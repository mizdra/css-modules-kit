import type { Declaration } from 'postcss';
import postcssValueParser from 'postcss-value-parser';
import type { DiagnosticWithDetachedLocation, TokenReference } from '../type.js';
import { calcDeclValueLoc } from './util.js';
import { VALID_IDENT_RE } from './util.js';

const ANIMATION_NAME_PROP_RE = /^(?:-(?:webkit|moz|o|ms)-)?animation-name$/iu;
const ANIMATION_PROP_RE = /^(?:-(?:webkit|moz|o|ms)-)?animation$/iu;

export function isAnimationNameProp(prop: string): boolean {
  return ANIMATION_NAME_PROP_RE.test(prop);
}

export function isAnimationProp(prop: string): boolean {
  return ANIMATION_PROP_RE.test(prop);
}

/** Keywords reserved by the `animation-name` longhand: `none` plus the CSS-wide keywords. */
const ANIMATION_NAME_RESERVED_KEYWORDS = new Set([
  // animation-name
  'none',
  // CSS-wide keywords
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
]);

/**
 * Keywords that cannot be a `<keyframes-name>` in the `animation` shorthand because
 * they are reserved by an `animation-*` longhand (or are CSS-wide keywords).
 */
const ANIMATION_SHORTHAND_RESERVED_KEYWORDS = new Set([
  ...ANIMATION_NAME_RESERVED_KEYWORDS,
  // animation-fill-mode, animation-timeline (`none` is also in ANIMATION_NAME_RESERVED_KEYWORDS)
  'none',
  // animation-duration, animation-timeline
  'auto',
  // animation-timing-function
  'linear',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'step-start',
  'step-end',
  // animation-iteration-count
  'infinite',
  // animation-direction
  'normal',
  'reverse',
  'alternate',
  'alternate-reverse',
  // animation-fill-mode
  'forwards',
  'backwards',
  'both',
  // animation-play-state
  'running',
  'paused',
]);

interface ParseAnimationResult {
  references: TokenReference[];
  diagnostics: DiagnosticWithDetachedLocation[];
}

/** Parse an `animation-name` declaration and extract token references. */
export function parseAnimationNameProp(decl: Declaration): ParseAnimationResult {
  return collectAnimationReferences(decl, isAnimationNameValue);
}

/** Parse an `animation` shorthand declaration and extract `<keyframes-name>` token references. */
export function parseAnimationProp(decl: Declaration): ParseAnimationResult {
  return collectAnimationReferences(decl, isKeyframesName);
}

/**
 * Walk the top-level value nodes and collect token references. `local(...)` is unwrapped
 * to a single reference, while `global(...)`, `var()`, and other functions are skipped.
 * Word nodes are turned into references only when `isReference` returns `true`.
 */
function collectAnimationReferences(decl: Declaration, isReference: (word: string) => boolean): ParseAnimationResult {
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
        type: 'local',
        name: nameNodeOrError.value,
        loc: calcDeclValueLoc(decl, nameNodeOrError.sourceIndex, nameNodeOrError.value.length),
      });
      continue;
    }
    if (node.type !== 'word') continue;
    if (!isReference(node.value)) continue;
    references.push({
      type: 'local',
      name: node.value,
      loc: calcDeclValueLoc(decl, node.sourceIndex, node.value.length),
    });
  }
  return { references, diagnostics };
}

/** In `animation-name`, every word is a `<keyframes-name>` except `none` and global keywords. */
function isAnimationNameValue(word: string): boolean {
  return !ANIMATION_NAME_RESERVED_KEYWORDS.has(word.toLowerCase());
}

/** In the `animation` shorthand, a word is a `<keyframes-name>` only if it is a non-reserved `<custom-ident>`. */
function isKeyframesName(word: string): boolean {
  if (ANIMATION_SHORTHAND_RESERVED_KEYWORDS.has(word.toLowerCase())) return false;
  return VALID_IDENT_RE.test(word);
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
  const length = fn.sourceEndIndex - fn.sourceIndex;
  const { start } = calcDeclValueLoc(decl, fn.sourceIndex, length);
  return {
    text: '`local(...)` must contain exactly one identifier.',
    category: 'error',
    start: { line: start.line, column: start.column },
    length,
  };
}
