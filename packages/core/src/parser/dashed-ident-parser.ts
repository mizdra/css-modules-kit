import type { AtRule, Declaration } from 'postcss';
import postcssValueParser from 'postcss-value-parser';
import type {
  DiagnosticWithDetachedLocation,
  ExternalTokenReference,
  Location,
  LocalTokenReference,
  Token,
  TokenReference,
} from '../type.js';
import { calcDeclValueLoc } from './decl-value-location.js';

/** Properties that declare a `<dashed-ident>` in their value. */
const DECLARING_PROP_RE = /^(?:anchor-name|view-timeline-name|scroll-timeline-name|view-timeline|scroll-timeline)$/iu;

/** Properties that reference a `<dashed-ident>` in their value. */
const REFERENCING_PROP_RE =
  /^(?:position-anchor|anchor-scope|animation-timeline|font-palette|position-try|position-try-fallbacks|timeline-scope)$/iu;

/** The role a bare `<dashed-ident>` plays in a value position. */
type BareDashedIdentRole = 'definition' | 'reference' | 'none';

function getBareDashedIdentRole(prop: string): BareDashedIdentRole {
  if (DECLARING_PROP_RE.test(prop)) return 'definition';
  if (REFERENCING_PROP_RE.test(prop)) return 'reference';
  return 'none';
}

/** At-rules that declare a `<dashed-ident>` in their prelude. */
const DASHED_IDENT_AT_RULE_NAMES = new Set(['property', 'custom-media', 'font-palette-values', 'position-try']);

function isCustomPropertyDecl(prop: string): boolean {
  return prop.startsWith('--');
}

export function isDashedIdentAtRule(name: string): boolean {
  return DASHED_IDENT_AT_RULE_NAMES.has(name.toLowerCase());
}

interface ParseDeclResult {
  localTokens: Token[];
  references: TokenReference[];
}

/**
 * Extract `<dashed-ident>` tokens from a declaration:
 *
 * - A custom property declaration (`--foo: ...`) and a `DECLARING_PROP_RE` property
 *   (e.g. `anchor-name: --foo`) become local tokens.
 * - A `REFERENCING_PROP_RE` property (e.g. `position-anchor: --foo`) and the
 *   `var()` / `env()` / `anchor()` / `anchor-size()` functions become token references.
 * - A bare `<dashed-ident>` anywhere else (e.g. `width: --foo`) is ignored.
 */
export function parseDashedIdentDecl(decl: Declaration): ParseDeclResult {
  const result = collectFromDeclValue(decl);
  if (isCustomPropertyDecl(decl.prop)) {
    result.localTokens.push({ name: decl.prop, loc: calcPropLoc(decl) });
  }
  return result;
}

interface ParseAtRuleResult {
  token?: Token;
  diagnostics: DiagnosticWithDetachedLocation[];
}

/**
 * Extract the declared `<dashed-ident>` name from an at-rule prelude, e.g. the
 * `--foo` in `@property --foo {...}` or `@custom-media --foo (...)`.
 */
export function parseDashedIdentAtRule(atRule: AtRule): ParseAtRuleResult {
  const nameNode = postcssValueParser(atRule.params).nodes.find((n) => n.type === 'word');
  if (!nameNode || !nameNode.value.startsWith('--')) return { diagnostics: [] };

  const name = nameNode.value;
  const startIndex = `@${atRule.name}${atRule.raws.afterName ?? ''}`.length + nameNode.sourceIndex;
  return {
    token: {
      name,
      loc: {
        start: atRule.positionBy({ index: startIndex }),
        end: atRule.positionBy({ index: startIndex + name.length }),
      },
      declarationLoc: {
        start: atRule.source!.start!,
        end: atRule.positionBy({ index: atRule.toString().length }),
      },
    },
    diagnostics: [],
  };
}

export function isMediaAtRule(name: string): boolean {
  return name.toLowerCase() === 'media';
}

export function isContainerAtRule(name: string): boolean {
  return name.toLowerCase() === 'container';
}

/**
 * Extract custom media references from an `@media` prelude, e.g. the `--foo` in
 * `@media (--foo) { ... }`, which references a `@custom-media --foo`. References nested
 * in a condition (e.g. `@media ((--foo))` or `@media (not (--foo))`) are also extracted.
 */
export function parseDashedIdentMediaQuery(atRule: AtRule): LocalTokenReference[] {
  const references: LocalTokenReference[] = [];
  // A custom media reference is always parenthesized (it sits where a media feature does),
  // which postcss-value-parser represents as a function node with an empty name.
  for (const node of postcssValueParser(atRule.params).nodes) {
    if (node.type === 'function' && node.value === '') {
      references.push(...collectFromConditionOrQuery(atRule, node.nodes));
    }
  }
  return references;
}

/**
 * Extract custom property references from a `@container` prelude, e.g. the `--foo`
 * in `@container style(--foo) { ... }` or `@container style(--foo: red) { ... }`.
 * Boolean style queries (e.g. `style((--a: red) or (--b: blue))`) and `style()` nested
 * in a condition are also extracted.
 */
export function parseDashedIdentContainerQuery(atRule: AtRule): LocalTokenReference[] {
  const references: LocalTokenReference[] = [];
  const walk = (nodes: postcssValueParser.Node[]): void => {
    for (const node of nodes) {
      if (node.type !== 'function') continue;
      if (node.value.toLowerCase() === 'style') {
        references.push(...collectFromConditionOrQuery(atRule, node.nodes));
      } else {
        walk(node.nodes);
      }
    }
  };
  walk(postcssValueParser(atRule.params).nodes);
  return references;
}

/**
 * Collect `<dashed-ident>` references from the `<media-condition>` in `@media (<media-condition>)`
 * and the `<style-query>` in `@container style(<style-query>)`. Recurse into nested groups
 * (e.g. `(--a) or (--b)`, `not (--a)`) as well as functions within values (e.g. `var(--b)` in `--a: var(--b)`).
 */
function collectFromConditionOrQuery(atRule: AtRule, nodes: postcssValueParser.Node[]): LocalTokenReference[] {
  const references: LocalTokenReference[] = [];
  const walk = (nodes: postcssValueParser.Node[]): void => {
    const nameNode = nodes.find((n) => n.type === 'word' && n.value.startsWith('--'));
    if (nameNode) references.push(createAtRuleParamReference(atRule, nameNode));
    for (const node of nodes) {
      if (node.type === 'function') walk(node.nodes);
    }
  };
  walk(nodes);
  return references;
}

function createAtRuleParamReference(atRule: AtRule, node: postcssValueParser.Node): LocalTokenReference {
  const base = `@${atRule.name}${atRule.raws.afterName ?? ''}`.length;
  return {
    type: 'local',
    name: node.value,
    loc: {
      start: atRule.positionBy({ index: base + node.sourceIndex }),
      end: atRule.positionBy({ index: base + node.sourceIndex + node.value.length }),
    },
  };
}

function calcPropLoc(decl: Declaration): Location {
  return {
    start: decl.positionBy({ index: 0 }),
    end: decl.positionBy({ index: decl.prop.length }),
  };
}

function collectFromDeclValue(decl: Declaration): ParseDeclResult {
  const result: ParseDeclResult = { localTokens: [], references: [] };
  const walk = (nodes: postcssValueParser.Node[], role: BareDashedIdentRole): void => {
    for (const node of nodes) {
      if (node.type === 'function') {
        const fn = node.value.toLowerCase();
        if (fn === 'var') {
          walkVar(node);
        } else if (fn === 'env') {
          walkEnv(node);
        } else if (fn === 'anchor' || fn === 'anchor-size') {
          // The `<dashed-ident>` argument references an anchor declared by `anchor-name`.
          walk(node.nodes, 'reference');
        } else {
          walk(node.nodes, 'none');
        }
      } else if (node.type === 'word' && node.value.startsWith('--')) {
        if (role === 'definition') {
          result.localTokens.push({ name: node.value, loc: calcNodeLoc(decl, node) });
        } else if (role === 'reference') {
          result.references.push(createLocalReference(decl, node));
        }
      }
    }
  };

  const walkVar = (fn: postcssValueParser.FunctionNode): void => {
    // `var( <first-arg> , <fallback>? )`: the first argument holds the referenced custom
    // property name (and an optional `from` clause); the fallback is an arbitrary value.
    const [firstArg, fallback] = splitAtFirstComma(fn.nodes);
    const reference = parseVarFirstArg(decl, firstArg);
    if (reference) result.references.push(reference);
    walk(fallback, 'none');
  };

  const walkEnv = (fn: postcssValueParser.FunctionNode): void => {
    // `env( <first-arg> , <fallback>? )`: the first argument holds the environment
    // variable name; the fallback is an arbitrary value.
    const [firstArg, fallback] = splitAtFirstComma(fn.nodes);
    const nameNode = firstArg.find((n) => n.type !== 'space');
    if (nameNode?.type === 'word' && nameNode.value.startsWith('--')) {
      result.references.push(createLocalReference(decl, nameNode));
    }
    walk(fallback, 'none');
  };

  walk(postcssValueParser(decl.value).nodes, getBareDashedIdentRole(decl.prop));
  return result;
}

/** Parse `--foo` or `--foo from <specifier>` from the first argument of a `var()` call. */
function parseVarFirstArg(decl: Declaration, firstArg: postcssValueParser.Node[]): TokenReference | undefined {
  const meaningful = firstArg.filter((n) => n.type !== 'space');
  const nameNode = meaningful[0];
  if (nameNode?.type !== 'word' || !nameNode.value.startsWith('--')) return undefined;

  const fromIndex = meaningful.findIndex((n) => n.type === 'word' && n.value.toLowerCase() === 'from');
  if (fromIndex === -1) return createLocalReference(decl, nameNode);

  const tail = meaningful.slice(fromIndex + 1);
  const specifier = tail.length === 1 ? tail[0] : undefined;
  if (specifier?.type === 'string') {
    return createExternalReference(decl, nameNode, specifier);
  }
  // `from global` does not produce a token reference.
  if (specifier?.type === 'word' && specifier.value.toLowerCase() === 'global') {
    return undefined;
  }
  return createLocalReference(decl, nameNode);
}

function createLocalReference(decl: Declaration, node: postcssValueParser.Node): LocalTokenReference {
  return { type: 'local', name: node.value, loc: calcNodeLoc(decl, node) };
}

function createExternalReference(
  decl: Declaration,
  nameNode: postcssValueParser.Node,
  specifierNode: postcssValueParser.StringNode,
): ExternalTokenReference {
  return {
    type: 'external',
    entries: [{ name: nameNode.value, loc: calcNodeLoc(decl, nameNode) }],
    from: specifierNode.value,
    // The location of the specifier without quotes.
    fromLoc: calcDeclValueLoc(decl, specifierNode.sourceIndex + 1, specifierNode.value.length),
  };
}

function calcNodeLoc(decl: Declaration, node: postcssValueParser.Node): Location {
  return calcDeclValueLoc(decl, node.sourceIndex, node.value.length);
}

/** Split function arguments at the first top-level comma into the first argument and the remaining fallback nodes. */
function splitAtFirstComma(nodes: postcssValueParser.Node[]): [postcssValueParser.Node[], postcssValueParser.Node[]] {
  const index = nodes.findIndex((n) => n.type === 'div' && n.value === ',');
  if (index === -1) return [nodes, []];
  return [nodes.slice(0, index), nodes.slice(index + 1)];
}
