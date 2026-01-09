import dedent from 'dedent';
import { describe, expect, test } from 'vitest';
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
  test('build export record', async () => {
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
  test('collect all tokens from imported modules', async () => {
    const iff = await createIFF({
      'a.module.css': dedent`
        .a_1 { color: red; }
        @import './b.module.css';
        @value c_1 from './c.module.css';
      `,
      'b.module.css': '.b_1 { color: red; }',
      'c.module.css': dedent`
        .c_1 { color: red; }
        .c_2 { color: red; }
      `,
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
  test('collect all tokens from imported modules recursively', async () => {
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
  test('do not collect tokens from unresolvable modules', async () => {
    const iff = await createIFF({
      'a.module.css': `@import './unresolvable.module.css';`,
    });
    const exportBuilder = prepareExportBuilder();
    const cssModule = readAndParseCSSModule(iff.paths['a.module.css'])!;
    expect(exportBuilder.build(cssModule)).toMatchInlineSnapshot(`
      {
        "allTokens": [],
      }
    `);
  });
  test('do not collect tokens from modules that do not match the pattern', async () => {
    const iff = await createIFF({
      'a.module.css': `@import './b.css';`,
      'b.css': '.b_1 { color: red; }',
    });
    const exportBuilder = prepareExportBuilder();
    const cssModule = readAndParseCSSModule(iff.paths['a.module.css'])!;
    expect(exportBuilder.build(cssModule)).toMatchInlineSnapshot(`
      {
        "allTokens": [],
      }
    `);
  });
  test('do not collect tokens from non-existing modules', async () => {
    const iff = await createIFF({
      'a.module.css': `@import './non-existing.module.css';`,
    });
    const exportBuilder = prepareExportBuilder();
    const cssModule = readAndParseCSSModule(iff.paths['a.module.css'])!;
    expect(exportBuilder.build(cssModule)).toMatchInlineSnapshot(`
      {
        "allTokens": [],
      }
    `);
  });

  test('cache export record and return same result on subsequent builds', async () => {
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

  test('clear cache and rebuild export record', async () => {
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

  test('maintain separate cache entries for different modules', async () => {
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

  test('handle circular dependencies', async () => {
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
