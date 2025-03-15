import type { AtImportTokenImporter, AtValueTokenImporter, Token } from '../parser/css-module-parser.js';

const fakeLoc = { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } };

export function fakeToken(name: string): Token {
  return { name, loc: fakeLoc };
}

export function fakeAtImportTokenImporter(from: string): AtImportTokenImporter {
  return {
    type: 'import',
    from,
    fromLoc: fakeLoc,
  };
}

export function fakeAtValueTokenImporter(from: string, valueNames: string[]): AtValueTokenImporter {
  return {
    type: 'value',
    from,
    values: valueNames.map((name) => ({ name, loc: fakeLoc })),
    fromLoc: fakeLoc,
  };
}
