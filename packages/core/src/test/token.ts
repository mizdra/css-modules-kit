import type { AtImportTokenImporter, AtValueTokenImporter, Token } from '../type.js';

const fakeLoc = { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } };

export function fakeToken(args?: Partial<Token>): Token {
  return { name: 'name', loc: fakeLoc, ...args };
}

export function fakeAtImportTokenImporter(args?: Omit<Partial<AtImportTokenImporter>, 'type'>): AtImportTokenImporter {
  return {
    type: 'import',
    from: '/test.module.css',
    fromLoc: fakeLoc,
    ...args,
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
