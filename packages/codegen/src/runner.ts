import type { Stats } from 'node:fs';
import { rm } from 'node:fs/promises';
import chokidar, { type FSWatcher } from 'chokidar';
import type { Logger } from './logger/logger.js';
import { createProject, type Project } from './project.js';

interface RunnerArgs {
  project: string;
  clean: boolean;
  preserveWatchOutput: boolean;
}

export interface Watcher {
  /** Exported for testing purposes */
  project: Project;
  close(): Promise<void>;
}

/**
 * Run css-modules-kit .d.ts generation.
 * @param project The absolute path to the project directory or the path to `tsconfig.json`.
 * @throws {ReadCSSModuleFileError} When failed to read CSS Module file.
 * @throws {WriteDtsFileError}
 * @returns Whether the process succeeded without errors.
 */
export async function runCMK(args: RunnerArgs, logger: Logger): Promise<boolean> {
  const project = createProject(args);
  if (args.clean) {
    await rm(project.config.dtsOutDir, { recursive: true, force: true });
  }
  await project.emitDtsFiles();
  const diagnostics = project.getDiagnostics();
  if (diagnostics.length > 0) {
    logger.logDiagnostics(diagnostics);
    const hasErrors = diagnostics.some((d) => d.category === 'error');
    return !hasErrors;
  }
  return true;
}

/**
 * Run css-modules-kit .d.ts generation in watch mode.
 *
 * The promise resolves when the initial diagnostics report, emit, and watcher initialization are complete.
 * Errors are reported through the logger.
 *
 * NOTE: For implementation simplicity, config file changes are not watched.
 * @param project The absolute path to the project directory or the path to `tsconfig.json`.
 * @throws {TsConfigFileNotFoundError}
 * @throws {ReadCSSModuleFileError}
 * @throws {WriteDtsFileError}
 */
export async function runCMKInWatchMode(args: RunnerArgs, logger: Logger): Promise<Watcher> {
  const fsWatchers: FSWatcher[] = [];
  const project = createProject(args);
  let emitAndReportDiagnosticsTimer: NodeJS.Timeout | undefined = undefined;

  if (args.clean) {
    await rm(project.config.dtsOutDir, { recursive: true, force: true });
  }
  await emitAndReportDiagnostics();

  // Watch project files and report diagnostics on changes
  const readyPromises: Promise<void>[] = [];
  for (const wildcardDirectory of project.config.wildcardDirectories) {
    const { promise, resolve } = promiseWithResolvers<void>();
    readyPromises.push(promise);
    fsWatchers.push(
      chokidar
        .watch(wildcardDirectory.fileName, {
          ignored: (fileName: string, stats?: Stats) => {
            // The ignored function is called twice for the same path. The first time with stats undefined,
            // and the second time with stats provided.
            // In the first call, we can't determine if the path is a directory or file.
            // So we include it in the watch target considering it might be a directory.
            if (!stats) return false;

            // In the second call, we include directories or files that match wildcards in the watch target.
            // However, `dtsOutDir` is excluded from the watch target.
            if (stats.isDirectory()) {
              return fileName === project.config.dtsOutDir;
            } else {
              return !project.isWildcardMatchedFile(fileName);
            }
          },
          ignoreInitial: true,
          ...(wildcardDirectory.recursive ? {} : { depth: 0 }),
        })
        .on('add', (fileName) => {
          try {
            project.addFile(fileName);
          } catch (e) {
            logger.logError(e);
            return;
          }
          scheduleEmitAndReportDiagnostics();
        })
        .on('change', (fileName) => {
          try {
            project.updateFile(fileName);
          } catch (e) {
            logger.logError(e);
            return;
          }
          scheduleEmitAndReportDiagnostics();
        })
        .on('unlink', (fileName: string) => {
          project.removeFile(fileName);
          scheduleEmitAndReportDiagnostics();
        })
        .on('error', (e) => logger.logError(e))
        .on('ready', () => resolve()),
    );
  }
  await Promise.all(readyPromises);

  function scheduleEmitAndReportDiagnostics() {
    // Switching between git branches results in numerous file changes occurring rapidly.
    // Reporting diagnostics for each file change would overwhelm users.
    // Therefore, we batch the processing.

    if (emitAndReportDiagnosticsTimer !== undefined) clearTimeout(emitAndReportDiagnosticsTimer);

    emitAndReportDiagnosticsTimer = setTimeout(() => {
      emitAndReportDiagnosticsTimer = undefined;
      emitAndReportDiagnostics().catch(logger.logError.bind(logger));
    }, 250);
  }

  /**
   * @throws {WriteDtsFileError}
   */
  async function emitAndReportDiagnostics() {
    if (!args.preserveWatchOutput) {
      logger.clearScreen();
    }
    await project.emitDtsFiles();
    const diagnostics = project.getDiagnostics();
    if (diagnostics.length > 0) {
      logger.logDiagnostics(diagnostics);
    }
    const errorCount = diagnostics.filter((d) => d.category === 'error').length;
    const warningCount = diagnostics.filter((d) => d.category === 'warning').length;
    const warningPart = warningCount > 0 ? ` and ${warningCount} warning${warningCount === 1 ? '' : 's'}` : '';
    logger.logMessage(
      `Found ${errorCount} error${errorCount === 1 ? '' : 's'}${warningPart}. Watching for file changes.`,
      { time: true },
    );
    if (args.preserveWatchOutput) {
      logger.logMessage('');
    }
  }

  async function close() {
    await Promise.all(fsWatchers.map(async (watcher) => watcher.close()));
  }

  return { project, close };
}

function promiseWithResolvers<T>() {
  let resolve;
  let reject;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {
    promise,
    resolve: resolve as unknown as (value: T) => void,
    reject: reject as unknown as (reason?: unknown) => void,
  };
}
