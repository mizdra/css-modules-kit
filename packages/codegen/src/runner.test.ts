import { writeFile } from 'node:fs/promises';
import { platform } from 'node:process';
import { describe, expect, test, vi } from 'vitest';
import { runCMKInWatchMode } from './runner.js';
import { fakeParsedArgs } from './test/faker.js';
import { createIFF } from './test/fixture.js';
import { createLoggerSpy } from './test/logger.js';

async function sleep(ms: number): Promise<void> {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForWatcherReady(): Promise<void> {
  // Workaround for https://github.com/paulmillr/chokidar/issues/1443
  if (platform === 'darwin') {
    await sleep(100);
  }
}
async function waitForWatcherEmitAndReportDiagnostics(): Promise<void> {
  // In watch mode, emits and diagnostic reports are batched with a 250ms delay. Therefore, a wait longer than 250ms is required.
  await sleep(500);
}

describe('runCMKInWatchMode', () => {
  test('reports system error occurs during watching', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{}',
      'src/a.module.css': '.a_1 { color: red; }',
    });

    // On macOS, chokidar may detect 'add' events for files added before watching starts.
    // To avoid test flakiness, wait for a short time before starting the watcher.
    await sleep(100);

    const loggerSpy = createLoggerSpy();
    const watcher = await runCMKInWatchMode(fakeParsedArgs({ project: iff.rootDir }), loggerSpy);
    await waitForWatcherReady();

    // Error when adding a file
    vi.spyOn(watcher.project, 'addFile').mockImplementationOnce(() => {
      throw new Error('test error');
    });
    await writeFile(iff.join('src/b.module.css'), '.b_1 { color: red; }');
    await vi.waitFor(() => {
      expect(loggerSpy.logError).toHaveBeenCalledTimes(1);
    });

    // Error when changing a file
    console.log('update a.module.css');
    vi.spyOn(watcher.project, 'updateFile').mockImplementationOnce(() => {
      throw new Error('test error');
    });
    await writeFile(iff.join('src/a.module.css'), '.a_1 { color: blue; }');
    await vi.waitFor(() => {
      expect(loggerSpy.logError).toHaveBeenCalledTimes(2);
    });

    // Error when emitting files
    vi.spyOn(watcher.project, 'emitDtsFiles').mockImplementationOnce(() => {
      throw new Error('test error');
    });
    console.log('update a.module.css');
    await writeFile(iff.join('src/a.module.css'), '.a_1 { color: yellow; }');
    await waitForWatcherEmitAndReportDiagnostics();
    expect(loggerSpy.logError).toHaveBeenCalledTimes(3);
  });
});
