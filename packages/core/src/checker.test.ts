import { describe, expect, test } from 'vitest';
import { checkCSSModule } from './checker.js';
import { createExportBuilder } from './export-builder.js';
import { resolve } from './path.js';
import { createResolver } from './resolver.js';
import { fakeCSSModule } from './test/css-module.js';
import {
  fakeAtImportTokenImporter,
  fakeAtValueTokenImporter,
  fakeAtValueTokenImporterValue,
  fakeToken,
} from './test/token.js';
import type { CSSModule, Location } from './type.js';

const resolver = createResolver({}, undefined);

function prepareCheckerArgs<const T extends CSSModule[]>(cssModules: T) {
  const getCSSModule = (path: string) => cssModules.find((m) => resolve(m.fileName) === resolve(path));
  const matchesPattern = (path: string) => path.endsWith('.module.css');
  const exportBuilder = createExportBuilder({
    getCSSModule,
    matchesPattern,
    resolver,
  });
  return { cssModules, exportBuilder, matchesPattern, resolver, getCSSModule };
}

function fakeLoc({ column }: { column: number }): Location {
  return {
    start: { line: 1, column, offset: column - 1 },
    end: { line: 1, column, offset: column - 1 },
  };
}

describe('checkCSSModule', () => {
  test('report diagnostics for non-existing module', () => {
    const args = prepareCheckerArgs([
      fakeCSSModule({
        fileName: '/a.module.css',
        tokenImporters: [
          fakeAtImportTokenImporter({ from: './b.module.css', fromLoc: fakeLoc({ column: 1 }) }),
          fakeAtValueTokenImporter({
            from: './c.module.css',
            fromLoc: fakeLoc({ column: 2 }),
            values: [fakeAtValueTokenImporterValue({ name: 'c_1', loc: fakeLoc({ column: 3 }) })],
          }),
        ],
      }),
    ]);
    const diagnostics = checkCSSModule(
      args.cssModules[0],
      args.exportBuilder,
      args.matchesPattern,
      args.resolver,
      args.getCSSModule,
    );
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
            "column": 2,
            "line": 1,
          },
          "text": "Cannot import module './c.module.css'",
        },
      ]
    `);
  });
  test('report diagnostics for non-exported token', () => {
    const args = prepareCheckerArgs([
      fakeCSSModule({
        fileName: '/a.module.css',
        tokenImporters: [
          fakeAtValueTokenImporter({
            from: './b.module.css',
            fromLoc: fakeLoc({ column: 1 }),
            values: [
              fakeAtValueTokenImporterValue({ name: 'b_1', loc: fakeLoc({ column: 2 }) }),
              fakeAtValueTokenImporterValue({ name: 'b_2', loc: fakeLoc({ column: 3 }) }),
            ],
          }),
        ],
      }),
      fakeCSSModule({
        fileName: '/b.module.css',
        localTokens: [fakeToken({ name: 'b_1' })],
      }),
    ]);
    const diagnostics = checkCSSModule(
      args.cssModules[0],
      args.exportBuilder,
      args.matchesPattern,
      args.resolver,
      args.getCSSModule,
    );
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
            "column": 3,
            "line": 1,
          },
          "text": "Module './b.module.css' has no exported token 'b_2'.",
        },
      ]
    `);
  });
  test('ignore token importers for unresolvable modules', () => {
    const args = prepareCheckerArgs([
      fakeCSSModule({
        fileName: '/a.module.css',
        tokenImporters: [fakeAtImportTokenImporter({ from: './unresolvable.module.css' })],
      }),
    ]);
    const diagnostics = checkCSSModule(
      args.cssModules[0],
      args.exportBuilder,
      args.matchesPattern,
      () => undefined, // Simulate unresolvable module
      args.getCSSModule,
    );
    expect(diagnostics).toEqual([]);
  });
  test('ignore token importers that do not match the pattern', () => {
    const args = prepareCheckerArgs([
      fakeCSSModule({
        fileName: '/a.module.css',
        tokenImporters: [
          fakeAtImportTokenImporter({ from: './b.module.css' }),
          fakeAtValueTokenImporter({
            from: './c.module.css',
            values: [fakeAtValueTokenImporterValue({ name: 'c_1' })],
          }),
        ],
      }),
    ]);
    const diagnostics = checkCSSModule(
      args.cssModules[0],
      args.exportBuilder,
      (path: string) => path === '/a.module.css', // Only match the current module
      args.resolver,
      args.getCSSModule,
    );
    expect(diagnostics).toEqual([]);
  });
});
