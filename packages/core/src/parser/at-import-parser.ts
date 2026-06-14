import type { Atrule, Url } from 'css-tree';
import type { Location } from '../type.js';
import { stringInnerLocation } from './csstree.js';

interface ParsedAtImport {
  from: string;
  fromLoc: Location;
}

/**
 * Parse the `@import` rule.
 * @param atImport The `@import` rule to parse.
 * @param text The source text of the CSS Module, used to locate the specifier inside `url(...)`.
 * @returns The specifier of the imported file.
 */
export function parseAtImport(atImport: Atrule, text: string): ParsedAtImport | undefined {
  const prelude = atImport.prelude;
  if (prelude === null || prelude.type !== 'AtrulePrelude') return undefined;
  const firstNode = prelude.children.first;
  if (firstNode === null) return undefined;
  if (firstNode.type === 'String') {
    return { from: firstNode.value, fromLoc: stringInnerLocation(firstNode.loc!) };
  }
  if (firstNode.type === 'Url') {
    return parseUrl(firstNode, text);
  }
  return undefined;
}

function parseUrl(node: Url, text: string): ParsedAtImport {
  const loc = node.loc!;
  // `url(` and the specifier are always on the same line, so a column offset is sufficient.
  let offset = loc.start.offset + 'url('.length;
  while (/\s/u.test(text[offset] ?? '')) offset++;
  if (text[offset] === '"' || text[offset] === "'") offset++;
  const startColumn = loc.start.column + (offset - loc.start.offset);
  return {
    from: node.value,
    fromLoc: {
      start: { line: loc.start.line, column: startColumn, offset },
      end: { line: loc.start.line, column: startColumn + node.value.length, offset: offset + node.value.length },
    },
  };
}
