import type { CSSModule } from '@css-modules-kit/core';

export interface ResolverOptions {
  /** The file that imports the specifier. It is a absolute path. */
  request: string;
}

/**
 * A resolver function that resolves import specifiers.
 * @param specifier The import specifier.
 * @param options The options.
 * @returns The resolved import specifier. It is a absolute path. If the import specifier cannot be resolved, return `undefined`.
 */
export type Resolver = (specifier: string, options: ResolverOptions) => string | undefined;

/**
 * A function that checks if a file name matches a pattern.
 * @param fileName The file name. It is an absolute path.
 * @returns `true` if the file name matches the pattern, otherwise `false`.
 */
export type MatchesPattern = (fileName: string) => boolean;

/** The export token record of a CSS module. */
export interface ExportRecord {
  /** The all exported tokens of the CSS module. */
  allTokens: string[];
}

export interface ExportBuilder {
  build(cssModule: CSSModule): ExportRecord;
  clearCache(): void;
}
