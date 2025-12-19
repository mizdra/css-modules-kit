import assert from 'node:assert';
import { writeFile } from 'node:fs/promises';
import { platform } from 'node:process';
import { describe, test, vi } from 'vitest';
import { runCMKInWatchMode } from './runner.js';
import { fakeParsedArgs } from './test/faker.js';
import { createIFF } from './test/fixture.js';
import { createLoggerSpy } from './test/logger.js';

async function sleep(ms: number): Promise<void> {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForWatcherEmitAndReportDiagnostics(): Promise<void> {
  // In watch mode, emits and diagnostic reports are batched with a 250ms delay. Therefore, a wait longer than 250ms is required.
  await sleep(2000);
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
    await runCMKInWatchMode(fakeParsedArgs({ project: iff.rootDir }), loggerSpy);

    // Workaround for https://github.com/paulmillr/chokidar/issues/1443
    if (platform === 'darwin') {
      await sleep(100);
    }

    globalThis.changeCount = 0;

    console.log('update a.module.css');
    await writeFile(iff.join('src/a.module.css'), '.a_1 { color: blue; }');
    await vi.waitFor(() => {
      assert(globalThis.changeCount === 1, `Expected changeCount to be 1, but got ${globalThis.changeCount}`);
    });

    console.log('update a.module.css');
    await writeFile(iff.join('src/a.module.css'), '.a_1 { color: yellow; }');
    await waitForWatcherEmitAndReportDiagnostics();
    assert(globalThis.changeCount === 2, `Expected changeCount to be 2, but got ${globalThis.changeCount}`);
  });
});
