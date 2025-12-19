import assert from 'node:assert';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { platform } from 'node:process';
import chokidar from 'chokidar';
import { describe, test, vi } from 'vitest';

async function sleep(ms: number): Promise<void> {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('runCMKInWatchMode', () => {
  test('reports system error occurs during watching', async () => {
    const fixturePath = join(process.cwd(), 'fixtures');
    const textFilePath = join(fixturePath, 'file.txt');

    // On macOS, chokidar may detect 'add' events for files added before watching starts.
    // To avoid test flakiness, wait for a short time before starting the watcher.
    await sleep(100);

    const { promise, resolve } = Promise.withResolvers<void>();
    chokidar
      .watch(fixturePath, { ignoreInitial: true })
      .on('change', (fileName) => {
        console.log('change event: ', fileName);
        if (fileName.endsWith('file.txt')) {
          globalThis.changeCount++;
        }
      })
      .on('raw', (eventName, fileName, details) => {
        console.log('raw event:', { fileName });
      })
      .on('ready', () => resolve());
    await promise;

    // Workaround for https://github.com/paulmillr/chokidar/issues/1443
    if (platform === 'darwin') {
      await sleep(100);
    }

    globalThis.changeCount = 0;

    console.log('update file');
    await writeFile(textFilePath, '1');
    await vi.waitFor(() => {
      assert(globalThis.changeCount === 1, `Expected changeCount to be 1, but got ${globalThis.changeCount}`);
    });

    console.log('update file');
    await writeFile(textFilePath, '2');
    await sleep(1000);
    assert(globalThis.changeCount === 2, `Expected changeCount to be 2, but got ${globalThis.changeCount}`);
  });
});
