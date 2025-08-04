import { describe, expect, test } from 'vitest';
import { checkCSSModule } from './checker.js';
import { createResolver } from './resolver.js';
import { fakeCSSModule } from './test/css-module.js';
import { fakeAtImportTokenImporter, fakeAtValueTokenImporter, fakeAtValueTokenImporterValue } from './test/token.js';
import type { ExportBuilder } from './type.js';

const resolver = createResolver({}, undefined);

describe('checkCSSModule', () => {
  test('report diagnostics for non-existing module', () => {
    const cssModule = fakeCSSModule({
      fileName: '/a.module.css',
      tokenImporters: [
        fakeAtImportTokenImporter({ from: './b.module.css' }),
        fakeAtValueTokenImporter({ from: './c.module.css', values: [fakeAtValueTokenImporterValue({ name: 'c_1' })] }),
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
          "file": {
            "fileName": "/a.module.css",
            "text": "",
          },
          "length": 0,
          "start": {
            "column": 1,
            "line": 1,
          },
          "text": "Cannot import module './b.module.css'",
        },
        {
          "category": "error",
          "file": {
            "fileName": "/a.module.css",
            "text": "",
          },
          "length": 0,
          "start": {
            "column": 1,
            "line": 1,
          },
          "text": "Cannot import module './c.module.css'",
        },
      ]
    `);
  });
  test('report diagnostics for non-exported token', () => {
    const cssModule = fakeCSSModule({
      fileName: '/a.module.css',
      tokenImporters: [
        fakeAtValueTokenImporter({
          from: './b.module.css',
          values: [fakeAtValueTokenImporterValue({ name: 'b_1' }), fakeAtValueTokenImporterValue({ name: 'b_2' })],
        }),
      ],
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
          "file": {
            "fileName": "/a.module.css",
            "text": "",
          },
          "length": 0,
          "start": {
            "column": 1,
            "line": 1,
          },
          "text": "Module './b.module.css' has no exported token 'b_2'.",
        },
      ]
    `);
  });
  test('ignore token importers for unresolvable modules', () => {
    const cssModule = fakeCSSModule({
      fileName: '/a.module.css',
      tokenImporters: [fakeAtImportTokenImporter({ from: './unresolvable.module.css' })],
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
        fakeAtImportTokenImporter({ from: './b.module.css' }),
        fakeAtValueTokenImporter({ from: './c.module.css', values: [fakeAtValueTokenImporterValue({ name: 'c_1' })] }),
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
