import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { fakeDeclaration } from '../test/ast.js';
import { isAnimationNameProp, parseAnimationNameProp } from './animation-parser.js';

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
    	    },
    	  ],
    	}
    `);
  });

  test('reports a diagnostic and skips references for invalid local() shapes (multiple idents, non-identifier node, empty)', () => {
    const decl = fakeDeclaration('.a_1 { animation-name: local(a_2, a_3), local(a_4, local(a_5)), local() }');
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
    	    },
    	  ],
    	}
    `);
  });
});
