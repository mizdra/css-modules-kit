import assert from 'node:assert';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { platform } from 'node:process';
import chokidar from 'chokidar';

async function sleep(ms: number): Promise<void> {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(fn: () => void) {
  return new Promise<void>((resolve, reject) => {
    let error: unknown = null;
    function runFn() {
      try {
        fn();
        clearInterval(intervalTimer);
        clearTimeout(timeoutTimer);
        resolve();
      } catch (e) {
        error = e;
      }
    }
    const intervalTimer = setInterval(() => {
      runFn();
    }, 50);
    const timeoutTimer = setTimeout(() => {
      clearInterval(intervalTimer);
      if (error) {
        reject(new Error('Timeout waiting for condition', { cause: error }));
      } else {
        reject(new Error('unreachable'));
      }
    }, 1000);
    runFn(); // First, execute immediately
  });
}

const fixturePath = join(process.cwd(), 'fixtures');
const textFilePath = join(fixturePath, 'file.txt');

// On macOS, chokidar may detect 'add' events for files added before watching starts.
// To avoid test flakiness, wait for a short time before starting the watcher.
await sleep(100);

const { promise, resolve } = Promise.withResolvers<void>();
const watcher = chokidar
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
await waitFor(() => {
  assert(globalThis.changeCount === 1, `Expected changeCount to be 1, but got ${globalThis.changeCount}`);
});

console.log('update file');
await writeFile(textFilePath, '2');
await sleep(1000);
assert(globalThis.changeCount === 2, `Expected changeCount to be 2, but got ${globalThis.changeCount}`);

await watcher.close();
