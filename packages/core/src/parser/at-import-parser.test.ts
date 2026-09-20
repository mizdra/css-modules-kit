import { describe, expect, test } from 'vite-plus/test';
import { fakeAtRule } from '../test/ast.js';
import { parseImportAtRule } from './at-import-parser.js';

describe('parseImportAtRule', () => {
  test('parses the specifier of a string `@import`', () => {
    expect(parseImportAtRule(fakeAtRule(`@import "test.css";`))).toMatchInlineSnapshot(`
      {
        "from": "test.css",
        "fromLoc": {
          "end": {
            "column": 18,
            "line": 1,
            "offset": 17,
          },
          "start": {
            "column": 10,
            "line": 1,
            "offset": 9,
          },
        },
      }
    `);
  });

  test('parses the specifier of `url()` with a quoted string', () => {
    expect(parseImportAtRule(fakeAtRule(`@import url("test.css");`))).toMatchInlineSnapshot(`
      {
        "from": "test.css",
        "fromLoc": {
          "end": {
            "column": 22,
            "line": 1,
            "offset": 21,
          },
          "start": {
            "column": 14,
            "line": 1,
            "offset": 13,
          },
        },
      }
    `);
  });

  test('parses the specifier of `url()` without quotes', () => {
    expect(parseImportAtRule(fakeAtRule(`@import url(test.css);`))).toMatchInlineSnapshot(`
      {
        "from": "test.css",
        "fromLoc": {
          "end": {
            "column": 21,
            "line": 1,
            "offset": 20,
          },
          "start": {
            "column": 13,
            "line": 1,
            "offset": 12,
          },
        },
      }
    `);
  });

  test('ignores the media query after the specifier', () => {
    expect(parseImportAtRule(fakeAtRule(`@import "test.css" print;`))).toMatchInlineSnapshot(`
      {
        "from": "test.css",
        "fromLoc": {
          "end": {
            "column": 18,
            "line": 1,
            "offset": 17,
          },
          "start": {
            "column": 10,
            "line": 1,
            "offset": 9,
          },
        },
      }
    `);
  });

  test('returns undefined for `@import` without a specifier', () => {
    expect(parseImportAtRule(fakeAtRule(`@import;`))).toBeUndefined();
  });
});
