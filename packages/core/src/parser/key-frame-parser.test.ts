import dedent from 'dedent';
import { describe, expect, test } from 'vitest';
import { fakeAtKeyframes, fakeRoot } from '../test/ast.js';
import { parseAtKeyframes } from './key-frame-parser.js';

describe('parseAtKeyframes', () => {
  test('valid', () => {
    const atKeyframes = fakeAtKeyframes(
      fakeRoot(dedent`
        @keyframes basic {}
        @keyframes
          multipleLine {
        }
         @keyframes  withSpace  {}
        /* Empty keyframes are ignored */
        @keyframes {}
        /* :global() wrappers are ignored */
        @keyframes :global(global) {}
      `),
    );
    const result = atKeyframes.map(parseAtKeyframes);
    expect(result).toMatchInlineSnapshot(`
      [
        {
          "diagnostics": [],
          "keyframe": {
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
                "column": 17,
                "line": 1,
                "offset": 16,
              },
              "start": {
                "column": 12,
                "line": 1,
                "offset": 11,
              },
            },
            "name": "basic",
          },
        },
        {
          "diagnostics": [],
          "keyframe": {
            "declarationLoc": {
              "end": {
                "column": 2,
                "line": 4,
                "offset": 49,
              },
              "start": {
                "column": 1,
                "line": 2,
                "offset": 20,
              },
            },
            "loc": {
              "end": {
                "column": 15,
                "line": 3,
                "offset": 45,
              },
              "start": {
                "column": 3,
                "line": 3,
                "offset": 33,
              },
            },
            "name": "multipleLine",
          },
        },
        {
          "diagnostics": [],
          "keyframe": {
            "declarationLoc": {
              "end": {
                "column": 27,
                "line": 5,
                "offset": 76,
              },
              "start": {
                "column": 2,
                "line": 5,
                "offset": 51,
              },
            },
            "loc": {
              "end": {
                "column": 23,
                "line": 5,
                "offset": 72,
              },
              "start": {
                "column": 14,
                "line": 5,
                "offset": 63,
              },
            },
            "name": "withSpace",
          },
        },
        {
          "diagnostics": [],
        },
        {
          "diagnostics": [],
        },
      ]
    `);
  });
  test('invalid', () => {
    const atKeyframes = fakeAtKeyframes(
      fakeRoot(dedent`
        /* :local() wrappers are disallowed */
        @keyframes :local(local) {}
      `),
    );
    const result = atKeyframes.map(parseAtKeyframes);
    expect(result).toMatchInlineSnapshot(`
      [
        {
          "diagnostics": [
            {
              "category": "error",
              "length": 13,
              "start": {
                "column": 12,
                "line": 2,
                "offset": 50,
              },
              "text": "css-modules-kit does not support \`:local()\` wrapper for keyframes. Use \`@keyframes :local(local) {...}\` instead.",
            },
          ],
        },
      ]
    `);
  });
});
