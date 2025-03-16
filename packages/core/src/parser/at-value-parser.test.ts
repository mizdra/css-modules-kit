import dedent from 'dedent';
import { describe, expect, test } from 'vitest';
import { fakeAtValues, fakeRoot } from '../test/ast.js';
import { parseAtValue } from './at-value-parser.js';

describe('parseAtValue', () => {
  test('valid', () => {
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
  test('invalid', () => {
    const [atValue1, atValue2] = fakeAtValues(
      fakeRoot(dedent`
        @value;
        @value a,,b from "test.css";
      `),
    );
    expect(parseAtValue(atValue1!)).toMatchInlineSnapshot(`
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
    expect(parseAtValue(atValue2!)).toMatchInlineSnapshot(`
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
              "column": 8,
              "line": 2,
            },
            "text": "\`\` is invalid syntax.",
          },
        ],
      }
    `);
  });
});
