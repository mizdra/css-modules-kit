import { rm } from 'node:fs/promises';
import type { Logger } from './logger/logger.js';
import { createProject } from './project.js';

interface RunnerArgs {
  project: string;
  clean: boolean;
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
