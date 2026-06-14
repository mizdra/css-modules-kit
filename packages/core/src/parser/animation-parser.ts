import type { Declaration, FunctionNode, Identifier } from 'css-tree';
import type { DiagnosticWithDetachedLocation, TokenReference } from '../type.js';
import { toLocation } from './csstree.js';

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

// A valid CSS identifier, including `<dashed-ident>`. Excludes `<time>` (`3s`), `<number>` (`2`),
// and other non-ident words. We don't validate `hex digits`, because it is the job of linters.
const VALID_IDENT_RE =
  /^-?([a-zA-Z\u0080-\uFFFF_]|(\\[^\r\n\f])|-(?![0-9]))((\\[^\r\n\f])|[a-zA-Z\u0080-\uFFFF_0-9-])*$/u;

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
 * Identifiers are turned into references only when `isReference` returns `true`.
 */
function collectAnimationReferences(decl: Declaration, isReference: (word: string) => boolean): ParseAnimationResult {
  const references: TokenReference[] = [];
  const diagnostics: DiagnosticWithDetachedLocation[] = [];
  if (decl.value.type !== 'Value') return { references, diagnostics };
  for (const node of decl.value.children) {
    if (node.type === 'Function') {
      // `global(name)`, `var(...)`, `env(...)`, and any other function are skipped.
      if (node.name !== 'local') continue;
      const nameNodeOrError = unwrapLocalCall(node);
      if (nameNodeOrError === 'invalid') {
        diagnostics.push(createInvalidLocalCallDiagnostic(node));
        continue;
      }
      references.push({ type: 'local', name: nameNodeOrError.name, loc: toLocation(nameNodeOrError.loc!) });
      continue;
    }
    if (node.type !== 'Identifier') continue;
    if (!isReference(node.name)) continue;
    references.push({ type: 'local', name: node.name, loc: toLocation(node.loc!) });
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
function unwrapLocalCall(fn: FunctionNode): Identifier | 'invalid' {
  const nodes = fn.children.toArray();
  if (nodes.length === 1 && nodes[0]!.type === 'Identifier') {
    return nodes[0];
  }
  return 'invalid';
}

function createInvalidLocalCallDiagnostic(fn: FunctionNode): DiagnosticWithDetachedLocation {
  const loc = fn.loc!;
  return {
    text: '`local(...)` must contain exactly one identifier.',
    category: 'error',
    start: { line: loc.start.line, column: loc.start.column },
    length: loc.end.offset - loc.start.offset,
  };
}
