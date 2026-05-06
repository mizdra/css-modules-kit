import type { AllTokenImporter, NamedTokenImporter, NamedTokenImporterSpecifier, Token } from '../type.js';

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
    specifiers: [],
    fromLoc: fakeLoc,
    ...args,
  };
}

export function fakeNamedTokenImporterSpecifier(
  args?: Partial<NamedTokenImporterSpecifier>,
): NamedTokenImporterSpecifier {
  return {
    name: 'name',
    loc: fakeLoc,
    ...args,
  };
}
