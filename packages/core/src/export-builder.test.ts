import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import type { ExportBuilderHost } from './export-builder.js';
import { createExportBuilder } from './export-builder.js';
import { createResolver } from './resolver.js';
import { readAndParseCSSModule } from './test/css-module.js';
import { createIFF } from './test/fixture.js';
import type { ExportBuilder } from './type.js';

const resolver = createResolver({}, undefined);

function prepareExportBuilder(args?: Partial<ExportBuilderHost>): ExportBuilder {
  return createExportBuilder({
    getCSSModule: readAndParseCSSModule,
    matchesPattern: (path) => path.endsWith('.module.css'),
    resolver,
    ...args,
  });
}

describe('ExportBuilder', () => {
  test('includes the local tokens of the module in the export record', async () => {
    const iff = await createIFF({
      'a.module.css': '.a_1 { color: red; }',
    });
    const exportBuilder = prepareExportBuilder();
    const cssModule = readAndParseCSSModule(iff.paths['a.module.css'])!;
    expect(exportBuilder.build(cssModule)).toMatchInlineSnapshot(`
      {
        "allTokens": [
          "a_1",
        ],
      }
    `);
  });
  test('includes every token exported by the module that an all token importer imports', async () => {
    const iff = await createIFF({
      'a.module.css': `@import './b.module.css';`,
      'b.module.css': dedent`
        .b_1 { color: red; }
        .b_2 { color: red; }
      `,
    });
    const exportBuilder = prepareExportBuilder();
    const cssModule = readAndParseCSSModule(iff.paths['a.module.css'])!;
    expect(exportBuilder.build(cssModule)).toMatchInlineSnapshot(`
      {
        "allTokens": [
          "b_1",
          "b_2",
        ],
      }
    `);
  });
  test('includes only the entries of a named token importer', async () => {
    const iff = await createIFF({
      'a.module.css': `@value b_1 from './b.module.css';`,
      'b.module.css': dedent`
        .b_1 { color: red; }
        .b_2 { color: red; }
      `,
    });
    const exportBuilder = prepareExportBuilder();
    const cssModule = readAndParseCSSModule(iff.paths['a.module.css'])!;
    expect(exportBuilder.build(cssModule)).toMatchInlineSnapshot(`
      {
        "allTokens": [
          "b_1",
        ],
      }
    `);
  });
  test('follows imported modules recursively and includes their exported tokens', async () => {
    const iff = await createIFF({
      'a.module.css': dedent`
        .a_1 { color: red; }
        @import './b.module.css';
      `,
      'b.module.css': dedent`
        .b_1 { color: red; }
        @import './c.module.css';
      `,
      'c.module.css': '.c_1 { color: red; }',
    });
    const exportBuilder = prepareExportBuilder();
    const cssModule = readAndParseCSSModule(iff.paths['a.module.css'])!;
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
  test('includes the local name of a named token importer entry with `as`', async () => {
    const iff = await createIFF({
      'a.module.css': `@value b_1 as b_alias from './b.module.css';`,
      'b.module.css': `@value b_1: red;`,
    });
    const exportBuilder = prepareExportBuilder();
    const cssModule = readAndParseCSSModule(iff.paths['a.module.css'])!;
    expect(exportBuilder.build(cssModule)).toMatchInlineSnapshot(`
      {
        "allTokens": [
          "b_alias",
        ],
      }
    `);
  });
  test('includes no tokens from an all token importer of an unmatched or unresolvable file', async () => {
    const iff = await createIFF({
      'a.module.css': dedent`
        @import './unmatched.module.css';
        @import './unresolvable.module.css';
      `,
      'unmatched.module.css': '.unmatched_1 { color: red; }',
    });
    const exportBuilder = prepareExportBuilder({
      matchesPattern: (path) => path.endsWith('.module.css') && !path.endsWith('unmatched.module.css'),
    });
    const cssModule = readAndParseCSSModule(iff.paths['a.module.css'])!;
    expect(exportBuilder.build(cssModule)).toMatchInlineSnapshot(`
      {
        "allTokens": [],
      }
    `);
  });
  // TODO: Include the entries. They are known without reading the imported file,
  // but the current implementation skips them.
  test.fails('includes the entries of a named token importer of an unmatched or unresolvable file', async () => {
    const iff = await createIFF({
      'a.module.css': dedent`
        @value unmatched_1 from './unmatched.module.css';
        @value unresolvable_1 from './unresolvable.module.css';
      `,
      'unmatched.module.css': '.unmatched_1 { color: red; }',
    });
    const exportBuilder = prepareExportBuilder({
      matchesPattern: (path) => path.endsWith('.module.css') && !path.endsWith('unmatched.module.css'),
    });
    const cssModule = readAndParseCSSModule(iff.paths['a.module.css'])!;
    expect(exportBuilder.build(cssModule)).toStrictEqual({ allTokens: ['unmatched_1', 'unresolvable_1'] });
  });

  test('returns the cached export record without reading the imported modules again', async () => {
    const iff = await createIFF({
      'a.module.css': dedent`
        .a_1 { color: red; }
        @import './b.module.css';
      `,
      'b.module.css': '.b_1 { color: red; }',
    });
    let getCSSModuleCalls = 0;
    const exportBuilder = prepareExportBuilder({
      getCSSModule: (path) => {
        getCSSModuleCalls++;
        return readAndParseCSSModule(path);
      },
    });
    const cssModule = readAndParseCSSModule(iff.paths['a.module.css'])!;

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

  test('rebuilds the export record after clearCache', async () => {
    const iff = await createIFF({
      'a.module.css': dedent`
        .a_1 { color: red; }
        @import './b.module.css';
      `,
      'b.module.css': '.b_1 { color: red; }',
    });
    let getCSSModuleCalls = 0;
    const exportBuilder = prepareExportBuilder({
      getCSSModule: (path) => {
        getCSSModuleCalls++;
        return readAndParseCSSModule(path);
      },
    });
    const cssModule = readAndParseCSSModule(iff.paths['a.module.css'])!;

    // First build
    exportBuilder.build(cssModule);
    expect(getCSSModuleCalls).toBe(1);

    // Clear cache
    exportBuilder.clearCache();

    // Second build should call getCSSModule again
    exportBuilder.build(cssModule);
    expect(getCSSModuleCalls).toBe(2);
  });

  test('keeps the cached export record of a module after another module is built', async () => {
    const iff = await createIFF({
      'a.module.css': dedent`
        .a_1 { color: red; }
        @import './b.module.css';
      `,
      'b.module.css': '.b_1 { color: red; }',
      'c.module.css': dedent`
        .c_1 { color: red; }
        @import './b.module.css';
      `,
    });
    let getCSSModuleCalls = 0;
    const exportBuilder = prepareExportBuilder({
      getCSSModule: (path) => {
        getCSSModuleCalls++;
        return readAndParseCSSModule(path);
      },
    });
    const moduleA = readAndParseCSSModule(iff.paths['a.module.css'])!;
    const moduleC = readAndParseCSSModule(iff.paths['c.module.css'])!;

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

  test('terminates on circular token importers and includes the tokens of both modules', async () => {
    const iff = await createIFF({
      'a.module.css': dedent`
        .a_1 { color: red; }
        @import './b.module.css';
      `,
      'b.module.css': dedent`
        .b_1 { color: red; }
        @import './a.module.css';
      `,
    });
    const exportBuilder = prepareExportBuilder();
    const cssModule = readAndParseCSSModule(iff.paths['a.module.css'])!;
    expect(exportBuilder.build(cssModule)).toMatchInlineSnapshot(`
      {
        "allTokens": [
          "a_1",
          "b_1",
        ],
      }
    `);
  });
});
