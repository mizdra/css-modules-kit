import type { Declaration } from 'postcss';
import postcssValueParser from 'postcss-value-parser';
import type { DiagnosticWithDetachedLocation, TokenReference } from '../type.js';
import { calcDeclValueLoc } from './decl-value-location.js';

const COMPOSES_PROP_RE = /^composes$/iu;

export function isComposesProp(prop: string): boolean {
  return COMPOSES_PROP_RE.test(prop);
}

interface ParseComposesResult {
  references: TokenReference[];
  diagnostics: DiagnosticWithDetachedLocation[];
}

/** Parse a `composes` declaration and extract token references. */
export function parseComposesProp(decl: Declaration): ParseComposesResult {
  const references: TokenReference[] = [];
  const diagnostics: DiagnosticWithDetachedLocation[] = [];
  for (const item of splitByComma(postcssValueParser(decl.value).nodes)) {
    const fromIndex = item.findLastIndex((node) => node.type === 'word' && node.value === 'from');
    if (fromIndex === -1) {
      for (const node of item) {
        // `global(name)` and any other function are skipped.
        if (node.type !== 'word') continue;
        references.push({ name: node.value, loc: calcDeclValueLoc(decl, node.sourceIndex, node.value.length) });
      }
      continue;
    }
    if (!isValidFromClauseTail(item.slice(fromIndex + 1))) {
      diagnostics.push(createInvalidFromClauseDiagnostic(decl, item, fromIndex));
    }
    // Items with `from global` and `from '<specifier>'` do not produce local token references.
  }
  return { references, diagnostics };
}

/** Split the value nodes by top-level commas. Space nodes are dropped. */
function splitByComma(nodes: postcssValueParser.Node[]): postcssValueParser.Node[][] {
  const items: postcssValueParser.Node[][] = [[]];
  for (const node of nodes) {
    if (node.type === 'div' && node.value === ',') {
      items.push([]);
    } else if (node.type !== 'space') {
      items.at(-1)!.push(node);
    }
  }
  return items;
}

/**
 * Check that the nodes after `from` represent a valid import source: a single
 * quoted specifier (e.g. `'./a.module.css'`) or the keyword `global`.
 */
function isValidFromClauseTail(tail: postcssValueParser.Node[]): boolean {
  if (tail.length !== 1) return false;
  const node = tail[0]!;
  return node.type === 'string' || (node.type === 'word' && node.value === 'global');
}

function createInvalidFromClauseDiagnostic(
  decl: Declaration,
  item: postcssValueParser.Node[],
  fromIndex: number,
): DiagnosticWithDetachedLocation {
  const fromNode = item[fromIndex]!;
  const lastNode = item[item.length - 1]!;
  const length = lastNode.sourceEndIndex - fromNode.sourceIndex;
  const { start } = calcDeclValueLoc(decl, fromNode.sourceIndex, length);
  return {
    text: '`from` must be followed by a quoted specifier or `global`.',
    category: 'error',
    start: { line: start.line, column: start.column },
    length,
  };
}
