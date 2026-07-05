import type { AtRule, Declaration } from 'postcss';
import postcssValueParser from 'postcss-value-parser';
import type { LocalTokenReference, Location, Token } from '../type.js';
import { calcDeclValueLoc } from './util.js';
import { VALID_IDENT_RE } from './util.js';

export function isContainerNameProp(prop: string): boolean {
  return prop.toLowerCase() === 'container-name';
}

export function isContainerProp(prop: string): boolean {
  return prop.toLowerCase() === 'container';
}

export function isContainerAtRuleName(name: string): boolean {
  return name.toLowerCase() === 'container';
}

/** Keywords that cannot be a `<container-name>`: the keywords excluded by `container-name`, the CSS-wide keywords, and `default`. */
const CONTAINER_NAME_RESERVED_KEYWORDS = new Set([
  // container-name
  'none',
  'and',
  'not',
  'or',
  // CSS-wide keywords
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
  // reserved by <custom-ident>
  'default',
]);

/** Parse a `container-name` declaration and extract a local token for each space-separated `<container-name>`. */
export function parseContainerNameProp(decl: Declaration): Token[] {
  return collectContainerNameTokens(decl, postcssValueParser(decl.value).nodes);
}

/** Parse a `container` shorthand declaration and extract local tokens from the `<container-name>` part before the `/`. */
export function parseContainerProp(decl: Declaration): Token[] {
  const nodes = postcssValueParser(decl.value).nodes;
  const slashIndex = nodes.findIndex((node) => node.type === 'div' && node.value === '/');
  const nameNodes = slashIndex === -1 ? nodes : nodes.slice(0, slashIndex);
  return collectContainerNameTokens(decl, nameNodes);
}

function collectContainerNameTokens(decl: Declaration, nodes: postcssValueParser.Node[]): Token[] {
  const tokens: Token[] = [];
  const declarationLoc = calcDeclarationLoc(decl);
  for (const node of nodes) {
    if (node.type !== 'word') continue;
    if (!isContainerName(node.value)) continue;
    tokens.push({
      name: node.value,
      loc: calcDeclValueLoc(decl, node.sourceIndex, node.value.length),
      declarationLoc,
    });
  }
  return tokens;
}

function isContainerName(word: string): boolean {
  if (CONTAINER_NAME_RESERVED_KEYWORDS.has(word.toLowerCase())) return false;
  return VALID_IDENT_RE.test(word);
}

function calcDeclarationLoc(decl: Declaration): Location {
  return {
    start: decl.source!.start!,
    end: decl.positionBy({ index: decl.toString().length }),
  };
}

/**
 * Parse an `@container` prelude and extract the leading `<container-name>` as a local token reference.
 * @example `@container foo (width > 400px) {}` references the `foo` container.
 */
export function parseContainerAtRule(atRule: AtRule): LocalTokenReference | undefined {
  const nameNode = postcssValueParser(atRule.params).nodes.find((node) => node.type !== 'space');
  if (nameNode?.type !== 'word') return undefined;
  if (!isContainerName(nameNode.value)) return undefined;

  const startIndex = `@${atRule.name}${atRule.raws.afterName ?? ''}`.length + nameNode.sourceIndex;
  return {
    type: 'local',
    name: nameNode.value,
    loc: {
      start: atRule.positionBy({ index: startIndex }),
      end: atRule.positionBy({ index: startIndex + nameNode.value.length }),
    },
  };
}
