import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import type { CheckerArgs } from './checker.js';
import { checkCSSModule } from './checker.js';
import { createExportBuilder } from './export-builder.js';
import { createResolver } from './resolver.js';
import { readAndParseCSSModule } from './test/css-module.js';
import { formatDiagnostics } from './test/diagnostic.js';
import { createIFF } from './test/fixture.js';
import type { CSSModule } from './type.js';

const resolver = createResolver({}, undefined);
const matchesPattern = (path: string) => path.endsWith('.module.css');

type Checker = (cssModule: CSSModule) => ReturnType<typeof checkCSSModule>;

function prepareChecker(args?: Partial<CheckerArgs>): Checker {
  const resolverFn = args?.resolver ?? resolver;
  const matchesPatternFn = args?.matchesPattern ?? matchesPattern;
  const exportBuilder = createExportBuilder({
    getCSSModule: readAndParseCSSModule,
    matchesPattern: matchesPatternFn,
    resolver: resolverFn,
  });
  return (cssModule: CSSModule) => {
    return checkCSSModule(cssModule, {
      getExportRecord: (m) => exportBuilder.build(m),
      matchesPattern: matchesPatternFn,
      resolver: resolverFn,
      getCSSModule: readAndParseCSSModule,
    });
  };
}

describe('checkCSSModule', () => {
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
  test('report diagnostics for references to undefined tokens', async () => {
    const iff = await createIFF({
      'a.module.css': dedent`
        @keyframes a_1 {}
        .a_2 { animation-name: a_1, a_3; }
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
    	      "column": 29,
    	      "line": 2,
    	    },
    	    "text": "Cannot find token 'a_3'.",
    	  },
    	]
    `);
  });
  test('do not report diagnostics for references to tokens imported via @import', async () => {
    const iff = await createIFF({
      'a.module.css': dedent`
        @import './b.module.css';
        .a_1 { animation-name: b_1; }
      `,
      'b.module.css': '@keyframes b_1 {}',
    });
    const check = prepareChecker();
    const diagnostics = check(readAndParseCSSModule(iff.paths['a.module.css'])!);
    expect(diagnostics).toEqual([]);
  });
  test('report diagnostics for external references with unresolvable modules', async () => {
    // The diagnostic is reported once per `from` clause, even if it has multiple entries.
    const iff = await createIFF({
      'a.module.css': `.a_1 { composes: b_1 b_2 from './b.module.css'; }`,
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
            "column": 32,
            "line": 1,
          },
          "text": "Cannot import module './b.module.css'",
        },
      ]
    `);
  });
  test('report diagnostics for external references to non-exported tokens', async () => {
    const iff = await createIFF({
      'a.module.css': `.a_1 { composes: b_1 b_2 from './b.module.css'; }`,
      'b.module.css': `.b_1 { color: red; }`,
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
            "column": 22,
            "line": 1,
          },
          "text": "Module './b.module.css' has no exported token 'b_2'.",
        },
      ]
    `);
  });
  test('do not report diagnostics for external references for unmatched modules', async () => {
    const iff = await createIFF({
      'a.module.css': `.a_1 { composes: unmatched_1 from './unmatched.module.css'; }`,
      'unmatched.module.css': '.unmatched_1 { color: red; }',
    });
    const check = prepareChecker({
      matchesPattern: (path) => path.endsWith('.module.css') && !path.endsWith('unmatched.module.css'),
    });
    const diagnostics = check(readAndParseCSSModule(iff.paths['a.module.css'])!);
    expect(diagnostics).toEqual([]);
  });
});
