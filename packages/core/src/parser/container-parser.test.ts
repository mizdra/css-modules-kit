import { describe, expect, test } from 'vite-plus/test';
import { fakeAtRule, fakeDeclaration } from '../test/ast.js';
import {
  isContainerAtRuleName,
  isContainerNameProp,
  isContainerProp,
  parseContainerAtRule,
  parseContainerNameProp,
  parseContainerProp,
} from './container-parser.js';

describe('isContainerNameProp', () => {
  test.each([
    ['container-name', true],
    ['Container-Name', true],
    ['container', false],
    ['color', false],
  ])('%s -> %s', (prop, expected) => {
    expect(isContainerNameProp(prop)).toBe(expected);
  });
});

describe('isContainerProp', () => {
  test.each([
    ['container', true],
    ['Container', true],
    ['container-name', false],
    ['color', false],
  ])('%s -> %s', (prop, expected) => {
    expect(isContainerProp(prop)).toBe(expected);
  });
});

describe('isContainerAtRuleName', () => {
  test.each([
    ['container', true],
    ['Container', true],
    ['media', false],
  ])('%s -> %s', (name, expected) => {
    expect(isContainerAtRuleName(name)).toBe(expected);
  });
});

describe('parseContainerNameProp', () => {
  test('extracts tokens from container-name declaration', () => {
    const decl = fakeDeclaration('.a_1 { container-name: foo }');
    expect(parseContainerNameProp(decl)).toMatchInlineSnapshot(`
      [
        {
          "declarationLoc": {
            "end": {
              "column": 27,
              "line": 1,
              "offset": 26,
            },
            "start": {
              "column": 8,
              "line": 1,
              "offset": 7,
            },
          },
          "loc": {
            "end": {
              "column": 27,
              "line": 1,
              "offset": 26,
            },
            "start": {
              "column": 24,
              "line": 1,
              "offset": 23,
            },
          },
          "name": "foo",
        },
      ]
    `);
  });

  test('extracts multiple tokens from space-separated container-name', () => {
    const decl = fakeDeclaration('.a_1 { container-name: foo bar }');
    expect(parseContainerNameProp(decl).map((token) => token.name)).toMatchInlineSnapshot(`
      [
        "foo",
        "bar",
      ]
    `);
  });

  test('omits reserved keywords from container-name', () => {
    const decl = fakeDeclaration(
      '.a_1 { container-name: none and not or inherit initial unset revert revert-layer default NONE }',
    );
    expect(parseContainerNameProp(decl)).toMatchInlineSnapshot(`[]`);
  });

  test('omits non-ident words from container-name', () => {
    const decl = fakeDeclaration('.a_1 { container-name: 1foo }');
    expect(parseContainerNameProp(decl)).toMatchInlineSnapshot(`[]`);
  });
});

describe('parseContainerProp', () => {
  test('extracts tokens before the slash from container shorthand', () => {
    const decl = fakeDeclaration('.a_1 { container: foo bar / inline-size }');
    expect(parseContainerProp(decl).map((token) => token.name)).toMatchInlineSnapshot(`
      [
        "foo",
        "bar",
      ]
    `);
  });

  test('extracts tokens from container shorthand without a container-type', () => {
    const decl = fakeDeclaration('.a_1 { container: foo bar }');
    expect(parseContainerProp(decl).map((token) => token.name)).toMatchInlineSnapshot(`
      [
        "foo",
        "bar",
      ]
    `);
  });
});

describe('parseContainerAtRule', () => {
  test('extracts a token reference from @container prelude', () => {
    const atRule = fakeAtRule('@container foo (width > 400px) {}');
    expect(parseContainerAtRule(atRule)).toMatchInlineSnapshot(`
      {
        "loc": {
          "end": {
            "column": 15,
            "line": 1,
            "offset": 14,
          },
          "start": {
            "column": 12,
            "line": 1,
            "offset": 11,
          },
        },
        "name": "foo",
        "type": "local",
      }
    `);
  });

  test('omits reference when @container prelude has no name', () => {
    const atRule = fakeAtRule('@container (width > 400px) {}');
    expect(parseContainerAtRule(atRule)).toBeUndefined();
  });

  test('omits reference when @container prelude starts with a reserved keyword', () => {
    const atRule = fakeAtRule('@container not (width > 400px) {}');
    expect(parseContainerAtRule(atRule)).toBeUndefined();
  });
});
