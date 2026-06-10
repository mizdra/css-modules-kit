import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { fakeDeclaration } from '../test/ast.js';
import { isComposesProp, parseComposesProp } from './composes-parser.js';

describe('isComposesProp', () => {
  test.each([
    ['composes', true],
    ['Composes', true],
    ['COMPOSES', true],
    ['compose-with', false],
    ['a-composes', false],
    ['composes-b', false],
    ['color', false],
  ])('%s -> %s', (prop, expected) => {
    expect(isComposesProp(prop)).toBe(expected);
  });
});

describe('parseComposesProp', () => {
  test('extracts a single class name', () => {
    const decl = fakeDeclaration('.a_1 { composes: a_2 }');
    expect(parseComposesProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "references": [
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
            "name": "a_2",
          },
        ],
      }
    `);
  });

  test('extracts space-separated class names', () => {
    const decl = fakeDeclaration('.a_1 { composes: a_2 a_3 }');
    expect(parseComposesProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "references": [
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
            "name": "a_2",
          },
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
            "name": "a_3",
          },
        ],
      }
    `);
  });

  test('extracts comma-separated class names', () => {
    const decl = fakeDeclaration('.a_1 { composes: a_2, a_3 }');
    expect(parseComposesProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "references": [
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
            "name": "a_2",
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
          },
        ],
      }
    `);
  });

  test('skips class name inside global()', () => {
    const decl = fakeDeclaration('.a_1 { composes: global(a_2) }');
    expect(parseComposesProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "references": [],
      }
    `);
  });

  test('skips items with from global', () => {
    const decl = fakeDeclaration('.a_1 { composes: a_2 a_3 from global }');
    expect(parseComposesProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "references": [],
      }
    `);
  });

  test('skips items with from specifier', () => {
    const decl = fakeDeclaration(`.a_1 { composes: a_2 from './a.module.css' }`);
    expect(parseComposesProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "references": [],
      }
    `);
  });

  test('extracts class names only from items without a from clause', () => {
    const decl = fakeDeclaration(`.a_1 { composes: a_2, a_3 from './a.module.css', a_4 from global, a_5 }`);
    expect(parseComposesProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "references": [
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
            "name": "a_2",
          },
          {
            "loc": {
              "end": {
                "column": 70,
                "line": 1,
                "offset": 69,
              },
              "start": {
                "column": 67,
                "line": 1,
                "offset": 66,
              },
            },
            "name": "a_5",
          },
        ],
      }
    `);
  });

  test('reports a diagnostic for from clause without quoted specifier or global keyword (unquoted specifier, empty, non-global word)', () => {
    const decl = fakeDeclaration('.a_1 { composes: a_2 from ./a.module.css, a_3 from, a_4 from b_1 }');
    expect(parseComposesProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [
          {
            "category": "error",
            "length": 19,
            "start": {
              "column": 22,
              "line": 1,
            },
            "text": "\`from\` must be followed by a quoted specifier or \`global\`.",
          },
          {
            "category": "error",
            "length": 4,
            "start": {
              "column": 47,
              "line": 1,
            },
            "text": "\`from\` must be followed by a quoted specifier or \`global\`.",
          },
          {
            "category": "error",
            "length": 8,
            "start": {
              "column": 57,
              "line": 1,
            },
            "text": "\`from\` must be followed by a quoted specifier or \`global\`.",
          },
        ],
        "references": [],
      }
    `);
  });

  test('extracts references on lines after the declaration start', () => {
    const decl = fakeDeclaration(dedent`
      .a_1 {
        composes:
          a_2,
          a_3 from global,
          a_4;
      }
    `);
    expect(parseComposesProp(decl)).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "references": [
          {
            "loc": {
              "end": {
                "column": 8,
                "line": 3,
                "offset": 26,
              },
              "start": {
                "column": 5,
                "line": 3,
                "offset": 23,
              },
            },
            "name": "a_2",
          },
          {
            "loc": {
              "end": {
                "column": 8,
                "line": 5,
                "offset": 56,
              },
              "start": {
                "column": 5,
                "line": 5,
                "offset": 53,
              },
            },
            "name": "a_4",
          },
        ],
      }
    `);
  });
});
