import dedent from 'dedent';
import { expect, test } from 'vitest';
import { fakeAtImports, fakeRoot } from '../test/ast.js';
import { parseAtImport } from './at-import-parser.js';

test('parseAtImport', () => {
  const atImports = fakeAtImports(
    fakeRoot(dedent`
      @import;
      @import "test.css";
      @import url("test.css");
      @import url(test.css);
      @import "test.css" print;
    `),
  );
  expect(atImports.map(parseAtImport)).toMatchInlineSnapshot(`
    [
      undefined,
      {
        "from": "test.css",
        "fromLoc": {
          "end": {
            "column": 18,
            "line": 2,
            "offset": 26,
          },
          "start": {
            "column": 10,
            "line": 2,
            "offset": 18,
          },
        },
      },
      {
        "from": "test.css",
        "fromLoc": {
          "end": {
            "column": 22,
            "line": 3,
            "offset": 50,
          },
          "start": {
            "column": 14,
            "line": 3,
            "offset": 42,
          },
        },
      },
      {
        "from": "test.css",
        "fromLoc": {
          "end": {
            "column": 21,
            "line": 4,
            "offset": 74,
          },
          "start": {
            "column": 13,
            "line": 4,
            "offset": 66,
          },
        },
      },
      {
        "from": "test.css",
        "fromLoc": {
          "end": {
            "column": 18,
            "line": 5,
            "offset": 94,
          },
          "start": {
            "column": 10,
            "line": 5,
            "offset": 86,
          },
        },
      },
    ]
  `);
});
