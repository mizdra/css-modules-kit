import { access, chmod, readFile } from 'node:fs/promises';
import dedent from 'dedent';
import type { Diagnostic } from 'honey-css-modules-core';
import { describe, expect, test, vi } from 'vitest';
import { resolveConfig } from '../../core/src/config.js';
import { GlobError, ReadCSSModuleFileError } from './error.js';
import type { Logger } from './logger/logger.js';
import { runHCM } from './runner.js';
import { createIFF } from './test/fixture.js';

function formatDiagnostic(diagnostic: Diagnostic, rootDir: string) {
  return {
    ...diagnostic,
    text: diagnostic.text.replace(rootDir, '<rootDir>').replace(/\\/gu, '/'),
    ...(diagnostic.fileName ?
      { fileName: diagnostic.fileName.replace(rootDir, '<rootDir>').replace(/\\/gu, '/') }
    : {}),
  };
}
function formatDiagnostics(diagnostics: Diagnostic[], rootDir: string) {
  return diagnostics.map((diagnostic) => formatDiagnostic(diagnostic, rootDir));
}

class ProcessExitError extends Error {
  exitCode: string | number | null | undefined;
  constructor(exitCode: string | number | null | undefined) {
    super();
    this.exitCode = exitCode;
  }
}

vi.spyOn(process, 'exit').mockImplementation((code) => {
  throw new ProcessExitError(code);
});

function createLoggerSpy() {
  return {
    logDiagnostics: vi.fn(),
    logSystemError: vi.fn(),
  } satisfies Logger;
}

describe('runHCM', () => {
  test('generates .d.ts files', async () => {
    const iff = await createIFF({
      'src/a.module.css': '.a1 { color: red; }',
      'src/b.module.css': '.b1 { color: blue; }',
    });
    await runHCM(
      resolveConfig({ pattern: 'src/**/*.module.css', dtsOutDir: 'generated' }, iff.rootDir),
      createLoggerSpy(),
    );
    expect(await readFile(iff.join('generated/src/a.module.css.d.ts'), 'utf-8')).toMatchInlineSnapshot(`
      "function anyToEmptyObject<T>(val: T): 0 extends 1 & T ? {} : T;
      function anyToUnknown<T>(val: T): 0 extends 1 & T ? unknown : T;
      declare const styles = {
        a1: '' as readonly string,
      };
      export default styles;
      "
    `);
    expect(await readFile(iff.join('generated/src/b.module.css.d.ts'), 'utf-8')).toMatchInlineSnapshot(`
      "function anyToEmptyObject<T>(val: T): 0 extends 1 & T ? {} : T;
      function anyToUnknown<T>(val: T): 0 extends 1 & T ? unknown : T;
      declare const styles = {
        b1: '' as readonly string,
      };
      export default styles;
      "
    `);
  });
  test('does not generate .d.ts files for files not matched by `pattern`', async () => {
    const iff = await createIFF({
      'src/a.module.css': '.a1 { color: red; }',
      'src/b.css': '.b1 { color: red; }',
    });
    await runHCM(
      resolveConfig({ pattern: 'src/**/*.module.css', dtsOutDir: 'generated' }, iff.rootDir),
      createLoggerSpy(),
    );
    await expect(access(iff.join('generated/src/a.module.css.d.ts'))).resolves.not.toThrow();
    await expect(access(iff.join('generated/src/b.css.d.ts'))).rejects.toThrow();
  });
  test('does not generate types derived from files not matched by `pattern`', async () => {
    const iff = await createIFF({
      'src/a.module.css': '@import "./b.module.css"; @import "./c.css"',
      'src/b.module.css': '.b1 { color: blue; }',
      'src/c.css': '.c1 { color: red; }',
    });
    await runHCM(
      resolveConfig({ pattern: 'src/**/*.module.css', dtsOutDir: 'generated' }, iff.rootDir),
      createLoggerSpy(),
    );
    expect(await readFile(iff.join('generated/src/a.module.css.d.ts'), 'utf-8')).toMatchInlineSnapshot(`
      "function anyToEmptyObject<T>(val: T): 0 extends 1 & T ? {} : T;
      function anyToUnknown<T>(val: T): 0 extends 1 & T ? unknown : T;
      declare const styles = {
        ...anyToEmptyObject((await import('./b.module.css')).default),
      };
      export default styles;
      "
    `);
  });
  test('warns when no files found by `pattern`', async () => {
    const iff = await createIFF({});
    const loggerSpy = createLoggerSpy();
    await runHCM(resolveConfig({ pattern: 'src/**/*.module.css', dtsOutDir: 'generated' }, iff.rootDir), loggerSpy);
    expect(loggerSpy.logDiagnostics).toHaveBeenCalledTimes(1);
    expect(formatDiagnostics(loggerSpy.logDiagnostics.mock.calls[0]![0], iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "warning",
          "text": "No files found by pattern <rootDir>/src/**/*.module.css.",
          "type": "semantic",
        },
      ]
    `);
  });
  test.runIf(process.platform !== 'win32')('throws error when failed to retrieve files by glob pattern', async () => {
    const iff = await createIFF({
      'src/a.module.css': '.a1 { color: red; }',
    });
    await chmod(iff.paths['src'], 0o200); // Remove read permission
    await expect(
      runHCM(resolveConfig({ pattern: 'src/**/*.module.css', dtsOutDir: 'generated' }, iff.rootDir), createLoggerSpy()),
    ).rejects.toThrow(GlobError);
  });
  test.runIf(process.platform !== 'win32')('throws error when failed to read CSS Module file', async () => {
    const iff = await createIFF({
      'src/a.module.css': '.a1 { color: red; }',
    });
    await chmod(iff.paths['src/a.module.css'], 0o200); // Remove read permission
    await expect(
      runHCM(resolveConfig({ pattern: 'src/**/*.module.css', dtsOutDir: 'generated' }, iff.rootDir), createLoggerSpy()),
    ).rejects.toThrow(ReadCSSModuleFileError);
  });
  test('support ./ in `pattern`', async () => {
    const iff = await createIFF({
      'src/a.module.css': `@import './b.css'; .a1 { color: red; }`,
      'src/b.css': '.b1 { color: red; }',
    });
    await runHCM(
      resolveConfig({ pattern: './src/**/*.module.css', dtsOutDir: 'generated' }, iff.rootDir),
      createLoggerSpy(),
    );
    expect(await readFile(iff.join('generated/src/a.module.css.d.ts'), 'utf-8')).toMatchInlineSnapshot(`
      "function anyToEmptyObject<T>(val: T): 0 extends 1 & T ? {} : T;
      function anyToUnknown<T>(val: T): 0 extends 1 & T ? unknown : T;
      declare const styles = {
        a1: '' as readonly string,
      };
      export default styles;
      "
    `);
    await expect(access(iff.join('generated/src/b.css.d.ts'))).rejects.toThrow();
  });
  test('reports syntactic diagnostics', async () => {
    const iff = await createIFF({
      'src/a.module.css': '.a1 {',
      'src/b.module.css': '@value;',
    });
    const loggerSpy = createLoggerSpy();
    await expect(
      runHCM(resolveConfig({ pattern: 'src/**/*.module.css', dtsOutDir: 'generated' }, iff.rootDir), loggerSpy),
    ).rejects.toThrow(ProcessExitError);
    expect(loggerSpy.logDiagnostics).toHaveBeenCalledTimes(1);
    expect(formatDiagnostics(loggerSpy.logDiagnostics.mock.calls[0]![0], iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "fileName": "<rootDir>/src/a.module.css",
          "start": {
            "column": 1,
            "line": 1,
          },
          "text": "Unclosed block",
          "type": "syntactic",
        },
        {
          "category": "error",
          "end": {
            "column": 8,
            "line": 1,
          },
          "fileName": "<rootDir>/src/b.module.css",
          "start": {
            "column": 1,
            "line": 1,
          },
          "text": "\`@value\` is a invalid syntax.",
          "type": "syntactic",
        },
      ]
    `);
  });
  test('reports semantic diagnostics', async () => {
    const iff = await createIFF({
      'src/a.module.css': dedent`
        @value b_1, b_2 from "./b.module.css";
      `,
      'src/b.module.css': dedent`
        @value b_1: red;
        @import "./c.module.css";
      `,
    });
    const loggerSpy = createLoggerSpy();
    await expect(
      runHCM(resolveConfig({ pattern: 'src/**/*.module.css', dtsOutDir: 'generated' }, iff.rootDir), loggerSpy),
    ).rejects.toThrow(ProcessExitError);
    expect(loggerSpy.logDiagnostics).toHaveBeenCalledTimes(1);
    expect(formatDiagnostics(loggerSpy.logDiagnostics.mock.calls[0]![0], iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "end": {
            "column": 16,
            "line": 1,
          },
          "fileName": "<rootDir>/src/a.module.css",
          "start": {
            "column": 13,
            "line": 1,
          },
          "text": "Module './b.module.css' has no exported token 'b_2'.",
          "type": "semantic",
        },
        {
          "category": "error",
          "end": {
            "column": 24,
            "line": 2,
          },
          "fileName": "<rootDir>/src/b.module.css",
          "start": {
            "column": 10,
            "line": 2,
          },
          "text": "Cannot import module './c.module.css'",
          "type": "semantic",
        },
      ]
    `);
  });
});
