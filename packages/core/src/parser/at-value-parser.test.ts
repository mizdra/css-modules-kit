import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { fakeAtValues, fakeRoot } from '../test/ast.js';
import { parseAtValue } from './at-value-parser.js';

describe('parseAtValue', () => {
  test('parses syntax supported by css-loader', () => {
    const atValues = fakeAtValues(
      fakeRoot(dedent`
        @value basic: #000;
        @value withoutColon #000;
        @value empty:;
        @value comment:/* comment */;
        @value complex: (max-width: 599px);
        @value import from "test.css";
        @value import1, import2 from "test.css";
        @value import3 as alias1 from "test.css";
         @value  withSpace1 : #000 ;
         @value  withSpace2 ,  withSpace3  as  alias2  from  "test.css" ;
      `),
    );
    const result = atValues.map(parseAtValue);
    expect(result).toMatchInlineSnapshot(`
      [
        {
          "atValue": {
            "declarationLoc": {
              "end": {
                "column": 19,
                "line": 1,
                "offset": 18,
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
            "name": "basic",
            "type": "valueDeclaration",
          },
          "diagnostics": [],
        },
        {
          "atValue": {
            "declarationLoc": {
              "end": {
                "column": 25,
                "line": 2,
                "offset": 44,
              },
              "start": {
                "column": 1,
                "line": 2,
                "offset": 20,
              },
            },
            "loc": {
              "end": {
                "column": 20,
                "line": 2,
                "offset": 39,
              },
              "start": {
                "column": 8,
                "line": 2,
                "offset": 27,
              },
            },
            "name": "withoutColon",
            "type": "valueDeclaration",
          },
          "diagnostics": [],
        },
        {
          "atValue": {
            "declarationLoc": {
              "end": {
                "column": 14,
                "line": 3,
                "offset": 59,
              },
              "start": {
                "column": 1,
                "line": 3,
                "offset": 46,
              },
            },
            "loc": {
              "end": {
                "column": 13,
                "line": 3,
                "offset": 58,
              },
              "start": {
                "column": 8,
                "line": 3,
                "offset": 53,
              },
            },
            "name": "empty",
            "type": "valueDeclaration",
          },
          "diagnostics": [],
        },
        {
          "atValue": {
            "declarationLoc": {
              "end": {
                "column": 29,
                "line": 4,
                "offset": 89,
              },
              "start": {
                "column": 1,
                "line": 4,
                "offset": 61,
              },
            },
            "loc": {
              "end": {
                "column": 15,
                "line": 4,
                "offset": 75,
              },
              "start": {
                "column": 8,
                "line": 4,
                "offset": 68,
              },
            },
            "name": "comment",
            "type": "valueDeclaration",
          },
          "diagnostics": [],
        },
        {
          "atValue": {
            "declarationLoc": {
              "end": {
                "column": 35,
                "line": 5,
                "offset": 125,
              },
              "start": {
                "column": 1,
                "line": 5,
                "offset": 91,
              },
            },
            "loc": {
              "end": {
                "column": 15,
                "line": 5,
                "offset": 105,
              },
              "start": {
                "column": 8,
                "line": 5,
                "offset": 98,
              },
            },
            "name": "complex",
            "type": "valueDeclaration",
          },
          "diagnostics": [],
        },
        {
          "atValue": {
            "from": "test.css",
            "fromLoc": {
              "end": {
                "column": 29,
                "line": 6,
                "offset": 155,
              },
              "start": {
                "column": 21,
                "line": 6,
                "offset": 147,
              },
            },
            "type": "valueImportDeclaration",
            "values": [
              {
                "loc": {
                  "end": {
                    "column": 14,
                    "line": 6,
                    "offset": 140,
                  },
                  "start": {
                    "column": 8,
                    "line": 6,
                    "offset": 134,
                  },
                },
                "name": "import",
              },
            ],
          },
          "diagnostics": [],
        },
        {
          "atValue": {
            "from": "test.css",
            "fromLoc": {
              "end": {
                "column": 39,
                "line": 7,
                "offset": 196,
              },
              "start": {
                "column": 31,
                "line": 7,
                "offset": 188,
              },
            },
            "type": "valueImportDeclaration",
            "values": [
              {
                "loc": {
                  "end": {
                    "column": 15,
                    "line": 7,
                    "offset": 172,
                  },
                  "start": {
                    "column": 8,
                    "line": 7,
                    "offset": 165,
                  },
                },
                "name": "import1",
              },
              {
                "loc": {
                  "end": {
                    "column": 24,
                    "line": 7,
                    "offset": 181,
                  },
                  "start": {
                    "column": 17,
                    "line": 7,
                    "offset": 174,
                  },
                },
                "name": "import2",
              },
            ],
          },
          "diagnostics": [],
        },
        {
          "atValue": {
            "from": "test.css",
            "fromLoc": {
              "end": {
                "column": 40,
                "line": 8,
                "offset": 238,
              },
              "start": {
                "column": 32,
                "line": 8,
                "offset": 230,
              },
            },
            "type": "valueImportDeclaration",
            "values": [
              {
                "loc": {
                  "end": {
                    "column": 15,
                    "line": 8,
                    "offset": 213,
                  },
                  "start": {
                    "column": 8,
                    "line": 8,
                    "offset": 206,
                  },
                },
                "localLoc": {
                  "end": {
                    "column": 25,
                    "line": 8,
                    "offset": 223,
                  },
                  "start": {
                    "column": 19,
                    "line": 8,
                    "offset": 217,
                  },
                },
                "localName": "alias1",
                "name": "import3",
              },
            ],
          },
          "diagnostics": [],
        },
        {
          "atValue": {
            "declarationLoc": {
              "end": {
                "column": 28,
                "line": 9,
                "offset": 268,
              },
              "start": {
                "column": 2,
                "line": 9,
                "offset": 242,
              },
            },
            "loc": {
              "end": {
                "column": 20,
                "line": 9,
                "offset": 260,
              },
              "start": {
                "column": 10,
                "line": 9,
                "offset": 250,
              },
            },
            "name": "withSpace1",
            "type": "valueDeclaration",
          },
          "diagnostics": [],
        },
        {
          "atValue": {
            "from": "test.css",
            "fromLoc": {
              "end": {
                "column": 63,
                "line": 10,
                "offset": 332,
              },
              "start": {
                "column": 55,
                "line": 10,
                "offset": 324,
              },
            },
            "type": "valueImportDeclaration",
            "values": [
              {
                "loc": {
                  "end": {
                    "column": 20,
                    "line": 10,
                    "offset": 289,
                  },
                  "start": {
                    "column": 10,
                    "line": 10,
                    "offset": 279,
                  },
                },
                "name": "withSpace2",
              },
              {
                "loc": {
                  "end": {
                    "column": 34,
                    "line": 10,
                    "offset": 303,
                  },
                  "start": {
                    "column": 24,
                    "line": 10,
                    "offset": 293,
                  },
                },
                "localLoc": {
                  "end": {
                    "column": 46,
                    "line": 10,
                    "offset": 315,
                  },
                  "start": {
                    "column": 40,
                    "line": 10,
                    "offset": 309,
                  },
                },
                "localName": "alias2",
                "name": "withSpace3",
              },
            ],
          },
          "diagnostics": [],
        },
      ]
    `);
  });
  test('parses syntax unsupported by css-loader', () => {
    // NOTE: These syntaxes are not supported by css-loader, so css-modules-kit does not
    // guarantee any specific behavior for them. The snapshots below document how the current
    // implementation parses them rather than a behavior we commit to.
    //
    // The `@value \31 e` case is tokenized as `\31` and `e` instead of a single ident `1e`,
    // because postcss-value-parser does not interpret CSS escape sequences in identifiers.
    // This is a known bug: https://github.com/postcss/postcss-value-parser/issues/64
    const atValues = fakeAtValues(
      fakeRoot(dedent`
        @value;
        @value a,,b from "test.css";
        @value \\c: #000;
        @value \'d: #000;
        @value \31 e: #000;
      `),
    );
    const result = atValues.map(parseAtValue);
    expect(result).toMatchInlineSnapshot(`
      [
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
        },
        {
          "atValue": {
            "from": "test.css",
            "fromLoc": {
              "end": {
                "column": 27,
                "line": 2,
                "offset": 34,
              },
              "start": {
                "column": 19,
                "line": 2,
                "offset": 26,
              },
            },
            "type": "valueImportDeclaration",
            "values": [
              {
                "loc": {
                  "end": {
                    "column": 9,
                    "line": 2,
                    "offset": 16,
                  },
                  "start": {
                    "column": 8,
                    "line": 2,
                    "offset": 15,
                  },
                },
                "name": "a",
              },
              {
                "loc": {
                  "end": {
                    "column": 12,
                    "line": 2,
                    "offset": 19,
                  },
                  "start": {
                    "column": 11,
                    "line": 2,
                    "offset": 18,
                  },
                },
                "name": "b",
              },
            ],
          },
          "diagnostics": [
            {
              "category": "error",
              "length": 0,
              "start": {
                "column": 10,
                "line": 2,
              },
              "text": "\`\` is invalid syntax.",
            },
          ],
        },
        {
          "atValue": {
            "declarationLoc": {
              "end": {
                "column": 17,
                "line": 3,
                "offset": 53,
              },
              "start": {
                "column": 1,
                "line": 3,
                "offset": 37,
              },
            },
            "loc": {
              "end": {
                "column": 11,
                "line": 3,
                "offset": 47,
              },
              "start": {
                "column": 8,
                "line": 3,
                "offset": 44,
              },
            },
            "name": "\\\\c",
            "type": "valueDeclaration",
          },
          "diagnostics": [],
        },
        {
          "atValue": {
            "declarationLoc": {
              "end": {
                "column": 17,
                "line": 4,
                "offset": 71,
              },
              "start": {
                "column": 1,
                "line": 4,
                "offset": 55,
              },
            },
            "loc": {
              "end": {
                "column": 11,
                "line": 4,
                "offset": 65,
              },
              "start": {
                "column": 8,
                "line": 4,
                "offset": 62,
              },
            },
            "name": "\\'d",
            "type": "valueDeclaration",
          },
          "diagnostics": [],
        },
        {
          "atValue": {
            "declarationLoc": {
              "end": {
                "column": 19,
                "line": 5,
                "offset": 91,
              },
              "start": {
                "column": 1,
                "line": 5,
                "offset": 73,
              },
            },
            "loc": {
              "end": {
                "column": 11,
                "line": 5,
                "offset": 83,
              },
              "start": {
                "column": 8,
                "line": 5,
                "offset": 80,
              },
            },
            "name": "\\31",
            "type": "valueDeclaration",
          },
          "diagnostics": [],
        },
      ]
    `);
  });
});
