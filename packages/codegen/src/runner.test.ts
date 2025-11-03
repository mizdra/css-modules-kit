import { access, writeFile } from 'node:fs/promises';
import dedent from 'dedent';
import { describe, expect, test } from 'vitest';
import { runCMK } from './runner.js';
import { formatDiagnostics } from './test/diagnostic.js';
import { fakeParsedArgs } from './test/faker.js';
import { createIFF } from './test/fixture.js';
import { createLoggerSpy } from './test/logger.js';

describe('runCMK', () => {
  test('emits .d.ts files', async () => {
    const iff = await createIFF({
      'tsconfig.json': dedent`
        {
          "cmkOptions": { "dtsOutDir": "generated" }
        }
      `,
      'src/a.module.css': '.a_1 { color: red; }',
      'src/b.module.css': '.b_1 { color: blue; }',
    });
    await runCMK(fakeParsedArgs({ project: iff.rootDir }), createLoggerSpy());
    expect(await iff.readFile('generated/src/a.module.css.d.ts')).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
        a_1: '' as readonly string,
      };
      export default styles;
      "
    `);
    expect(await iff.readFile('generated/src/b.module.css.d.ts')).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
        b_1: '' as readonly string,
      };
      export default styles;
      "
    `);
  });
  test('reports diagnostics if errors are found', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{}',
      'src/a.module.css': '.a_1 {',
      'src/b.module.css': '.b_1 { color: red; }',
    });
    const loggerSpy = createLoggerSpy();
    await runCMK(fakeParsedArgs({ project: iff.rootDir }), loggerSpy);
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
      ]
    `);
  });
  test('returns false if errors are found', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{}',
      'src/a.module.css': '.a_1 {',
    });
    const result1 = await runCMK(fakeParsedArgs({ project: iff.rootDir }), createLoggerSpy());
    expect(result1).toBe(false);
    await writeFile(iff.join('src/a.module.css'), '.a_1 { color: red; }');
    const result2 = await runCMK(fakeParsedArgs({ project: iff.rootDir }), createLoggerSpy());
    expect(result2).toBe(true);
  });
  test('emits .d.ts files even if there are diagnostics', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{}',
      'src/a.module.css': '.a_1 {',
      'src/b.module.css': '.b_1 { color: red; }',
    });
    const loggerSpy = createLoggerSpy();
    await runCMK(fakeParsedArgs({ project: iff.rootDir }), loggerSpy);
    expect(loggerSpy.logDiagnostics).toHaveBeenCalledTimes(1);
    await expect(access(iff.join('generated/src/a.module.css.d.ts'))).resolves.not.toThrow();
    await expect(access(iff.join('generated/src/b.module.css.d.ts'))).resolves.not.toThrow();
  });
  test('removes output directory before emitting files when `clean` is true', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{}',
      'src/a.module.css': '.a_1 { color: red; }',
      'generated/src/old.module.css.d.ts': '',
    });
    await runCMK(fakeParsedArgs({ project: iff.rootDir, clean: true }), createLoggerSpy());
    await expect(access(iff.join('generated/src/a.module.css.d.ts'))).resolves.not.toThrow();
    await expect(access(iff.join('generated/src/old.module.css.d.ts'))).rejects.toThrow();
  });
});
