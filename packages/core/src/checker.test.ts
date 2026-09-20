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
  test('reports a named token importer entry that the imported module does not export', async () => {
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
  test('reports a token importer whose specifier cannot be resolved', async () => {
    const iff = await createIFF({
      'a.module.css': dedent`
        @import './b.module.css';
        @value b_1 from './b.module.css';
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
          "text": "Cannot import module './b.module.css'",
        },
      ]
    `);
  });
  test('reports no diagnostic for an all token importer whose specifier is a URL', async () => {
    const iff = await createIFF({
      'a.module.css': `@import 'https://example.com/a.module.css';`,
    });
    const check = prepareChecker();
    const diagnostics = check(readAndParseCSSModule(iff.paths['a.module.css'])!);
    expect(diagnostics).toEqual([]);
  });
  test('reports no diagnostic for an all token importer of an unmatched file', async () => {
    const iff = await createIFF({
      'a.module.css': `@import './unmatched.module.css';`,
      'unmatched.module.css': '.unmatched_1 { color: red; }',
    });
    const check = prepareChecker({
      matchesPattern: (path) => path.endsWith('.module.css') && !path.endsWith('unmatched.module.css'),
    });
    const diagnostics = check(readAndParseCSSModule(iff.paths['a.module.css'])!);
    expect(diagnostics).toEqual([]);
  });
  // TODO: https://github.com/mizdra/css-modules-kit/issues/450
  test.todo('reports a named token importer whose specifier is a URL');
  test('reports no diagnostic for a named token importer of an unmatched file', async () => {
    const iff = await createIFF({
      'a.module.css': `@value unmatched_1 from './unmatched.module.css';`,
      'unmatched.module.css': '.unmatched_1 { color: red; }',
    });
    const check = prepareChecker({
      matchesPattern: (path) => path.endsWith('.module.css') && !path.endsWith('unmatched.module.css'),
    });
    const diagnostics = check(readAndParseCSSModule(iff.paths['a.module.css'])!);
    expect(diagnostics).toEqual([]);
  });
  test('reports a local token reference to a token that is neither defined nor imported', async () => {
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
  test('reports no diagnostic for a local token reference to an imported token', async () => {
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
  test('reports an external token reference whose specifier cannot be resolved once per `from` clause', async () => {
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
  test('reports an external token reference entry that the referenced module does not export', async () => {
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
  test('reports no diagnostic for an external token reference to an unmatched file', async () => {
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
