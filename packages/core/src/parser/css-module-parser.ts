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
        localTokens.push({ name: atValue.name, loc: atValue.loc, definition: atValue.definition });
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

export interface ParseCSSModuleOptions {
  fileName: string;
  safe: boolean;
}

export interface ParseCSSModuleResult {
  cssModule: CSSModule;
  diagnostics: DiagnosticWithLocation[];
}

export function parseCSSModule(text: string, { fileName, safe }: ParseCSSModuleOptions): ParseCSSModuleResult {
  let ast: Root;
  const diagnosticSourceFile = { fileName, text };
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
            file: diagnosticSourceFile,
            start,
            // TODO: Assign correct length (e.g. `e.endOffset - e.offset`)
            length: 1,
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
  return { cssModule, diagnostics: diagnostics.map((diagnostic) => ({ ...diagnostic, file: diagnosticSourceFile })) };
}
