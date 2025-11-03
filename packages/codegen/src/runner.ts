import type { Stats } from 'node:fs';
import { rm } from 'node:fs/promises';
import chokidar, { type FSWatcher } from 'chokidar';
import type { Logger } from './logger/logger.js';
import { createProject } from './project.js';

interface RunnerArgs {
  project: string;
  clean: boolean;
}

interface Watcher {
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
    return false;
  }
  return true;
}

/**
 * Run css-modules-kit .d.ts generation in watch mode.
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
  for (const wildcardDirectory of project.config.wildcardDirectories) {
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
          awaitWriteFinish: true,
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
        .on('error', logger.logError.bind(logger)),
    );
  }

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
    logger.clearScreen();
    await project.emitDtsFiles();
    const diagnostics = project.getDiagnostics();
    if (diagnostics.length > 0) {
      logger.logDiagnostics(diagnostics);
    }
    logger.logMessage(
      `Found ${diagnostics.length} error${diagnostics.length === 1 ? '' : 's'}. Watching for file changes.`,
      { time: true },
    );
  }

  async function close() {
    await Promise.all(fsWatchers.map(async (watcher) => watcher.close()));
  }

  return { close };
}
