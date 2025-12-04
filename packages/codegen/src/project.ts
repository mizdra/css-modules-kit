import { readFileSync } from 'node:fs';
import type { CSSModule, Diagnostic } from '@css-modules-kit/core';
import {
  checkCSSModule,
  type CMKConfig,
  createExportBuilder,
  createMatchesPattern,
  createResolver,
  generateDts,
  getFileNamesByPattern,
  parseCSSModule,
  readConfigFile,
} from '@css-modules-kit/core';
import ts from 'typescript';
import { writeDtsFile } from './dts-writer.js';
import { ReadCSSModuleFileError } from './error.js';

interface ProjectArgs {
  project: string;
}

export interface Project {
  config: CMKConfig;
  /** Whether the file matches the wildcard patterns in `include` / `exclude` options */
  isWildcardMatchedFile(fileName: string): boolean;
  /**
   * Add a file to the project.
   * @throws {ReadCSSModuleFileError}
   */
  addFile(fileName: string): void;
  /**
   * Update a file in the project.
   * @throws {ReadCSSModuleFileError}
   */
  updateFile(fileName: string): void;
  /** Remove a file from the project. */
  removeFile(fileName: string): void;
  /**
   * Get all diagnostics.
   * Including three types of diagnostics: project diagnostics, syntactic diagnostics, and semantic diagnostics.
   * - Project diagnostics: For example, it includes configuration errors in tsconfig.json or warnings when there are no target files.
   * - Syntactic diagnostics: Syntax errors in CSS Module files.
   * - Semantic diagnostics: Errors related to the use of imports and exports in CSS module files.
   * If there are any project diagnostics or syntactic diagnostics, semantic diagnostics will be skipped.
   */
  getDiagnostics(): Diagnostic[];
  /**
   * Emit .d.ts files for all project files.
   * @throws {WriteDtsFileError}
   */
  emitDtsFiles(): Promise<void>;
}

/**
 * Create a Project instance.
 * Project is like a facade that calls core operations such as loading settings, parsing CSS Module files, and performing checks.
 * The parsing and checking results are cached, and methods are also provided to clear the cache when files change.
 * @throws {TsConfigFileNotFoundError}
 * @throws {ReadCSSModuleFileError}
 */
export function createProject(args: ProjectArgs): Project {
  const config = readConfigFile(args.project);

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
  const semanticDiagnosticsMap = new Map<string, Diagnostic[]>();
  // Tracks whether .d.ts has been emitted after the last change
  const emittedSet = new Set<string>();
  const getCSSModule = (path: string) => cssModuleMap.get(path);
  const exportBuilder = createExportBuilder({ getCSSModule, matchesPattern, resolver });

  for (const fileName of getFileNamesByPattern(config)) {
    // NOTE: Files may be deleted between executing `getFileNamesByPattern` and `tryParseCSSModule`.
    // Therefore, `tryParseCSSModule` may return `undefined`.
    const cssModule = tryParseCSSModule(fileName);
    if (cssModule) cssModuleMap.set(fileName, cssModule);
  }

  /**
   * @throws {ReadCSSModuleFileError}
   */
  function addFile(fileName: string) {
    if (cssModuleMap.has(fileName)) return;

    const cssModule = tryParseCSSModule(fileName);
    if (!cssModule) return;
    cssModuleMap.set(fileName, cssModule);

    // TODO: Delete only the minimum amount of check stage cache
    moduleResolutionCache.clear();
    exportBuilder.clearCache();
    semanticDiagnosticsMap.clear();
  }

  /**
   * @throws {ReadCSSModuleFileError}
   */
  function updateFile(fileName: string) {
    if (!cssModuleMap.has(fileName)) return;

    const cssModule = tryParseCSSModule(fileName);
    if (!cssModule) return;
    cssModuleMap.set(fileName, cssModule);

    // TODO: Delete only the minimum amount of check stage cache
    exportBuilder.clearCache();
    semanticDiagnosticsMap.clear();

    emittedSet.delete(fileName);
  }

  function removeFile(fileName: string) {
    if (!cssModuleMap.has(fileName)) return;

    cssModuleMap.delete(fileName);

    // TODO: Delete only the minimum amount of check stage cache
    moduleResolutionCache.clear();
    exportBuilder.clearCache();
    semanticDiagnosticsMap.clear();

    emittedSet.delete(fileName);
  }

  /**
   * @throws {ReadCSSModuleFileError}
   */
  function tryParseCSSModule(fileName: string): CSSModule | undefined {
    let text: string;
    try {
      // NOTE: We are not using asynchronous APIs for the following reasons:
      //
      // - Asynchronous APIs are slow in Node.js.
      //   - https://github.com/nodejs/performance/issues/151
      // - Handling race conditions is cumbersome.
      //   - Using an asynchronous API makes `addFile` asynchronous too.
      //   - If `deleteFile` runs while `addFile` is executing, a race condition occurs.
      //   - Avoiding this requires something like a mutex. However, implementing that is cumbersome.
      text = readFileSync(fileName, 'utf-8');
    } catch (error) {
      if (isNodeJSSystemError(error) && error.code === 'ENOENT') {
        return undefined;
      }
      throw new ReadCSSModuleFileError(fileName, error);
    }
    return parseCSSModule(text, { fileName, includeSyntaxError: true, keyframes: config.keyframes });
  }

  function getDiagnostics(): Diagnostic[] {
    const diagnostics: Diagnostic[] = [...getProjectDiagnostics(), ...getSyntacticDiagnostics()];
    // If there are project or syntactic diagnostics, skip semantic diagnostics
    if (diagnostics.length > 0) return diagnostics;
    diagnostics.push(...getSemanticDiagnostics());
    return diagnostics;
  }

  function getProjectDiagnostics() {
    const diagnostics: Diagnostic[] = [];
    diagnostics.push(...config.diagnostics);
    if (cssModuleMap.size === 0) {
      diagnostics.push({
        category: 'error',
        text: `The file specified in tsconfig.json not found.`,
      });
    }
    return diagnostics;
  }

  function getSyntacticDiagnostics() {
    return Array.from(cssModuleMap.values()).flatMap(({ diagnostics }) => diagnostics);
  }

  function getSemanticDiagnostics() {
    const allDiagnostics: Diagnostic[] = [];
    for (const cssModule of cssModuleMap.values()) {
      let diagnostics = semanticDiagnosticsMap.get(cssModule.fileName);
      if (!diagnostics) {
        diagnostics = checkCSSModule(cssModule, config, exportBuilder, matchesPattern, resolver, getCSSModule);
        semanticDiagnosticsMap.set(cssModule.fileName, diagnostics);
      }
      allDiagnostics.push(...diagnostics);
    }
    return allDiagnostics;
  }

  /**
   * @throws {WriteDtsFileError}
   */
  async function emitDtsFiles(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const cssModule of cssModuleMap.values()) {
      if (emittedSet.has(cssModule.fileName)) continue;
      const dts = generateDts(cssModule, { resolver, matchesPattern }, { ...config, forTsPlugin: false });
      promises.push(
        writeDtsFile(dts.text, cssModule.fileName, {
          outDir: config.dtsOutDir,
          basePath: config.basePath,
          arbitraryExtensions: config.arbitraryExtensions,
        }).then(() => {
          emittedSet.add(cssModule.fileName);
        }),
      );
    }
    await Promise.all(promises);
  }

  return {
    config,
    isWildcardMatchedFile: (fileName) => matchesPattern(fileName),
    addFile,
    updateFile,
    removeFile,
    getDiagnostics,
    emitDtsFiles,
  };
}

function isNodeJSSystemError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string';
}
