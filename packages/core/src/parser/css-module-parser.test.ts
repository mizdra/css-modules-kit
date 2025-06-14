import dedent from 'dedent';
import { describe, expect, test } from 'vitest';
import { parseCSSModule, type ParseCSSModuleOptions } from './css-module-parser.js';

const options: ParseCSSModuleOptions = { fileName: '/test.module.css', safe: false };

describe('parseCSSModule', () => {
  test('collects local tokens', () => {
    const parsed = parseCSSModule(
      dedent`
        .basic {}
        .cascading {}
        .cascading {}
        .pseudo_class_1 {}
        .pseudo_class_2:hover {}
        :not(.pseudo_class_3) {}
        .multiple_selector_1.multiple_selector_2 {}
        .combinator_1 + .combinator_2 {}
        @supports (display: flex) {
          @media screen and (min-width: 900px) {
            .at_rule {}
          }
        }
        .selector_list_1, .selector_list_2 {}
        :local(.local_1) {}
        @value value: #BF4040;
      `,
      options,
    );
    expect(parsed).toMatchInlineSnapshot(`
      {
        "cssModule": {
          "fileName": "/test.module.css",
          "localTokens": [
            {
              "definition": ".basic {}",
              "loc": {
                "end": {
                  "column": 7,
                  "line": 1,
                  "offset": 6,
                },
                "start": {
                  "column": 2,
                  "line": 1,
                  "offset": 1,
                },
              },
              "name": "basic",
            },
            {
              "definition": ".cascading {}",
              "loc": {
                "end": {
                  "column": 11,
                  "line": 2,
                  "offset": 20,
                },
                "start": {
                  "column": 2,
                  "line": 2,
                  "offset": 11,
                },
              },
              "name": "cascading",
            },
            {
              "definition": ".cascading {}",
              "loc": {
                "end": {
                  "column": 11,
                  "line": 3,
                  "offset": 34,
                },
                "start": {
                  "column": 2,
                  "line": 3,
                  "offset": 25,
                },
              },
              "name": "cascading",
            },
            {
              "definition": ".pseudo_class_1 {}",
              "loc": {
                "end": {
                  "column": 16,
                  "line": 4,
                  "offset": 53,
                },
                "start": {
                  "column": 2,
                  "line": 4,
                  "offset": 39,
                },
              },
              "name": "pseudo_class_1",
            },
            {
              "definition": ".pseudo_class_2:hover {}",
              "loc": {
                "end": {
                  "column": 16,
                  "line": 5,
                  "offset": 72,
                },
                "start": {
                  "column": 2,
                  "line": 5,
                  "offset": 58,
                },
              },
              "name": "pseudo_class_2",
            },
            {
              "definition": ":not(.pseudo_class_3) {}",
              "loc": {
                "end": {
                  "column": 21,
                  "line": 6,
                  "offset": 102,
                },
                "start": {
                  "column": 7,
                  "line": 6,
                  "offset": 88,
                },
              },
              "name": "pseudo_class_3",
            },
            {
              "definition": ".multiple_selector_1.multiple_selector_2 {}",
              "loc": {
                "end": {
                  "column": 21,
                  "line": 7,
                  "offset": 127,
                },
                "start": {
                  "column": 2,
                  "line": 7,
                  "offset": 108,
                },
              },
              "name": "multiple_selector_1",
            },
            {
              "definition": ".multiple_selector_1.multiple_selector_2 {}",
              "loc": {
                "end": {
                  "column": 41,
                  "line": 7,
                  "offset": 147,
                },
                "start": {
                  "column": 22,
                  "line": 7,
                  "offset": 128,
                },
              },
              "name": "multiple_selector_2",
            },
            {
              "definition": ".combinator_1 + .combinator_2 {}",
              "loc": {
                "end": {
                  "column": 14,
                  "line": 8,
                  "offset": 164,
                },
                "start": {
                  "column": 2,
                  "line": 8,
                  "offset": 152,
                },
              },
              "name": "combinator_1",
            },
            {
              "definition": ".combinator_1 + .combinator_2 {}",
              "loc": {
                "end": {
                  "column": 30,
                  "line": 8,
                  "offset": 180,
                },
                "start": {
                  "column": 18,
                  "line": 8,
                  "offset": 168,
                },
              },
              "name": "combinator_2",
            },
            {
              "definition": ".at_rule {}",
              "loc": {
                "end": {
                  "column": 13,
                  "line": 11,
                  "offset": 265,
                },
                "start": {
                  "column": 6,
                  "line": 11,
                  "offset": 258,
                },
              },
              "name": "at_rule",
            },
            {
              "definition": ".selector_list_1, .selector_list_2 {}",
              "loc": {
                "end": {
                  "column": 17,
                  "line": 14,
                  "offset": 291,
                },
                "start": {
                  "column": 2,
                  "line": 14,
                  "offset": 276,
                },
              },
              "name": "selector_list_1",
            },
            {
              "definition": ".selector_list_1, .selector_list_2 {}",
              "loc": {
                "end": {
                  "column": 35,
                  "line": 14,
                  "offset": 309,
                },
                "start": {
                  "column": 20,
                  "line": 14,
                  "offset": 294,
                },
              },
              "name": "selector_list_2",
            },
            {
              "definition": ":local(.local_1) {}",
              "loc": {
                "end": {
                  "column": 16,
                  "line": 15,
                  "offset": 328,
                },
                "start": {
                  "column": 9,
                  "line": 15,
                  "offset": 321,
                },
              },
              "name": "local_1",
            },
            {
              "definition": "@value value: #BF4040",
              "loc": {
                "end": {
                  "column": 13,
                  "line": 16,
                  "offset": 345,
                },
                "start": {
                  "column": 8,
                  "line": 16,
                  "offset": 340,
                },
              },
              "name": "value",
            },
          ],
          "text": ".basic {}
      .cascading {}
      .cascading {}
      .pseudo_class_1 {}
      .pseudo_class_2:hover {}
      :not(.pseudo_class_3) {}
      .multiple_selector_1.multiple_selector_2 {}
      .combinator_1 + .combinator_2 {}
      @supports (display: flex) {
        @media screen and (min-width: 900px) {
          .at_rule {}
        }
      }
      .selector_list_1, .selector_list_2 {}
      :local(.local_1) {}
      @value value: #BF4040;",
          "tokenImporters": [],
        },
        "diagnostics": [],
      }
    `);
  });
  test('collects token importers', () => {
    const parsed = parseCSSModule(
      dedent`
        @import './a.module.css';
        @value a, b as alias from './a.module.css';
      `,
      options,
    );
    expect(parsed).toMatchInlineSnapshot(`
      {
        "cssModule": {
          "fileName": "/test.module.css",
          "localTokens": [],
          "text": "@import './a.module.css';
      @value a, b as alias from './a.module.css';",
          "tokenImporters": [
            {
              "from": "./a.module.css",
              "fromLoc": {
                "end": {
                  "column": 24,
                  "line": 1,
                  "offset": 23,
                },
                "start": {
                  "column": 10,
                  "line": 1,
                  "offset": 9,
                },
              },
              "type": "import",
            },
            {
              "from": "./a.module.css",
              "fromLoc": {
                "end": {
                  "column": 42,
                  "line": 2,
                  "offset": 67,
                },
                "start": {
                  "column": 28,
                  "line": 2,
                  "offset": 53,
                },
              },
              "type": "value",
              "values": [
                {
                  "loc": {
                    "end": {
                      "column": 9,
                      "line": 2,
                      "offset": 34,
                    },
                    "start": {
                      "column": 8,
                      "line": 2,
                      "offset": 33,
                    },
                  },
                  "name": "a",
                },
                {
                  "loc": {
                    "end": {
                      "column": 12,
                      "line": 2,
                      "offset": 37,
                    },
                    "start": {
                      "column": 11,
                      "line": 2,
                      "offset": 36,
                    },
                  },
                  "localLoc": {
                    "end": {
                      "column": 21,
                      "line": 2,
                      "offset": 46,
                    },
                    "start": {
                      "column": 16,
                      "line": 2,
                      "offset": 41,
                    },
                  },
                  "localName": "alias",
                  "name": "b",
                },
              ],
            },
          ],
        },
        "diagnostics": [],
      }
    `);
  });
  test('collects diagnostics', () => {
    const parsed = parseCSSModule(
      dedent`
        :local .local1 {}
        @value;
      `,
      options,
    );
    expect(parsed).toMatchInlineSnapshot(`
      {
        "cssModule": {
          "fileName": "/test.module.css",
          "localTokens": [
            {
              "definition": ":local .local1 {}",
              "loc": {
                "end": {
                  "column": 15,
                  "line": 1,
                  "offset": 14,
                },
                "start": {
                  "column": 9,
                  "line": 1,
                  "offset": 8,
                },
              },
              "name": "local1",
            },
          ],
          "text": ":local .local1 {}
      @value;",
          "tokenImporters": [],
        },
        "diagnostics": [
          {
            "category": "error",
            "file": {
              "fileName": "/test.module.css",
              "text": ":local .local1 {}
      @value;",
            },
            "length": 6,
            "start": {
              "column": 1,
              "line": 1,
              "offset": 0,
            },
            "text": "\`:local\` is not supported. Use \`:local(...)\` instead.",
          },
          {
            "category": "error",
            "file": {
              "fileName": "/test.module.css",
              "text": ":local .local1 {}
      @value;",
            },
            "length": 7,
            "start": {
              "column": 1,
              "line": 2,
            },
            "text": "\`@value\` is a invalid syntax.",
          },
        ],
      }
    `);
  });
  // TODO: Support local tokens by CSS variables. This is supported by lightningcss.
  // https://github.com/parcel-bundler/lightningcss/blob/a3390fd4140ca87f5035595d22bc9357cf72177e/src/css_modules.rs#L34

  // TODO: Support local tokens by animation names. This is supported by postcss-modules-local-by-default and lightningcss.
  // https://github.com/css-modules/postcss-modules-local-by-default/blob/39a2f78d9f39f5c0e30dd9b2a25f4a145431cb20/test/index.test.js#L162-L399
  // https://github.com/parcel-bundler/lightningcss/blob/a3390fd4140ca87f5035595d22bc9357cf72177e/src/css_modules.rs#L37

  // TODO: Support local tokens by grid names. This is supported by lightningcss.
  // https://github.com/parcel-bundler/lightningcss/blob/a3390fd4140ca87f5035595d22bc9357cf72177e/src/css_modules.rs#L40

  // TODO: Support local tokens by container names. This is supported by lightningcss.
  // https://github.com/parcel-bundler/lightningcss/blob/a3390fd4140ca87f5035595d22bc9357cf72177e/src/css_modules.rs#L46

  // TODO: Support local tokens by custom identifiers. This is supported by lightningcss.
  // https://github.com/parcel-bundler/lightningcss/blob/a3390fd4140ca87f5035595d22bc9357cf72177e/src/css_modules.rs#L43
  // https://developer.mozilla.org/ja/docs/Web/CSS/custom-ident
  test('reports diagnostics if the CSS is invalid', () => {
    expect(
      parseCSSModule(
        dedent`
          .a {
        `,
        options,
      ),
    ).toMatchInlineSnapshot(`
      {
        "cssModule": {
          "fileName": "/test.module.css",
          "localTokens": [],
          "text": ".a {",
          "tokenImporters": [],
        },
        "diagnostics": [
          {
            "category": "error",
            "file": {
              "fileName": "/test.module.css",
              "text": ".a {",
            },
            "length": 1,
            "start": {
              "column": 1,
              "line": 1,
            },
            "text": "Unclosed block",
          },
        ],
      }
    `);
  });
  test('parses CSS in a fault-tolerant manner if safe is true', () => {
    const parsed = parseCSSModule(
      dedent`
        .a {
      `,
      { ...options, safe: true },
    );
    expect(parsed).toMatchInlineSnapshot(`
      {
        "cssModule": {
          "fileName": "/test.module.css",
          "localTokens": [
            {
              "definition": ".a {}",
              "loc": {
                "end": {
                  "column": 3,
                  "line": 1,
                  "offset": 2,
                },
                "start": {
                  "column": 2,
                  "line": 1,
                  "offset": 1,
                },
              },
              "name": "a",
            },
          ],
          "text": ".a {",
          "tokenImporters": [],
        },
        "diagnostics": [],
      }
    `);
  });
});
