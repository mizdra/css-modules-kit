import type { AtRule, Node, Root, Rule } from 'postcss';
import { CssSyntaxError, parse } from 'postcss';
import safeParser from 'postcss-safe-parser';
import type {
  CSSModule,
  DiagnosticWithDetachedLocation,
  DiagnosticWithLocation,
  Token,
  TokenImporter,
} from '../type.js';
import { parseAtImport } from './at-import-parser.js';
import { parseAtValue } from './at-value-parser.js';
import { parseAtKeyframes } from './key-frame-parser.js';
import { parseRule } from './rule-parser.js';

type AtImport = AtRule & { name: 'import' };
type AtValue = AtRule & { name: 'value' };
type AtKeyframes = AtRule & { name: 'keyframes' };

function isAtRuleNode(node: Node): node is AtRule {
  return node.type === 'atrule';
}

function isAtImportNode(node: Node): node is AtImport {
  return isAtRuleNode(node) && node.name === 'import';
}

function isAtValueNode(node: Node): node is AtValue {
  return isAtRuleNode(node) && node.name === 'value';
}

function isAtKeyframesNode(node: Node): node is AtKeyframes {
  return isAtRuleNode(node) && node.name === 'keyframes';
}

function isRuleNode(node: Node): node is Rule {
  return node.type === 'rule';
}

/**
 * Collect tokens from the AST.
 */
function collectTokens(ast: Root, keyframes: boolean) {
  const allDiagnostics: DiagnosticWithDetachedLocation[] = [];
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
        localTokens.push({ name: atValue.name, loc: atValue.loc, declarationLoc: atValue.declarationLoc });
      } else if (atValue.type === 'valueImportDeclaration') {
        tokenImporters.push({ ...atValue, type: 'value' });
      }
    } else if (keyframes && isAtKeyframesNode(node)) {
      const { keyframe, diagnostics } = parseAtKeyframes(node);
      allDiagnostics.push(...diagnostics);
      if (keyframe) {
        localTokens.push({ name: keyframe.name, loc: keyframe.loc, declarationLoc: keyframe.declarationLoc });
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

export interface ParseCSSModuleOptions {
  fileName: string;
  /** Whether to include syntax errors from diagnostics */
  includeSyntaxError: boolean;
  keyframes: boolean;
}

export interface ParseCSSModuleResult {
  cssModule: CSSModule;
  diagnostics: DiagnosticWithLocation[];
}

/**
 * Parse CSS Module text.
 * If a syntax error is detected in the text, it is re-parsed using `postcss-safe-parser`, and `localTokens` are collected as much as possible.
 */
export function parseCSSModule(
  text: string,
  { fileName, includeSyntaxError, keyframes }: ParseCSSModuleOptions,
): ParseCSSModuleResult {
  let ast: Root;
  const diagnosticFile = { fileName, text };
  const allDiagnostics: DiagnosticWithLocation[] = [];
  if (includeSyntaxError) {
    try {
      ast = parse(text, { from: fileName });
    } catch (e) {
      if (!(e instanceof CssSyntaxError)) throw e;
      // If syntax error, try to parse with safe parser. While this incurs a cost
      // due to parsing the file twice, it rarely becomes an issue since files
      // with syntax errors are usually few in number.
      ast = safeParser(text, { from: fileName });
      const { line, column, endColumn } = e.input!;
      allDiagnostics.push({
        file: diagnosticFile,
        start: { line, column },
        length: endColumn !== undefined ? endColumn - column : 1,
        text: e.reason,
        category: 'error',
      });
    }
  } else {
    ast = safeParser(text, { from: fileName });
  }

  const { localTokens, tokenImporters, diagnostics } = collectTokens(ast, keyframes);
  const cssModule = {
    fileName,
    text,
    localTokens,
    tokenImporters,
  };
  allDiagnostics.push(...diagnostics.map((diagnostic) => ({ ...diagnostic, file: diagnosticFile })));
  return { cssModule, diagnostics: allDiagnostics };
}
