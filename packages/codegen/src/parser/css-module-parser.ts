import type { AtRule, Node, Root, Rule } from 'postcss';
import { parse } from 'postcss';
import { CSSModuleParseError } from '../error.js';
import { parseAtImport } from './at-import-parser.js';
import { parseAtValue } from './at-value-parser.js';
import { type Location } from './location.js';
import { parseRule } from './rule-parser.js';

type AtImport = AtRule & { name: 'import' };
type AtValue = AtRule & { name: 'value' };

function isAtRuleNode(node: Node): node is AtRule {
  return node.type === 'atrule';
}

function isAtImportNode(node: Node): node is AtImport {
  return isAtRuleNode(node) && node.name === 'import';
}

function isAtValueNode(node: Node): node is AtValue {
  return isAtRuleNode(node) && node.name === 'value';
}

function isRuleNode(node: Node): node is Rule {
  return node.type === 'rule';
}

/**
 * Collect tokens from the AST.
 * @throws {AtValueInvalidError}
 * @throws {ScopeError}
 */
function collectTokens(ast: Root) {
  const localTokens: Token[] = [];
  const tokenImporters: TokenImporter[] = [];
  ast.walk((node) => {
    if (isAtImportNode(node)) {
      const parsed = parseAtImport(node);
      if (parsed !== undefined) {
        tokenImporters.push({ type: 'import', ...parsed });
      }
    } else if (isAtValueNode(node)) {
      const parsed = parseAtValue(node);
      if (parsed.type === 'valueDeclaration') {
        localTokens.push({ name: parsed.name, loc: parsed.loc });
      } else if (parsed.type === 'valueImportDeclaration') {
        tokenImporters.push({ ...parsed, type: 'value' });
      }
    } else if (isRuleNode(node)) {
      const classSelectors = parseRule(node);
      for (const classSelector of classSelectors) {
        localTokens.push(classSelector);
      }
    }
  });
  return { localTokens, tokenImporters };
}

/** The item being exported from a CSS module file (a.k.a. token). */
export interface Token {
  /** The token name. */
  name: string;
  /** The location of the token in the source file. */
  loc: Location;
  /** The style definition of the token. */
  definition?: string;
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
   * This is a string before being resolved and surrounded by quotes.
   * @example `@import './a.module.css'` would have `from` as `"'./a.module.css'"`.
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
   * This is a string before being resolved and surrounded by quotes.
   * @example `@value a from './a.module.css'` would have `from` as `"'./a.module.css'"`.
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

export interface CSSModuleFile {
  /** Absolute path of the file */
  filename: string;
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

export interface ParseCSSModuleCodeOptions {
  filename: string;
  dashedIdents: boolean;
}

/**
 * @throws {CSSModuleParseError}
 * @throws {AtValueInvalidError}
 * @throws {ScopeError}
 */
export function parseCSSModuleCode(code: string, { filename }: ParseCSSModuleCodeOptions): CSSModuleFile {
  let ast: Root;
  try {
    ast = parse(code, { from: filename });
  } catch (e) {
    throw new CSSModuleParseError(filename, e);
  }
  const { localTokens, tokenImporters } = collectTokens(ast);
  return {
    filename,
    localTokens,
    tokenImporters,
  };
}
