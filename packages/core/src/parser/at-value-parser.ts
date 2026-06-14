import type { Atrule, Raw } from 'css-tree';
import type { DiagnosticWithDetachedLocation, Location, Position } from '../type.js';
import { offsetToPosition, tokenize, tokenTypes } from './csstree.js';

const IDENT = tokenTypes['Ident']!;
const STRING = tokenTypes['String']!;
const COMMA = tokenTypes['Comma']!;
const WHITESPACE = tokenTypes['WhiteSpace']!;
const COMMENT = tokenTypes['Comment']!;

interface ValueDeclaration {
  type: 'declaration';
  name: string;
  loc: Location;
  /**
   * NOTE: The `declarationLoc` for value declaration does not include the trailing semicolon.
   * @example `@value white: #fff` has `declarationLoc` as `{ start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 19, offset: 18 } }`.
   */
  declarationLoc: Location;
}

interface ValueImporter {
  type: 'importer';
  entries: {
    name: string;
    loc: Location;
    localName?: string;
    localLoc?: Location;
  }[];
  from: string;
  fromLoc: Location;
}

type ParsedAtValue = ValueDeclaration | ValueImporter;

interface ParseAtValueResult {
  atValue?: ParsedAtValue;
  diagnostics: DiagnosticWithDetachedLocation[];
}

/** A token of the `@value` prelude with its absolute location. */
interface PreludeToken {
  type: number;
  value: string;
  start: Position;
  end: Position;
}

/**
 * Parse the `@value` rule.
 *
 * MEMO: css-modules-kit does not support `@value` with parentheses (e.g., `@value (a, b) from '...';`) to simplify the implementation.
 * MEMO: css-modules-kit does not support `@value` with variable module name (e.g., `@value a from moduleName;`) to simplify the implementation.
 */
export function parseAtValue(atValue: Atrule): ParseAtValueResult {
  const raw = getRawPrelude(atValue);
  if (raw === undefined) return invalidDeclaration(atValue, undefined);
  const tokens = tokenizePrelude(raw);
  if (isValueImporter(tokens)) {
    return parseValueImporter(raw, tokens);
  }
  return parseValueDeclaration(atValue, raw, tokens);
}

function getRawPrelude(atValue: Atrule): Raw | undefined {
  const prelude = atValue.prelude;
  if (prelude === null || prelude.type !== 'AtrulePrelude') return undefined;
  const first = prelude.children.first;
  return first !== null && first.type === 'Raw' ? first : undefined;
}

/** Tokenize the unparsed `@value` prelude, dropping whitespace and comments. */
function tokenizePrelude(raw: Raw): PreludeToken[] {
  const source = raw.value;
  const base = raw.loc!.start;
  const tokens: PreludeToken[] = [];
  tokenize(source, (type, start, end) => {
    if (type === WHITESPACE || type === COMMENT) return;
    tokens.push({
      type,
      value: source.slice(start, end),
      start: offsetToPosition(source, base, start),
      end: offsetToPosition(source, base, end),
    });
  });
  return tokens;
}

/** A value importer is one or more entries followed by `from` and a single quoted specifier. */
function isValueImporter(tokens: PreludeToken[]): boolean {
  const fromIndex = findFromKeywordIndex(tokens);
  if (fromIndex < 1) return false;
  const tail = tokens.slice(fromIndex + 1);
  return tail.length === 1 && tail[0]!.type === STRING;
}

function findFromKeywordIndex(tokens: PreludeToken[]): number {
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i]!;
    if (token.type === IDENT && token.value === 'from') return i;
  }
  return -1;
}

function parseValueImporter(raw: Raw, tokens: PreludeToken[]): ParseAtValueResult {
  const fromIndex = findFromKeywordIndex(tokens);
  const specifierToken = tokens[fromIndex + 1]!;

  const entries: ValueImporter['entries'] = [];
  const diagnostics: DiagnosticWithDetachedLocation[] = [];
  for (const item of splitByComma(tokens.slice(0, fromIndex), raw.loc!.start)) {
    const words = item.tokens.filter((token) => token.type === IDENT);
    const nameToken = words[0];
    // An empty item (e.g. the middle item in `a,,b`) has no name, so report it like `@value;`.
    if (nameToken === undefined) {
      diagnostics.push({
        start: { line: item.position.line, column: item.position.column },
        length: 0,
        text: '`` is invalid syntax.',
        category: 'error',
      });
      continue;
    }
    const entry: ValueImporter['entries'][number] = {
      name: nameToken.value,
      loc: { start: nameToken.start, end: nameToken.end },
    };
    const localToken = words[1]?.value === 'as' ? words[2] : undefined;
    if (localToken !== undefined) {
      entry.localName = localToken.value;
      entry.localLoc = { start: localToken.start, end: localToken.end };
    }
    entries.push(entry);
  }

  const parsedAtValue: ValueImporter = {
    type: 'importer',
    entries,
    from: unquote(specifierToken.value),
    fromLoc: innerStringLoc(specifierToken),
  };
  return { atValue: parsedAtValue, diagnostics };
}

function parseValueDeclaration(atValue: Atrule, raw: Raw, tokens: PreludeToken[]): ParseAtValueResult {
  const nameToken = tokens[0];
  if (nameToken === undefined || nameToken.type !== IDENT) {
    return invalidDeclaration(atValue, raw);
  }
  const parsedAtValue: ValueDeclaration = {
    type: 'declaration',
    name: nameToken.value,
    loc: { start: nameToken.start, end: nameToken.end },
    declarationLoc: { start: toPosition(atValue.loc!.start), end: toPosition(raw.loc!.end) },
  };
  return { atValue: parsedAtValue, diagnostics: [] };
}

function invalidDeclaration(atValue: Atrule, raw: Raw | undefined): ParseAtValueResult {
  const loc = atValue.loc!;
  const text = raw === undefined ? `@${atValue.name}` : `@${atValue.name} ${raw.value}`;
  return {
    diagnostics: [
      {
        start: { line: loc.start.line, column: loc.start.column },
        length: loc.end.offset - loc.start.offset,
        text: `\`${text}\` is a invalid syntax.`,
        category: 'error',
      },
    ],
  };
}

interface ImportItem {
  tokens: PreludeToken[];
  /** The position where the item begins, used to locate an empty item. */
  position: Position;
}

/** Split the tokens by top-level commas. */
function splitByComma(tokens: PreludeToken[], start: Position): ImportItem[] {
  const items: ImportItem[] = [{ tokens: [], position: start }];
  for (const token of tokens) {
    if (token.type === COMMA) {
      items.push({ tokens: [], position: token.end });
    } else {
      items.at(-1)!.tokens.push(token);
    }
  }
  return items;
}

function unquote(value: string): string {
  return value.slice(1, -1);
}

/** Location of a quoted specifier token's content, excluding the surrounding quotes. */
function innerStringLoc(token: PreludeToken): Location {
  return {
    start: { line: token.start.line, column: token.start.column + 1, offset: token.start.offset + 1 },
    end: { line: token.end.line, column: token.end.column - 1, offset: token.end.offset - 1 },
  };
}

function toPosition(p: { line: number; column: number; offset: number }): Position {
  return { line: p.line, column: p.column, offset: p.offset };
}
