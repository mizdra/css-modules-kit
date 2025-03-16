import ts from 'typescript';
import { TsConfigFileNotFoundError } from './error.js';
import { basename, dirname, join, resolve } from './path.js';
import type { SemanticDiagnostic } from './type.js';

// https://github.com/microsoft/TypeScript/blob/caf1aee269d1660b4d2a8b555c2d602c97cb28d7/src/compiler/commandLineParser.ts#L3006
const DEFAULT_INCLUDE_SPEC = '**/*';

type RemoveUndefined<T> = {
  [K in keyof T]: Exclude<T[K], undefined>;
};

/**
 * The config used by css-modules-kit.
 * This is normalized. Paths are resolved from relative to absolute, and default values are set for missing options.
 */
export interface CMKConfig {
  includes: string[];
  excludes: string[];
  dtsOutDir: string;
  arbitraryExtensions: boolean;
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
  /** The diagnostics that occurred while reading the config file. */
  diagnostics: SemanticDiagnostic[];
}

/**
 * The config loaded from `ts.ParsedCommandLine['raw']`.
 * This is unnormalized. Paths are relative, and some options may be omitted.
 */
interface UnnormalizedRawConfig {
  includes: string[] | undefined;
  excludes: string[] | undefined;
  dtsOutDir: string | undefined;
  arbitraryExtensions: boolean | undefined;
}

/**
 * The validated data of `ts.ParsedCommandLine['raw']`.
 */
interface ParsedRawData {
  config: UnnormalizedRawConfig;
  diagnostics: SemanticDiagnostic[];
}

export function findTsConfigFile(project: string): string | undefined {
  const configFile =
    ts.sys.directoryExists(project) ?
      ts.findConfigFile(project, ts.sys.fileExists.bind(ts.sys), 'tsconfig.json')
    : ts.findConfigFile(dirname(project), ts.sys.fileExists.bind(ts.sys), basename(project));
  if (!configFile) return undefined;
  return resolve(configFile);
}

function parseRawData(raw: unknown, tsConfigSourceFile: ts.TsConfigSourceFile): ParsedRawData {
  const result: ParsedRawData = {
    config: {
      includes: undefined,
      excludes: undefined,
      dtsOutDir: undefined,
      arbitraryExtensions: undefined,
    },
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
  }
  return result;
}
export { parseRawData as parseRawDataForTest };

function mergeParsedRawData(base: ParsedRawData, overrides: ParsedRawData): ParsedRawData {
  const result: ParsedRawData = { config: { ...base.config }, diagnostics: [...base.diagnostics] };
  if (overrides.config.includes !== undefined) result.config.includes = overrides.config.includes;
  if (overrides.config.excludes !== undefined) result.config.excludes = overrides.config.excludes;
  if (overrides.config.dtsOutDir !== undefined) result.config.dtsOutDir = overrides.config.dtsOutDir;
  if (overrides.config.arbitraryExtensions !== undefined)
    result.config.arbitraryExtensions = overrides.config.arbitraryExtensions;
  result.diagnostics.push(...overrides.diagnostics);
  return result;
}

/**
 * @throws {TsConfigFileNotFoundError}
 */
export function readTsConfigFile(project: string): {
  configFileName: string;
  config: UnnormalizedRawConfig;
  compilerOptions: ts.CompilerOptions;
  diagnostics: SemanticDiagnostic[];
} {
  const configFileName = findTsConfigFile(project);
  if (!configFileName) throw new TsConfigFileNotFoundError();

  const tsConfigSourceFile = ts.readJsonConfigFile(configFileName, ts.sys.readFile.bind(ts.sys));
  // MEMO: `tsConfigSourceFile.parseDiagnostics` (Internal API) contains a syntax error for `tsconfig.json`.
  // However, it is ignored so that ts-plugin will work even if `tsconfig.json` is somewhat broken.
  // Also, this error is reported to the user by `tsc` or `tsserver`.
  // We discard it since there is no need to report it from css-modules-kit.

  const parsedCommandLine = ts.parseJsonSourceFileConfigFileContent(
    tsConfigSourceFile,
    ts.sys,
    dirname(configFileName),
    undefined,
    configFileName,
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
  let parsedRawData = parseRawData(parsedCommandLine.raw, tsConfigSourceFile);

  // The options read from `parsedCommandLine.raw` do not inherit values from the file specified in `extends`.
  // So here we read the options from those files and merge them into `parsedRawData`.
  if (tsConfigSourceFile.extendedSourceFiles) {
    for (const extendedSourceFile of tsConfigSourceFile.extendedSourceFiles) {
      let base: ParsedRawData;
      try {
        base = readTsConfigFile(extendedSourceFile);
      } catch (error) {
        if (error instanceof TsConfigFileNotFoundError) continue;
        throw error;
      }
      parsedRawData = mergeParsedRawData(base, parsedRawData);
    }
  }

  return {
    configFileName,
    compilerOptions: parsedCommandLine.options,
    ...parsedRawData,
  };
}

/**
 * Normalize `UnnormalizedRawConfig`. Resolve relative paths to absolute paths, and set default values for missing options.
 * @param basePath A root directory to resolve relative path entries in the config file to.
 */
export function normalizeConfig(
  config: UnnormalizedRawConfig,
  basePath: string,
): RemoveUndefined<UnnormalizedRawConfig> {
  return {
    // If `include` is not specified, fallback to the default include spec.
    // ref: https://github.com/microsoft/TypeScript/blob/caf1aee269d1660b4d2a8b555c2d602c97cb28d7/src/compiler/commandLineParser.ts#L3102
    includes: (config.includes ?? [DEFAULT_INCLUDE_SPEC]).map((i) => join(basePath, i)),
    excludes: (config.excludes ?? []).map((e) => join(basePath, e)),
    dtsOutDir: join(basePath, config.dtsOutDir ?? 'generated'),
    arbitraryExtensions: config.arbitraryExtensions ?? false,
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
  const { configFileName, config, compilerOptions, diagnostics } = readTsConfigFile(project);
  const basePath = dirname(configFileName);
  return {
    ...normalizeConfig(config, basePath),
    basePath,
    configFileName,
    compilerOptions,
    diagnostics,
  };
}
