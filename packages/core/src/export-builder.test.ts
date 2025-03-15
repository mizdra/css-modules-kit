import { describe, expect, test } from 'vitest';
import { createExportBuilder } from './export-builder.js';
import { resolve } from './path.js';
import { createResolver } from './resolver.js';
import { fakeCSSModule } from './test/css-module.js';
import { fakeAtImportTokenImporter, fakeAtValueTokenImporter, fakeToken } from './test/token.js';

const resolver = createResolver({}, undefined);

describe('ExportBuilder', () => {
  test('build export record', () => {
    const exportBuilder = createExportBuilder({
      getCSSModule: () => undefined,
      matchesPattern: () => true,
      resolver: () => undefined,
    });
    const cssModule = fakeCSSModule({
      fileName: resolve('/a.css'),
      localTokens: [fakeToken('a_1')],
    });
    expect(exportBuilder.build(cssModule)).toMatchInlineSnapshot(`
      {
        "allTokens": [
          "a_1",
        ],
      }
    `);
  });
  test('collect all tokens from imported modules', () => {
    const exportBuilder = createExportBuilder({
      getCSSModule: (path) => {
        if (path === resolve('/b.module.css')) {
          return fakeCSSModule({
            fileName: resolve('/b.module.css'),
            localTokens: [fakeToken('b_1')],
          });
        } else if (path === resolve('/c.module.css')) {
          return fakeCSSModule({
            fileName: resolve('/c.module.css'),
            localTokens: [fakeToken('c_1'), fakeToken('c_2')],
          });
        } else {
          return undefined;
        }
      },
      matchesPattern: (path) => {
        return (
          path === resolve('/a.module.css') || path === resolve('/b.module.css') || path === resolve('/c.module.css')
        );
      },
      resolver,
    });
    const cssModule = fakeCSSModule({
      fileName: resolve('/a.module.css'),
      localTokens: [fakeToken('a_1')],
      tokenImporters: [
        fakeAtImportTokenImporter('./b.module.css'),
        fakeAtValueTokenImporter('./c.module.css', ['c_1']),
      ],
    });
    expect(exportBuilder.build(cssModule)).toMatchInlineSnapshot(`
      {
        "allTokens": [
          "a_1",
          "b_1",
          "c_1",
        ],
      }
    `);
  });
  test('collect all tokens from imported modules recursively', () => {
    const exportBuilder = createExportBuilder({
      getCSSModule: (path) => {
        if (path === resolve('/b.module.css')) {
          return fakeCSSModule({
            fileName: resolve('/b.module.css'),
            localTokens: [fakeToken('b_1')],
            tokenImporters: [fakeAtImportTokenImporter('./c.module.css')],
          });
        } else if (path === resolve('/c.module.css')) {
          return fakeCSSModule({
            fileName: resolve('/c.module.css'),
            localTokens: [fakeToken('c_1')],
          });
        } else {
          return undefined;
        }
      },
      matchesPattern: (path) => {
        return (
          path === resolve('/a.module.css') || path === resolve('/b.module.css') || path === resolve('/c.module.css')
        );
      },
      resolver,
    });
    const cssModule = fakeCSSModule({
      fileName: resolve('/a.module.css'),
      localTokens: [fakeToken('a_1')],
      tokenImporters: [fakeAtImportTokenImporter('./b.module.css')],
    });
    expect(exportBuilder.build(cssModule)).toMatchInlineSnapshot(`
      {
        "allTokens": [
          "a_1",
          "b_1",
          "c_1",
        ],
      }
    `);
  });
  test('do not collect tokens from unresolvable modules', () => {
    const exportBuilder = createExportBuilder({
      getCSSModule: () => undefined,
      matchesPattern: () => true,
      resolver: () => undefined,
    });
    const cssModule = fakeCSSModule({
      fileName: resolve('/a.module.css'),
      tokenImporters: [fakeAtImportTokenImporter('./unresolvable.module.css')],
    });
    expect(exportBuilder.build(cssModule)).toMatchInlineSnapshot(`
      {
        "allTokens": [],
      }
    `);
  });
  test('do not collect tokens from modules that do not match the pattern', () => {
    const exportBuilder = createExportBuilder({
      getCSSModule: () => undefined,
      matchesPattern: (path) => path !== resolve('/b.module.css'),
      resolver,
    });
    const cssModule = fakeCSSModule({
      fileName: resolve('/a.module.css'),
      tokenImporters: [fakeAtImportTokenImporter('./b.module.css')],
    });
    expect(exportBuilder.build(cssModule)).toMatchInlineSnapshot(`
      {
        "allTokens": [],
      }
    `);
  });
  test('do not collect tokens from non-existing modules', () => {
    const exportBuilder = createExportBuilder({
      getCSSModule: () => undefined,
      matchesPattern: () => true,
      resolver,
    });
    const cssModule = fakeCSSModule({
      fileName: resolve('/a.module.css'),
      tokenImporters: [fakeAtImportTokenImporter('./non-existing.module.css')],
    });
    expect(exportBuilder.build(cssModule)).toMatchInlineSnapshot(`
      {
        "allTokens": [],
      }
    `);
  });

  test('cache export record and return same result on subsequent builds', () => {
    let getCSSModuleCalls = 0;
    const exportBuilder = createExportBuilder({
      getCSSModule: (path) => {
        getCSSModuleCalls++;
        if (path === resolve('/b.module.css')) {
          return fakeCSSModule({
            fileName: resolve('/b.module.css'),
            localTokens: [fakeToken('b_1')],
          });
        }
        return undefined;
      },
      matchesPattern: () => true,
      resolver,
    });
    const cssModule = fakeCSSModule({
      fileName: resolve('/a.module.css'),
      localTokens: [fakeToken('a_1')],
      tokenImporters: [fakeAtImportTokenImporter('./b.module.css')],
    });

    // First build should call getCSSModule
    const result1 = exportBuilder.build(cssModule);
    expect(result1).toMatchInlineSnapshot(`
      {
        "allTokens": [
          "a_1",
          "b_1",
        ],
      }
    `);
    expect(getCSSModuleCalls).toBe(1);

    // Second build should use cache and not call getCSSModule again
    const result2 = exportBuilder.build(cssModule);
    expect(result2).toMatchInlineSnapshot(`
      {
        "allTokens": [
          "a_1",
          "b_1",
        ],
      }
    `);
    expect(getCSSModuleCalls).toBe(1);
  });

  test('clear cache and rebuild export record', () => {
    let getCSSModuleCalls = 0;
    const exportBuilder = createExportBuilder({
      getCSSModule: (path) => {
        getCSSModuleCalls++;
        if (path === resolve('/b.module.css')) {
          return fakeCSSModule({
            fileName: resolve('/b.module.css'),
            localTokens: [fakeToken('b_1')],
          });
        }
        return undefined;
      },
      matchesPattern: () => true,
      resolver,
    });
    const cssModule = fakeCSSModule({
      fileName: resolve('/a.module.css'),
      localTokens: [fakeToken('a_1')],
      tokenImporters: [fakeAtImportTokenImporter('./b.module.css')],
    });

    // First build
    exportBuilder.build(cssModule);
    expect(getCSSModuleCalls).toBe(1);

    // Clear cache
    exportBuilder.clearCache();

    // Second build should call getCSSModule again
    exportBuilder.build(cssModule);
    expect(getCSSModuleCalls).toBe(2);
  });

  test('maintain separate cache entries for different modules', () => {
    let getCSSModuleCalls = 0;
    const exportBuilder = createExportBuilder({
      getCSSModule: (path) => {
        getCSSModuleCalls++;
        if (path === resolve('/b.module.css')) {
          return fakeCSSModule({
            fileName: resolve('/b.module.css'),
            localTokens: [fakeToken('b_1')],
          });
        }
        return undefined;
      },
      matchesPattern: () => true,
      resolver,
    });
    const moduleA = fakeCSSModule({
      fileName: resolve('/a.module.css'),
      localTokens: [fakeToken('a_1')],
      tokenImporters: [fakeAtImportTokenImporter('./b.module.css')],
    });
    const moduleC = fakeCSSModule({
      fileName: resolve('/c.module.css'),
      localTokens: [fakeToken('c_1')],
      tokenImporters: [fakeAtImportTokenImporter('./b.module.css')],
    });

    // Build moduleA
    exportBuilder.build(moduleA);
    expect(getCSSModuleCalls).toBe(1);

    // Build moduleC should call getCSSModule again
    exportBuilder.build(moduleC);
    expect(getCSSModuleCalls).toBe(2);

    // Build moduleA again should use cache
    exportBuilder.build(moduleA);
    expect(getCSSModuleCalls).toBe(2);
  });

  test('handle circular dependencies', () => {
    const exportBuilder = createExportBuilder({
      getCSSModule: (path) => {
        if (path === resolve('/a.module.css')) {
          return fakeCSSModule({
            fileName: resolve('/a.module.css'),
            localTokens: [fakeToken('a_1')],
            tokenImporters: [fakeAtImportTokenImporter('./b.module.css')],
          });
        } else if (path === resolve('/b.module.css')) {
          return fakeCSSModule({
            fileName: resolve('/b.module.css'),
            localTokens: [fakeToken('b_1')],
            tokenImporters: [fakeAtImportTokenImporter('./a.module.css')],
          });
        }
        return undefined;
      },
      matchesPattern: () => true,
      resolver,
    });
    const cssModule = fakeCSSModule({
      fileName: resolve('/a.module.css'),
      localTokens: [fakeToken('a_1')],
      tokenImporters: [fakeAtImportTokenImporter('./b.module.css')],
    });

    // Should not cause infinite recursion
    const result = exportBuilder.build(cssModule);
    expect(result).toMatchInlineSnapshot(`
      {
        "allTokens": [
          "a_1",
          "b_1",
        ],
      }
    `);
  });
});
