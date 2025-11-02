import ts from 'typescript';
import { TsConfigFileNotFoundError } from './error.js';
import { basename, dirname, join, resolve } from './path.js';
import type { Diagnostic } from './type.js';

// https://github.com/microsoft/TypeScript/blob/caf1aee269d1660b4d2a8b555c2d602c97cb28d7/src/compiler/commandLineParser.ts#L3006
const DEFAULT_INCLUDE_SPEC = '**/*';

/**
 * The config used by css-modules-kit.
 * This is normalized. Paths are resolved from relative to absolute, and default values are set for missing options.
 */
export interface CMKConfig {
  includes: string[];
  excludes: string[];
  dtsOutDir: string;
  arbitraryExtensions: boolean;
  namedExports: boolean;
  prioritizeNamedImports: boolean;
  keyframes: boolean;
  /**
   * A root directory to resolve relative path entries in the config file to.
   * This is an absolute path.
   *
   * This is also used to determine the output directory of the d.ts file.
   * For example, let’s say you have some input files:
   * ```
   * /app
   * ├── tsconfig.json
   * ├── src
   * │   ├── a.module.css
   * │   ├── b.module.css
   * │   ├── sub
   * │   │   ├── c.module.css
   * ```
   *
   * If you set `basePath` to `/app/src`, the output files will be:
   * ```
   * /app
   * ├── dist
   * │   ├── a.module.css.d.ts
   * │   ├── b.module.css.d.ts
   * │   ├── sub
   * │   │   ├── c.module.css.d.ts
   * ```
   *
   * If you set `basePath` to `/app`, the output files will be:
   * ```
   * /app
   * ├── dist
   * │   ├── src
   * │   │   ├── a.module.css.d.ts
   * │   │   ├── b.module.css.d.ts
   * │   │   ├── sub
   * │   │   │   ├── c.module.css.d.ts
   * ```
   */
  basePath: string;
  configFileName: string;
  compilerOptions: ts.CompilerOptions;
  /** The directories to watch when watch mode is enabled. */
  wildcardDirectories: { fileName: string; recursive: boolean }[];
  /** The diagnostics that occurred while reading the config file. */
  diagnostics: Diagnostic[];
}

/**
 * The config loaded from `ts.ParsedCommandLine['raw']`.
 * This is unnormalized. Paths are relative, and some options may be omitted.
 */
interface UnnormalizedRawConfig {
  includes?: string[];
  excludes?: string[];
  dtsOutDir?: string;
  arbitraryExtensions?: boolean;
  namedExports?: boolean;
  prioritizeNamedImports?: boolean;
  keyframes?: boolean;
}

/**
 * The validated data of `ts.ParsedCommandLine['raw']`.
 */
interface ParsedRawData {
  config: UnnormalizedRawConfig;
  diagnostics: Diagnostic[];
}

function findTsConfigFile(project: string): string | undefined {
  const configFile =
    ts.sys.directoryExists(project) ?
      ts.findConfigFile(project, ts.sys.fileExists.bind(ts.sys), 'tsconfig.json')
    : ts.findConfigFile(dirname(project), ts.sys.fileExists.bind(ts.sys), basename(project));
  if (!configFile) return undefined;
  return resolve(configFile);
}

function isTsConfigFileExists(fileName: string): boolean {
  return ts.findConfigFile(dirname(fileName), ts.sys.fileExists.bind(ts.sys), basename(fileName)) !== undefined;
}

function parseRawData(raw: unknown, tsConfigSourceFile: ts.TsConfigSourceFile): ParsedRawData {
  const result: ParsedRawData = {
    config: {},
    diagnostics: [],
  };
  if (typeof raw !== 'object' || raw === null) return result;

  // `tsConfigSourceFile.configFileSpecs` contains `includes` and `excludes`. However, it is an internal API.
  // So we collect `includes` and `excludes` from `parsedCommandLine.raw` without the internal API.

  if ('include' in raw) {
    if (Array.isArray(raw.include)) {
      const includes = raw.include.filter((i) => typeof i === 'string');
      result.config.includes = includes;
    }
    // MEMO: The errors for this option are reported by `tsc` or `tsserver`, so we don't need to report.
  }
  if ('exclude' in raw) {
    if (Array.isArray(raw.exclude)) {
      const excludes = raw.exclude.filter((e) => typeof e === 'string');
      result.config.excludes = excludes;
    }
    // MEMO: The errors for this option are reported by `tsc` or `tsserver`, so we don't need to report.
  }
  if ('cmkOptions' in raw && typeof raw.cmkOptions === 'object' && raw.cmkOptions !== null) {
    if ('dtsOutDir' in raw.cmkOptions) {
      if (typeof raw.cmkOptions.dtsOutDir === 'string') {
        result.config.dtsOutDir = raw.cmkOptions.dtsOutDir;
      } else {
        result.diagnostics.push({
          category: 'error',
          text: `\`dtsOutDir\` in ${tsConfigSourceFile.fileName} must be a string.`,
          // MEMO: Location information can be obtained from `tsConfigSourceFile.statements`, but this is complicated and will be omitted.
        });
      }
    }
    if ('arbitraryExtensions' in raw.cmkOptions) {
      if (typeof raw.cmkOptions.arbitraryExtensions === 'boolean') {
        result.config.arbitraryExtensions = raw.cmkOptions.arbitraryExtensions;
      } else {
        result.diagnostics.push({
          category: 'error',
          text: `\`arbitraryExtensions\` in ${tsConfigSourceFile.fileName} must be a boolean.`,
          // MEMO: Location information can be obtained from `tsConfigSourceFile.statements`, but this is complicated and will be omitted.
        });
      }
    }
    if ('keyframes' in raw.cmkOptions) {
      if (typeof raw.cmkOptions.keyframes === 'boolean') {
        result.config.keyframes = raw.cmkOptions.keyframes;
      } else {
        result.diagnostics.push({
          category: 'error',
          text: `\`keyframes\` in ${tsConfigSourceFile.fileName} must be a boolean.`,
        });
      }
    }
    if ('namedExports' in raw.cmkOptions) {
      if (typeof raw.cmkOptions.namedExports === 'boolean') {
        result.config.namedExports = raw.cmkOptions.namedExports;
      } else {
        result.diagnostics.push({
          category: 'error',
          text: `\`namedExports\` in ${tsConfigSourceFile.fileName} must be a boolean.`,
          // MEMO: Location information can be obtained from `tsConfigSourceFile.statements`, but this is complicated and will be omitted.
        });
      }
    }
    if ('prioritizeNamedImports' in raw.cmkOptions) {
      if (typeof raw.cmkOptions.prioritizeNamedImports === 'boolean') {
        result.config.prioritizeNamedImports = raw.cmkOptions.prioritizeNamedImports;
      } else {
        result.diagnostics.push({
          category: 'error',
          text: `\`prioritizeNamedImports\` in ${tsConfigSourceFile.fileName} must be a boolean.`,
          // MEMO: Location information can be obtained from `tsConfigSourceFile.statements`, but this is complicated and will be omitted.
        });
      }
    }
  }
  return result;
}

function parseTsConfigFile(fileName: string) {
  const tsConfigSourceFile = ts.readJsonConfigFile(fileName, ts.sys.readFile.bind(ts.sys));
  // MEMO: `tsConfigSourceFile.parseDiagnostics` (Internal API) contains a syntax error for `tsconfig.json`.
  // However, it is ignored so that ts-plugin will work even if `tsconfig.json` is somewhat broken.
  // Also, this error is reported to the user by `tsc` or `tsserver`.
  // We discard it since there is no need to report it from css-modules-kit.

  const parsedCommandLine = ts.parseJsonSourceFileConfigFileContent(
    tsConfigSourceFile,
    ts.sys,
    dirname(fileName),
    undefined,
    fileName,
    undefined,
    [
      {
        extension: 'css',
        isMixedContent: false,
        scriptKind: ts.ScriptKind.Deferred,
      },
    ],
  );
  // Read options from `parsedCommandLine.raw`
  const parsedRawData = parseRawData(parsedCommandLine.raw, tsConfigSourceFile);

  return {
    extendedSourceFiles: tsConfigSourceFile.extendedSourceFiles,
    compilerOptions: parsedCommandLine.options,
    wildcardDirectories: Object.entries(parsedCommandLine.wildcardDirectories ?? {}).map(([fileName, flags]) => ({
      fileName,
      recursive: (flags & ts.WatchDirectoryFlags.Recursive) !== 0,
    })),
    ...parsedRawData,
  };
}

/**
 * Reads the `tsconfig.json` file and returns the normalized config.
 * Even if the `tsconfig.json` file contains syntax or semantic errors,
 * this function attempts to parse as much as possible and still returns a valid config.
 *
 * @param project The absolute path to the project directory or the path to `tsconfig.json`.
 * @throws {TsConfigFileNotFoundError}
 */
export function readConfigFile(project: string): CMKConfig {
  const configFileName = findTsConfigFile(project);
  if (!configFileName) throw new TsConfigFileNotFoundError();

  const parsedTsConfig = parseTsConfigFile(configFileName);

  // The options read from `parsedCommandLine.raw` do not inherit values from the file specified in `extends`.
  // So here we read the options from those files and merge them into `parsedRawData`.
  if (parsedTsConfig.extendedSourceFiles) {
    for (const extendedSourceFile of parsedTsConfig.extendedSourceFiles) {
      if (isTsConfigFileExists(extendedSourceFile)) {
        const base = parseTsConfigFile(extendedSourceFile);
        parsedTsConfig.config = { ...base.config, ...parsedTsConfig.config };
        parsedTsConfig.diagnostics = [...base.diagnostics, ...parsedTsConfig.diagnostics];
      }
    }
  }

  const basePath = dirname(configFileName);
  return {
    // If `include` is not specified, fallback to the default include spec。
    // ref: https://github.com/microsoft/TypeScript/blob/caf1aee269d1660b4d2a8b555c2d602c97cb28d7/src/compiler/commandLineParser.ts#L3102
    includes: (parsedTsConfig.config.includes ?? [DEFAULT_INCLUDE_SPEC]).map((i) => join(basePath, i)),
    excludes: (parsedTsConfig.config.excludes ?? []).map((e) => join(basePath, e)),
    dtsOutDir: join(basePath, parsedTsConfig.config.dtsOutDir ?? 'generated'),
    arbitraryExtensions: parsedTsConfig.config.arbitraryExtensions ?? false,
    namedExports: parsedTsConfig.config.namedExports ?? false,
    prioritizeNamedImports: parsedTsConfig.config.prioritizeNamedImports ?? false,
    keyframes: parsedTsConfig.config.keyframes ?? true,
    basePath,
    configFileName,
    compilerOptions: parsedTsConfig.compilerOptions,
    wildcardDirectories: parsedTsConfig.wildcardDirectories,
    diagnostics: parsedTsConfig.diagnostics,
  };
}
