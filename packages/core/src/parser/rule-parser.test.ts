import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { fakeRoot, fakeRules } from '../test/ast.js';
import { parseRule } from './rule-parser.js';

function parseRuleSimply(ruleStr: string): string[] {
  const [rule] = fakeRules(fakeRoot(ruleStr));
  return parseRule(rule!).classSelectors.map((classSelector) => classSelector.name);
}

describe('parseRule', () => {
  test('collects a class selector', () => {
    const [rule] = fakeRules(fakeRoot('.a_1 {}'));
    expect(parseRule(rule!)).toMatchInlineSnapshot(`
      {
        "classSelectors": [
          {
            "declarationLoc": {
              "end": {
                "column": 8,
                "line": 1,
                "offset": 7,
              },
              "start": {
                "column": 1,
                "line": 1,
                "offset": 0,
              },
            },
            "loc": {
              "end": {
                "column": 5,
                "line": 1,
                "offset": 4,
              },
              "start": {
                "column": 2,
                "line": 1,
                "offset": 1,
              },
            },
            "name": "a_1",
          },
        ],
        "diagnostics": [],
      }
    `);
  });

  test('collects every class selector in a compound selector, a complex selector, and a selector list', () => {
    const [rule] = fakeRules(fakeRoot('.a_1.a_2 + .a_3, .a_4 {}'));
    expect(parseRule(rule!)).toMatchInlineSnapshot(`
      {
        "classSelectors": [
          {
            "declarationLoc": {
              "end": {
                "column": 25,
                "line": 1,
                "offset": 24,
              },
              "start": {
                "column": 1,
                "line": 1,
                "offset": 0,
              },
            },
            "loc": {
              "end": {
                "column": 5,
                "line": 1,
                "offset": 4,
              },
              "start": {
                "column": 2,
                "line": 1,
                "offset": 1,
              },
            },
            "name": "a_1",
          },
          {
            "declarationLoc": {
              "end": {
                "column": 25,
                "line": 1,
                "offset": 24,
              },
              "start": {
                "column": 1,
                "line": 1,
                "offset": 0,
              },
            },
            "loc": {
              "end": {
                "column": 9,
                "line": 1,
                "offset": 8,
              },
              "start": {
                "column": 6,
                "line": 1,
                "offset": 5,
              },
            },
            "name": "a_2",
          },
          {
            "declarationLoc": {
              "end": {
                "column": 25,
                "line": 1,
                "offset": 24,
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
                "column": 13,
                "line": 1,
                "offset": 12,
              },
            },
            "name": "a_3",
          },
          {
            "declarationLoc": {
              "end": {
                "column": 25,
                "line": 1,
                "offset": 24,
              },
              "start": {
                "column": 1,
                "line": 1,
                "offset": 0,
              },
            },
            "loc": {
              "end": {
                "column": 22,
                "line": 1,
                "offset": 21,
              },
              "start": {
                "column": 19,
                "line": 1,
                "offset": 18,
              },
            },
            "name": "a_4",
          },
        ],
        "diagnostics": [],
      }
    `);
  });

  test('collects a class selector inside a functional pseudo-class', () => {
    const [rule] = fakeRules(fakeRoot(':not(.a_1) {}'));
    expect(parseRule(rule!)).toMatchInlineSnapshot(`
      {
        "classSelectors": [
          {
            "declarationLoc": {
              "end": {
                "column": 14,
                "line": 1,
                "offset": 13,
              },
              "start": {
                "column": 1,
                "line": 1,
                "offset": 0,
              },
            },
            "loc": {
              "end": {
                "column": 10,
                "line": 1,
                "offset": 9,
              },
              "start": {
                "column": 7,
                "line": 1,
                "offset": 6,
              },
            },
            "name": "a_1",
          },
        ],
        "diagnostics": [],
      }
    `);
  });

  test('collects a class selector placed right after a comment', () => {
    const [rule] = fakeRules(fakeRoot('/* comment */.a_1 {}'));
    expect(parseRule(rule!)).toMatchInlineSnapshot(`
      {
        "classSelectors": [
          {
            "declarationLoc": {
              "end": {
                "column": 21,
                "line": 1,
                "offset": 20,
              },
              "start": {
                "column": 14,
                "line": 1,
                "offset": 13,
              },
            },
            "loc": {
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
            "name": "a_1",
          },
        ],
        "diagnostics": [],
      }
    `);
  });

  test('keeps escape sequences in the class name as written', () => {
    const [rule] = fakeRules(fakeRoot(String.raw`.\\a_1, .\'a_2, .\31 a_3 {}`));
    expect(parseRule(rule!)).toMatchInlineSnapshot(`
      {
        "classSelectors": [
          {
            "declarationLoc": {
              "end": {
                "column": 28,
                "line": 1,
                "offset": 27,
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
            "name": "\\\\a_1",
          },
          {
            "declarationLoc": {
              "end": {
                "column": 28,
                "line": 1,
                "offset": 27,
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
                "column": 10,
                "line": 1,
                "offset": 9,
              },
            },
            "name": "\\'a_2",
          },
          {
            "declarationLoc": {
              "end": {
                "column": 28,
                "line": 1,
                "offset": 27,
              },
              "start": {
                "column": 1,
                "line": 1,
                "offset": 0,
              },
            },
            "loc": {
              "end": {
                "column": 25,
                "line": 1,
                "offset": 24,
              },
              "start": {
                "column": 18,
                "line": 1,
                "offset": 17,
              },
            },
            "name": "\\31 a_3",
          },
        ],
        "diagnostics": [],
      }
    `);
  });

  test('calculates the location of a class selector in an indented rule', () => {
    const [rule] = fakeRules(
      fakeRoot(dedent`
        @media screen {
          .a_1 {}
        }
      `),
    );
    expect(parseRule(rule!)).toMatchInlineSnapshot(`
      {
        "classSelectors": [
          {
            "declarationLoc": {
              "end": {
                "column": 10,
                "line": 2,
                "offset": 25,
              },
              "start": {
                "column": 3,
                "line": 2,
                "offset": 18,
              },
            },
            "loc": {
              "end": {
                "column": 7,
                "line": 2,
                "offset": 22,
              },
              "start": {
                "column": 4,
                "line": 2,
                "offset": 19,
              },
            },
            "name": "a_1",
          },
        ],
        "diagnostics": [],
      }
    `);
  });

  test('calculates the locations of class selectors on the second and later lines of a selector', () => {
    const [rule] = fakeRules(
      fakeRoot(dedent`
        .a_1,
        .a_2
          + .a_3 {}
      `),
    );
    expect(parseRule(rule!)).toMatchInlineSnapshot(`
      {
        "classSelectors": [
          {
            "declarationLoc": {
              "end": {
                "column": 12,
                "line": 3,
                "offset": 22,
              },
              "start": {
                "column": 1,
                "line": 1,
                "offset": 0,
              },
            },
            "loc": {
              "end": {
                "column": 5,
                "line": 1,
                "offset": 4,
              },
              "start": {
                "column": 2,
                "line": 1,
                "offset": 1,
              },
            },
            "name": "a_1",
          },
          {
            "declarationLoc": {
              "end": {
                "column": 12,
                "line": 3,
                "offset": 22,
              },
              "start": {
                "column": 1,
                "line": 1,
                "offset": 0,
              },
            },
            "loc": {
              "end": {
                "column": 5,
                "line": 2,
                "offset": 10,
              },
              "start": {
                "column": 2,
                "line": 2,
                "offset": 7,
              },
            },
            "name": "a_2",
          },
          {
            "declarationLoc": {
              "end": {
                "column": 12,
                "line": 3,
                "offset": 22,
              },
              "start": {
                "column": 1,
                "line": 1,
                "offset": 0,
              },
            },
            "loc": {
              "end": {
                "column": 9,
                "line": 3,
                "offset": 19,
              },
              "start": {
                "column": 6,
                "line": 3,
                "offset": 16,
              },
            },
            "name": "a_3",
          },
        ],
        "diagnostics": [],
      }
    `);
  });

  describe('`:local(...)` and `:global(...)`', () => {
    test('collects class selectors wrapped by `:local(...)`', () => {
      expect(parseRuleSimply(':local(.local1 :is(.local2)) {}')).toStrictEqual(['local1', 'local2']);
    });
    test('omits class selectors wrapped by `:global(...)`', () => {
      expect(parseRuleSimply('.local1 :global(.global1 :is(.global2)) .local2 {}')).toStrictEqual(['local1', 'local2']);
    });
    test('reports a diagnostic for `:local(...)` or `:global(...)` nested in another one', () => {
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
    test('reports no diagnostic for an empty `:local()` or `:global()`', () => {
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
    test('reports a diagnostic for `:local` and `:global` without parentheses', () => {
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

    test('calculates the location of a diagnostic on the second line of a selector', () => {
      const [rule] = fakeRules(
        fakeRoot(dedent`
          @import './a.module.css';
          .a_1
            :local .a_2 {}
        `),
      );
      expect(parseRule(rule!).diagnostics).toMatchInlineSnapshot(`
        [
          {
            "category": "error",
            "length": 6,
            "start": {
              "column": 3,
              "line": 3,
              "offset": 33,
            },
            "text": "css-modules-kit does not support \`:local\`. Use \`:local(...)\` instead.",
          },
        ]
      `);
    });
  });
});
