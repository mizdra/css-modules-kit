import type { CssNode, Declaration, StringNode } from 'css-tree';
import type {
  ExternalTokenReference,
  ExternalTokenReferenceEntry,
  LocalTokenReference,
  TokenReference,
} from '../type.js';
import { stringInnerLocation, toLocation } from './csstree.js';

const COMPOSES_PROP_RE = /^composes$/iu;

export function isComposesProp(prop: string): boolean {
  return COMPOSES_PROP_RE.test(prop);
}

/** Parse a `composes` declaration and extract token references. */
export function parseComposesProp(decl: Declaration): TokenReference[] {
  if (decl.value.type !== 'Value') return [];
  const references: TokenReference[] = [];
  for (const item of splitByComma(decl.value.children.toArray())) {
    const fromIndex = findFromKeywordIndex(item);
    if (fromIndex >= 1 && isValidFromClauseTail(item.slice(fromIndex + 1))) {
      const specifierNode = item.at(-1)!;
      // Items with `from global` do not produce token references.
      if (specifierNode.type !== 'String') continue;
      const externalReference = createExternalReference(item.slice(0, fromIndex), specifierNode);
      if (externalReference.entries.length > 0) references.push(externalReference);
      continue;
    }
    // Items without a `from` clause consist of plain class names.
    references.push(...createLocalReferences(item));
  }
  return references;
}

function findFromKeywordIndex(item: CssNode[]): number {
  for (let i = item.length - 1; i >= 0; i--) {
    const node = item[i]!;
    if (node.type === 'Identifier' && node.name === 'from') return i;
  }
  return -1;
}

/**
 * Check that the nodes after `from` represent a valid import source: a single
 * quoted specifier (e.g. `'./a.module.css'`) or the keyword `global`.
 */
function isValidFromClauseTail(tail: CssNode[]): boolean {
  if (tail.length !== 1) return false;
  const node = tail[0]!;
  return node.type === 'String' || (node.type === 'Identifier' && node.name === 'global');
}

/** Create a local token reference for each class name in `nodes`. */
function createLocalReferences(nodes: CssNode[]): LocalTokenReference[] {
  const references: LocalTokenReference[] = [];
  for (const node of nodes) {
    // `global(name)` and any other function are skipped.
    if (node.type !== 'Identifier') continue;
    references.push({ type: 'local', name: node.name, loc: toLocation(node.loc!) });
  }
  return references;
}

/** Create an external token reference with an entry for each class name in `nodes`. */
function createExternalReference(nodes: CssNode[], specifierNode: StringNode): ExternalTokenReference {
  const entries: ExternalTokenReferenceEntry[] = [];
  for (const node of nodes) {
    if (node.type !== 'Identifier') continue;
    entries.push({ name: node.name, loc: toLocation(node.loc!) });
  }
  return {
    type: 'external',
    entries,
    from: specifierNode.value,
    fromLoc: stringInnerLocation(specifierNode.loc!),
  };
}

/** Split the value nodes by top-level commas. */
function splitByComma(nodes: CssNode[]): CssNode[][] {
  const items: CssNode[][] = [[]];
  for (const node of nodes) {
    if (node.type === 'Operator' && node.value === ',') {
      items.push([]);
    } else {
      items.at(-1)!.push(node);
    }
  }
  return items;
}
