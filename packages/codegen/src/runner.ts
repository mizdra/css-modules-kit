import { readFile, rm } from 'node:fs/promises';
import type {
  CMKConfig,
  CSSModule,
  Diagnostic,
  DiagnosticWithLocation,
  MatchesPattern,
  ParseCSSModuleResult,
  Resolver,
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
import ts from 'typescript';
import type { ParsedArgs } from './cli.js';
import { writeDtsFile } from './dts-writer.js';
import { ReadCSSModuleFileError } from './error.js';
import type { Logger } from './logger/logger.js';

/**
 * @throws {ReadCSSModuleFileError} When failed to read CSS Module file.
 */
async function parseCSSModuleByFileName(fileName: string, config: CMKConfig): Promise<ParseCSSModuleResult> {
  let text: string;
  try {
    text = await readFile(fileName, 'utf-8');
  } catch (error) {
    throw new ReadCSSModuleFileError(fileName, error);
  }
  return parseCSSModule(text, { fileName, safe: false, keyframes: config.keyframes });
}

/**
 * @throws {WriteDtsFileError}
 */
async function writeDtsByCSSModule(
  cssModule: CSSModule,
  { dtsOutDir, basePath, arbitraryExtensions, namedExports, prioritizeNamedImports }: CMKConfig,
  resolver: Resolver,
  matchesPattern: MatchesPattern,
): Promise<void> {
  const dts = createDts(
    cssModule,
    { resolver, matchesPattern },
    { namedExports, prioritizeNamedImports, forTsPlugin: false },
  );
  await writeDtsFile(dts.text, cssModule.fileName, {
    outDir: dtsOutDir,
    basePath,
    arbitraryExtensions,
  });
}

/**
 * Run css-modules-kit .d.ts generation.
 * @param project The absolute path to the project directory or the path to `tsconfig.json`.
 * @throws {ReadCSSModuleFileError} When failed to read CSS Module file.
 * @throws {WriteDtsFileError}
 */
export async function runCMK(args: ParsedArgs, logger: Logger): Promise<void> {
  const config = readConfigFile(args.project);
  if (config.diagnostics.length > 0) {
    logger.logDiagnostics(config.diagnostics);
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  }

  const getCanonicalFileName = (fileName: string) =>
    ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
  const moduleResolutionCache = ts.createModuleResolutionCache(
    config.basePath,
    getCanonicalFileName,
    config.compilerOptions,
  );
  const resolver = createResolver(config.compilerOptions, moduleResolutionCache);
  const matchesPattern = createMatchesPattern(config);

  const cssModuleMap = new Map<string, CSSModule>();
  const syntacticDiagnostics: DiagnosticWithLocation[] = [];

  const fileNames = getFileNamesByPattern(config);
  if (fileNames.length === 0) {
    logger.logDiagnostics([
      {
        category: 'warning',
        text: `The file specified in tsconfig.json not found.`,
      },
    ]);
    return;
  }
  const parseResults = await Promise.all(fileNames.map(async (fileName) => parseCSSModuleByFileName(fileName, config)));
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
  const semanticDiagnostics: Diagnostic[] = [];
  for (const { cssModule } of parseResults) {
    const diagnostics = checkCSSModule(cssModule, config, exportBuilder, matchesPattern, resolver, getCSSModule);
    semanticDiagnostics.push(...diagnostics);
  }

  if (semanticDiagnostics.length > 0) {
    logger.logDiagnostics(semanticDiagnostics);
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  }

  if (args.clean) {
    await rm(config.dtsOutDir, { recursive: true, force: true });
  }
  await Promise.all(
    parseResults.map(async (parseResult) =>
      writeDtsByCSSModule(parseResult.cssModule, config, resolver, matchesPattern),
    ),
  );
}
