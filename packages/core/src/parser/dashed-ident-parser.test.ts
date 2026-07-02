import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { fakeAtRule, fakeDeclaration } from '../test/ast.js';
import {
  isDashedIdentAtRuleName,
  parseDashedIdentAtRule,
  parseDashedIdentContainerQuery,
  parseDashedIdentDecl,
  parseDashedIdentMediaQuery,
} from './dashed-ident-parser.js';

describe('isDashedIdentAtRuleName', () => {
  test.each([
    ['property', true],
    ['custom-media', true],
    ['font-palette-values', true],
    ['position-try', true],
    ['keyframes', false],
    ['import', false],
  ])('%s -> %s', (name, expected) => {
    expect(isDashedIdentAtRuleName(name)).toBe(expected);
  });
});

describe('parseDashedIdentDecl', () => {
  test('extracts a local token from a custom property declaration', () => {
    expect(parseDashedIdentDecl(fakeDeclaration('.a { --foo: red }'))).toMatchInlineSnapshot(`
      {
        "localTokens": [
          {
            "loc": {
              "end": {
                "column": 11,
                "line": 1,
                "offset": 10,
              },
              "start": {
                "column": 6,
                "line": 1,
                "offset": 5,
              },
            },
            "name": "--foo",
          },
        ],
        "references": [],
      }
    `);
  });

  test('extracts a local reference from var()', () => {
    expect(parseDashedIdentDecl(fakeDeclaration('.a { color: var(--foo) }'))).toMatchInlineSnapshot(`
      {
        "localTokens": [],
        "references": [
          {
            "loc": {
              "end": {
                "column": 22,
                "line": 1,
                "offset": 21,
              },
              "start": {
                "column": 17,
                "line": 1,
                "offset": 16,
              },
            },
            "name": "--foo",
            "type": "local",
          },
        ],
      }
    `);
  });

  test('extracts an external reference from var() with a file specifier', () => {
    expect(parseDashedIdentDecl(fakeDeclaration(`.a { color: var(--foo from "./b.module.css") }`)))
      .toMatchInlineSnapshot(`
      {
        "localTokens": [],
        "references": [
          {
            "entries": [
              {
                "loc": {
                  "end": {
                    "column": 22,
                    "line": 1,
                    "offset": 21,
                  },
                  "start": {
                    "column": 17,
                    "line": 1,
                    "offset": 16,
                  },
                },
                "name": "--foo",
              },
            ],
            "from": "./b.module.css",
            "fromLoc": {
              "end": {
                "column": 43,
                "line": 1,
                "offset": 42,
              },
              "start": {
                "column": 29,
                "line": 1,
                "offset": 28,
              },
            },
            "type": "external",
          },
        ],
      }
    `);
  });

  test('omits a reference from var() with a global specifier', () => {
    expect(parseDashedIdentDecl(fakeDeclaration('.a { color: var(--foo from global) }'))).toMatchInlineSnapshot(`
      {
        "localTokens": [],
        "references": [],
      }
    `);
  });

  // MEMO: css-modules-kit does not guarantee how a malformed `from` clause is parsed, but the current
  // implementation falls back to a local reference. This test merely documents that behavior.
  test('extracts a local reference from var() with a malformed from clause', () => {
    expect(parseDashedIdentDecl(fakeDeclaration('.a { color: var(--foo from bar) }'))).toMatchInlineSnapshot(`
      {
        "localTokens": [],
        "references": [
          {
            "loc": {
              "end": {
                "column": 22,
                "line": 1,
                "offset": 21,
              },
              "start": {
                "column": 17,
                "line": 1,
                "offset": 16,
              },
            },
            "name": "--foo",
            "type": "local",
          },
        ],
      }
    `);
  });

  test('extracts a local reference nested in a var() fallback', () => {
    expect(parseDashedIdentDecl(fakeDeclaration('.a { color: var(--foo, var(--fallback)) }'))).toMatchInlineSnapshot(`
      {
        "localTokens": [],
        "references": [
          {
            "loc": {
              "end": {
                "column": 22,
                "line": 1,
                "offset": 21,
              },
              "start": {
                "column": 17,
                "line": 1,
                "offset": 16,
              },
            },
            "name": "--foo",
            "type": "local",
          },
          {
            "loc": {
              "end": {
                "column": 38,
                "line": 1,
                "offset": 37,
              },
              "start": {
                "column": 28,
                "line": 1,
                "offset": 27,
              },
            },
            "name": "--fallback",
            "type": "local",
          },
        ],
      }
    `);
  });

  test('extracts a local reference from a var() nested in another function', () => {
    expect(parseDashedIdentDecl(fakeDeclaration('.a { color: rgb(var(--foo)) }'))).toMatchInlineSnapshot(`
      {
        "localTokens": [],
        "references": [
          {
            "loc": {
              "end": {
                "column": 26,
                "line": 1,
                "offset": 25,
              },
              "start": {
                "column": 21,
                "line": 1,
                "offset": 20,
              },
            },
            "name": "--foo",
            "type": "local",
          },
        ],
      }
    `);
  });

  test('extracts a local reference from env()', () => {
    expect(parseDashedIdentDecl(fakeDeclaration('.a { color: env(--foo) }'))).toMatchInlineSnapshot(`
      {
        "localTokens": [],
        "references": [
          {
            "loc": {
              "end": {
                "column": 22,
                "line": 1,
                "offset": 21,
              },
              "start": {
                "column": 17,
                "line": 1,
                "offset": 16,
              },
            },
            "name": "--foo",
            "type": "local",
          },
        ],
      }
    `);
  });

  test('omits a reference from env() with a non-dashed-ident name', () => {
    expect(parseDashedIdentDecl(fakeDeclaration('.a { color: env(safe-area-inset-top) }'))).toMatchInlineSnapshot(`
      {
        "localTokens": [],
        "references": [],
      }
    `);
  });

  test('extracts a local reference from font-palette', () => {
    expect(parseDashedIdentDecl(fakeDeclaration('.a { font-palette: --foo }'))).toMatchInlineSnapshot(`
      {
        "localTokens": [],
        "references": [
          {
            "loc": {
              "end": {
                "column": 25,
                "line": 1,
                "offset": 24,
              },
              "start": {
                "column": 20,
                "line": 1,
                "offset": 19,
              },
            },
            "name": "--foo",
            "type": "local",
          },
        ],
      }
    `);
  });

  test('extracts a local token from a name-defining property value', () => {
    expect(parseDashedIdentDecl(fakeDeclaration('.a { anchor-name: --foo }'))).toMatchInlineSnapshot(`
      {
        "localTokens": [
          {
            "loc": {
              "end": {
                "column": 24,
                "line": 1,
                "offset": 23,
              },
              "start": {
                "column": 19,
                "line": 1,
                "offset": 18,
              },
            },
            "name": "--foo",
          },
        ],
        "references": [],
      }
    `);
  });

  test('extracts a local reference from an anchor() function', () => {
    expect(parseDashedIdentDecl(fakeDeclaration('.a { top: anchor(--foo top) }'))).toMatchInlineSnapshot(`
      {
        "localTokens": [],
        "references": [
          {
            "loc": {
              "end": {
                "column": 23,
                "line": 1,
                "offset": 22,
              },
              "start": {
                "column": 18,
                "line": 1,
                "offset": 17,
              },
            },
            "name": "--foo",
            "type": "local",
          },
        ],
      }
    `);
  });

  test('extracts a local reference from an anchor-size() function', () => {
    expect(parseDashedIdentDecl(fakeDeclaration('.a { width: anchor-size(--foo width) }'))).toMatchInlineSnapshot(`
      {
        "localTokens": [],
        "references": [
          {
            "loc": {
              "end": {
                "column": 30,
                "line": 1,
                "offset": 29,
              },
              "start": {
                "column": 25,
                "line": 1,
                "offset": 24,
              },
            },
            "name": "--foo",
            "type": "local",
          },
        ],
      }
    `);
  });

  test('omits a token from a bare dashed-ident in an unrecognized property', () => {
    expect(parseDashedIdentDecl(fakeDeclaration('.a { width: --foo }'))).toMatchInlineSnapshot(`
      {
        "localTokens": [],
        "references": [],
      }
    `);
  });
});

describe('parseDashedIdentAtRule', () => {
  test('extracts the name from a block at-rule', () => {
    expect(
      parseDashedIdentAtRule(
        fakeAtRule(dedent`
          @property --foo {
            syntax: "<color>";
            inherits: false;
            initial-value: red;
          }
        `),
      ),
    ).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "token": {
          "declarationLoc": {
            "end": {
              "column": 2,
              "line": 5,
              "offset": 81,
            },
            "start": {
              "column": 1,
              "line": 1,
              "offset": 0,
            },
          },
          "loc": {
            "end": {
              "column": 16,
              "line": 1,
              "offset": 15,
            },
            "start": {
              "column": 11,
              "line": 1,
              "offset": 10,
            },
          },
          "name": "--foo",
        },
      }
    `);
  });

  test('extracts the name from a statement at-rule', () => {
    expect(parseDashedIdentAtRule(fakeAtRule('@custom-media --foo (min-width: 30em);'))).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "token": {
          "declarationLoc": {
            "end": {
              "column": 38,
              "line": 1,
              "offset": 37,
            },
            "start": {
              "column": 1,
              "line": 1,
              "offset": 0,
            },
          },
          "loc": {
            "end": {
              "column": 20,
              "line": 1,
              "offset": 19,
            },
            "start": {
              "column": 15,
              "line": 1,
              "offset": 14,
            },
          },
          "name": "--foo",
        },
      }
    `);
  });
});

describe('parseDashedIdentMediaQuery', () => {
  test('extracts a reference from a custom media query', () => {
    expect(parseDashedIdentMediaQuery(fakeAtRule('@media (--narrow) and (min-width: 30em) {}'))).toMatchInlineSnapshot(`
      [
        {
          "loc": {
            "end": {
              "column": 17,
              "line": 1,
              "offset": 16,
            },
            "start": {
              "column": 9,
              "line": 1,
              "offset": 8,
            },
          },
          "name": "--narrow",
          "type": "local",
        },
      ]
    `);
  });

  test('omits a reference from a non-custom-media feature query', () => {
    expect(parseDashedIdentMediaQuery(fakeAtRule('@media (min-width: 30em) {}'))).toMatchInlineSnapshot(`[]`);
  });

  test('extracts a reference from a custom media query nested in a condition', () => {
    expect(parseDashedIdentMediaQuery(fakeAtRule('@media (not (--narrow)) {}'))).toMatchInlineSnapshot(`
      [
        {
          "loc": {
            "end": {
              "column": 22,
              "line": 1,
              "offset": 21,
            },
            "start": {
              "column": 14,
              "line": 1,
              "offset": 13,
            },
          },
          "name": "--narrow",
          "type": "local",
        },
      ]
    `);
  });
});

describe('parseDashedIdentContainerQuery', () => {
  test('extracts a reference from a style query', () => {
    expect(parseDashedIdentContainerQuery(fakeAtRule('@container style(--accent: blue) {}'))).toMatchInlineSnapshot(`
      [
        {
          "loc": {
            "end": {
              "column": 26,
              "line": 1,
              "offset": 25,
            },
            "start": {
              "column": 18,
              "line": 1,
              "offset": 17,
            },
          },
          "name": "--accent",
          "type": "local",
        },
      ]
    `);
  });

  test('extracts a reference from a style query in a named container', () => {
    expect(parseDashedIdentContainerQuery(fakeAtRule('@container sidebar style(--accent) {}'))).toMatchInlineSnapshot(`
      [
        {
          "loc": {
            "end": {
              "column": 34,
              "line": 1,
              "offset": 33,
            },
            "start": {
              "column": 26,
              "line": 1,
              "offset": 25,
            },
          },
          "name": "--accent",
          "type": "local",
        },
      ]
    `);
  });

  test('extracts a reference from a style feature nested in a style query', () => {
    expect(parseDashedIdentContainerQuery(fakeAtRule('@container style((--accent)) {}'))).toMatchInlineSnapshot(`
      [
        {
          "loc": {
            "end": {
              "column": 27,
              "line": 1,
              "offset": 26,
            },
            "start": {
              "column": 19,
              "line": 1,
              "offset": 18,
            },
          },
          "name": "--accent",
          "type": "local",
        },
      ]
    `);
  });

  test('extracts an external reference from a var() with a file specifier in a style query value', () => {
    expect(parseDashedIdentContainerQuery(fakeAtRule(`@container style(--a: var(--b from "./c.module.css")) {}`)))
      .toMatchInlineSnapshot(`
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
            "name": "--a",
            "type": "local",
          },
          {
            "entries": [
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
                "name": "--b",
              },
            ],
            "from": "./c.module.css",
            "fromLoc": {
              "end": {
                "column": 51,
                "line": 1,
                "offset": 50,
              },
              "start": {
                "column": 37,
                "line": 1,
                "offset": 36,
              },
            },
            "type": "external",
          },
        ]
      `);
  });

  test('extracts a reference from a var() in a style query value', () => {
    expect(parseDashedIdentContainerQuery(fakeAtRule('@container style(--accent: var(--theme)) {}')))
      .toMatchInlineSnapshot(`
      [
        {
          "loc": {
            "end": {
              "column": 26,
              "line": 1,
              "offset": 25,
            },
            "start": {
              "column": 18,
              "line": 1,
              "offset": 17,
            },
          },
          "name": "--accent",
          "type": "local",
        },
        {
          "loc": {
            "end": {
              "column": 39,
              "line": 1,
              "offset": 38,
            },
            "start": {
              "column": 32,
              "line": 1,
              "offset": 31,
            },
          },
          "name": "--theme",
          "type": "local",
        },
      ]
    `);
  });
});
