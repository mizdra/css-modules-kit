import { access, chmod, rm, writeFile } from 'node:fs/promises';
import { TsConfigFileNotFoundError } from '@css-modules-kit/core';
import dedent from 'dedent';
import { describe, expect, test } from 'vitest';
import { ReadCSSModuleFileError } from './error.js';
import { createProject } from './project.js';
import { formatDiagnostics } from './test/diagnostic.js';
import { createIFF } from './test/fixture.js';

describe('createProject', () => {
  test('creates project', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{}',
    });
    const project = createProject({ project: iff.rootDir });
    expect(project.config.dtsOutDir).toContain('generated');
  });
  test('throws TsConfigFileNotFoundError when tsconfig.json does not exist', async () => {
    const iff = await createIFF({});
    expect(() => createProject({ project: iff.rootDir })).toThrow(TsConfigFileNotFoundError);
  });
  test.runIf(process.platform !== 'win32')(
    'throws ReadCSSModuleFileError when a CSS module file cannot be read',
    async () => {
      const iff = await createIFF({
        'tsconfig.json': '{}',
        'src/a.module.css': '.a1 { color: red; }',
      });
      await chmod(iff.paths['src/a.module.css'], 0o200); // Remove read permission
      expect(() => createProject({ project: iff.rootDir })).toThrow(ReadCSSModuleFileError);
    },
  );
});

test('isWildcardMatchedFile', async () => {
  const iff = await createIFF({
    'tsconfig.json': dedent`
      {
        "include": ["src"],
        "exclude": ["src/excluded"]
      }
    `,
  });
  const project = createProject({ project: iff.rootDir });
  expect(project.isWildcardMatchedFile(iff.join('src/a.module.css'))).toBe(true);
  expect(project.isWildcardMatchedFile(iff.join('src/excluded/b.module.css'))).toBe(false);
  expect(project.isWildcardMatchedFile(iff.join('c.module.css'))).toBe(false);
});

describe('addFile', () => {
  test('The diagnostics of the added file are reported, and .d.ts file is emitted', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{}',
      'src': {},
    });
    const project = createProject({ project: iff.rootDir });

    // Even if the file is added, diagnostics will not change until notified by `addFile`.
    await writeFile(iff.join('src/a.module.css'), '.a_1 {');
    expect(formatDiagnostics(project.getDiagnostics(), iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "text": "The file specified in tsconfig.json not found.",
        },
      ]
    `);

    project.addFile(iff.join('src/a.module.css'));
    expect(formatDiagnostics(project.getDiagnostics(), iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "fileName": "<rootDir>/src/a.module.css",
          "length": 1,
          "start": {
            "column": 1,
            "line": 1,
          },
          "text": "Unclosed block",
        },
      ]
    `);

    await project.emitDtsFiles();
    await expect(access(iff.join('generated/src/a.module.css.d.ts'))).resolves.not.toThrow();
  });
  test('changes diagnostics in files that import it directly or indirectly', async () => {
    // This test case suggests the following facts:
    // - The check stage cache for files that directly import the added file should be invalidated.
    // - The check stage cache for files that indirectly import the added file should also be invalidated.
    const iff = await createIFF({
      'tsconfig.json': '{}',
      'src/b.module.css': '@import "./a.module.css";', // directly
      'src/c.module.css': '@value a_1 from "./b.module.css";', // indirectly
    });
    const project = createProject({ project: iff.rootDir });
    expect(formatDiagnostics(project.getDiagnostics(), iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "fileName": "<rootDir>/src/b.module.css",
          "length": 14,
          "start": {
            "column": 10,
            "line": 1,
          },
          "text": "Cannot import module './a.module.css'",
        },
        {
          "category": "error",
          "fileName": "<rootDir>/src/c.module.css",
          "length": 3,
          "start": {
            "column": 8,
            "line": 1,
          },
          "text": "Module './b.module.css' has no exported token 'a_1'.",
        },
      ]
    `);
    await writeFile(iff.join('src/a.module.css'), '@value a_1: red;');
    project.addFile(iff.join('src/a.module.css'));
    expect(formatDiagnostics(project.getDiagnostics(), iff.rootDir)).toMatchInlineSnapshot(`[]`);
  });
  test('changes the resolution results of import specifiers in other files', async () => {
    // This test case suggests the following facts:
    // - The check stage cache for files that import other files should be invalidated.
    // - Only independent files that do not import any other files can keep the check stage cache.
    const iff = await createIFF({
      'tsconfig.json': dedent`
        {
          "compilerOptions": {
            "paths": {
              "@/a.module.css": ["src/a-1.module.css", "src/a-2.module.css"]
            }
          }
        }
      `,
      'src/a-2.module.css': '@value a_2: red;',
      'src/b.module.css': '@import "@/a.module.css";',
      'src/c.module.css': '@value a_2 from "./b.module.css";',
    });
    const project = createProject({ project: iff.rootDir });
    expect(formatDiagnostics(project.getDiagnostics(), iff.rootDir)).toMatchInlineSnapshot(`[]`);
    await writeFile(iff.join('src/a-1.module.css'), '@value a_1: red;');
    project.addFile(iff.join('src/a-1.module.css'));
    expect(formatDiagnostics(project.getDiagnostics(), iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "fileName": "<rootDir>/src/c.module.css",
          "length": 3,
          "start": {
            "column": 8,
            "line": 1,
          },
          "text": "Module './b.module.css' has no exported token 'a_2'.",
        },
      ]
    `);
  });
});

describe('updateFile', () => {
  test('The new diagnostics of the changed file are reported, and new .d.ts file is emitted', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{}',
      'src/a.module.css': '',
    });
    const project = createProject({ project: iff.rootDir });

    // Even if the file is updated, diagnostics will not change until notified by `updateFile`.
    await writeFile(iff.join('src/a.module.css'), '.a_1 {');
    expect(formatDiagnostics(project.getDiagnostics(), iff.rootDir)).toMatchInlineSnapshot(`[]`);

    // New syntactic diagnostics are reported
    project.updateFile(iff.join('src/a.module.css'));
    expect(formatDiagnostics(project.getDiagnostics(), iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "fileName": "<rootDir>/src/a.module.css",
          "length": 1,
          "start": {
            "column": 1,
            "line": 1,
          },
          "text": "Unclosed block",
        },
      ]
    `);

    // New .d.ts file is emitted
    await project.emitDtsFiles();
    expect(await iff.readFile('generated/src/a.module.css.d.ts')).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
        a_1: '' as readonly string,
      };
      export default styles;
      "
    `);

    // New semantic diagnostics are reported
    await writeFile(iff.join('src/a.module.css'), `@import './non-existent.module.css';`);
    project.updateFile(iff.join('src/a.module.css'));
    expect(formatDiagnostics(project.getDiagnostics(), iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "fileName": "<rootDir>/src/a.module.css",
          "length": 25,
          "start": {
            "column": 10,
            "line": 1,
          },
          "text": "Cannot import module './non-existent.module.css'",
        },
      ]
    `);
  });
  test('changes diagnostics in files that import it directly or indirectly', async () => {
    // This test case suggests the following facts:
    // - The resolution cache should be invalidated.
    // - The check stage cache for files that directly import the changed file should be invalidated.
    // - The check stage cache for files that indirectly import the changed file should also be invalidated.
    const iff = await createIFF({
      'tsconfig.json': '{}',
      'src/a.module.css': '',
      'src/b.module.css': dedent`
        @value a_1 from "./a.module.css";
        @import "./a.module.css";
      `,
      'src/c.module.css': '@value a_2 from "./b.module.css";',
    });
    const project = createProject({ project: iff.rootDir });
    expect(formatDiagnostics(project.getDiagnostics(), iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "fileName": "<rootDir>/src/b.module.css",
          "length": 3,
          "start": {
            "column": 8,
            "line": 1,
          },
          "text": "Module './a.module.css' has no exported token 'a_1'.",
        },
        {
          "category": "error",
          "fileName": "<rootDir>/src/c.module.css",
          "length": 3,
          "start": {
            "column": 8,
            "line": 1,
          },
          "text": "Module './b.module.css' has no exported token 'a_2'.",
        },
      ]
    `);
    await writeFile(iff.join('src/a.module.css'), '@value a_1: red; @value a_2: blue;');
    project.updateFile(iff.join('src/a.module.css'));
    expect(formatDiagnostics(project.getDiagnostics(), iff.rootDir)).toMatchInlineSnapshot(`[]`);
  });
});

describe('removeFile', () => {
  test('The diagnostics of the removed file are not reported, and .d.ts file is not emitted', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{}',
      'src/a.module.css': '.a_1 {',
    });
    const project = createProject({ project: iff.rootDir });

    // Even if the file is deleted, diagnostics will not change until notified by `removeFile`.
    await rm(iff.join('src/a.module.css'));
    expect(formatDiagnostics(project.getDiagnostics(), iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "fileName": "<rootDir>/src/a.module.css",
          "length": 1,
          "start": {
            "column": 1,
            "line": 1,
          },
          "text": "Unclosed block",
        },
      ]
    `);

    project.removeFile(iff.join('src/a.module.css'));
    expect(formatDiagnostics(project.getDiagnostics(), iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "text": "The file specified in tsconfig.json not found.",
        },
      ]
    `);

    await project.emitDtsFiles();
    await expect(access(iff.join('generated/src/a.module.css.d.ts'))).rejects.toThrow();
  });
  test('changes diagnostics in files that import it directly or indirectly', async () => {
    // This test case suggests the following facts:
    // - The check stage cache for files that directly import the changed file should be invalidated.
    // - The check stage cache for files that indirectly import the changed file should also be invalidated.
    const iff = await createIFF({
      'tsconfig.json': '{}',
      'src/a.module.css': '@value a_1: red;',
      'src/b.module.css': '@import "./a.module.css";', // directly
      'src/c.module.css': '@value a_1 from "./b.module.css";', // indirectly
    });
    const project = createProject({ project: iff.rootDir });
    expect(formatDiagnostics(project.getDiagnostics(), iff.rootDir)).toMatchInlineSnapshot(`[]`);
    await rm(iff.join('src/a.module.css'));
    project.removeFile(iff.join('src/a.module.css'));
    expect(formatDiagnostics(project.getDiagnostics(), iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "fileName": "<rootDir>/src/b.module.css",
          "length": 14,
          "start": {
            "column": 10,
            "line": 1,
          },
          "text": "Cannot import module './a.module.css'",
        },
        {
          "category": "error",
          "fileName": "<rootDir>/src/c.module.css",
          "length": 3,
          "start": {
            "column": 8,
            "line": 1,
          },
          "text": "Module './b.module.css' has no exported token 'a_1'.",
        },
      ]
    `);
  });
  test('changes the resolution results of import specifiers in other files', async () => {
    // This test case suggests the following facts:
    // - The resolution cache should be invalidated.
    // - The check stage cache for files that import the removed file should be invalidated.
    const iff = await createIFF({
      'tsconfig.json': dedent`
        {
          "compilerOptions": {
            "paths": {
              "@/a.module.css": ["src/a-1.module.css", "src/a-2.module.css"]
            }
          }
        }
      `,
      'src/a-1.module.css': '@value a_1: red;',
      'src/a-2.module.css': '@value a_2: red;',
      'src/b.module.css': '@import "@/a.module.css";',
      'src/c.module.css': '@value a_2 from "./b.module.css";',
    });
    const project = createProject({ project: iff.rootDir });
    expect(formatDiagnostics(project.getDiagnostics(), iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "fileName": "<rootDir>/src/c.module.css",
          "length": 3,
          "start": {
            "column": 8,
            "line": 1,
          },
          "text": "Module './b.module.css' has no exported token 'a_2'.",
        },
      ]
    `);
    await rm(iff.join('src/a-1.module.css'));
    project.removeFile(iff.join('src/a-1.module.css'));
    expect(formatDiagnostics(project.getDiagnostics(), iff.rootDir)).toMatchInlineSnapshot(`[]`);
  });
});

describe('getDiagnostics', () => {
  test('returns empty array when no diagnostics', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{}',
      'src/a.module.css': '.a_1 { color: red; }',
    });
    const project = createProject({ project: iff.rootDir });
    const diagnostics = project.getDiagnostics();
    expect(diagnostics).toEqual([]);
  });
  test('returns project diagnostics', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{ "cmkOptions": { "dtsOutDir": 1 } }',
    });
    const project = createProject({ project: iff.rootDir });
    const diagnostics = project.getDiagnostics();
    expect(formatDiagnostics(diagnostics, iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "text": "\`dtsOutDir\` in <rootDir>/tsconfig.json must be a string.",
        },
        {
          "category": "error",
          "text": "The file specified in tsconfig.json not found.",
        },
      ]
    `);
  });
  test('returns syntactic diagnostics', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{}',
      'src/a.module.css': '.a_1 {',
      'src/b.module.css': '.a_2 { color }',
    });
    const project = createProject({ project: iff.rootDir });
    const diagnostics = project.getDiagnostics();
    expect(formatDiagnostics(diagnostics, iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "fileName": "<rootDir>/src/a.module.css",
          "length": 1,
          "start": {
            "column": 1,
            "line": 1,
          },
          "text": "Unclosed block",
        },
        {
          "category": "error",
          "fileName": "<rootDir>/src/b.module.css",
          "length": 5,
          "start": {
            "column": 8,
            "line": 1,
          },
          "text": "Unknown word color",
        },
      ]
    `);
  });

  test('returns semantic diagnostics', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{}',
      'src/a.module.css': `@import './non-existent-1.module.css';`,
      'src/b.module.css': `@import './non-existent-2.module.css';`,
    });
    const project = createProject({ project: iff.rootDir });
    const diagnostics = project.getDiagnostics();
    expect(formatDiagnostics(diagnostics, iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "fileName": "<rootDir>/src/a.module.css",
          "length": 27,
          "start": {
            "column": 10,
            "line": 1,
          },
          "text": "Cannot import module './non-existent-1.module.css'",
        },
        {
          "category": "error",
          "fileName": "<rootDir>/src/b.module.css",
          "length": 27,
          "start": {
            "column": 10,
            "line": 1,
          },
          "text": "Cannot import module './non-existent-2.module.css'",
        },
      ]
    `);
  });
  test('skips semantic diagnostics when project or syntactic diagnostics exist', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{ "cmkOptions": { "dtsOutDir": 1 } }',
      'src/a.module.css': '.a_1 {',
      'src/b.module.css': `@import './non-existent.module.css';`,
    });
    const project = createProject({ project: iff.rootDir });
    const diagnostics = project.getDiagnostics();
    expect(formatDiagnostics(diagnostics, iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "text": "\`dtsOutDir\` in <rootDir>/tsconfig.json must be a string.",
        },
        {
          "category": "error",
          "fileName": "<rootDir>/src/a.module.css",
          "length": 1,
          "start": {
            "column": 1,
            "line": 1,
          },
          "text": "Unclosed block",
        },
      ]
    `);
  });
});

describe('emitDtsFiles', () => {
  test('emits .d.ts files', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{}',
      'src/a.module.css': '.a1 { color: red; }',
      'src/b.module.css': '.b1 { color: blue; }',
    });
    const project = createProject({ project: iff.rootDir });
    await project.emitDtsFiles();
    expect(await iff.readFile('generated/src/a.module.css.d.ts')).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
        a1: '' as readonly string,
      };
      export default styles;
      "
    `);
    expect(await iff.readFile('generated/src/b.module.css.d.ts')).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
        b1: '' as readonly string,
      };
      export default styles;
      "
    `);
  });
  test('does not emit .d.ts files for files not matched by `pattern`', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{}',
      'src/a.module.css': '.a1 { color: red; }',
      'src/b.css': '.b1 { color: blue; }',
    });
    const project = createProject({ project: iff.rootDir });
    await project.emitDtsFiles();
    expect(await iff.readFile('generated/src/a.module.css.d.ts')).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
        a1: '' as readonly string,
      };
      export default styles;
      "
    `);
    await expect(access(iff.join('generated/src/a.module.css.d.ts'))).resolves.not.toThrow();
    await expect(access(iff.join('generated/src/b.css.d.ts'))).rejects.toThrow();
  });
});
