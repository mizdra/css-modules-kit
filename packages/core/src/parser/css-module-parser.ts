import type { AtRule, Node, Root, Rule } from 'postcss';
import { CssSyntaxError, parse } from 'postcss';
import safeParser from 'postcss-safe-parser';
import type { Location, SyntacticDiagnostic } from '../type.js';
import { parseAtImport } from './at-import-parser.js';
import { parseAtValue } from './at-value-parser.js';
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
 */
function collectTokens(ast: Root) {
  const allDiagnostics: SyntacticDiagnostic[] = [];
  const localTokens: Token[] = [];
  const tokenImporters: TokenImporter[] = [];
  ast.walk((node) => {
    if (isAtImportNode(node)) {
      const parsed = parseAtImport(node);
      if (parsed !== undefined) {
        tokenImporters.push({ type: 'import', ...parsed });
      }
    } else if (isAtValueNode(node)) {
      const { atValue, diagnostics } = parseAtValue(node);
      allDiagnostics.push(...diagnostics);
      if (atValue === undefined) return;
      if (atValue.type === 'valueDeclaration') {
        localTokens.push({ name: atValue.name, loc: atValue.loc });
      } else if (atValue.type === 'valueImportDeclaration') {
        tokenImporters.push({ ...atValue, type: 'value' });
      }
    } else if (isRuleNode(node)) {
      const { classSelectors, diagnostics } = parseRule(node);
      allDiagnostics.push(...diagnostics);
      for (const classSelector of classSelectors) {
        localTokens.push(classSelector);
      }
    }
  });
  return { localTokens, tokenImporters, diagnostics: allDiagnostics };
}

/** The item being exported from a CSS module file (a.k.a. token). */
export interface Token {
  /** The token name. */
  name: string;
  /** The location of the token in the source file. */
  loc: Location;
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

export interface ParseCSSModuleOptions {
  fileName: string;
  safe: boolean;
}

export interface ParseCSSModuleResult {
  cssModule: CSSModule;
  diagnostics: SyntacticDiagnostic[];
}

export function parseCSSModule(text: string, { fileName, safe }: ParseCSSModuleOptions): ParseCSSModuleResult {
  let ast: Root;
  try {
    const parser = safe ? safeParser : parse;
    ast = parser(text, { from: fileName });
  } catch (e) {
    if (e instanceof CssSyntaxError) {
      const start = { line: e.line ?? 1, column: e.column ?? 1 };
      return {
        cssModule: { fileName, text, localTokens: [], tokenImporters: [] },
        diagnostics: [
          {
            fileName,
            start,
            ...(e.endLine !== undefined &&
              e.endColumn !== undefined && {
                end: { line: e.endLine, column: e.endColumn },
              }),
            text: e.reason,
            category: 'error',
          },
        ],
      };
    }
    throw e;
  }
  const { localTokens, tokenImporters, diagnostics } = collectTokens(ast);
  const cssModule = {
    fileName,
    text,
    localTokens,
    tokenImporters,
  };
  return { cssModule, diagnostics };
}
