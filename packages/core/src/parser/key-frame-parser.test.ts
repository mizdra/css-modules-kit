import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { fakeAtRule } from '../test/ast.js';
import { parseKeyframesAtRule } from './key-frame-parser.js';

describe('parseKeyframesAtRule', () => {
  test('parses the name of a `@keyframes` rule', () => {
    expect(parseKeyframesAtRule(fakeAtRule('@keyframes a_1 {}'))).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "keyframe": {
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
              "column": 12,
              "line": 1,
              "offset": 11,
            },
          },
          "name": "a_1",
        },
      }
    `);
  });

  test('calculates the location of a name preceded by a line break or extra spaces', () => {
    const afterLineBreak = fakeAtRule(dedent`
      @keyframes
        a_1 {
      }
    `);
    expect(parseKeyframesAtRule(afterLineBreak)).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "keyframe": {
          "declarationLoc": {
            "end": {
              "column": 2,
              "line": 3,
              "offset": 20,
            },
            "start": {
              "column": 1,
              "line": 1,
              "offset": 0,
            },
          },
          "loc": {
            "end": {
              "column": 6,
              "line": 2,
              "offset": 16,
            },
            "start": {
              "column": 3,
              "line": 2,
              "offset": 13,
            },
          },
          "name": "a_1",
        },
      }
    `);
    expect(parseKeyframesAtRule(fakeAtRule(' @keyframes  a_1  {}'))).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "keyframe": {
          "declarationLoc": {
            "end": {
              "column": 21,
              "line": 1,
              "offset": 20,
            },
            "start": {
              "column": 2,
              "line": 1,
              "offset": 1,
            },
          },
          "loc": {
            "end": {
              "column": 17,
              "line": 1,
              "offset": 16,
            },
            "start": {
              "column": 14,
              "line": 1,
              "offset": 13,
            },
          },
          "name": "a_1",
        },
      }
    `);
  });

  test('returns no keyframe for `@keyframes` without a name', () => {
    expect(parseKeyframesAtRule(fakeAtRule('@keyframes {}'))).toStrictEqual({ diagnostics: [] });
  });

  test('omits a name wrapped by `:global()`', () => {
    expect(parseKeyframesAtRule(fakeAtRule('@keyframes :global(a_1) {}'))).toStrictEqual({ diagnostics: [] });
  });

  test('reports a diagnostic for a name wrapped by `:local()`', () => {
    expect(parseKeyframesAtRule(fakeAtRule('@keyframes :local(a_1) {}'))).toMatchInlineSnapshot(`
      {
        "diagnostics": [
          {
            "category": "error",
            "length": 11,
            "start": {
              "column": 12,
              "line": 1,
              "offset": 11,
            },
            "text": "css-modules-kit does not support \`@keyframes :local(...)\`. Remove the \`:local(...)\` wrapper.",
          },
        ],
      }
    `);
  });
});
