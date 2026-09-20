import { describe, expect, test } from 'vite-plus/test';
import { fakeAtRule } from '../test/ast.js';
import { parseValueAtRule } from './at-value-parser.js';

describe('parseValueAtRule', () => {
  test('parses a value declaration', () => {
    expect(parseValueAtRule(fakeAtRule('@value a_1: red;'))).toMatchInlineSnapshot(`
      {
        "atValue": {
          "declarationLoc": {
            "end": {
              "column": 16,
              "line": 1,
              "offset": 15,
            },
            "start": {
              "column": 1,
              "line": 1,
              "offset": 0,
            },
          },
          "loc": {
            "end": {
              "column": 11,
              "line": 1,
              "offset": 10,
            },
            "start": {
              "column": 8,
              "line": 1,
              "offset": 7,
            },
          },
          "name": "a_1",
          "type": "declaration",
        },
        "diagnostics": [],
      }
    `);
  });

  test.each([
    ['without a colon', '@value a_1 red;'],
    ['with an empty value', '@value a_1:;'],
    ['with a comment as the value', '@value a_1:/* comment */;'],
    ['with parentheses and a colon in the value', '@value a_1: (max-width: 599px);'],
  ])('parses the name of a value declaration %s', (_, css) => {
    expect(parseValueAtRule(fakeAtRule(css))).toMatchObject({
      atValue: {
        type: 'declaration',
        name: 'a_1',
        loc: { start: { line: 1, column: 8, offset: 7 }, end: { line: 1, column: 11, offset: 10 } },
      },
      diagnostics: [],
    });
  });

  test('parses a value importer', () => {
    expect(parseValueAtRule(fakeAtRule(`@value a_1 from './a.module.css';`))).toMatchInlineSnapshot(`
      {
        "atValue": {
          "entries": [
            {
              "loc": {
                "end": {
                  "column": 11,
                  "line": 1,
                  "offset": 10,
                },
                "start": {
                  "column": 8,
                  "line": 1,
                  "offset": 7,
                },
              },
              "name": "a_1",
            },
          ],
          "from": "./a.module.css",
          "fromLoc": {
            "end": {
              "column": 32,
              "line": 1,
              "offset": 31,
            },
            "start": {
              "column": 18,
              "line": 1,
              "offset": 17,
            },
          },
          "type": "importer",
        },
        "diagnostics": [],
      }
    `);
  });

  test('parses an entry for each comma-separated name', () => {
    expect(parseValueAtRule(fakeAtRule(`@value a_1, a_2 from './a.module.css';`))).toMatchInlineSnapshot(`
      {
        "atValue": {
          "entries": [
            {
              "loc": {
                "end": {
                  "column": 11,
                  "line": 1,
                  "offset": 10,
                },
                "start": {
                  "column": 8,
                  "line": 1,
                  "offset": 7,
                },
              },
              "name": "a_1",
            },
            {
              "loc": {
                "end": {
                  "column": 16,
                  "line": 1,
                  "offset": 15,
                },
                "start": {
                  "column": 13,
                  "line": 1,
                  "offset": 12,
                },
              },
              "name": "a_2",
            },
          ],
          "from": "./a.module.css",
          "fromLoc": {
            "end": {
              "column": 37,
              "line": 1,
              "offset": 36,
            },
            "start": {
              "column": 23,
              "line": 1,
              "offset": 22,
            },
          },
          "type": "importer",
        },
        "diagnostics": [],
      }
    `);
  });

  test('parses the local name of an entry with `as`', () => {
    expect(parseValueAtRule(fakeAtRule(`@value a_1 as a_2 from './a.module.css';`))).toMatchInlineSnapshot(`
      {
        "atValue": {
          "entries": [
            {
              "loc": {
                "end": {
                  "column": 11,
                  "line": 1,
                  "offset": 10,
                },
                "start": {
                  "column": 8,
                  "line": 1,
                  "offset": 7,
                },
              },
              "localLoc": {
                "end": {
                  "column": 18,
                  "line": 1,
                  "offset": 17,
                },
                "start": {
                  "column": 15,
                  "line": 1,
                  "offset": 14,
                },
              },
              "localName": "a_2",
              "name": "a_1",
            },
          ],
          "from": "./a.module.css",
          "fromLoc": {
            "end": {
              "column": 39,
              "line": 1,
              "offset": 38,
            },
            "start": {
              "column": 25,
              "line": 1,
              "offset": 24,
            },
          },
          "type": "importer",
        },
        "diagnostics": [],
      }
    `);
  });

  test('matches the `from` and `as` keywords case-insensitively', () => {
    expect(parseValueAtRule(fakeAtRule(`@value a_1 AS a_2 FROM './a.module.css';`))).toMatchInlineSnapshot(`
      {
        "atValue": {
          "entries": [
            {
              "loc": {
                "end": {
                  "column": 11,
                  "line": 1,
                  "offset": 10,
                },
                "start": {
                  "column": 8,
                  "line": 1,
                  "offset": 7,
                },
              },
              "localLoc": {
                "end": {
                  "column": 18,
                  "line": 1,
                  "offset": 17,
                },
                "start": {
                  "column": 15,
                  "line": 1,
                  "offset": 14,
                },
              },
              "localName": "a_2",
              "name": "a_1",
            },
          ],
          "from": "./a.module.css",
          "fromLoc": {
            "end": {
              "column": 39,
              "line": 1,
              "offset": 38,
            },
            "start": {
              "column": 25,
              "line": 1,
              "offset": 24,
            },
          },
          "type": "importer",
        },
        "diagnostics": [],
      }
    `);
  });

  test('calculates locations when extra whitespace surrounds each part', () => {
    expect(parseValueAtRule(fakeAtRule(' @value  a_1 : red ;'))).toMatchInlineSnapshot(`
      {
        "atValue": {
          "declarationLoc": {
            "end": {
              "column": 20,
              "line": 1,
              "offset": 19,
            },
            "start": {
              "column": 2,
              "line": 1,
              "offset": 1,
            },
          },
          "loc": {
            "end": {
              "column": 13,
              "line": 1,
              "offset": 12,
            },
            "start": {
              "column": 10,
              "line": 1,
              "offset": 9,
            },
          },
          "name": "a_1",
          "type": "declaration",
        },
        "diagnostics": [],
      }
    `);
    expect(parseValueAtRule(fakeAtRule(` @value  a_1 ,  a_2  as  a_3  from  './a.module.css' ;`)))
      .toMatchInlineSnapshot(`
      {
        "atValue": {
          "entries": [
            {
              "loc": {
                "end": {
                  "column": 13,
                  "line": 1,
                  "offset": 12,
                },
                "start": {
                  "column": 10,
                  "line": 1,
                  "offset": 9,
                },
              },
              "name": "a_1",
            },
            {
              "loc": {
                "end": {
                  "column": 20,
                  "line": 1,
                  "offset": 19,
                },
                "start": {
                  "column": 17,
                  "line": 1,
                  "offset": 16,
                },
              },
              "localLoc": {
                "end": {
                  "column": 29,
                  "line": 1,
                  "offset": 28,
                },
                "start": {
                  "column": 26,
                  "line": 1,
                  "offset": 25,
                },
              },
              "localName": "a_3",
              "name": "a_2",
            },
          ],
          "from": "./a.module.css",
          "fromLoc": {
            "end": {
              "column": 52,
              "line": 1,
              "offset": 51,
            },
            "start": {
              "column": 38,
              "line": 1,
              "offset": 37,
            },
          },
          "type": "importer",
        },
        "diagnostics": [],
      }
    `);
  });

  test('reports a diagnostic for `@value` without a name', () => {
    expect(parseValueAtRule(fakeAtRule('@value;'))).toMatchInlineSnapshot(`
      {
        "diagnostics": [
          {
            "category": "error",
            "length": 7,
            "start": {
              "column": 1,
              "line": 1,
            },
            "text": "\`@value\` is a invalid syntax.",
          },
        ],
      }
    `);
  });

  test('reports a diagnostic for an empty entry and parses the other entries', () => {
    expect(parseValueAtRule(fakeAtRule(`@value a_1,,a_2 from './a.module.css';`))).toMatchInlineSnapshot(`
      {
        "atValue": {
          "entries": [
            {
              "loc": {
                "end": {
                  "column": 11,
                  "line": 1,
                  "offset": 10,
                },
                "start": {
                  "column": 8,
                  "line": 1,
                  "offset": 7,
                },
              },
              "name": "a_1",
            },
            {
              "loc": {
                "end": {
                  "column": 16,
                  "line": 1,
                  "offset": 15,
                },
                "start": {
                  "column": 13,
                  "line": 1,
                  "offset": 12,
                },
              },
              "name": "a_2",
            },
          ],
          "from": "./a.module.css",
          "fromLoc": {
            "end": {
              "column": 37,
              "line": 1,
              "offset": 36,
            },
            "start": {
              "column": 23,
              "line": 1,
              "offset": 22,
            },
          },
          "type": "importer",
        },
        "diagnostics": [
          {
            "category": "error",
            "length": 0,
            "start": {
              "column": 12,
              "line": 1,
            },
            "text": "\`\` is invalid syntax.",
          },
        ],
      }
    `);
  });

  // NOTE: Escape sequences in `@value` names are not supported by css-loader, so css-modules-kit does not
  // guarantee any specific behavior for them. The snapshots below document how the current
  // implementation parses them rather than a behavior we commit to.
  //
  // The `@value \31 e` case is tokenized as `\31` and `e` instead of a single ident `1e`,
  // because postcss-value-parser does not interpret CSS escape sequences in identifiers.
  // This is a known bug: https://github.com/postcss/postcss-value-parser/issues/64
  test('extracts the name without interpreting escape sequences', () => {
    expect(parseValueAtRule(fakeAtRule(String.raw`@value \\a_1: red;`))).toMatchInlineSnapshot(`
      {
        "atValue": {
          "declarationLoc": {
            "end": {
              "column": 18,
              "line": 1,
              "offset": 17,
            },
            "start": {
              "column": 1,
              "line": 1,
              "offset": 0,
            },
          },
          "loc": {
            "end": {
              "column": 13,
              "line": 1,
              "offset": 12,
            },
            "start": {
              "column": 8,
              "line": 1,
              "offset": 7,
            },
          },
          "name": "\\\\a_1",
          "type": "declaration",
        },
        "diagnostics": [],
      }
    `);
    expect(parseValueAtRule(fakeAtRule(String.raw`@value \'a_1: red;`))).toMatchInlineSnapshot(`
      {
        "atValue": {
          "declarationLoc": {
            "end": {
              "column": 18,
              "line": 1,
              "offset": 17,
            },
            "start": {
              "column": 1,
              "line": 1,
              "offset": 0,
            },
          },
          "loc": {
            "end": {
              "column": 13,
              "line": 1,
              "offset": 12,
            },
            "start": {
              "column": 8,
              "line": 1,
              "offset": 7,
            },
          },
          "name": "\\'a_1",
          "type": "declaration",
        },
        "diagnostics": [],
      }
    `);
    expect(parseValueAtRule(fakeAtRule(String.raw`@value \31 a_1: red;`))).toMatchInlineSnapshot(`
      {
        "atValue": {
          "declarationLoc": {
            "end": {
              "column": 20,
              "line": 1,
              "offset": 19,
            },
            "start": {
              "column": 1,
              "line": 1,
              "offset": 0,
            },
          },
          "loc": {
            "end": {
              "column": 11,
              "line": 1,
              "offset": 10,
            },
            "start": {
              "column": 8,
              "line": 1,
              "offset": 7,
            },
          },
          "name": "\\31",
          "type": "declaration",
        },
        "diagnostics": [],
      }
    `);
  });
});
