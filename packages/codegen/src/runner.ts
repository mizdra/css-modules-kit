import chokidar from 'chokidar';

/**
 * Run css-modules-kit .d.ts generation in watch mode.
 *
 * The promise resolves when the initial diagnostics report, emit, and watcher initialization are complete.
 * If an error occurs before the promise resolves, the promise will be rejected. If an error occurs
 * during file watching, the promise will not be rejected. Errors are reported through the logger.
 *
 * NOTE: For implementation simplicity, config file changes are not watched.
 * @param project The absolute path to the project directory or the path to `tsconfig.json`.
 * @throws {TsConfigFileNotFoundError}
 * @throws {ReadCSSModuleFileError}
 * @throws {WriteDtsFileError}
 * @throws {WatchInitializationError}
 */
export async function runCMKInWatchMode(rootDir: string): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  chokidar
    .watch(rootDir, { ignoreInitial: true })
    .on('change', (fileName) => {
      console.log('change event: ', fileName);
      if (fileName.endsWith('a.module.css')) {
        globalThis.changeCount++;
      }
    })
    .on('raw', (eventName, fileName, details) => {
      console.log('raw event:', { fileName });
    })
    .on('ready', () => resolve());
  await promise;
}
