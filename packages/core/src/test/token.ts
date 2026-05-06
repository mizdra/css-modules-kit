import type { AllTokenImporter, NamedTokenImporter, NamedTokenImporterEntry, Token } from '../type.js';

const fakeLoc = { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } };

export function fakeToken(args?: Partial<Token>): Token {
  return { name: 'name', loc: fakeLoc, ...args };
}

export function fakeAllTokenImporter(args?: Omit<Partial<AllTokenImporter>, 'type'>): AllTokenImporter {
  return {
    type: 'all',
    from: '/test.module.css',
    fromLoc: fakeLoc,
    ...args,
  };
}

export function fakeNamedTokenImporter(args?: Omit<Partial<NamedTokenImporter>, 'type'>): NamedTokenImporter {
  return {
    type: 'named',
    from: '/test.module.css',
    entries: [],
    fromLoc: fakeLoc,
    ...args,
  };
}

export function fakeNamedTokenImporterEntry(args?: Partial<NamedTokenImporterEntry>): NamedTokenImporterEntry {
  return {
    name: 'name',
    loc: fakeLoc,
    ...args,
  };
}
