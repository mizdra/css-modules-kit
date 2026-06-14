import type { CssNode, SyntaxParseError } from 'css-tree';
import type {
  CSSModule,
  DiagnosticSourceFile,
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
import { parseAtImport } from './at-import-parser.js';
import { parseAtValue } from './at-value-parser.js';
import { isComposesProp, parseComposesProp } from './composes-parser.js';
import { offsetToPosition, parseCss, walk } from './csstree.js';
import { parseAtKeyframes } from './key-frame-parser.js';
import { type ClassSelector, parseRule } from './rule-parser.js';

/**
 * Collect tokens from the AST.
 */
function collectTokens(ast: CssNode, text: string, keyframes: boolean) {
  const allDiagnostics: DiagnosticWithDetachedLocation[] = [];
  const localTokens: Token[] = [];
  const tokenImporters: TokenImporter[] = [];
  const tokenReferences: TokenReference[] = [];
  walk(ast, (node) => {
    if (node.type === 'Atrule') {
      if (node.name === 'import') {
        const parsed = parseAtImport(node, text);
        if (parsed !== undefined) {
          tokenImporters.push({ type: 'all', ...parsed });
        }
      } else if (node.name === 'value') {
        const { atValue, diagnostics } = parseAtValue(node);
        allDiagnostics.push(...diagnostics);
        if (atValue === undefined) return;
        if (atValue.type === 'declaration') {
          localTokens.push({ name: atValue.name, loc: atValue.loc, declarationLoc: atValue.declarationLoc });
        } else if (atValue.type === 'importer') {
          const { type: _, ...rest } = atValue;
          tokenImporters.push({ ...rest, type: 'named' });
        }
      } else if (keyframes && node.name === 'keyframes') {
        const { keyframe, diagnostics } = parseAtKeyframes(node);
        allDiagnostics.push(...diagnostics);
        if (keyframe) {
          localTokens.push({ name: keyframe.name, loc: keyframe.loc, declarationLoc: keyframe.declarationLoc });
        }
      }
    } else if (node.type === 'Rule') {
      const { classSelectors, diagnostics } = parseRule(node);
      allDiagnostics.push(...diagnostics);
      for (const classSelector of classSelectors) {
        localTokens.push(classSelector);
      }
    } else if (node.type === 'Declaration') {
      if (keyframes && isAnimationNameProp(node.property)) {
        const { references, diagnostics } = parseAnimationNameProp(node);
        allDiagnostics.push(...diagnostics);
        tokenReferences.push(...references);
      } else if (keyframes && isAnimationProp(node.property)) {
        const { references, diagnostics } = parseAnimationProp(node);
        allDiagnostics.push(...diagnostics);
        tokenReferences.push(...references);
      } else if (isComposesProp(node.property)) {
        tokenReferences.push(...parseComposesProp(node));
      }
    }
  });
  return { localTokens, tokenImporters, tokenReferences, diagnostics: allDiagnostics };
}

/**
 * css-tree silently auto-closes an unclosed block at EOF instead of reporting it, so detect it from the AST.
 * A block is unclosed when its source does not end with `}`.
 */
function collectUnclosedBlockDiagnostics(
  ast: CssNode,
  text: string,
  file: DiagnosticSourceFile,
): DiagnosticWithLocation[] {
  const diagnostics: DiagnosticWithLocation[] = [];
  walk(ast, (node) => {
    if (node.type !== 'Rule' && node.type !== 'Atrule') return;
    const block = node.block;
    if (block === null || block.loc === undefined) return;
    if (text.charAt(block.loc.end.offset - 1) === '}') return;
    diagnostics.push({
      file,
      start: { line: node.loc!.start.line, column: node.loc!.start.column },
      length: 1,
      text: 'Unclosed block',
      category: 'error',
    });
  });
  return diagnostics;
}

function toSyntaxErrorDiagnostic(
  error: SyntaxParseError,
  text: string,
  file: DiagnosticSourceFile,
): DiagnosticWithLocation {
  const position = offsetToPosition(text, { line: 1, column: 1, offset: 0 }, error.offset);
  return {
    file,
    start: { line: position.line, column: position.column },
    length: 1,
    text: error.message,
    category: 'error',
  };
}

export interface ParseCSSModuleOptions {
  fileName: string;
  /** Whether to include syntax errors from diagnostics */
  includeSyntaxError: boolean;
  keyframes: boolean;
}
/**
 * Parse CSS Module text.
 * Parsing is tolerant, so `localTokens` are collected even when the text contains syntax errors.
 */
export function parseCSSModule(
  text: string,
  { fileName, includeSyntaxError, keyframes }: ParseCSSModuleOptions,
): CSSModule {
  const diagnosticFile = { fileName, text };
  const syntaxErrors: DiagnosticWithLocation[] = [];
  const ast = parseCss(text, {
    fileName,
    onParseError: includeSyntaxError
      ? (error) => {
          syntaxErrors.push(toSyntaxErrorDiagnostic(error, text, diagnosticFile));
        }
      : undefined,
  });

  if (includeSyntaxError) {
    syntaxErrors.push(...collectUnclosedBlockDiagnostics(ast, text, diagnosticFile));
  }

  const { localTokens, tokenImporters, tokenReferences, diagnostics } = collectTokens(ast, text, keyframes);
  const allDiagnostics: DiagnosticWithLocation[] = [
    ...syntaxErrors,
    ...diagnostics.map((diagnostic) => ({ ...diagnostic, file: diagnosticFile })),
  ];
  return {
    fileName,
    text,
    localTokens,
    tokenImporters,
    tokenReferences,
    diagnostics: allDiagnostics,
  };
}

/**
 * Collect the local class selectors defined in CSS Module text.
 *
 * Unlike {@link parseCSSModule}, the result is limited to class selectors and excludes other token
 * kinds such as `@value` and `@keyframes`. It is used by the lint plugins to report unused class names.
 */
export function getClassSelectors(text: string, fileName: string): ClassSelector[] {
  const ast = parseCss(text, { fileName });
  const classSelectors: ClassSelector[] = [];
  walk(ast, (node) => {
    if (node.type === 'Rule') {
      classSelectors.push(...parseRule(node).classSelectors);
    }
  });
  return classSelectors;
}
