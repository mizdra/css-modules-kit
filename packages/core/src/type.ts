/** The position of the node in the source file. */
export interface Position {
  /**
   * The line number in the source file. It is 1-based.
   * This is compatible with postcss and tsserver.
   */
  line: number;
  /**
   * The column number in the source file. It is 1-based.
   * This is compatible with postcss and tsserver.
   */
  column: number;
  /** The offset in the source file. It is 0-based. */
  offset: number;
}

/** The location of the node in the source file. */
export interface Location {
  /**
   * The starting position of the node. It is inclusive.
   * This is compatible with postcss and tsserver.
   */
  start: Position;
  /**
   * The ending position of the node. It is exclusive.
   * This is compatible with tsserver, but not postcss.
   */
  end: Position;
}

/** The item being exported from a CSS module file (a.k.a. token). */
export interface Token {
  /** The token name. */
  name: string;
  /** The location of the token in the source file. */
  loc: Location;
  /** The location of the declaration of the token in the source file. */
  declarationLoc?: Location;
}

/**
 * A token importer using `@import '...'`.
 * `@import` imports all tokens from the file. Therefore, it does not have
 * the name of the imported token unlike {@link AtValueTokenImporter}.
 */
export interface AtImportTokenImporter {
  type: 'import';
  /**
   * The specifier of the file from which the token is imported.
   * This is a string before being resolved and unquoted.
   * @example `@import './a.module.css'` would have `from` as `'./a.module.css'`.
   */
  from: string;
  /** The location of the `from` in *.module.css file. */
  fromLoc: Location;
}

/** A token importer using `@value ... from '...'`. */
export interface AtValueTokenImporter {
  type: 'value';
  /** The values imported from the file. */
  values: AtValueTokenImporterValue[];
  /**
   * The specifier of the file from which the token is imported.
   * This is a string before being resolved and unquoted.
   * @example `@value a from './a.module.css'` would have `from` as `'./a.module.css'`.
   */
  from: string;
  /** The location of the `from` in *.module.css file. */
  fromLoc: Location;
}

/** A value imported from a CSS module file using `@value ... from '...'`. */
export interface AtValueTokenImporterValue {
  /**
   * The name of the token in the file from which it is imported.
   * @example `@value a from './a.module.css'` would have `name` as `'a'`.
   * @example `@value a as b from './a.module.css'` would have `name` as `'a'`.
   */
  name: string;
  /** The location of the `name` in *.module.css file. */
  loc: Location;
  /**
   * The name of the token in the current file.
   * @example `@value a from './a.module.css'` would not have `localName`.
   * @example `@value a as b from './a.module.css'` would have `localName` as `'b'`.
   */
  localName?: string;
  /**
   * The location of the `localName` in *.module.css file.
   * This is `undefined` when `localName` is `undefined`.
   */
  localLoc?: Location;
}

export type TokenImporter = AtImportTokenImporter | AtValueTokenImporter;

export interface CSSModule {
  /** Absolute path of the file */
  fileName: string;
  /** The content of the file */
  text: string;
  /**
   * List of token names defined in the file.
   * @example
   * Consider the following file:
   * ```css
   * .foo { color: red }
   * .bar, .baz { color: red }
   * ```
   * The `localTokens` for this file would be `['foo', 'bar', 'baz']`.
   */
  localTokens: Token[];
  /**
   * List of token importers in the file.
   * Token importer is a statement that imports tokens from another file.
   */
  tokenImporters: TokenImporter[];
}

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

export type DiagnosticCategory = 'error';

export interface DiagnosticSourceFile {
  fileName: string;
  text: string;
}

export interface DiagnosticPosition {
  /** The line number in the source file. It is 1-based. */
  line: number;
  /** The column number in the source file. It is 1-based. */
  column: number;
}

interface DiagnosticWithoutLocation {
  /** Text of diagnostic message. */
  text: string;
  /** The category of the diagnostic message. */
  category: DiagnosticCategory;
}

export interface DiagnosticWithLocation extends DiagnosticWithoutLocation {
  /** The file in which the diagnostic occurred */
  file: DiagnosticSourceFile;
  /** Starting file position at which text applies. It is inclusive. */
  start: DiagnosticPosition;
  /** Length of the diagnostic. */
  length: number;
}

export type Diagnostic = DiagnosticWithLocation | DiagnosticWithoutLocation;

/**
 * A diagnostic with location information detached from the source file.
 * It is an intermediate representation used inside the CSS Module parser.
 */
export interface DiagnosticWithDetachedLocation extends DiagnosticWithoutLocation {
  /** Starting file position at which text applies. It is inclusive. */
  start: DiagnosticPosition;
  /** Length of the diagnostic. */
  length: number;
}
