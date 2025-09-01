import { readFile, rm } from 'node:fs/promises';
import type {
  CMKConfig,
  CSSModule,
  Diagnostic,
  DiagnosticWithLocation,
  MatchesPattern,
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
import { CreateProjectError, ReadCSSModuleFileError } from './error.js';
import type { Logger } from './logger/logger.js';

interface Project {
  config: CMKConfig;
  /**
   * Emit all .d.ts files.
   * @returns Whether all .d.ts files were emitted without diagnostics.
   * @throws {ReadCSSModuleFileError}
   * @throws {WriteDtsFileError}
   */
  emitAllDtsFiles: () => Promise<boolean>;
}

/**
 * @throws {CreateProjectError}
 */
export function createProject(args: ParsedArgs, logger: Logger): Project {
  const config = readConfigFile(args.project);
  if (config.diagnostics.length > 0) {
    logger.logDiagnostics(config.diagnostics);
    throw new CreateProjectError();
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

  const cssModuleCache = new Map<string, CSSModule>();
  const getCSSModule = (path: string) => cssModuleCache.get(path);
  const exportBuilder = createExportBuilder({ getCSSModule, matchesPattern, resolver });

  /**
   *
   * @throws {ReadCSSModuleFileError}
   */
  async function parseCSSModulesAndUpdateCache(fileNames: string[]): Promise<DiagnosticWithLocation[]> {
    const syntacticDiagnostics: DiagnosticWithLocation[] = [];
    const parseResults = await Promise.all(
      fileNames.map(async (fileName) =>
        readFile(fileName, 'utf-8')
          .catch((error) => {
            throw new ReadCSSModuleFileError(fileName, error);
          })
          .then((text) => parseCSSModule(text, { fileName, safe: false })),
      ),
    );
    for (const parseResult of parseResults) {
      cssModuleCache.set(parseResult.cssModule.fileName, parseResult.cssModule);
      syntacticDiagnostics.push(...parseResult.diagnostics);
    }
    return syntacticDiagnostics;
  }

  async function emitAllDtsFiles(): Promise<boolean> {
    const fileNames = getFileNamesByPattern(config);
    if (fileNames.length === 0) {
      logger.logDiagnostics([{ category: 'warning', text: `The file specified in tsconfig.json not found.` }]);
    }
    const syntacticDiagnostics = await parseCSSModulesAndUpdateCache(fileNames);
    if (syntacticDiagnostics.length > 0) {
      logger.logDiagnostics(syntacticDiagnostics);
      return false;
    }

    const cssModules = cssModuleCache.values();
    const semanticDiagnostics: Diagnostic[] = [];
    for (const cssModule of cssModules) {
      const diagnostics = checkCSSModule(cssModule, config, exportBuilder, matchesPattern, resolver, getCSSModule);
      semanticDiagnostics.push(...diagnostics);
    }
    if (semanticDiagnostics.length > 0) {
      logger.logDiagnostics(semanticDiagnostics);
      return false;
    }

    if (args.clean) {
      await rm(config.dtsOutDir, { recursive: true, force: true });
    }
    await writeDtsFiles(cssModules, config, resolver, matchesPattern);
    return true;
  }

  return {
    config,
    emitAllDtsFiles,
  };
}

/**
 * @throws {WriteDtsFileError}
 */
async function writeDtsFiles(
  cssModules: MapIterator<CSSModule>,
  { dtsOutDir, basePath, arbitraryExtensions, namedExports, prioritizeNamedImports }: CMKConfig,
  resolver: Resolver,
  matchesPattern: MatchesPattern,
): Promise<void> {
  await Promise.all(
    cssModules.map(async (cssModule) => {
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
    }),
  );
}
