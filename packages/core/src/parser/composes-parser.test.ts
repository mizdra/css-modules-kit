import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { fakeDeclaration } from '../test/ast.js';
import { isComposesProp, parseComposesProp } from './composes-parser.js';

describe('isComposesProp', () => {
  test.each([
    ['composes', true],
    ['Composes', true],
    ['COMPOSES', true],
    ['compose-with', false],
    ['a-composes', false],
    ['composes-b', false],
    ['color', false],
  ])('%s -> %s', (prop, expected) => {
    expect(isComposesProp(prop)).toBe(expected);
  });
});

describe('parseComposesProp', () => {
  test('extracts a local reference from a single class name', () => {
    const decl = fakeDeclaration('.a_1 { composes: a_2 }');
    expect(parseComposesProp(decl)).toMatchInlineSnapshot(`
      [
        {
          "loc": {
            "end": {
              "column": 21,
              "line": 1,
              "offset": 20,
            },
            "start": {
              "column": 18,
              "line": 1,
              "offset": 17,
            },
          },
          "name": "a_2",
          "type": "local",
        },
      ]
    `);
  });

  test('extracts a local reference for each space-separated class name', () => {
    const decl = fakeDeclaration('.a_1 { composes: a_2 a_3 }');
    expect(parseComposesProp(decl)).toMatchInlineSnapshot(`
      [
        {
          "loc": {
            "end": {
              "column": 21,
              "line": 1,
              "offset": 20,
            },
            "start": {
              "column": 18,
              "line": 1,
              "offset": 17,
            },
          },
          "name": "a_2",
          "type": "local",
        },
        {
          "loc": {
            "end": {
              "column": 25,
              "line": 1,
              "offset": 24,
            },
            "start": {
              "column": 22,
              "line": 1,
              "offset": 21,
            },
          },
          "name": "a_3",
          "type": "local",
        },
      ]
    `);
  });

  test('extracts a local reference for each comma-separated class name', () => {
    const decl = fakeDeclaration('.a_1 { composes: a_2, a_3 }');
    expect(parseComposesProp(decl)).toMatchInlineSnapshot(`
      [
        {
          "loc": {
            "end": {
              "column": 21,
              "line": 1,
              "offset": 20,
            },
            "start": {
              "column": 18,
              "line": 1,
              "offset": 17,
            },
          },
          "name": "a_2",
          "type": "local",
        },
        {
          "loc": {
            "end": {
              "column": 26,
              "line": 1,
              "offset": 25,
            },
            "start": {
              "column": 23,
              "line": 1,
              "offset": 22,
            },
          },
          "name": "a_3",
          "type": "local",
        },
      ]
    `);
  });

  test('skips class name inside global()', () => {
    const decl = fakeDeclaration('.a_1 { composes: global(a_2) }');
    expect(parseComposesProp(decl)).toMatchInlineSnapshot(`[]`);
  });

  test('skips items with `from global`', () => {
    const decl = fakeDeclaration('.a_1 { composes: a_2 a_3 from global }');
    expect(parseComposesProp(decl)).toMatchInlineSnapshot(`[]`);
  });

  test('extracts an external reference from an item with a `from` specifier', () => {
    const decl = fakeDeclaration(`.a_1 { composes: a_2 from './a.module.css' }`);
    expect(parseComposesProp(decl)).toMatchInlineSnapshot(`
      [
        {
          "entries": [
            {
              "loc": {
                "end": {
                  "column": 21,
                  "line": 1,
                  "offset": 20,
                },
                "start": {
                  "column": 18,
                  "line": 1,
                  "offset": 17,
                },
              },
              "name": "a_2",
            },
          ],
          "from": "./a.module.css",
          "fromLoc": {
            "end": {
              "column": 42,
              "line": 1,
              "offset": 41,
            },
            "start": {
              "column": 28,
              "line": 1,
              "offset": 27,
            },
          },
          "type": "external",
        },
      ]
    `);
  });

  test('extracts an external reference with an entry for each class name', () => {
    const decl = fakeDeclaration(`.a_1 { composes: a_2 a_3 from './a.module.css' }`);
    expect(parseComposesProp(decl)).toMatchInlineSnapshot(`
      [
        {
          "entries": [
            {
              "loc": {
                "end": {
                  "column": 21,
                  "line": 1,
                  "offset": 20,
                },
                "start": {
                  "column": 18,
                  "line": 1,
                  "offset": 17,
                },
              },
              "name": "a_2",
            },
            {
              "loc": {
                "end": {
                  "column": 25,
                  "line": 1,
                  "offset": 24,
                },
                "start": {
                  "column": 22,
                  "line": 1,
                  "offset": 21,
                },
              },
              "name": "a_3",
            },
          ],
          "from": "./a.module.css",
          "fromLoc": {
            "end": {
              "column": 46,
              "line": 1,
              "offset": 45,
            },
            "start": {
              "column": 32,
              "line": 1,
              "offset": 31,
            },
          },
          "type": "external",
        },
      ]
    `);
  });

  test('extracts local and external references according to the `from` clause of each item', () => {
    const decl = fakeDeclaration(`.a_1 { composes: a_2, a_3 from './a.module.css', a_4 from global, a_5 }`);
    expect(parseComposesProp(decl)).toMatchInlineSnapshot(`
      [
        {
          "loc": {
            "end": {
              "column": 21,
              "line": 1,
              "offset": 20,
            },
            "start": {
              "column": 18,
              "line": 1,
              "offset": 17,
            },
          },
          "name": "a_2",
          "type": "local",
        },
        {
          "entries": [
            {
              "loc": {
                "end": {
                  "column": 26,
                  "line": 1,
                  "offset": 25,
                },
                "start": {
                  "column": 23,
                  "line": 1,
                  "offset": 22,
                },
              },
              "name": "a_3",
            },
          ],
          "from": "./a.module.css",
          "fromLoc": {
            "end": {
              "column": 47,
              "line": 1,
              "offset": 46,
            },
            "start": {
              "column": 33,
              "line": 1,
              "offset": 32,
            },
          },
          "type": "external",
        },
        {
          "loc": {
            "end": {
              "column": 70,
              "line": 1,
              "offset": 69,
            },
            "start": {
              "column": 67,
              "line": 1,
              "offset": 66,
            },
          },
          "name": "a_5",
          "type": "local",
        },
      ]
    `);
  });

  test('extracts local references from an item where `from` is not preceded by class names', () => {
    const decl = fakeDeclaration('.a_1 { composes: from global }');
    expect(parseComposesProp(decl)).toMatchInlineSnapshot(`
      [
        {
          "loc": {
            "end": {
              "column": 22,
              "line": 1,
              "offset": 21,
            },
            "start": {
              "column": 18,
              "line": 1,
              "offset": 17,
            },
          },
          "name": "from",
          "type": "local",
        },
        {
          "loc": {
            "end": {
              "column": 29,
              "line": 1,
              "offset": 28,
            },
            "start": {
              "column": 23,
              "line": 1,
              "offset": 22,
            },
          },
          "name": "global",
          "type": "local",
        },
      ]
    `);
  });

  test('extracts local references from an item whose `from` clause is invalid', () => {
    const decl = fakeDeclaration('.a_1 { composes: a_2 from a_3 }');
    expect(parseComposesProp(decl)).toMatchInlineSnapshot(`
      [
        {
          "loc": {
            "end": {
              "column": 21,
              "line": 1,
              "offset": 20,
            },
            "start": {
              "column": 18,
              "line": 1,
              "offset": 17,
            },
          },
          "name": "a_2",
          "type": "local",
        },
        {
          "loc": {
            "end": {
              "column": 26,
              "line": 1,
              "offset": 25,
            },
            "start": {
              "column": 22,
              "line": 1,
              "offset": 21,
            },
          },
          "name": "from",
          "type": "local",
        },
        {
          "loc": {
            "end": {
              "column": 30,
              "line": 1,
              "offset": 29,
            },
            "start": {
              "column": 27,
              "line": 1,
              "offset": 26,
            },
          },
          "name": "a_3",
          "type": "local",
        },
      ]
    `);
  });

  test('extracts references on lines after the declaration start', () => {
    const decl = fakeDeclaration(dedent`
      .a_1 {
        composes:
          a_2,
          a_3 from global,
          a_4;
      }
    `);
    expect(parseComposesProp(decl)).toMatchInlineSnapshot(`
      [
        {
          "loc": {
            "end": {
              "column": 8,
              "line": 3,
              "offset": 26,
            },
            "start": {
              "column": 5,
              "line": 3,
              "offset": 23,
            },
          },
          "name": "a_2",
          "type": "local",
        },
        {
          "loc": {
            "end": {
              "column": 8,
              "line": 5,
              "offset": 56,
            },
            "start": {
              "column": 5,
              "line": 5,
              "offset": 53,
            },
          },
          "name": "a_4",
          "type": "local",
        },
      ]
    `);
  });
});
