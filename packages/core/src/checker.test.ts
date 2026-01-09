import dedent from 'dedent';
import { describe, expect, test } from 'vitest';
import { checkCSSModule } from './checker.js';
import { createExportBuilder } from './export-builder.js';
import { createResolver } from './resolver.js';
import { readAndParseCSSModule } from './test/css-module.js';
import { formatDiagnostics } from './test/diagnostic.js';
import { fakeConfig } from './test/faker.js';
import { createIFF } from './test/fixture.js';
import type { CSSModule } from './type.js';

const resolver = createResolver({}, undefined);
const matchesPattern = (path: string) => path.endsWith('.module.css');

type Checker = (cssModule: CSSModule) => ReturnType<typeof checkCSSModule>;

interface PrepareCheckerOptions {
  config?: ReturnType<typeof fakeConfig>;
  resolver?: typeof resolver;
  matchesPattern?: typeof matchesPattern;
}

function prepareChecker(options?: PrepareCheckerOptions): Checker {
  const config = options?.config ?? fakeConfig();
  const resolverFn = options?.resolver ?? resolver;
  const matchesPatternFn = options?.matchesPattern ?? matchesPattern;
  return (cssModule: CSSModule) => {
    return checkCSSModule(
      cssModule,
      config,
      createExportBuilder({
        getCSSModule: readAndParseCSSModule,
        matchesPattern: matchesPatternFn,
        resolver: resolverFn,
      }),
      matchesPatternFn,
      resolverFn,
      readAndParseCSSModule,
    );
  };
}

describe('checkCSSModule', () => {
  test('report diagnostics for invalid name as js identifier', async () => {
    const iff = await createIFF({
      'a.module.css': dedent`
        .a-1 { color: red; }
        @value b-1, b-2 as a-2 from './b.module.css';
      `,
      'b.module.css': dedent`
        @value b-1: red;
        @value b-2: red;
      `,
    });
    const check = prepareChecker();
    const diagnostics = check(readAndParseCSSModule(iff.paths['a.module.css'])!);
    expect(formatDiagnostics(diagnostics, iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "fileName": "<rootDir>/a.module.css",
          "length": 3,
          "start": {
            "column": 2,
            "line": 1,
          },
          "text": "css-modules-kit does not support invalid names as JavaScript identifiers.",
        },
        {
          "category": "error",
          "fileName": "<rootDir>/a.module.css",
          "length": 3,
          "start": {
            "column": 8,
            "line": 2,
          },
          "text": "css-modules-kit does not support invalid names as JavaScript identifiers.",
        },
        {
          "category": "error",
          "fileName": "<rootDir>/a.module.css",
          "length": 3,
          "start": {
            "column": 13,
            "line": 2,
          },
          "text": "css-modules-kit does not support invalid names as JavaScript identifiers.",
        },
        {
          "category": "error",
          "fileName": "<rootDir>/a.module.css",
          "length": 3,
          "start": {
            "column": 20,
            "line": 2,
          },
          "text": "css-modules-kit does not support invalid names as JavaScript identifiers.",
        },
      ]
    `);
  });
  test('report diagnostics for "__proto__" name', async () => {
    const iff = await createIFF({
      'a.module.css': dedent`
        .__proto__ { color: red; }
        @value __proto__, valid as __proto__ from './b.module.css';
      `,
      'b.module.css': dedent`
        @value __proto__: red;
        @value valid: red;
      `,
    });
    const check = prepareChecker();
    const diagnostics = check(readAndParseCSSModule(iff.paths['a.module.css'])!);
    expect(formatDiagnostics(diagnostics, iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "fileName": "<rootDir>/a.module.css",
          "length": 9,
          "start": {
            "column": 2,
            "line": 1,
          },
          "text": "\`__proto__\` is not allowed as names.",
        },
        {
          "category": "error",
          "fileName": "<rootDir>/a.module.css",
          "length": 9,
          "start": {
            "column": 8,
            "line": 2,
          },
          "text": "\`__proto__\` is not allowed as names.",
        },
        {
          "category": "error",
          "fileName": "<rootDir>/a.module.css",
          "length": 9,
          "start": {
            "column": 28,
            "line": 2,
          },
          "text": "\`__proto__\` is not allowed as names.",
        },
      ]
    `);
  });
  test('report diagnostics for "default" name when namedExports is true', async () => {
    const iff = await createIFF({
      'a.module.css': dedent`
        .default { color: red; }
        @value default, valid as default from './b.module.css';
      `,
      'b.module.css': dedent`
        @value default: red;
        @value valid: red;
      `,
    });
    const check = prepareChecker({ config: fakeConfig({ namedExports: true }) });
    const diagnostics = check(readAndParseCSSModule(iff.paths['a.module.css'])!);
    expect(formatDiagnostics(diagnostics, iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "fileName": "<rootDir>/a.module.css",
          "length": 7,
          "start": {
            "column": 2,
            "line": 1,
          },
          "text": "\`default\` is not allowed as names when \`cmkOptions.namedExports\` is set to \`true\`.",
        },
        {
          "category": "error",
          "fileName": "<rootDir>/a.module.css",
          "length": 7,
          "start": {
            "column": 8,
            "line": 2,
          },
          "text": "\`default\` is not allowed as names when \`cmkOptions.namedExports\` is set to \`true\`.",
        },
        {
          "category": "error",
          "fileName": "<rootDir>/a.module.css",
          "length": 7,
          "start": {
            "column": 26,
            "line": 2,
          },
          "text": "\`default\` is not allowed as names when \`cmkOptions.namedExports\` is set to \`true\`.",
        },
      ]
    `);
  });
  test('report diagnostics for non-existing module', async () => {
    const iff = await createIFF({
      'a.module.css': dedent`
        @import './b.module.css';
        @value c_1 from './c.module.css';
      `,
    });
    const check = prepareChecker();
    const diagnostics = check(readAndParseCSSModule(iff.paths['a.module.css'])!);
    expect(formatDiagnostics(diagnostics, iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "fileName": "<rootDir>/a.module.css",
          "length": 14,
          "start": {
            "column": 10,
            "line": 1,
          },
          "text": "Cannot import module './b.module.css'",
        },
        {
          "category": "error",
          "fileName": "<rootDir>/a.module.css",
          "length": 14,
          "start": {
            "column": 18,
            "line": 2,
          },
          "text": "Cannot import module './c.module.css'",
        },
      ]
    `);
  });
  test('report diagnostics for non-exported token', async () => {
    const iff = await createIFF({
      'a.module.css': `@value b_1, b_2 from './b.module.css';`,
      'b.module.css': `@value b_1: red;`,
    });
    const check = prepareChecker();
    const diagnostics = check(readAndParseCSSModule(iff.paths['a.module.css'])!);
    expect(formatDiagnostics(diagnostics, iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "fileName": "<rootDir>/a.module.css",
          "length": 3,
          "start": {
            "column": 13,
            "line": 1,
          },
          "text": "Module './b.module.css' has no exported token 'b_2'.",
        },
      ]
    `);
  });
  test('ignore token importers for unresolvable modules', async () => {
    const iff = await createIFF({
      'a.module.css': `@import 'unresolvable';`,
    });
    const check = prepareChecker();
    const diagnostics = check(readAndParseCSSModule(iff.paths['a.module.css'])!);
    expect(diagnostics).toEqual([]);
  });
  test('ignore token importers that do not match the pattern', async () => {
    const iff = await createIFF({
      'a.module.css': dedent`
        @import './b.module.css';
        @value non_existing_value from './b.module.css';
      `,
      'b.module.css': '.b_1 { color: red; }',
    });
    const check = prepareChecker({
      matchesPattern: (path) => path.endsWith('.module.css') && !path.endsWith('b.module.css'),
    });
    const diagnostics = check(readAndParseCSSModule(iff.paths['a.module.css'])!);
    // TODO: Report a diagnostic for code that imports values from modules that do not match the pattern.
    expect(diagnostics).toEqual([]);
  });
});
