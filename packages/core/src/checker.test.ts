import dedent from 'dedent';
import { describe, expect, test } from 'vitest';
import type { CheckerArgs } from './checker.js';
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

function prepareChecker(args?: Partial<CheckerArgs>): Checker {
  const config = args?.config ?? fakeConfig();
  const resolverFn = args?.resolver ?? resolver;
  const matchesPatternFn = args?.matchesPattern ?? matchesPattern;
  const exportBuilder = createExportBuilder({
    getCSSModule: readAndParseCSSModule,
    matchesPattern: matchesPatternFn,
    resolver: resolverFn,
  });
  return (cssModule: CSSModule) => {
    return checkCSSModule(cssModule, {
      config,
      getExportRecord: (m) => exportBuilder.build(m),
      matchesPattern: matchesPatternFn,
      resolver: resolverFn,
      getCSSModule: readAndParseCSSModule,
    });
  };
}

describe('checkCSSModule', () => {
  test('do not report diagnostics for invalid name as js identifier when namedExports is false', async () => {
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
    const check = prepareChecker({ config: fakeConfig({ namedExports: false }) });
    const diagnostics = check(readAndParseCSSModule(iff.paths['a.module.css'])!);
    expect(diagnostics).toEqual([]);
  });
  test('report diagnostics for invalid name as js identifier when namedExports is true', async () => {
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
    const check = prepareChecker({ config: fakeConfig({ namedExports: true }) });
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
          "text": "css-modules-kit does not support invalid names as JavaScript identifiers when \`cmkOptions.namedExports\` is set to \`true\`.",
        },
        {
          "category": "error",
          "fileName": "<rootDir>/a.module.css",
          "length": 3,
          "start": {
            "column": 8,
            "line": 2,
          },
          "text": "css-modules-kit does not support invalid names as JavaScript identifiers when \`cmkOptions.namedExports\` is set to \`true\`.",
        },
        {
          "category": "error",
          "fileName": "<rootDir>/a.module.css",
          "length": 3,
          "start": {
            "column": 13,
            "line": 2,
          },
          "text": "css-modules-kit does not support invalid names as JavaScript identifiers when \`cmkOptions.namedExports\` is set to \`true\`.",
        },
        {
          "category": "error",
          "fileName": "<rootDir>/a.module.css",
          "length": 3,
          "start": {
            "column": 20,
            "line": 2,
          },
          "text": "css-modules-kit does not support invalid names as JavaScript identifiers when \`cmkOptions.namedExports\` is set to \`true\`.",
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
  test('report diagnostics for unresolvable modules', async () => {
    const iff = await createIFF({
      'a.module.css': dedent`
        @import './b.module.css';
        @import 'package/c.module.css';
        @value b_1 from './b.module.css';
        @value c_1 from 'package/c.module.css';
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
          "length": 20,
          "start": {
            "column": 10,
            "line": 2,
          },
          "text": "Cannot import module 'package/c.module.css'",
        },
        {
          "category": "error",
          "fileName": "<rootDir>/a.module.css",
          "length": 14,
          "start": {
            "column": 18,
            "line": 3,
          },
          "text": "Cannot import module './b.module.css'",
        },
        {
          "category": "error",
          "fileName": "<rootDir>/a.module.css",
          "length": 20,
          "start": {
            "column": 18,
            "line": 4,
          },
          "text": "Cannot import module 'package/c.module.css'",
        },
      ]
    `);
  });
  test('do not report diagnostics for `@import` for URLs and unmatched modules', async () => {
    const iff = await createIFF({
      'a.module.css': dedent`
        @import 'https://example.com/a.module.css';
        @import './unmatched.module.css';
      `,
      'unmatched.module.css': '.unmatched_1 { color: red; }',
    });
    const check = prepareChecker({
      matchesPattern: (path) => path.endsWith('.module.css') && !path.endsWith('unmatched.module.css'),
    });
    const diagnostics = check(readAndParseCSSModule(iff.paths['a.module.css'])!);
    expect(diagnostics).toEqual([]);
  });
  test('report diagnostics for `@value ... from ...` for URLs and unmatched modules', async () => {
    const iff = await createIFF({
      'a.module.css': dedent`
        @value a_1 from 'https://example.com/a.module.css';
        @value unmatched_1 from './unmatched.module.css';
      `,
      'unmatched.module.css': '.unmatched_1 { color: red; }',
    });
    const check = prepareChecker({
      matchesPattern: (path) => path.endsWith('.module.css') && !path.endsWith('unmatched.module.css'),
    });
    const diagnostics = check(readAndParseCSSModule(iff.paths['a.module.css'])!);
    // TODO: Report diagnostics
    expect(diagnostics).toEqual([]);
  });
});
