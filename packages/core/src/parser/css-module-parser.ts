import type { AtRule, Declaration, Node, Root, Rule } from 'postcss';
import { CssSyntaxError, parse } from 'postcss';
import safeParser from 'postcss-safe-parser';
import type {
  CSSModule,
  DiagnosticWithDetachedLocation,
  DiagnosticWithLocation,
  Location,
  Token,
  TokenImporter,
  TokenReference,
} from '../type.js';
import { type TokenNameViolation, validateTokenName } from '../util.js';
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
  isContainerNameProp,
  isContainerProp,
  parseContainerAtRule,
  parseContainerNameProp,
  parseContainerProp,
} from './container-parser.js';
import {
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
  return name.toLowerCase() === 'import';
}

function isValueAtRuleName(name: string): boolean {
  return name.toLowerCase() === 'value';
}

function isKeyframesAtRuleName(name: string): boolean {
  return name.toLowerCase() === 'keyframes';
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
function collectTokens(ast: Root, animation: boolean, dashedIdents: boolean, container: boolean) {
  const allDiagnostics: DiagnosticWithDetachedLocation[] = [];
  const localTokens: Token[] = [];
  const tokenImporters: TokenImporter[] = [];
  const tokenReferences: TokenReference[] = [];
  ast.walk((node) => {
    if (isAtRule(node)) {
      if (dashedIdents && isDashedIdentAtRuleName(node.name)) {
        const { token, diagnostics } = parseDashedIdentAtRule(node);
        allDiagnostics.push(...diagnostics);
        if (token) localTokens.push(token);
      } else if (dashedIdents && isMediaAtRuleName(node.name)) {
        tokenReferences.push(...parseDashedIdentMediaQuery(node));
      } else if (isContainerAtRuleName(node.name)) {
        if (container) {
          const reference = parseContainerAtRule(node);
          if (reference) tokenReferences.push(reference);
        }
        if (dashedIdents) tokenReferences.push(...parseDashedIdentContainerQuery(node));
      } else if (isImportAtRuleName(node.name)) {
        const parsed = parseImportAtRule(node);
        if (parsed !== undefined) {
          tokenImporters.push({ type: 'all', ...parsed });
        }
      } else if (isValueAtRuleName(node.name)) {
        const { atValue, diagnostics } = parseValueAtRule(node);
        allDiagnostics.push(...diagnostics);
        if (atValue === undefined) return;
        if (atValue.type === 'declaration') {
          localTokens.push({ name: atValue.name, loc: atValue.loc, declarationLoc: atValue.declarationLoc });
        } else if (atValue.type === 'importer') {
          const { type: _, ...rest } = atValue;
          tokenImporters.push({ ...rest, type: 'named' });
        }
      } else if (animation && isKeyframesAtRuleName(node.name)) {
        const { keyframe, diagnostics } = parseKeyframesAtRule(node);
        allDiagnostics.push(...diagnostics);
        if (keyframe) {
          localTokens.push({ name: keyframe.name, loc: keyframe.loc, declarationLoc: keyframe.declarationLoc });
        }
      }
    } else if (isRule(node)) {
      const { classSelectors, diagnostics } = parseRule(node);
      allDiagnostics.push(...diagnostics);
      for (const classSelector of classSelectors) {
        localTokens.push(classSelector);
      }
    } else if (isDeclaration(node)) {
      if (animation && isAnimationNameProp(node.prop)) {
        const { references, diagnostics } = parseAnimationNameProp(node);
        allDiagnostics.push(...diagnostics);
        tokenReferences.push(...references);
      } else if (animation && isAnimationProp(node.prop)) {
        const { references, diagnostics } = parseAnimationProp(node);
        allDiagnostics.push(...diagnostics);
        tokenReferences.push(...references);
      } else if (container && isContainerNameProp(node.prop)) {
        localTokens.push(...parseContainerNameProp(node));
      } else if (container && isContainerProp(node.prop)) {
        localTokens.push(...parseContainerProp(node));
      } else if (isComposesProp(node.prop)) {
        tokenReferences.push(...parseComposesProp(node));
      } else if (dashedIdents) {
        const { localTokens: tokens, references } = parseDashedIdentDecl(node);
        localTokens.push(...tokens);
        tokenReferences.push(...references);
      }
    }
  });
  return { localTokens, tokenImporters, tokenReferences, diagnostics: allDiagnostics };
}

function validateTokenNames(
  localTokens: Token[],
  tokenImporters: TokenImporter[],
  namedExports: boolean,
): DiagnosticWithDetachedLocation[] {
  const diagnostics: DiagnosticWithDetachedLocation[] = [];
  for (const token of localTokens) {
    // Reject special names as they may break .d.ts files
    const violation = validateTokenName(token.name, { namedExports });
    if (violation) {
      diagnostics.push(createTokenNameDiagnostic(token.loc, violation));
    }
  }
  for (const tokenImporter of tokenImporters) {
    if (tokenImporter.type !== 'named') continue;
    for (const entry of tokenImporter.entries) {
      const nameViolation = validateTokenName(entry.name, { namedExports });
      if (nameViolation) {
        diagnostics.push(createTokenNameDiagnostic(entry.loc, nameViolation));
      }
      if (entry.localName) {
        const localNameViolation = validateTokenName(entry.localName, { namedExports });
        if (localNameViolation) {
          diagnostics.push(createTokenNameDiagnostic(entry.localLoc!, localNameViolation));
        }
      }
    }
  }
  return diagnostics;
}

function createTokenNameDiagnostic(loc: Location, violation: TokenNameViolation): DiagnosticWithDetachedLocation {
  let text: string;
  switch (violation) {
    case 'proto-not-allowed':
      text = `\`__proto__\` is not allowed as names.`;
      break;
    case 'default-not-allowed':
      text = `\`default\` is not allowed as names when \`cmkOptions.namedExports\` is set to \`true\`.`;
      break;
    case 'backslash-not-allowed':
      text = `Backslash (\\) is not allowed in names.`;
      break;
    default:
      throw new Error('unreachable: unknown TokenNameViolation');
  }
  return {
    text,
    category: 'error',
    start: loc.start,
    length: loc.end.offset - loc.start.offset,
  };
}

export interface ParseCSSModuleOptions {
  fileName: string;
  /** Whether to include syntax errors from diagnostics */
  includeSyntaxError: boolean;
  animation: boolean;
  dashedIdents: boolean;
  container: boolean;
  namedExports: boolean;
}
/**
 * Parse CSS Module text.
 * If a syntax error is detected in the text, it is re-parsed using `postcss-safe-parser`, and `localTokens` are collected as much as possible.
 */
export function parseCSSModule(
  text: string,
  { fileName, includeSyntaxError, animation, dashedIdents, container, namedExports }: ParseCSSModuleOptions,
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

  const { localTokens, tokenImporters, tokenReferences, diagnostics } = collectTokens(
    ast,
    animation,
    dashedIdents,
    container,
  );
  allDiagnostics.push(...diagnostics.map((diagnostic) => ({ ...diagnostic, file: diagnosticFile })));
  allDiagnostics.push(
    ...validateTokenNames(localTokens, tokenImporters, namedExports).map((diagnostic) => ({
      ...diagnostic,
      file: diagnosticFile,
    })),
  );
  return {
    fileName,
    text,
    localTokens,
    tokenImporters,
    tokenReferences,
    diagnostics: allDiagnostics,
  };
}
