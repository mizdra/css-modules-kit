import type { AtImportTokenImporter, AtValueTokenImporter, AtValueTokenImporterValue, Token } from '../type.js';

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

export function fakeAtValueTokenImporter(args?: Omit<Partial<AtValueTokenImporter>, 'type'>): AtValueTokenImporter {
  return {
    type: 'value',
    from: '/test.module.css',
    values: [],
    fromLoc: fakeLoc,
    ...args,
  };
}

export function fakeAtValueTokenImporterValue(args?: Partial<AtValueTokenImporterValue>): AtValueTokenImporterValue {
  return {
    name: 'name',
    loc: fakeLoc,
    ...args,
  };
}
