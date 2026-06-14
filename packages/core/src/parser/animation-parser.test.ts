import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { fakeDeclaration } from '../test/ast.js';
import {
  isAnimationNameProp,
  isAnimationProp,
  parseAnimationNameProp,
  parseAnimationProp,
} from './animation-parser.js';

describe('isAnimationNameProp', () => {
  test.each([
    ['animation-name', true],
    ['-webkit-animation-name', true],
    ['-moz-animation-name', true],
    ['-o-animation-name', true],
    ['-ms-animation-name', true],
    ['Animation-Name', true],
    ['animation', false],
    ['color', false],
  ])('%s -> %s', (prop, expected) => {
    expect(isAnimationNameProp(prop)).toBe(expected);
  });
});

describe('parseAnimationNameProp', () => {
  test('extracts a single ident', () => {
    const decl = fakeDeclaration('.a_1 { animation-name: a_2 }');
    expect(parseAnimationNameProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "references": [
          {
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
            "name": "a_2",
            "type": "local",
          },
        ],
      }
    `);
  });

  test('extracts comma-separated idents', () => {
    const decl = fakeDeclaration('.a_1 { animation-name: a_2, a_3 }');
    expect(parseAnimationNameProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "references": [
          {
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
            "name": "a_2",
            "type": "local",
          },
          {
            "loc": {
              "end": {
                "column": 32,
                "line": 1,
                "offset": 31,
              },
              "start": {
                "column": 29,
                "line": 1,
                "offset": 28,
              },
            },
            "name": "a_3",
            "type": "local",
          },
        ],
      }
    `);
  });

  test('extracts ident from local()', () => {
    const decl = fakeDeclaration('.a_1 { animation-name: local(a_2) }');
    expect(parseAnimationNameProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "references": [
          {
            "loc": {
              "end": {
                "column": 33,
                "line": 1,
                "offset": 32,
              },
              "start": {
                "column": 30,
                "line": 1,
                "offset": 29,
              },
            },
            "name": "a_2",
            "type": "local",
          },
        ],
      }
    `);
  });

  test('skips ident inside global()', () => {
    const decl = fakeDeclaration('.a_1 { animation-name: global(a_2) }');
    expect(parseAnimationNameProp(decl)).toMatchInlineSnapshot(`
    	{
    	  "diagnostics": [],
    	  "references": [],
    	}
    `);
  });

  test('skips ident inside var()', () => {
    const decl = fakeDeclaration('.a_1 { animation-name: var(--a_2) }');
    expect(parseAnimationNameProp(decl)).toMatchInlineSnapshot(`
    	{
    	  "diagnostics": [],
    	  "references": [],
    	}
    `);
  });

  test('skips ident inside env()', () => {
    const decl = fakeDeclaration('.a_1 { animation-name: env(a_2) }');
    expect(parseAnimationNameProp(decl)).toMatchInlineSnapshot(`
    	{
    	  "diagnostics": [],
    	  "references": [],
    	}
    `);
  });

  test('skips reserved keywords (none, revert, revert-layer)', () => {
    const decl = fakeDeclaration('.a_1 { animation-name: revert, a_2, none }');
    expect(parseAnimationNameProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "references": [
          {
            "loc": {
              "end": {
                "column": 35,
                "line": 1,
                "offset": 34,
              },
              "start": {
                "column": 32,
                "line": 1,
                "offset": 31,
              },
            },
            "name": "a_2",
            "type": "local",
          },
        ],
      }
    `);
  });

  test('reports a diagnostic and skips references for invalid local() shapes (multiple idents, non-identifier node, empty)', () => {
    const decl = fakeDeclaration(
      '.a_1 { animation-name: local(a_2, a_3), local(a_4, local(a_5)), local(), local("a_6") }',
    );
    expect(parseAnimationNameProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [
          {
            "category": "error",
            "length": 15,
            "start": {
              "column": 24,
              "line": 1,
            },
            "text": "\`local(...)\` must contain exactly one identifier.",
          },
          {
            "category": "error",
            "length": 22,
            "start": {
              "column": 41,
              "line": 1,
            },
            "text": "\`local(...)\` must contain exactly one identifier.",
          },
          {
            "category": "error",
            "length": 7,
            "start": {
              "column": 65,
              "line": 1,
            },
            "text": "\`local(...)\` must contain exactly one identifier.",
          },
          {
            "category": "error",
            "length": 12,
            "start": {
              "column": 74,
              "line": 1,
            },
            "text": "\`local(...)\` must contain exactly one identifier.",
          },
        ],
        "references": [],
      }
    `);
  });

  test('handles references on lines after the declaration start', () => {
    const decl = fakeDeclaration(dedent`
      .a_1 {
        animation-name:
          a_2,
          local(a_3),
          local(a_4 a_5);
      }
    `);
    expect(parseAnimationNameProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [
          {
            "category": "error",
            "length": 14,
            "start": {
              "column": 5,
              "line": 5,
            },
            "text": "\`local(...)\` must contain exactly one identifier.",
          },
        ],
        "references": [
          {
            "loc": {
              "end": {
                "column": 8,
                "line": 3,
                "offset": 32,
              },
              "start": {
                "column": 5,
                "line": 3,
                "offset": 29,
              },
            },
            "name": "a_2",
            "type": "local",
          },
          {
            "loc": {
              "end": {
                "column": 14,
                "line": 4,
                "offset": 47,
              },
              "start": {
                "column": 11,
                "line": 4,
                "offset": 44,
              },
            },
            "name": "a_3",
            "type": "local",
          },
        ],
      }
    `);
  });
});

describe('isAnimationProp', () => {
  test.each([
    ['animation', true],
    ['-webkit-animation', true],
    ['-moz-animation', true],
    ['-o-animation', true],
    ['-ms-animation', true],
    ['Animation', true],
    ['animation-name', false],
    ['color', false],
  ])('%s -> %s', (prop, expected) => {
    expect(isAnimationProp(prop)).toBe(expected);
  });
});

describe('parseAnimationProp', () => {
  test('extracts a keyframes name and skips times and longhand keywords', () => {
    const decl = fakeDeclaration('.a_1 { animation: a_2 1s linear infinite }');
    expect(parseAnimationProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "references": [
          {
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
            "name": "a_2",
            "type": "local",
          },
        ],
      }
    `);
  });

  // `auto` is reserved (animation-duration/timeline) and is skipped. This differs from css-loader,
  // which does not know `auto` and treats it as a `<keyframes-name>`.
  test('extracts a dashed-ident name and skips auto and numbers', () => {
    const decl = fakeDeclaration('.a_1 { animation: a_2 auto --foo 2 }');
    expect(parseAnimationProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "references": [
          {
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
            "name": "a_2",
            "type": "local",
          },
          {
            "loc": {
              "end": {
                "column": 33,
                "line": 1,
                "offset": 32,
              },
              "start": {
                "column": 28,
                "line": 1,
                "offset": 27,
              },
            },
            "name": "--foo",
            "type": "local",
          },
        ],
      }
    `);
  });

  test('extracts a name from each comma-separated segment', () => {
    const decl = fakeDeclaration('.a_1 { animation: 1s a_2, 2s linear a_3 }');
    expect(parseAnimationProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "references": [
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
            "name": "a_2",
            "type": "local",
          },
          {
            "loc": {
              "end": {
                "column": 40,
                "line": 1,
                "offset": 39,
              },
              "start": {
                "column": 37,
                "line": 1,
                "offset": 36,
              },
            },
            "name": "a_3",
            "type": "local",
          },
        ],
      }
    `);
  });

  // Per the CSS spec this declaration is invalid because a segment has a single `<keyframes-name>` slot,
  // but for simplicity—and to match css-loader—every custom-ident is extracted.
  test('extracts every custom-ident in a comma-less segment', () => {
    const decl = fakeDeclaration('.a_1 { animation: a_2 a_3 }');
    expect(parseAnimationProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "references": [
          {
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
        ],
      }
    `);
  });

  // css-loader counts keyword occurrences and treats a repeated keyword as a name (the 2nd `infinite`).
  // We do not count occurrences, so every reserved keyword is always skipped.
  test('skips repeated reserved keywords without occurrence counting', () => {
    const decl = fakeDeclaration('.a_1 { animation: infinite infinite }');
    expect(parseAnimationProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "references": [],
      }
    `);
  });

  test('skips none', () => {
    const decl = fakeDeclaration('.a_1 { animation: none }');
    expect(parseAnimationProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "references": [],
      }
    `);
  });

  test('extracts ident from local() and skips global() and var()', () => {
    const decl = fakeDeclaration('.a_1 { animation: local(a_2), global(a_3), var(--a_4) a_5 }');
    expect(parseAnimationProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "references": [
          {
            "loc": {
              "end": {
                "column": 28,
                "line": 1,
                "offset": 27,
              },
              "start": {
                "column": 25,
                "line": 1,
                "offset": 24,
              },
            },
            "name": "a_2",
            "type": "local",
          },
          {
            "loc": {
              "end": {
                "column": 58,
                "line": 1,
                "offset": 57,
              },
              "start": {
                "column": 55,
                "line": 1,
                "offset": 54,
              },
            },
            "name": "a_5",
            "type": "local",
          },
        ],
      }
    `);
  });

  test('reports a diagnostic and skips references for invalid local() shapes', () => {
    const decl = fakeDeclaration('.a_1 { animation: local(a_2, a_3) }');
    expect(parseAnimationProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [
          {
            "category": "error",
            "length": 15,
            "start": {
              "column": 19,
              "line": 1,
            },
            "text": "\`local(...)\` must contain exactly one identifier.",
          },
        ],
        "references": [],
      }
    `);
  });

  // The CSS spec allows `<string>` as a `<keyframes-name>`, but it is intentionally not detected, matching css-loader.
  test('skips string-form keyframes names', () => {
    const decl = fakeDeclaration('.a_1 { animation: "a_2" a_3 }');
    expect(parseAnimationProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "references": [
          {
            "loc": {
              "end": {
                "column": 28,
                "line": 1,
                "offset": 27,
              },
              "start": {
                "column": 25,
                "line": 1,
                "offset": 24,
              },
            },
            "name": "a_3",
            "type": "local",
          },
        ],
      }
    `);
  });
});
