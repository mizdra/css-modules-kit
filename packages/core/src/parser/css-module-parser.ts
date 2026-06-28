import type { AtRule, Declaration, Node, Root, Rule } from 'postcss';
import { CssSyntaxError, parse } from 'postcss';
import safeParser from 'postcss-safe-parser';
import type {
  CSSModule,
  DiagnosticWithDetachedLocation,
  DiagnosticWithLocation,
  Token,
  TokenImporter,
  TokenReference,
} from '../type.js';
import {
  isAnimationNameProp,
  isAnimationProp,
  parseAnimationNameProp,
  parseAnimationProp,
} from './animation-parser.js';
import { parseImportAtRule } from './at-import-parser.js';
import { parseValueAtRule } from './at-value-parser.js';
import { isComposesProp, parseComposesProp } from './composes-parser.js';
import {
  isContainerAtRuleName,
  isDashedIdentAtRuleName,
  isMediaAtRuleName,
  parseDashedIdentAtRule,
  parseDashedIdentContainerQuery,
  parseDashedIdentDecl,
  parseDashedIdentMediaQuery,
} from './dashed-ident-parser.js';
import { parseKeyframesAtRule } from './key-frame-parser.js';
import { parseRule } from './rule-parser.js';

function isAtRule(node: Node): node is AtRule {
  return node.type === 'atrule';
}

function isImportAtRuleName(name: string): boolean {
  return name === 'import';
}

function isValueAtRuleName(name: string): boolean {
  return name === 'value';
}

function isKeyframesAtRuleName(name: string): boolean {
  return name === 'keyframes';
}

function isRule(node: Node): node is Rule {
  return node.type === 'rule';
}

function isDeclaration(node: Node): node is Declaration {
  return node.type === 'decl';
}

/**
 * Collect tokens from the AST.
 */
function collectTokens(ast: Root, keyframes: boolean, dashedIdents: boolean) {
  const allDiagnostics: DiagnosticWithDetachedLocation[] = [];
  const localTokens: Token[] = [];
  const tokenImporters: TokenImporter[] = [];
  const tokenReferences: TokenReference[] = [];
  ast.walk((node) => {
    if (dashedIdents && isAtRule(node) && isDashedIdentAtRuleName(node.name)) {
      const { token, diagnostics } = parseDashedIdentAtRule(node);
      allDiagnostics.push(...diagnostics);
      if (token) localTokens.push(token);
    } else if (dashedIdents && isAtRule(node) && isMediaAtRuleName(node.name)) {
      tokenReferences.push(...parseDashedIdentMediaQuery(node));
    } else if (dashedIdents && isAtRule(node) && isContainerAtRuleName(node.name)) {
      tokenReferences.push(...parseDashedIdentContainerQuery(node));
    } else if (isAtRule(node) && isImportAtRuleName(node.name)) {
      const parsed = parseImportAtRule(node);
      if (parsed !== undefined) {
        tokenImporters.push({ type: 'all', ...parsed });
      }
    } else if (isAtRule(node) && isValueAtRuleName(node.name)) {
      const { atValue, diagnostics } = parseValueAtRule(node);
      allDiagnostics.push(...diagnostics);
      if (atValue === undefined) return;
      if (atValue.type === 'declaration') {
        localTokens.push({ name: atValue.name, loc: atValue.loc, declarationLoc: atValue.declarationLoc });
      } else if (atValue.type === 'importer') {
        const { type: _, ...rest } = atValue;
        tokenImporters.push({ ...rest, type: 'named' });
      }
    } else if (keyframes && isAtRule(node) && isKeyframesAtRuleName(node.name)) {
      const { keyframe, diagnostics } = parseKeyframesAtRule(node);
      allDiagnostics.push(...diagnostics);
      if (keyframe) {
        localTokens.push({ name: keyframe.name, loc: keyframe.loc, declarationLoc: keyframe.declarationLoc });
      }
    } else if (isRule(node)) {
      const { classSelectors, diagnostics } = parseRule(node);
      allDiagnostics.push(...diagnostics);
      for (const classSelector of classSelectors) {
        localTokens.push(classSelector);
      }
    } else if (keyframes && isDeclaration(node) && isAnimationNameProp(node.prop)) {
      const { references, diagnostics } = parseAnimationNameProp(node);
      allDiagnostics.push(...diagnostics);
      tokenReferences.push(...references);
    } else if (keyframes && isDeclaration(node) && isAnimationProp(node.prop)) {
      const { references, diagnostics } = parseAnimationProp(node);
      allDiagnostics.push(...diagnostics);
      tokenReferences.push(...references);
    } else if (isDeclaration(node) && isComposesProp(node.prop)) {
      tokenReferences.push(...parseComposesProp(node));
    } else if (dashedIdents && isDeclaration(node)) {
      const { localTokens: tokens, references } = parseDashedIdentDecl(node);
      localTokens.push(...tokens);
      tokenReferences.push(...references);
    }
  });
  return { localTokens, tokenImporters, tokenReferences, diagnostics: allDiagnostics };
}

export interface ParseCSSModuleOptions {
  fileName: string;
  /** Whether to include syntax errors from diagnostics */
  includeSyntaxError: boolean;
  keyframes: boolean;
  dashedIdents: boolean;
}
/**
 * Parse CSS Module text.
 * If a syntax error is detected in the text, it is re-parsed using `postcss-safe-parser`, and `localTokens` are collected as much as possible.
 */
export function parseCSSModule(
  text: string,
  { fileName, includeSyntaxError, keyframes, dashedIdents }: ParseCSSModuleOptions,
): CSSModule {
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

  const { localTokens, tokenImporters, tokenReferences, diagnostics } = collectTokens(ast, keyframes, dashedIdents);
  allDiagnostics.push(...diagnostics.map((diagnostic) => ({ ...diagnostic, file: diagnosticFile })));
  return {
    fileName,
    text,
    localTokens,
    tokenImporters,
    tokenReferences,
    diagnostics: allDiagnostics,
  };
}
