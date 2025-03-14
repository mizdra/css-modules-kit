import { describe, expect, test } from 'vitest';
import { checkCSSModule } from './checker.js';
import type { ExportBuilder } from './export-builder.js';
import { createResolver } from './resolver.js';
import { fakeCSSModule } from './test/css-module.js';
import { fakeAtImportTokenImporter, fakeAtValueTokenImporter } from './test/token.js';

const resolver = createResolver({}, undefined);

describe('checkCSSModule', () => {
  test('report diagnostics for non-existing module', () => {
    const cssModule = fakeCSSModule({
      fileName: '/a.module.css',
      tokenImporters: [
        fakeAtImportTokenImporter('./b.module.css'),
        fakeAtValueTokenImporter('./c.module.css', ['c_1']),
      ],
    });
    const exportBuilder: ExportBuilder = {
      build: () => ({ allTokens: [] }),
      clearCache: () => {},
    };
    const matchesPattern = () => true;
    const getCSSModule = () => undefined;
    const diagnostics = checkCSSModule(cssModule, exportBuilder, matchesPattern, resolver, getCSSModule);
    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "end": {
            "column": 1,
            "line": 1,
          },
          "fileName": "/a.module.css",
          "start": {
            "column": 1,
            "line": 1,
          },
          "text": "Cannot import module './b.module.css'",
          "type": "semantic",
        },
        {
          "category": "error",
          "end": {
            "column": 1,
            "line": 1,
          },
          "fileName": "/a.module.css",
          "start": {
            "column": 1,
            "line": 1,
          },
          "text": "Cannot import module './c.module.css'",
          "type": "semantic",
        },
      ]
    `);
  });
  test('report diagnostics for non-exported token', () => {
    const cssModule = fakeCSSModule({
      fileName: '/a.module.css',
      tokenImporters: [fakeAtValueTokenImporter('./b.module.css', ['b_1', 'b_2'])],
    });
    const exportBuilder: ExportBuilder = {
      build: () => ({ allTokens: ['b_1'] }),
      clearCache: () => {},
    };
    const matchesPattern = () => true;
    const getCSSModule = () => cssModule;
    const diagnostics = checkCSSModule(cssModule, exportBuilder, matchesPattern, resolver, getCSSModule);
    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "end": {
            "column": 1,
            "line": 1,
          },
          "fileName": "/a.module.css",
          "start": {
            "column": 1,
            "line": 1,
          },
          "text": "Module './b.module.css' has no exported token 'b_2'.",
          "type": "semantic",
        },
      ]
    `);
  });
  test('ignore token importers for unresolvable modules', () => {
    const cssModule = fakeCSSModule({
      fileName: '/a.module.css',
      tokenImporters: [fakeAtImportTokenImporter('./unresolvable.module.css')],
    });
    const exportBuilder: ExportBuilder = {
      build: () => ({ allTokens: [] }),
      clearCache: () => {},
    };
    const matchesPattern = () => true;
    const resolver = () => undefined;
    const getCSSModule = () => undefined;
    const diagnostics = checkCSSModule(cssModule, exportBuilder, matchesPattern, resolver, getCSSModule);
    expect(diagnostics).toEqual([]);
  });
  test('ignore token importers that do not match the pattern', () => {
    const cssModule = fakeCSSModule({
      fileName: '/a.module.css',
      tokenImporters: [
        fakeAtImportTokenImporter('./b.module.css'),
        fakeAtValueTokenImporter('./c.module.css', ['c_1']),
      ],
    });
    const exportBuilder: ExportBuilder = {
      build: () => ({ allTokens: [] }),
      clearCache: () => {},
    };
    const matchesPattern = () => false;
    const getCSSModule = () => undefined;
    const diagnostics = checkCSSModule(cssModule, exportBuilder, matchesPattern, resolver, getCSSModule);
    expect(diagnostics).toEqual([]);
  });
});
