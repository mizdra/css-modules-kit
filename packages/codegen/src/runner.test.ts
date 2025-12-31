import { access, rm, writeFile } from 'node:fs/promises';
import { platform } from 'node:process';
import dedent from 'dedent';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { CMKDisabledError } from './error.js';
import type { Watcher } from './runner.js';
import { runCMK, runCMKInWatchMode } from './runner.js';
import { formatDiagnostics } from './test/diagnostic.js';
import { fakeParsedArgs } from './test/faker.js';
import { createIFF } from './test/fixture.js';
import { createLoggerSpy } from './test/logger.js';

async function sleep(ms: number): Promise<void> {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
      'tsconfig.json': '{ "cmkOptions": { "enabled": true } }',
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
      'tsconfig.json': '{ "cmkOptions": { "enabled": true } }',
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
      'tsconfig.json': '{ "cmkOptions": { "enabled": true } }',
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
      'tsconfig.json': '{ "cmkOptions": { "enabled": true } }',
      'src/a.module.css': '.a_1 { color: red; }',
      'generated/src/old.module.css.d.ts': '',
    });
    await runCMK(fakeParsedArgs({ project: iff.rootDir, clean: true }), createLoggerSpy());
    await expect(access(iff.join('generated/src/a.module.css.d.ts'))).resolves.not.toThrow();
    await expect(access(iff.join('generated/src/old.module.css.d.ts'))).rejects.toThrow();
  });
  test('throws CMKDisabledError if enabled is false', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{ "cmkOptions": { "enabled": false } }',
      'src/a.module.css': '.a_1 { color: red; }',
    });
    await expect(runCMK(fakeParsedArgs({ project: iff.rootDir }), createLoggerSpy())).rejects.toThrow(CMKDisabledError);
  });
});

describe('runCMKInWatchMode', () => {
  let watcher: Watcher | null = null;
  afterEach(async () => {
    if (watcher) {
      await watcher.close();
      // eslint-disable-next-line require-atomic-updates
      watcher = null;
    }
  });
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
    watcher = await runCMKInWatchMode(fakeParsedArgs({ project: iff.rootDir }), createLoggerSpy());
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
      'tsconfig.json': '{ "cmkOptions": { "enabled": true } }',
      'src/a.module.css': '.a_1 {',
      'src/b.module.css': '.b_1 { color: red; }',
    });
    const loggerSpy = createLoggerSpy();
    watcher = await runCMKInWatchMode(fakeParsedArgs({ project: iff.rootDir }), loggerSpy);
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
  test('emits .d.ts files even if there are diagnostics', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{ "cmkOptions": { "enabled": true } }',
      'src/a.module.css': '.a_1 {',
      'src/b.module.css': '.b_1 { color: red; }',
    });
    const loggerSpy = createLoggerSpy();
    watcher = await runCMKInWatchMode(fakeParsedArgs({ project: iff.rootDir }), loggerSpy);
    expect(loggerSpy.logDiagnostics).toHaveBeenCalledTimes(1);
    await expect(access(iff.join('generated/src/a.module.css.d.ts'))).resolves.not.toThrow();
    await expect(access(iff.join('generated/src/b.module.css.d.ts'))).resolves.not.toThrow();
  });
  test('removes output directory before emitting files when `clean` is true', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{ "cmkOptions": { "enabled": true } }',
      'src/a.module.css': '.a_1 { color: red; }',
      'generated/src/old.module.css.d.ts': '',
    });
    watcher = await runCMKInWatchMode(fakeParsedArgs({ project: iff.rootDir, clean: true }), createLoggerSpy());
    await expect(access(iff.join('generated/src/a.module.css.d.ts'))).resolves.not.toThrow();
    await expect(access(iff.join('generated/src/old.module.css.d.ts'))).rejects.toThrow();
  });
  test('reports system error occurs during watching', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{ "cmkOptions": { "enabled": true } }',
      'src/a.module.css': '.a_1 { color: red; }',
    });

    // Workaround for https://github.com/nodejs/node/issues/54450
    if (platform === 'darwin') await sleep(100);

    const loggerSpy = createLoggerSpy();
    watcher = await runCMKInWatchMode(fakeParsedArgs({ project: iff.rootDir }), loggerSpy);
    // Workaround for https://github.com/nodejs/node/issues/52601
    if (platform === 'darwin') await sleep(100);

    // Error when adding a file
    vi.spyOn(watcher.project, 'addFile').mockImplementationOnce(() => {
      throw new Error('test error');
    });
    await writeFile(iff.join('src/b.module.css'), '.b_1 { color: red; }');
    await vi.waitFor(() => {
      expect(loggerSpy.logError).toHaveBeenCalledTimes(1);
    });

    // Error when changing a file
    vi.spyOn(watcher.project, 'updateFile').mockImplementationOnce(() => {
      throw new Error('test error');
    });
    await writeFile(iff.join('src/a.module.css'), '.a_1 { color: blue; }');
    await vi.waitFor(() => {
      expect(loggerSpy.logError).toHaveBeenCalledTimes(2);
    });

    // Workaround for https://github.com/paulmillr/chokidar/issues/1399
    await sleep(100);

    // Error when emitting files
    vi.spyOn(watcher.project, 'emitDtsFiles').mockImplementationOnce(() => {
      throw new Error('test error');
    });
    await writeFile(iff.join('src/a.module.css'), '.a_1 { color: yellow; }');
    await vi.waitFor(() => {
      // Wait for watcher to emit and report diagnostics
      expect(loggerSpy.logError).toHaveBeenCalledTimes(3);
    });
  });
  test('reports diagnostics and emits files on changes', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{ "cmkOptions": { "enabled": true } }',
      'src/a.module.css': '.a_1 { color: red; }',
    });
    const loggerSpy = createLoggerSpy();
    watcher = await runCMKInWatchMode(fakeParsedArgs({ project: iff.rootDir }), loggerSpy);
    // Workaround for https://github.com/nodejs/node/issues/52601
    if (platform === 'darwin') await sleep(100);
    loggerSpy.logDiagnostics.mockClear();

    // Add a file
    await writeFile(iff.join('src/b.module.css'), '.b_1 {');
    await vi.waitFor(async () => {
      // Wait for watcher to emit and report diagnostics
      expect(loggerSpy.logDiagnostics).toHaveBeenCalledTimes(1);
      expect(await iff.readFile('generated/src/b.module.css.d.ts')).contain('b_1');
    });

    // Change a file
    await writeFile(iff.join('src/b.module.css'), '.b_2 {');
    await vi.waitFor(async () => {
      // Wait for watcher to emit and report diagnostics
      expect(loggerSpy.logDiagnostics).toHaveBeenCalledTimes(2);
      expect(await iff.readFile('generated/src/b.module.css.d.ts')).contain('b_2');
    });

    // Remove a file
    await rm(iff.join('src/a.module.css'));
    await vi.waitFor(async () => {
      // Wait for watcher to emit and report diagnostics
      expect(loggerSpy.logDiagnostics).toHaveBeenCalledTimes(3);
      await expect(access(iff.join('generated/src/a.module.css.d.ts'))).resolves.not.toThrow();
    });
  });
  test('batches rapid file changes', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{ "cmkOptions": { "enabled": true } }',
      'src': {},
    });
    const loggerSpy = createLoggerSpy();
    watcher = await runCMKInWatchMode(fakeParsedArgs({ project: iff.rootDir }), loggerSpy);
    // Workaround for https://github.com/nodejs/node/issues/52601
    if (platform === 'darwin') await sleep(100);
    loggerSpy.logDiagnostics.mockClear();

    // Make rapid changes
    await Promise.all([
      writeFile(iff.join('src/a.module.css'), '.a_1 {'),
      writeFile(iff.join('src/b.module.css'), '.b_1 {'),
      writeFile(iff.join('src/c.module.css'), '.c_1 {'),
    ]);
    await vi.waitFor(() => {
      // Wait for watcher to emit and report diagnostics
      expect(loggerSpy.logDiagnostics).toHaveBeenCalledTimes(1);
      // Diagnostics for three files are reported at once.
      expect(formatDiagnostics(loggerSpy.logDiagnostics.mock.calls[0]![0], iff.rootDir)).length(3);
    });
  });
  test('does not clear screen when preserveWatchOutput is true', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{ "cmkOptions": { "enabled": true } }',
      'src/a.module.css': '.a_1 { color: red; }',
    });

    const loggerSpy1 = createLoggerSpy();
    watcher = await runCMKInWatchMode(fakeParsedArgs({ project: iff.rootDir, preserveWatchOutput: false }), loggerSpy1);
    expect(loggerSpy1.clearScreen).toHaveBeenCalledTimes(1);
    await watcher.close();

    const loggerSpy2 = createLoggerSpy();
    // eslint-disable-next-line require-atomic-updates
    watcher = await runCMKInWatchMode(fakeParsedArgs({ project: iff.rootDir, preserveWatchOutput: true }), loggerSpy2);
    expect(loggerSpy2.clearScreen).toHaveBeenCalledTimes(0);
  });
  test('throws CMKDisabledError if enabled is false', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{ "cmkOptions": { "enabled": false } }',
      'src/a.module.css': '.a_1 { color: red; }',
    });
    await expect(runCMKInWatchMode(fakeParsedArgs({ project: iff.rootDir }), createLoggerSpy())).rejects.toThrow(
      CMKDisabledError,
    );
  });
});
