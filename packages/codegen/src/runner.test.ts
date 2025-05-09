import { access, chmod } from 'node:fs/promises';
import { type Diagnostic } from '@css-modules-kit/core';
import dedent from 'dedent';
import { describe, expect, test } from 'vitest';
import { ReadCSSModuleFileError } from './error.js';
import { runCMK } from './runner.js';
import { createIFF } from './test/fixture.js';
import { createLoggerSpy } from './test/logger.js';
import { mockProcessExit, ProcessExitError } from './test/process.js';

function formatDiagnostic(diagnostic: Diagnostic, rootDir: string) {
  return {
    text: diagnostic.text.replace(rootDir, '<rootDir>'),
    category: diagnostic.category,
    ...('file' in diagnostic ?
      {
        fileName: diagnostic.file.fileName.replace(rootDir, '<rootDir>'),
        start: diagnostic.start,
        length: diagnostic.length,
      }
    : {}),
  };
}
function formatDiagnostics(diagnostics: Diagnostic[], rootDir: string) {
  return diagnostics.map((diagnostic) => formatDiagnostic(diagnostic, rootDir));
}

mockProcessExit();

describe('runCMK', () => {
  test('generates .d.ts files', async () => {
    const iff = await createIFF({
      'tsconfig.json': dedent`
        {
          "cmkOptions": { "dtsOutDir": "generated" }
        }
      `,
      'src/a.module.css': '.a1 { /** RED */ color: red; }',
      'src/b.module.css': '/** BLUE */ .b1 { color: blue; }',
    });
    await runCMK(iff.rootDir, createLoggerSpy());
    expect(await iff.readFile('generated/src/a.module.css.d.ts')).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
        /**
         * \`\`\`css
         * .a1 {  color: red; }
         * \`\`\`
         */
        a1: '' as readonly string,
      };
      export default styles;
      "
    `);
    expect(await iff.readFile('generated/src/b.module.css.d.ts')).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
        /**
         * \`\`\`css
         * .b1 { color: blue; }
         * \`\`\`
         */
        b1: '' as readonly string,
      };
      export default styles;
      "
    `);
  });
  test('does not generate .d.ts files for files not matched by `pattern`', async () => {
    const iff = await createIFF({
      'tsconfig.json': dedent`
        {
          "cmkOptions": { "dtsOutDir": "generated" }
        }
      `,
      'src/a.module.css': '.a1 { color: red; }',
      'src/b.css': '.b1 { color: red; }',
    });
    await runCMK(iff.rootDir, createLoggerSpy());
    await expect(access(iff.join('generated/src/a.module.css.d.ts'))).resolves.not.toThrow();
    await expect(access(iff.join('generated/src/b.css.d.ts'))).rejects.toThrow();
  });
  test('does not generate types derived from files not matched by `pattern`', async () => {
    const iff = await createIFF({
      'tsconfig.json': dedent`
        {
          "cmkOptions": { "dtsOutDir": "generated" }
        }
      `,
      'src/a.module.css': '@import "./b.module.css"; @import "./c.css"',
      'src/b.module.css': '.b1 { color: blue; }',
      'src/c.css': '.c1 { color: red; }',
    });
    await runCMK(iff.rootDir, createLoggerSpy());
    expect(await iff.readFile('generated/src/a.module.css.d.ts')).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
        ...(await import('./b.module.css')).default,
      };
      export default styles;
      "
    `);
  });
  test('warns when no files found by `pattern`', async () => {
    const iff = await createIFF({
      'tsconfig.json': dedent`
        {
          "cmkOptions": { "dtsOutDir": "generated" }
        }
      `,
    });
    const loggerSpy = createLoggerSpy();
    await runCMK(iff.rootDir, loggerSpy);
    expect(loggerSpy.logDiagnostics).toHaveBeenCalledTimes(1);
    expect(formatDiagnostics(loggerSpy.logDiagnostics.mock.calls[0]![0], iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "warning",
          "text": "The file specified in tsconfig.json not found.",
        },
      ]
    `);
  });
  test.runIf(process.platform !== 'win32')('throws error when failed to read CSS Module file', async () => {
    const iff = await createIFF({
      'tsconfig.json': dedent`
        {
          "cmkOptions": { "dtsOutDir": "generated" }
        }
      `,
      'src/a.module.css': '.a1 { color: red; }',
    });
    await chmod(iff.paths['src/a.module.css'], 0o200); // Remove read permission
    await expect(runCMK(iff.rootDir, createLoggerSpy())).rejects.toThrow(ReadCSSModuleFileError);
  });
  test('support ./ in `pattern`', async () => {
    const iff = await createIFF({
      'tsconfig.json': dedent`
        {
          "cmkOptions": { "dtsOutDir": "generated" }
        }
      `,
      'src/a.module.css': `@import './b.css'; .a1 { color: red; }`,
      'src/b.css': '.b1 { color: red; }',
    });
    await runCMK(iff.rootDir, createLoggerSpy());
    expect(await iff.readFile('generated/src/a.module.css.d.ts')).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
        /**
         * \`\`\`css
         * .a1 { color: red; }
         * \`\`\`
         */
        a1: '' as readonly string,
      };
      export default styles;
      "
    `);
    await expect(access(iff.join('generated/src/b.css.d.ts'))).rejects.toThrow();
  });
  test('reports semantic diagnostics in tsconfig.json', async () => {
    const iff = await createIFF({
      'tsconfig.json': dedent`
        {
          "cmkOptions": { "dtsOutDir": 1 }
        }
      `,
    });
    const loggerSpy = createLoggerSpy();
    await expect(runCMK(iff.rootDir, loggerSpy)).rejects.toThrow(ProcessExitError);
    expect(loggerSpy.logDiagnostics).toHaveBeenCalledTimes(1);
    expect(formatDiagnostics(loggerSpy.logDiagnostics.mock.calls[0]![0], iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "text": "\`dtsOutDir\` in <rootDir>/tsconfig.json must be a string.",
        },
      ]
    `);
  });
  test('reports syntactic diagnostics in *.module.css', async () => {
    const iff = await createIFF({
      'tsconfig.json': dedent`
        {
          "cmkOptions": { "dtsOutDir": "generated" }
        }
      `,
      'src/a.module.css': '.a1 {',
      'src/b.module.css': '@value;',
    });
    const loggerSpy = createLoggerSpy();
    await expect(runCMK(iff.rootDir, loggerSpy)).rejects.toThrow(ProcessExitError);
    expect(loggerSpy.logDiagnostics).toHaveBeenCalledTimes(1);
    expect(formatDiagnostics(loggerSpy.logDiagnostics.mock.calls[0]![0], iff.rootDir)).toMatchInlineSnapshot(`
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
          "length": 7,
          "start": {
            "column": 1,
            "line": 1,
          },
          "text": "\`@value\` is a invalid syntax.",
        },
      ]
    `);
  });
  test('reports semantic diagnostics in *.module.css', async () => {
    const iff = await createIFF({
      'tsconfig.json': dedent`
        {
          "cmkOptions": { "dtsOutDir": "generated" }
        }
      `,
      'src/a.module.css': dedent`
        @value b_1, b_2 from "./b.module.css";
      `,
      'src/b.module.css': dedent`
        @value b_1: red;
        @import "./c.module.css";
      `,
    });
    const loggerSpy = createLoggerSpy();
    await expect(runCMK(iff.rootDir, loggerSpy)).rejects.toThrow(ProcessExitError);
    expect(loggerSpy.logDiagnostics).toHaveBeenCalledTimes(1);
    expect(formatDiagnostics(loggerSpy.logDiagnostics.mock.calls[0]![0], iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "fileName": "<rootDir>/src/a.module.css",
          "length": 3,
          "start": {
            "column": 13,
            "line": 1,
          },
          "text": "Module './b.module.css' has no exported token 'b_2'.",
        },
        {
          "category": "error",
          "fileName": "<rootDir>/src/b.module.css",
          "length": 14,
          "start": {
            "column": 10,
            "line": 2,
          },
          "text": "Cannot import module './c.module.css'",
        },
      ]
    `);
  });
});
