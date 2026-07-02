import type { AtRule } from 'postcss';
import postcssValueParser from 'postcss-value-parser';
import type { Location } from '../type.js';

interface ParsedAtImport {
  from: string;
  fromLoc: Location;
}

/**
 * Parse the `@import` rule.
 * @param atImport The `@import` rule to parse.
 * @returns The specifier of the imported file.
 */
export function parseImportAtRule(atImport: AtRule): ParsedAtImport | undefined {
  const firstNode = postcssValueParser(atImport.params).nodes[0];
  if (firstNode === undefined) return undefined;
  if (firstNode.type === 'string') return convertParsedAtImport(atImport, firstNode);
  if (firstNode.type === 'function' && firstNode.value === 'url') {
    if (firstNode.nodes[0] === undefined) return undefined;
    if (firstNode.nodes[0].type === 'string') return convertParsedAtImport(atImport, firstNode.nodes[0]);
    if (firstNode.nodes[0].type === 'word') return convertParsedAtImport(atImport, firstNode.nodes[0]);
  }
  return undefined;
}

function convertParsedAtImport(
  atImport: AtRule,
  node: postcssValueParser.StringNode | postcssValueParser.WordNode,
): ParsedAtImport {
  // The length of the `@import  ` part in `@import  '...'`
  const baseLength = 7 + (atImport.raws.afterName?.length ?? 0);
  // For string nodes, skip the leading quote to point at the specifier itself.
  const startIndex = baseLength + node.sourceIndex + (node.type === 'string' ? 1 : 0);
  return {
    from: node.value,
    fromLoc: {
      start: atImport.positionBy({ index: startIndex }),
      end: atImport.positionBy({ index: startIndex + node.value.length }),
    },
  };
}
