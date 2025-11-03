import { access, chmod } from 'node:fs/promises';
import { TsConfigFileNotFoundError } from '@css-modules-kit/core';
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
