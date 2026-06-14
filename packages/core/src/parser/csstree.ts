import { fork, tokenize as baseTokenize, tokenTypes as baseTokenTypes } from 'css-tree';
import type { CssLocation, CssNode, List, ParseOptions, SyntaxParseError } from 'css-tree';
import type { Location, Position } from '../type.js';

// `tokenize` and `tokenTypes` are shipped by css-tree but missing from `@types/css-tree`.
declare module 'css-tree' {
  export function tokenize(source: string, onToken: (type: number, start: number, end: number) => void): void;
  export const tokenTypes: Record<string, number>;
}

/**
 * css-modules-kit treats `:local()`/`:global()` as functional pseudo-classes whose argument is a
 * selector list, and `@value` as an at-rule whose prelude is left unparsed. Without these, css-tree
 * would report parse errors for valid CSS Modules syntax.
 */
interface PreludeParseContext {
  Raw(consumeUntil: ((code: number) => number) | null, excludeWhiteSpace: boolean): CssNode;
  consumeUntilLeftCurlyBracketOrSemicolon(code: number): number;
  SelectorList(): CssNode;
  createSingleNodeList(node: CssNode): List<CssNode>;
}

const selectorListPseudo = {
  parse(this: PreludeParseContext): List<CssNode> {
    // eslint-disable-next-line new-cap -- `SelectorList` is a css-tree parser method.
    return this.createSingleNodeList(this.SelectorList());
  },
};

interface CmkSyntax {
  parse(text: string, options?: ParseOptions): CssNode;
  walk(ast: CssNode, options: { enter: (node: CssNode) => void }): void;
}

const forkExtension = {
  atrule: {
    value: {
      parse: {
        prelude(this: PreludeParseContext): List<CssNode> {
          // Keep trailing whitespace so the prelude spans up to the terminating `;`, matching `declarationLoc`.
          const consumeUntil = (code: number): number => this.consumeUntilLeftCurlyBracketOrSemicolon(code);
          // eslint-disable-next-line new-cap -- `Raw` is a css-tree parser method.
          const raw = this.Raw(consumeUntil, false);
          return this.createSingleNodeList(raw);
        },
        block: null,
      },
    },
  },
  pseudo: {
    local: selectorListPseudo,
    global: selectorListPseudo,
  },
};

const cmk = (fork as unknown as (extension: typeof forkExtension) => CmkSyntax)(forkExtension);

export const tokenTypes = baseTokenTypes;

export interface ParseCssOptions {
  fileName: string;
  onParseError?: ((error: SyntaxParseError) => void) | undefined;
}

export function parseCss(text: string, { fileName, onParseError }: ParseCssOptions): CssNode {
  return cmk.parse(text, { positions: true, filename: fileName, onParseError });
}

export function walk(ast: CssNode, enter: (node: CssNode) => void): void {
  cmk.walk(ast, { enter });
}

export function tokenize(source: string, onToken: (type: number, start: number, end: number) => void): void {
  baseTokenize(source, onToken);
}

/** Convert a css-tree location to a css-modules-kit {@link Location}. Both use exclusive ends and 0-based offsets. */
export function toLocation(loc: CssLocation): Location {
  return {
    start: { line: loc.start.line, column: loc.start.column, offset: loc.start.offset },
    end: { line: loc.end.line, column: loc.end.column, offset: loc.end.offset },
  };
}

/** Location of a quoted string's content, excluding the surrounding quotes. Quoted strings never span lines. */
export function stringInnerLocation(loc: CssLocation): Location {
  return {
    start: { line: loc.start.line, column: loc.start.column + 1, offset: loc.start.offset + 1 },
    end: { line: loc.end.line, column: loc.end.column - 1, offset: loc.end.offset - 1 },
  };
}

/**
 * Resolve the absolute {@link Position} of `index` within `source`, where `source` itself starts at `base`.
 * Used to locate ranges inside a {@link Raw} prelude that css-tree leaves unparsed.
 */
export function offsetToPosition(source: string, base: Position, index: number): Position {
  let { line, column } = base;
  for (let i = 0; i < index; i++) {
    if (source[i] === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column, offset: base.offset + index };
}
