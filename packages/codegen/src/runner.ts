import { readFile } from 'node:fs/promises';
import type {
  CMKConfig,
  CSSModule,
  MatchesPattern,
  ParseCSSModuleResult,
  Resolver,
  SemanticDiagnostic,
  SyntacticDiagnostic,
} from '@css-modules-kit/core';
import {
  checkCSSModule,
  createDts,
  createExportBuilder,
  createMatchesPattern,
  createResolver,
  getFileNamesByPattern,
  parseCSSModule,
  readConfigFile,
} from '@css-modules-kit/core';
import { writeDtsFile } from './dts-writer.js';
import { ReadCSSModuleFileError } from './error.js';
import type { Logger } from './logger/logger.js';

/**
 * @throws {ReadCSSModuleFileError} When failed to read CSS Module file.
 */
async function parseCSSModuleByFileName(fileName: string): Promise<ParseCSSModuleResult> {
  let text: string;
  try {
    text = await readFile(fileName, 'utf-8');
  } catch (error) {
    throw new ReadCSSModuleFileError(fileName, error);
  }
  return parseCSSModule(text, { fileName, safe: false });
}

/**
 * @throws {WriteDtsFileError}
 */
async function writeDtsByCSSModule(
  cssModule: CSSModule,
  { dtsOutDir, basePath, arbitraryExtensions }: CMKConfig,
  resolver: Resolver,
  matchesPattern: MatchesPattern,
): Promise<void> {
  const dts = createDts(cssModule, { resolver, matchesPattern });
  await writeDtsFile(dts.text, cssModule.fileName, {
    outDir: dtsOutDir,
    basePath,
    arbitraryExtensions,
  });
}

/**
 * Run css-modules-kit .d.ts generation.
 * @param project The absolute path to the project directory or the path to `tsconfig.json`.
 * @throws {GlobError} When failed to retrieve files by glob pattern.
 * @throws {ReadCSSModuleFileError} When failed to read CSS Module file.
 * @throws {WriteDtsFileError}
 */
export async function runCMK(project: string, logger: Logger): Promise<void> {
  const config = readConfigFile(project);
  if (config.diagnostics.length > 0) {
    logger.logDiagnostics(config.diagnostics);
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  }

  const resolver = createResolver(config.paths, config.resolvePackageJsonImports);
  const matchesPattern = createMatchesPattern(config);

  const cssModuleMap = new Map<string, CSSModule>();
  const syntacticDiagnostics: SyntacticDiagnostic[] = [];

  const fileNames = getFileNamesByPattern(config);
  if (fileNames.length === 0) {
    logger.logDiagnostics([
      {
        type: 'semantic',
        category: 'warning',
        text: `The file specified in tsconfig.json not found.`,
      },
    ]);
    return;
  }
  const parseResults = await Promise.all(fileNames.map(async (fileName) => parseCSSModuleByFileName(fileName)));
  for (const parseResult of parseResults) {
    cssModuleMap.set(parseResult.cssModule.fileName, parseResult.cssModule);
    syntacticDiagnostics.push(...parseResult.diagnostics);
  }

  if (syntacticDiagnostics.length > 0) {
    logger.logDiagnostics(syntacticDiagnostics);
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  }

  const getCSSModule = (path: string) => cssModuleMap.get(path);
  const exportBuilder = createExportBuilder({ getCSSModule, matchesPattern, resolver });
  const semanticDiagnostics: SemanticDiagnostic[] = [];
  for (const { cssModule } of parseResults) {
    const diagnostics = checkCSSModule(cssModule, exportBuilder, matchesPattern, resolver, getCSSModule);
    semanticDiagnostics.push(...diagnostics);
  }

  if (semanticDiagnostics.length > 0) {
    logger.logDiagnostics(semanticDiagnostics);
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  }

  await Promise.all(
    parseResults.map(async (parseResult) =>
      writeDtsByCSSModule(parseResult.cssModule, config, resolver, matchesPattern),
    ),
  );
}
