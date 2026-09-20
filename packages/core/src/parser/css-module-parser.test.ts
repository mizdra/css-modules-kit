import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { parseCSSModule, type ParseCSSModuleOptions } from './css-module-parser.js';

const options: ParseCSSModuleOptions = {
  fileName: '/test.module.css',
  includeSyntaxError: true,
  animation: true,
  dashedIdents: false,
  container: false,
  namedExports: false,
};

describe('parseCSSModule', () => {
  test('collects a local token from a class selector, a `@value` declaration, and a `@keyframes` rule', () => {
    const parsed = parseCSSModule(
      dedent`
        .a_1 {}
        @value a_2: red;
        @keyframes a_3 {}
      `,
      options,
    );
    expect(parsed).toMatchInlineSnapshot(`
      {
        "diagnostics": [],
        "fileName": "/test.module.css",
        "localTokens": [
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
          {
            "declarationLoc": {
              "end": {
                "column": 16,
                "line": 2,
                "offset": 23,
              },
              "start": {
                "column": 1,
                "line": 2,
                "offset": 8,
              },
            },
            "loc": {
              "end": {
                "column": 11,
                "line": 2,
                "offset": 18,
              },
              "start": {
                "column": 8,
                "line": 2,
                "offset": 15,
              },
            },
            "name": "a_2",
          },
          {
            "declarationLoc": {
              "end": {
                "column": 18,
                "line": 3,
                "offset": 42,
              },
              "start": {
                "column": 1,
                "line": 3,
                "offset": 25,
              },
            },
            "loc": {
              "end": {
                "column": 15,
                "line": 3,
                "offset": 39,
              },
              "start": {
                "column": 12,
                "line": 3,
                "offset": 36,
              },
            },
            "name": "a_3",
          },
        ],
        "text": ".a_1 {}
      @value a_2: red;
      @keyframes a_3 {}",
        "tokenImporters": [],
        "tokenReferences": [],
      }
    `);
  });
  test('collects local tokens from rules nested in at-rules', () => {
    const parsed = parseCSSModule(
      dedent`
        @supports (display: flex) {
          @media screen {
            .a_1 {}
          }
        }
      `,
      options,
    );
    expect(parsed.localTokens.map((token) => token.name)).toStrictEqual(['a_1']);
  });
  test('collects an all token importer from `@import` and a named token importer from `@value ... from`', () => {
    const parsed = parseCSSModule(
      dedent`
        @import './b.module.css';
        @value c_1, c_2 as a_1 from './c.module.css';
      `,
      options,
    );
    expect(parsed.tokenImporters).toMatchInlineSnapshot(`
      [
        {
          "from": "./b.module.css",
          "fromLoc": {
            "end": {
              "column": 24,
              "line": 1,
              "offset": 23,
            },
            "start": {
              "column": 10,
              "line": 1,
              "offset": 9,
            },
          },
          "type": "all",
        },
        {
          "entries": [
            {
              "loc": {
                "end": {
                  "column": 11,
                  "line": 2,
                  "offset": 36,
                },
                "start": {
                  "column": 8,
                  "line": 2,
                  "offset": 33,
                },
              },
              "name": "c_1",
            },
            {
              "loc": {
                "end": {
                  "column": 16,
                  "line": 2,
                  "offset": 41,
                },
                "start": {
                  "column": 13,
                  "line": 2,
                  "offset": 38,
                },
              },
              "localLoc": {
                "end": {
                  "column": 23,
                  "line": 2,
                  "offset": 48,
                },
                "start": {
                  "column": 20,
                  "line": 2,
                  "offset": 45,
                },
              },
              "localName": "a_1",
              "name": "c_2",
            },
          ],
          "from": "./c.module.css",
          "fromLoc": {
            "end": {
              "column": 44,
              "line": 2,
              "offset": 69,
            },
            "start": {
              "column": 30,
              "line": 2,
              "offset": 55,
            },
          },
          "type": "named",
        },
      ]
    `);
  });
  test('collects token references from `composes` declarations', () => {
    const parsed = parseCSSModule(
      dedent`
        .a_1 { color: red; }
        .a_2 { composes: a_1; }
      `,
      options,
    );
    expect(parsed.tokenReferences).toMatchInlineSnapshot(`
      [
        {
          "loc": {
            "end": {
              "column": 21,
              "line": 2,
              "offset": 41,
            },
            "start": {
              "column": 18,
              "line": 2,
              "offset": 38,
            },
          },
          "name": "a_1",
          "type": "local",
        },
      ]
    `);
  });
  test('matches at-rule names case-insensitively', () => {
    const cssModule = parseCSSModule(
      dedent`
        @IMPORT './a.module.css';
        @VALUE b: red;
        @KEYFRAMES fade {}
      `,
      options,
    );
    expect(cssModule.tokenImporters.map((importer) => importer.from)).toStrictEqual(['./a.module.css']);
    expect(cssModule.localTokens.map((token) => token.name)).toStrictEqual(['b', 'fade']);
  });
  test('collects `@keyframes` tokens and the token references of `animation-name` and `animation` when animation is true', () => {
    const parsed = parseCSSModule(
      dedent`
        @keyframes a_1 {}
        .a_2 { animation-name: a_1; }
        .a_3 { animation: a_1 1s linear; }
      `,
      { ...options, animation: true },
    );
    expect(parsed.localTokens.map((token) => token.name)).toStrictEqual(['a_1', 'a_2', 'a_3']);
    expect(parsed.tokenReferences.map((ref) => ref.type === 'local' && ref.name)).toStrictEqual(['a_1', 'a_1']);
  });
  test('omits `@keyframes` tokens and the token references of `animation-name` and `animation` when animation is false', () => {
    const parsed = parseCSSModule(
      dedent`
        @keyframes a_1 {}
        .a_2 { animation-name: a_1; }
        .a_3 { animation: a_1 1s linear; }
      `,
      { ...options, animation: false },
    );
    expect(parsed.localTokens.map((token) => token.name)).toStrictEqual(['a_2', 'a_3']);
    expect(parsed.tokenReferences).toStrictEqual([]);
  });
  test('collects container name tokens and token references when container is true', () => {
    const parsed = parseCSSModule(
      dedent`
        .a_1 { container-name: foo; }
        @container foo (width > 400px) {}
      `,
      { ...options, container: true },
    );
    expect(parsed.localTokens.map((token) => token.name)).toStrictEqual(['a_1', 'foo']);
    expect(parsed.tokenReferences.map((ref) => ref.type === 'local' && ref.name)).toStrictEqual(['foo']);
  });
  test('omits container name tokens and token references when container is false', () => {
    const parsed = parseCSSModule(
      dedent`
        .a_1 { container-name: foo; }
        @container foo (width > 400px) {}
      `,
      { ...options, container: false },
    );
    expect(parsed.localTokens.map((token) => token.name)).toStrictEqual(['a_1']);
    expect(parsed.tokenReferences).toStrictEqual([]);
  });
  test('collects dashed-ident tokens and token references when dashedIdents is true', () => {
    const parsed = parseCSSModule('.a_1 { --foo: red; color: var(--foo); }', { ...options, dashedIdents: true });
    expect(parsed.localTokens.map((token) => token.name)).toStrictEqual(['a_1', '--foo']);
    expect(parsed.tokenReferences.map((ref) => ref.type === 'local' && ref.name)).toStrictEqual(['--foo']);
  });
  test('omits dashed-ident tokens and token references when dashedIdents is false', () => {
    const parsed = parseCSSModule('.a_1 { --foo: red; color: var(--foo); }', { ...options, dashedIdents: false });
    expect(parsed.localTokens.map((token) => token.name)).toStrictEqual(['a_1']);
    expect(parsed.tokenReferences).toStrictEqual([]);
  });
  test('attaches the file to the diagnostics reported by the rule and `@value` parsers', () => {
    const parsed = parseCSSModule(
      dedent`
        :local .a_1 {}
        @value;
      `,
      options,
    );
    expect(parsed.diagnostics).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "file": {
            "fileName": "/test.module.css",
            "text": ":local .a_1 {}
      @value;",
          },
          "length": 6,
          "start": {
            "column": 1,
            "line": 1,
            "offset": 0,
          },
          "text": "css-modules-kit does not support \`:local\`. Use \`:local(...)\` instead.",
        },
        {
          "category": "error",
          "file": {
            "fileName": "/test.module.css",
            "text": ":local .a_1 {}
      @value;",
          },
          "length": 7,
          "start": {
            "column": 1,
            "line": 2,
          },
          "text": "\`@value\` is a invalid syntax.",
        },
      ]
    `);
  });
  test('reports a CSS syntax error and still collects local tokens', () => {
    const parsed = parseCSSModule('.a_1 {', options);
    expect(parsed.diagnostics).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "file": {
            "fileName": "/test.module.css",
            "text": ".a_1 {",
          },
          "length": 1,
          "start": {
            "column": 1,
            "line": 1,
          },
          "text": "Unclosed block",
        },
      ]
    `);
    expect(parsed.localTokens.map((token) => token.name)).toStrictEqual(['a_1']);
  });
  test('reports the range of a CSS syntax error that has an end position', () => {
    const parsed = parseCSSModule('badword', options);
    expect(parsed.diagnostics).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "file": {
            "fileName": "/test.module.css",
            "text": "badword",
          },
          "length": 7,
          "start": {
            "column": 1,
            "line": 1,
          },
          "text": "Unknown word badword",
        },
      ]
    `);
  });
  test('omits CSS syntax errors when includeSyntaxError is false', () => {
    const parsed = parseCSSModule('.a_1 {', { ...options, includeSyntaxError: false });
    expect(parsed.diagnostics).toStrictEqual([]);
    expect(parsed.localTokens.map((token) => token.name)).toStrictEqual(['a_1']);
  });
  test('reports diagnostics for `__proto__` in token names', () => {
    const parsed = parseCSSModule(
      dedent`
        .__proto__ {}
        @value __proto__, valid as __proto__ from './b.module.css';
      `,
      options,
    );
    expect(parsed.diagnostics).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "file": {
            "fileName": "/test.module.css",
            "text": ".__proto__ {}
      @value __proto__, valid as __proto__ from './b.module.css';",
          },
          "length": 9,
          "start": {
            "column": 2,
            "line": 1,
            "offset": 1,
          },
          "text": "\`__proto__\` is not allowed as names.",
        },
        {
          "category": "error",
          "file": {
            "fileName": "/test.module.css",
            "text": ".__proto__ {}
      @value __proto__, valid as __proto__ from './b.module.css';",
          },
          "length": 9,
          "start": {
            "column": 8,
            "line": 2,
            "offset": 21,
          },
          "text": "\`__proto__\` is not allowed as names.",
        },
        {
          "category": "error",
          "file": {
            "fileName": "/test.module.css",
            "text": ".__proto__ {}
      @value __proto__, valid as __proto__ from './b.module.css';",
          },
          "length": 9,
          "start": {
            "column": 28,
            "line": 2,
            "offset": 41,
          },
          "text": "\`__proto__\` is not allowed as names.",
        },
      ]
    `);
  });
  test('reports diagnostics for `default` in token names when namedExports is true', () => {
    const parsed = parseCSSModule(
      dedent`
        .default {}
        @value default, valid as default from './b.module.css';
      `,
      { ...options, namedExports: true },
    );
    expect(parsed.diagnostics).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "file": {
            "fileName": "/test.module.css",
            "text": ".default {}
      @value default, valid as default from './b.module.css';",
          },
          "length": 7,
          "start": {
            "column": 2,
            "line": 1,
            "offset": 1,
          },
          "text": "\`default\` is not allowed as names when \`cmkOptions.namedExports\` is set to \`true\`.",
        },
        {
          "category": "error",
          "file": {
            "fileName": "/test.module.css",
            "text": ".default {}
      @value default, valid as default from './b.module.css';",
          },
          "length": 7,
          "start": {
            "column": 8,
            "line": 2,
            "offset": 19,
          },
          "text": "\`default\` is not allowed as names when \`cmkOptions.namedExports\` is set to \`true\`.",
        },
        {
          "category": "error",
          "file": {
            "fileName": "/test.module.css",
            "text": ".default {}
      @value default, valid as default from './b.module.css';",
          },
          "length": 7,
          "start": {
            "column": 26,
            "line": 2,
            "offset": 37,
          },
          "text": "\`default\` is not allowed as names when \`cmkOptions.namedExports\` is set to \`true\`.",
        },
      ]
    `);
  });
  test('does not report diagnostics for `default` in token names when namedExports is false', () => {
    const parsed = parseCSSModule('.default {}', options);
    expect(parsed.diagnostics).toEqual([]);
  });
  test('reports diagnostics for backslash in token names', () => {
    // NOTE: The backslash is valid syntax in class selectors, but it is invalid syntax in `@value`.
    // Therefore, it is sufficient for diagnostics to be reported only for class selectors.
    const parsed = parseCSSModule(`.a\\1 {}`, options);
    expect(parsed.diagnostics).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "file": {
            "fileName": "/test.module.css",
            "text": ".a\\1 {}",
          },
          "length": 4,
          "start": {
            "column": 2,
            "line": 1,
            "offset": 1,
          },
          "text": "Backslash (\\) is not allowed in names.",
        },
      ]
    `);
  });
});
