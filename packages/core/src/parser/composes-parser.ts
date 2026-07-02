import type { Declaration } from 'postcss';
import postcssValueParser from 'postcss-value-parser';
import type {
  ExternalTokenReference,
  ExternalTokenReferenceEntry,
  LocalTokenReference,
  TokenReference,
} from '../type.js';
import { calcDeclValueLoc } from './decl-value-location.js';

const COMPOSES_PROP_RE = /^composes$/iu;

export function isComposesProp(prop: string): boolean {
  return COMPOSES_PROP_RE.test(prop);
}

/** Parse a `composes` declaration and extract token references. */
export function parseComposesProp(decl: Declaration): TokenReference[] {
  const references: TokenReference[] = [];
  for (const item of splitByComma(postcssValueParser(decl.value).nodes)) {
    if (hasFromClause(item)) {
      const specifierNode = item.at(-1)!;
      // Items with `from global` do not produce token references.
      if (specifierNode.type !== 'string') continue;
      const head = item.slice(0, findFromKeywordIndex(item));
      const externalReference = createExternalReference(decl, head, specifierNode);
      if (externalReference.entries.length > 0) references.push(externalReference);
      continue;
    }
    // Items without a `from` clause consist of plain class names.
    references.push(...createLocalReferences(decl, item));
  }
  return references;
}

/**
 * Check that the item forms a `from` clause: one or more nodes followed by `from`
 * and a quoted specifier (e.g. `'./a.module.css'`) or the keyword `global`.
 */
function hasFromClause(item: postcssValueParser.Node[]): boolean {
  const fromIndex = findFromKeywordIndex(item);
  return fromIndex >= 1 && isValidFromClauseTail(item.slice(fromIndex + 1));
}

function findFromKeywordIndex(item: postcssValueParser.Node[]): number {
  return item.findLastIndex((node) => node.type === 'word' && node.value.toLowerCase() === 'from');
}

/**
 * Check that the nodes after `from` represent a valid import source: a single
 * quoted specifier (e.g. `'./a.module.css'`) or the keyword `global`.
 */
function isValidFromClauseTail(tail: postcssValueParser.Node[]): boolean {
  if (tail.length !== 1) return false;
  const node = tail[0]!;
  return node.type === 'string' || (node.type === 'word' && node.value.toLowerCase() === 'global');
}

/** Create a local token reference for each class name in `nodes`. */
function createLocalReferences(decl: Declaration, nodes: postcssValueParser.Node[]): LocalTokenReference[] {
  const references: LocalTokenReference[] = [];
  for (const node of nodes) {
    // `global(name)` and any other function are skipped.
    if (node.type !== 'word') continue;
    references.push({
      type: 'local',
      name: node.value,
      loc: calcDeclValueLoc(decl, node.sourceIndex, node.value.length),
    });
  }
  return references;
}

/** Create an external token reference with an entry for each class name in `nodes`. */
function createExternalReference(
  decl: Declaration,
  nodes: postcssValueParser.Node[],
  specifierNode: postcssValueParser.StringNode,
): ExternalTokenReference {
  const entries: ExternalTokenReferenceEntry[] = [];
  for (const node of nodes) {
    if (node.type !== 'word') continue;
    entries.push({ name: node.value, loc: calcDeclValueLoc(decl, node.sourceIndex, node.value.length) });
  }
  return {
    type: 'external',
    entries,
    from: specifierNode.value,
    // The location of the specifier without quotes.
    fromLoc: calcDeclValueLoc(decl, specifierNode.sourceIndex + 1, specifierNode.value.length),
  };
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
