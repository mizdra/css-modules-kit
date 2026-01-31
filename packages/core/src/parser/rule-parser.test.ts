import dedent from 'dedent';
import selectorParser from 'postcss-selector-parser';
import { describe, expect, test } from 'vitest';
import { fakeRoot, fakeRules } from '../test/ast.js';
import type { DiagnosticPosition } from '../type.js';
import { calcDiagnosticsLocationForSelectorParserNodeForTest, parseRule } from './rule-parser.js';

function parseRuleSimply(ruleStr: string): string[] {
  const [rule] = fakeRules(fakeRoot(ruleStr));
  return parseRule(rule!).classSelectors.map((classSelector) => classSelector.name);
}

function calcLocations(source: string) {
  const [rule] = fakeRules(fakeRoot(source));
  const root = selectorParser().astSync(rule!);
  const result: { node: string; type: string; start: DiagnosticPosition; length: number }[] = [];
  root.walk((node) => {
    const loc = calcDiagnosticsLocationForSelectorParserNodeForTest(rule!, node);
    result.push({
      node: node.toString(),
      type: node.type,
      ...loc,
    });
  });
  return result;
}

describe('calcDiagnosticsLocationForSelectorParserNode', () => {
  test('single line', () => {
    const result = calcLocations('.a .b {}');
    expect(result).toMatchInlineSnapshot(`
      [
        {
          "length": 5,
          "node": ".a .b",
          "start": {
            "column": 1,
            "line": 1,
            "offset": 0,
          },
          "type": "selector",
        },
        {
          "length": 2,
          "node": ".a",
          "start": {
            "column": 1,
            "line": 1,
            "offset": 0,
          },
          "type": "class",
        },
        {
          "length": 1,
          "node": " ",
          "start": {
            "column": 3,
            "line": 1,
            "offset": 2,
          },
          "type": "combinator",
        },
        {
          "length": 2,
          "node": ".b",
          "start": {
            "column": 4,
            "line": 1,
            "offset": 3,
          },
          "type": "class",
        },
      ]
    `);
  });
  test('multiple line', () => {
    const result1 = calcLocations(dedent`
      .a
      .b
        .c {}
    `);
    expect(result1).toMatchInlineSnapshot(`
      [
        {
          "length": 10,
          "node": ".a
      .b
        .c",
          "start": {
            "column": 1,
            "line": 1,
            "offset": 0,
          },
          "type": "selector",
        },
        {
          "length": 2,
          "node": ".a",
          "start": {
            "column": 1,
            "line": 1,
            "offset": 0,
          },
          "type": "class",
        },
        {
          "length": 1,
          "node": "
      ",
          "start": {
            "column": 3,
            "line": 1,
            "offset": 2,
          },
          "type": "combinator",
        },
        {
          "length": 2,
          "node": ".b",
          "start": {
            "column": 1,
            "line": 2,
            "offset": 3,
          },
          "type": "class",
        },
        {
          "length": 3,
          "node": "
        ",
          "start": {
            "column": 3,
            "line": 2,
            "offset": 5,
          },
          "type": "combinator",
        },
        {
          "length": 2,
          "node": ".c",
          "start": {
            "column": 3,
            "line": 3,
            "offset": 8,
          },
          "type": "class",
        },
      ]
    `);
    const result2 = calcLocations(dedent`
      @import './test.css';
      .a
        .b {}
    `);
    expect(result2).toMatchInlineSnapshot(`
      [
        {
          "length": 7,
          "node": ".a
        .b",
          "start": {
            "column": 1,
            "line": 2,
            "offset": 22,
          },
          "type": "selector",
        },
        {
          "length": 2,
          "node": ".a",
          "start": {
            "column": 1,
            "line": 2,
            "offset": 22,
          },
          "type": "class",
        },
        {
          "length": 3,
          "node": "
        ",
          "start": {
            "column": 3,
            "line": 2,
            "offset": 24,
          },
          "type": "combinator",
        },
        {
          "length": 2,
          "node": ".b",
          "start": {
            "column": 3,
            "line": 3,
            "offset": 27,
          },
          "type": "class",
        },
      ]
    `);
  });
});

describe('parseRule', () => {
  test('collect local class selectors', () => {
    const rules = fakeRules(
      fakeRoot(dedent`
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
        :local(.local_class_name_1) {}
        .with_newline_1,
        .with_newline_2
          + .with_newline_3, {}
      `),
    );
    const result = rules.map(parseRule);
    expect(result).toMatchInlineSnapshot(`
      [
        {
          "classSelectors": [
            {
              "declarationLoc": {
                "end": {
                  "column": 10,
                  "line": 1,
                  "offset": 9,
                },
                "start": {
                  "column": 1,
                  "line": 1,
                  "offset": 0,
                },
              },
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
          ],
          "diagnostics": [],
        },
        {
          "classSelectors": [
            {
              "declarationLoc": {
                "end": {
                  "column": 14,
                  "line": 2,
                  "offset": 23,
                },
                "start": {
                  "column": 1,
                  "line": 2,
                  "offset": 10,
                },
              },
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
          ],
          "diagnostics": [],
        },
        {
          "classSelectors": [
            {
              "declarationLoc": {
                "end": {
                  "column": 14,
                  "line": 3,
                  "offset": 37,
                },
                "start": {
                  "column": 1,
                  "line": 3,
                  "offset": 24,
                },
              },
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
          ],
          "diagnostics": [],
        },
        {
          "classSelectors": [
            {
              "declarationLoc": {
                "end": {
                  "column": 19,
                  "line": 4,
                  "offset": 56,
                },
                "start": {
                  "column": 1,
                  "line": 4,
                  "offset": 38,
                },
              },
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
          ],
          "diagnostics": [],
        },
        {
          "classSelectors": [
            {
              "declarationLoc": {
                "end": {
                  "column": 25,
                  "line": 5,
                  "offset": 81,
                },
                "start": {
                  "column": 1,
                  "line": 5,
                  "offset": 57,
                },
              },
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
          ],
          "diagnostics": [],
        },
        {
          "classSelectors": [
            {
              "declarationLoc": {
                "end": {
                  "column": 25,
                  "line": 6,
                  "offset": 106,
                },
                "start": {
                  "column": 1,
                  "line": 6,
                  "offset": 82,
                },
              },
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
          ],
          "diagnostics": [],
        },
        {
          "classSelectors": [
            {
              "declarationLoc": {
                "end": {
                  "column": 44,
                  "line": 7,
                  "offset": 150,
                },
                "start": {
                  "column": 1,
                  "line": 7,
                  "offset": 107,
                },
              },
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
              "declarationLoc": {
                "end": {
                  "column": 44,
                  "line": 7,
                  "offset": 150,
                },
                "start": {
                  "column": 1,
                  "line": 7,
                  "offset": 107,
                },
              },
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
          ],
          "diagnostics": [],
        },
        {
          "classSelectors": [
            {
              "declarationLoc": {
                "end": {
                  "column": 33,
                  "line": 8,
                  "offset": 183,
                },
                "start": {
                  "column": 1,
                  "line": 8,
                  "offset": 151,
                },
              },
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
              "declarationLoc": {
                "end": {
                  "column": 33,
                  "line": 8,
                  "offset": 183,
                },
                "start": {
                  "column": 1,
                  "line": 8,
                  "offset": 151,
                },
              },
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
          ],
          "diagnostics": [],
        },
        {
          "classSelectors": [
            {
              "declarationLoc": {
                "end": {
                  "column": 16,
                  "line": 11,
                  "offset": 268,
                },
                "start": {
                  "column": 5,
                  "line": 11,
                  "offset": 257,
                },
              },
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
          ],
          "diagnostics": [],
        },
        {
          "classSelectors": [
            {
              "declarationLoc": {
                "end": {
                  "column": 38,
                  "line": 14,
                  "offset": 312,
                },
                "start": {
                  "column": 1,
                  "line": 14,
                  "offset": 275,
                },
              },
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
              "declarationLoc": {
                "end": {
                  "column": 38,
                  "line": 14,
                  "offset": 312,
                },
                "start": {
                  "column": 1,
                  "line": 14,
                  "offset": 275,
                },
              },
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
          ],
          "diagnostics": [],
        },
        {
          "classSelectors": [
            {
              "declarationLoc": {
                "end": {
                  "column": 31,
                  "line": 15,
                  "offset": 343,
                },
                "start": {
                  "column": 1,
                  "line": 15,
                  "offset": 313,
                },
              },
              "loc": {
                "end": {
                  "column": 27,
                  "line": 15,
                  "offset": 339,
                },
                "start": {
                  "column": 9,
                  "line": 15,
                  "offset": 321,
                },
              },
              "name": "local_class_name_1",
            },
          ],
          "diagnostics": [],
        },
        {
          "classSelectors": [
            {
              "declarationLoc": {
                "end": {
                  "column": 24,
                  "line": 18,
                  "offset": 400,
                },
                "start": {
                  "column": 1,
                  "line": 16,
                  "offset": 344,
                },
              },
              "loc": {
                "end": {
                  "column": 16,
                  "line": 16,
                  "offset": 359,
                },
                "start": {
                  "column": 2,
                  "line": 16,
                  "offset": 345,
                },
              },
              "name": "with_newline_1",
            },
            {
              "declarationLoc": {
                "end": {
                  "column": 24,
                  "line": 18,
                  "offset": 400,
                },
                "start": {
                  "column": 1,
                  "line": 16,
                  "offset": 344,
                },
              },
              "loc": {
                "end": {
                  "column": 16,
                  "line": 17,
                  "offset": 376,
                },
                "start": {
                  "column": 2,
                  "line": 17,
                  "offset": 362,
                },
              },
              "name": "with_newline_2",
            },
            {
              "declarationLoc": {
                "end": {
                  "column": 24,
                  "line": 18,
                  "offset": 400,
                },
                "start": {
                  "column": 1,
                  "line": 16,
                  "offset": 344,
                },
              },
              "loc": {
                "end": {
                  "column": 20,
                  "line": 18,
                  "offset": 396,
                },
                "start": {
                  "column": 6,
                  "line": 18,
                  "offset": 382,
                },
              },
              "name": "with_newline_3",
            },
          ],
          "diagnostics": [],
        },
      ]
    `);
  });
  test('collect class selectors containing special characters', () => {
    const rules = fakeRules(
      fakeRoot(dedent`
        .non-js-identifier {}
        .\\backslash_1, .\'backslash_2, .\31 backslash_3 {}
        /* comment */.class_selector_after_comment {}
      `),
    );
    const result = rules.map(parseRule);
    expect(result).toMatchInlineSnapshot(`
      [
        {
          "classSelectors": [
            {
              "declarationLoc": {
                "end": {
                  "column": 22,
                  "line": 1,
                  "offset": 21,
                },
                "start": {
                  "column": 1,
                  "line": 1,
                  "offset": 0,
                },
              },
              "loc": {
                "end": {
                  "column": 19,
                  "line": 1,
                  "offset": 18,
                },
                "start": {
                  "column": 2,
                  "line": 1,
                  "offset": 1,
                },
              },
              "name": "non-js-identifier",
            },
          ],
          "diagnostics": [],
        },
        {
          "classSelectors": [
            {
              "declarationLoc": {
                "end": {
                  "column": 52,
                  "line": 2,
                  "offset": 73,
                },
                "start": {
                  "column": 1,
                  "line": 2,
                  "offset": 22,
                },
              },
              "loc": {
                "end": {
                  "column": 15,
                  "line": 2,
                  "offset": 36,
                },
                "start": {
                  "column": 2,
                  "line": 2,
                  "offset": 23,
                },
              },
              "name": "\\\\backslash_1",
            },
            {
              "declarationLoc": {
                "end": {
                  "column": 52,
                  "line": 2,
                  "offset": 73,
                },
                "start": {
                  "column": 1,
                  "line": 2,
                  "offset": 22,
                },
              },
              "loc": {
                "end": {
                  "column": 31,
                  "line": 2,
                  "offset": 52,
                },
                "start": {
                  "column": 18,
                  "line": 2,
                  "offset": 39,
                },
              },
              "name": "\\'backslash_2",
            },
            {
              "declarationLoc": {
                "end": {
                  "column": 52,
                  "line": 2,
                  "offset": 73,
                },
                "start": {
                  "column": 1,
                  "line": 2,
                  "offset": 22,
                },
              },
              "loc": {
                "end": {
                  "column": 49,
                  "line": 2,
                  "offset": 70,
                },
                "start": {
                  "column": 34,
                  "line": 2,
                  "offset": 55,
                },
              },
              "name": "\\31 backslash_3",
            },
          ],
          "diagnostics": [],
        },
        {
          "classSelectors": [
            {
              "declarationLoc": {
                "end": {
                  "column": 46,
                  "line": 3,
                  "offset": 119,
                },
                "start": {
                  "column": 14,
                  "line": 3,
                  "offset": 87,
                },
              },
              "loc": {
                "end": {
                  "column": 43,
                  "line": 3,
                  "offset": 116,
                },
                "start": {
                  "column": 15,
                  "line": 3,
                  "offset": 88,
                },
              },
              "name": "class_selector_after_comment",
            },
          ],
          "diagnostics": [],
        },
      ]
    `);
  });
  describe('`:local(...)` and `:global(...)`', () => {
    test('The class names wrapped by `:global(...)` is global', () => {
      expect(parseRuleSimply('.local1 :global(.global1 :is(.global2)) .local2 {}')).toStrictEqual(['local1', 'local2']);
    });
    test('The class names wrapped by `:local(...)` is local', () => {
      expect(parseRuleSimply(':local(.local1 :is(.local2)) {}')).toStrictEqual(['local1', 'local2']);
      // If css-modules-kit supports `:local` and `:global`, the following test should pass.
      // expect(parseRuleSimply(':global .global1 :local(.local1 :is(.local2)) .global2 {}')).toStrictEqual([
      //   'local1',
      //   'local2',
      // ]);
    });
    test('reports diagnostics when `:local(...)` or `:global(...)` is nested', () => {
      const rules = fakeRules(
        fakeRoot(dedent`
          :local(:global(.a)) {}
          :global(:local(.a)) {}
          :local(:local(.a)) {}
          :global(:global(.a)) {}
        `),
      );
      const result = rules.map(parseRule);
      expect(result).toMatchInlineSnapshot(`
        [
          {
            "classSelectors": [],
            "diagnostics": [
              {
                "category": "error",
                "length": 11,
                "start": {
                  "column": 8,
                  "line": 1,
                  "offset": 7,
                },
                "text": "A \`:global(...)\` is not allowed inside of \`:local(...)\`.",
              },
            ],
          },
          {
            "classSelectors": [],
            "diagnostics": [
              {
                "category": "error",
                "length": 10,
                "start": {
                  "column": 9,
                  "line": 2,
                  "offset": 31,
                },
                "text": "A \`:local(...)\` is not allowed inside of \`:global(...)\`.",
              },
            ],
          },
          {
            "classSelectors": [],
            "diagnostics": [
              {
                "category": "error",
                "length": 10,
                "start": {
                  "column": 8,
                  "line": 3,
                  "offset": 53,
                },
                "text": "A \`:local(...)\` is not allowed inside of \`:local(...)\`.",
              },
            ],
          },
          {
            "classSelectors": [],
            "diagnostics": [
              {
                "category": "error",
                "length": 11,
                "start": {
                  "column": 9,
                  "line": 4,
                  "offset": 76,
                },
                "text": "A \`:global(...)\` is not allowed inside of \`:global(...)\`.",
              },
            ],
          },
        ]
      `);
    });
    test('`:local()` and `:global()` is allowed', () => {
      // postcss-modules does not allow it, but css-modules-kit allows it.
      // Because allowing it does not harm users.
      const rules = fakeRules(
        fakeRoot(dedent`
          :local() {}
          :global() {}
          :local( ) {}
        `),
      );
      const result = rules.map(parseRule);
      expect(result).toMatchInlineSnapshot(`
        [
          {
            "classSelectors": [],
            "diagnostics": [],
          },
          {
            "classSelectors": [],
            "diagnostics": [],
          },
          {
            "classSelectors": [],
            "diagnostics": [],
          },
        ]
      `);
    });
  });
  describe('`:local` and `:global`', () => {
    // The :local and :global specifications are complex. Therefore, css-modules-kit does not support them.
    test('reports diagnostics when using `:local` or `:global`', () => {
      const rules = fakeRules(
        fakeRoot(dedent`
          :local .local1 {}
          :global .global1 {}
        `),
      );
      const result = rules.map(parseRule);
      expect(result).toMatchInlineSnapshot(`
        [
          {
            "classSelectors": [
              {
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
            "diagnostics": [
              {
                "category": "error",
                "length": 6,
                "start": {
                  "column": 1,
                  "line": 1,
                  "offset": 0,
                },
                "text": "css-modules-kit does not support \`:local\`. Use \`:local(...)\` instead.",
              },
            ],
          },
          {
            "classSelectors": [
              {
                "declarationLoc": {
                  "end": {
                    "column": 20,
                    "line": 2,
                    "offset": 37,
                  },
                  "start": {
                    "column": 1,
                    "line": 2,
                    "offset": 18,
                  },
                },
                "loc": {
                  "end": {
                    "column": 17,
                    "line": 2,
                    "offset": 34,
                  },
                  "start": {
                    "column": 10,
                    "line": 2,
                    "offset": 27,
                  },
                },
                "name": "global1",
              },
            ],
            "diagnostics": [
              {
                "category": "error",
                "length": 7,
                "start": {
                  "column": 1,
                  "line": 2,
                  "offset": 18,
                },
                "text": "css-modules-kit does not support \`:global\`. Use \`:global(...)\` instead.",
              },
            ],
          },
        ]
      `);
    });
    // test('`:global` changes the mode to global and the following class names are global', () => {
    //   expect(parseRuleSimply('.local1 :global .global1 .global2 {}')).toStrictEqual(['local1']);
    // });
    // test('`:local` changes the mode to local and the following class names are local', () => {
    //   expect(parseRuleSimply(':global .global1 :local .local1 .local2 {}')).toStrictEqual(['local1', 'local2']);
    // });
    // test('`global` and `local` can be used in any selector', () => {
    //   expect(parseRuleSimply(':is(:global .global1 :local .local1) .local2 {}')).toStrictEqual(['local1', 'local2']);
    // });
    // test('`:local` and `:global` is only in effect within that selector', () => {
    //   expect(parseRuleSimply(':is(:global .global1) .local1 {}')).toStrictEqual(['local1']);
    // });
    // test('In multiple selector, the selector must match the mode of the previous selector', () => {
    //   expect(() => parseRuleSimply('.local1, :global .global1 {}')).toThrowError();
    //   expect(() => parseRuleSimply(':global, .local1 {}')).toThrowError();
    //   expect(parseRuleSimply('.local1, .local2 {}')).toStrictEqual(['local1', 'local2']);
    //   expect(parseRuleSimply(':local, :local {}')).toStrictEqual([]);
    //   expect(parseRuleSimply(':global, :global {}')).toStrictEqual([]);
    //   // The mode of the head of the previous selector is local, but the mode of the tail is global. So, it does not throw an error.
    //   expect(parseRuleSimply('.local1 :global .global1, :global .global2 {}')).toStrictEqual(['local1']);
    //   // For some reason, different scopes are allowed in the non-root selector list...😇
    //   expect(parseRuleSimply(':is(:global .global1, :local .local1) {}')).toStrictEqual(['local1']);
    //   // For some reason, in a non-root selector list, the next selector takes over the scope from the previous selector...😇
    //   expect(parseRuleSimply(':is(:global .global1, .global2) {}')).toStrictEqual([]);
    // });
  });
});
