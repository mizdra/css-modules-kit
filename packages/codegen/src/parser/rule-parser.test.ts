import dedent from 'dedent';
import { describe, expect, test } from 'vitest';
import { createRoot, createRules } from '../test/ast.js';
import { parseRule } from './rule-parser.js';

function parseRuleSimply(ruleStr: string): string[] {
  const [rule] = createRules(createRoot(ruleStr));
  return parseRule(rule!).map((classSelector) => classSelector.name);
}

describe('parseRule', () => {
  test('collect local class selectors', () => {
    const rules = createRules(
      createRoot(dedent`
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
        [
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
        ],
        [
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
        ],
        [
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
        ],
        [
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
        ],
        [
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
        ],
        [
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
        ],
        [
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
        ],
        [
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
        ],
        [
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
        ],
        [
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
        ],
        [
          {
            "definition": ":local(.local_class_name_1) {}",
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
        [
          {
            "definition": ".with_newline_1,
      .with_newline_2
        + .with_newline_3, {}",
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
            "definition": ".with_newline_1,
      .with_newline_2
        + .with_newline_3, {}",
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
            "definition": ".with_newline_1,
      .with_newline_2
        + .with_newline_3, {}",
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
      ]
    `);
  });
  describe('`:local(...)` and `:global(...)`', () => {
    test('The class names wrapped by `:global(...)` is global', () => {
      expect(parseRuleSimply('.local1 :global(.global1 :is(.global2)) .local2 {}')).toStrictEqual(['local1', 'local2']);
    });
    test('The class names wrapped by `:local(...)` is local', () => {
      expect(parseRuleSimply(':local(.local1 :is(.local2)) {}')).toStrictEqual(['local1', 'local2']);
      // If honey-css-modules supports `:local` and `:global`, the following test should pass.
      // expect(parseRuleSimply(':global .global1 :local(.local1 :is(.local2)) .global2 {}')).toStrictEqual([
      //   'local1',
      //   'local2',
      // ]);
    });
    test('An error is thrown when `:local(...)` or `:global(...)` is nested', () => {
      expect(() => parseRuleSimply(':local(:global(.a)) {}')).toThrowErrorMatchingInlineSnapshot(
        `[Error: A \`:global\` is not allowed inside of \`:local(...)\`.]`,
      );
      expect(() => parseRuleSimply(':global(:local(.a)) {}')).toThrowErrorMatchingInlineSnapshot(
        `[Error: A \`:local\` is not allowed inside of \`:global(...)\`.]`,
      );
      expect(() => parseRuleSimply(':local(:local(.a)) {}')).toThrowErrorMatchingInlineSnapshot(
        `[Error: A \`:local\` is not allowed inside of \`:local(...)\`.]`,
      );
      expect(() => parseRuleSimply(':global(:global(.a)) {}')).toThrowErrorMatchingInlineSnapshot(
        `[Error: A \`:global\` is not allowed inside of \`:global(...)\`.]`,
      );
    });
    test('`:local()` and `:global()` is allowed', () => {
      // postcss-modules does not allow it, but honey-css-modules allows it.
      // Because allowing it does not harm users.
      expect(parseRuleSimply(':local() {}')).toStrictEqual([]);
      expect(parseRuleSimply(':global() {}')).toStrictEqual([]);
      expect(parseRuleSimply(':local( ) {}')).toStrictEqual([]);
    });
  });
  describe('`:local` and `:global`', () => {
    // The :local and :global specifications are complex. Therefore, honey-css-modules does not support them.
    test('An error is thrown when using `:local` or `:global`', () => {
      expect(() => parseRuleSimply(':local .local1 {}')).toThrowErrorMatchingInlineSnapshot(
        `[Error: \`:local\` (without any arguments) is not supported. Use \`:local(...)\` instead.]`,
      );
      expect(() => parseRuleSimply(':global .global1 {}')).toThrowErrorMatchingInlineSnapshot(
        `[Error: \`:global\` (without any arguments) is not supported. Use \`:global(...)\` instead.]`,
      );
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
