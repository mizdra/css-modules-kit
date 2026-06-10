import type { Declaration } from 'postcss';
import postcssValueParser from 'postcss-value-parser';
import type { DiagnosticWithDetachedLocation, TokenReference } from '../type.js';
import { calcDeclValueLoc } from './decl-value-location.js';

const ANIMATION_NAME_PROP_RE = /^(?:-(?:webkit|moz|o|ms)-)?animation-name$/iu;

export function isAnimationNameProp(prop: string): boolean {
  return ANIMATION_NAME_PROP_RE.test(prop);
}

const COMMON_RESERVED_KEYWORDS = new Set(['none', 'inherit', 'initial', 'unset', 'revert', 'revert-layer']);

interface ParseAnimationResult {
  references: TokenReference[];
  diagnostics: DiagnosticWithDetachedLocation[];
}

/** Parse an `animation-name` declaration and extract token references. */
export function parseAnimationNameProp(decl: Declaration): ParseAnimationResult {
  const references: TokenReference[] = [];
  const diagnostics: DiagnosticWithDetachedLocation[] = [];
  const parsed = postcssValueParser(decl.value);
  for (const node of parsed.nodes) {
    if (node.type === 'function') {
      // `global(name)`, `var(...)`, `env(...)`, and any other function are skipped.
      if (node.value !== 'local') continue;
      const nameNodeOrError = unwrapLocalCall(node);
      if (nameNodeOrError === 'invalid') {
        diagnostics.push(createInvalidLocalCallDiagnostic(decl, node));
        continue;
      }
      references.push({
        name: nameNodeOrError.value,
        loc: calcDeclValueLoc(decl, nameNodeOrError.sourceIndex, nameNodeOrError.value.length),
      });
      continue;
    }
    if (node.type !== 'word') continue;
    if (COMMON_RESERVED_KEYWORDS.has(node.value.toLowerCase())) continue;
    references.push({ name: node.value, loc: calcDeclValueLoc(decl, node.sourceIndex, node.value.length) });
  }
  return { references, diagnostics };
}

/**
 * Inspect a `local(...)` call and return its single identifier, or `'invalid'`
 * for any other shape (empty, multiple words, nested functions, strings, etc.).
 */
function unwrapLocalCall(fn: postcssValueParser.FunctionNode): postcssValueParser.WordNode | 'invalid' {
  const words = fn.nodes.filter((n) => n.type !== 'space');
  if (words.length === 1 && words[0]!.type === 'word') {
    return words[0]!;
  }
  return 'invalid';
}

function createInvalidLocalCallDiagnostic(
  decl: Declaration,
  fn: postcssValueParser.FunctionNode,
): DiagnosticWithDetachedLocation {
  const length = postcssValueParser.stringify(fn).length;
  const { start } = calcDeclValueLoc(decl, fn.sourceIndex, length);
  return {
    text: '`local(...)` must contain exactly one identifier.',
    category: 'error',
    start: { line: start.line, column: start.column },
    length,
  };
}
