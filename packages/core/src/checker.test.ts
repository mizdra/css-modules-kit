import { describe, expect, test } from 'vitest';
import { checkCSSModule } from './checker.js';
import { createExportBuilder } from './export-builder.js';
import { resolve } from './path.js';
import { createResolver } from './resolver.js';
import { fakeCSSModule } from './test/css-module.js';
import { fakeConfig } from './test/faker.js';
import {
  fakeAtImportTokenImporter,
  fakeAtValueTokenImporter,
  fakeAtValueTokenImporterValue,
  fakeToken,
} from './test/token.js';
import type { CSSModule, Location } from './type.js';

const resolver = createResolver({}, undefined);

function prepareCheckerArgs<const T extends CSSModule[]>(cssModules: T) {
  const config = fakeConfig();
  const getCSSModule = (path: string) => cssModules.find((m) => resolve(m.fileName) === resolve(path));
  const matchesPattern = (path: string) => path.endsWith('.module.css');
  const exportBuilder = createExportBuilder({
    getCSSModule,
    matchesPattern,
    resolver,
  });
  return { cssModules, config, exportBuilder, matchesPattern, resolver, getCSSModule };
}

function fakeLoc({ column }: { column: number }): Location {
  return {
    start: { line: 1, column, offset: column - 1 },
    end: { line: 1, column, offset: column - 1 },
  };
}

describe('checkCSSModule', () => {
  test('report diagnostics for invalid name as js identifier', () => {
    const args = prepareCheckerArgs([
      fakeCSSModule({
        fileName: '/a.module.css',
        localTokens: [fakeToken({ name: 'a-1', loc: fakeLoc({ column: 1 }) })],
        tokenImporters: [
          fakeAtValueTokenImporter({
            from: './b.module.css',
            fromLoc: fakeLoc({ column: 2 }),
            values: [
              fakeAtValueTokenImporterValue({ name: 'b-1', loc: fakeLoc({ column: 3 }) }),
              fakeAtValueTokenImporterValue({
                name: 'b-2',
                loc: fakeLoc({ column: 4 }),
                localName: 'a-2',
                localLoc: fakeLoc({ column: 5 }),
              }),
            ],
          }),
        ],
      }),
      fakeCSSModule({
        fileName: '/b.module.css',
        localTokens: [fakeToken({ name: 'b-1' }), fakeToken({ name: 'b-2' })],
      }),
    ]);
    const diagnostics = checkCSSModule(
      args.cssModules[0],
      args.config,
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
          "text": "css-modules-kit does not support invalid names as JavaScript identifiers.",
        },
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
          "text": "css-modules-kit does not support invalid names as JavaScript identifiers.",
        },
        {
          "category": "error",
          "file": {
            "fileName": "/a.module.css",
            "text": "",
          },
          "length": 0,
          "start": {
            "column": 4,
            "line": 1,
          },
          "text": "css-modules-kit does not support invalid names as JavaScript identifiers.",
        },
        {
          "category": "error",
          "file": {
            "fileName": "/a.module.css",
            "text": "",
          },
          "length": 0,
          "start": {
            "column": 5,
            "line": 1,
          },
          "text": "css-modules-kit does not support invalid names as JavaScript identifiers.",
        },
      ]
    `);
  });
  test('report diagnostics for "__proto__" name', () => {
    const args = prepareCheckerArgs([
      fakeCSSModule({
        fileName: '/a.module.css',
        localTokens: [fakeToken({ name: '__proto__', loc: fakeLoc({ column: 1 }) })],
        tokenImporters: [
          fakeAtValueTokenImporter({
            from: './b.module.css',
            fromLoc: fakeLoc({ column: 2 }),
            values: [
              fakeAtValueTokenImporterValue({ name: '__proto__', loc: fakeLoc({ column: 3 }) }),
              fakeAtValueTokenImporterValue({
                name: 'valid',
                loc: fakeLoc({ column: 4 }),
                localName: '__proto__',
                localLoc: fakeLoc({ column: 5 }),
              }),
            ],
          }),
        ],
      }),
      fakeCSSModule({
        fileName: '/b.module.css',
        localTokens: [fakeToken({ name: '__proto__' }), fakeToken({ name: 'valid' })],
      }),
    ]);

    const diagnostics = checkCSSModule(
      args.cssModules[0],
      args.config,
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
          "text": "\`__proto__\` is not allowed as names.",
        },
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
          "text": "\`__proto__\` is not allowed as names.",
        },
        {
          "category": "error",
          "file": {
            "fileName": "/a.module.css",
            "text": "",
          },
          "length": 0,
          "start": {
            "column": 5,
            "line": 1,
          },
          "text": "\`__proto__\` is not allowed as names.",
        },
      ]
    `);
  });
  test('report diagnostics for "default" name when namedExports is true', () => {
    const args = prepareCheckerArgs([
      fakeCSSModule({
        fileName: '/a.module.css',
        localTokens: [fakeToken({ name: 'default', loc: fakeLoc({ column: 1 }) })],
        tokenImporters: [
          fakeAtValueTokenImporter({
            from: './b.module.css',
            fromLoc: fakeLoc({ column: 2 }),
            values: [
              fakeAtValueTokenImporterValue({ name: 'default', loc: fakeLoc({ column: 3 }) }),
              fakeAtValueTokenImporterValue({
                name: 'valid',
                loc: fakeLoc({ column: 4 }),
                localName: 'default',
                localLoc: fakeLoc({ column: 5 }),
              }),
            ],
          }),
        ],
      }),
      fakeCSSModule({
        fileName: '/b.module.css',
        localTokens: [fakeToken({ name: 'default' }), fakeToken({ name: 'valid' })],
      }),
    ]);
    args.config.namedExports = true;

    const diagnostics = checkCSSModule(
      args.cssModules[0],
      args.config,
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
          "text": "\`default\` is not allowed as names when \`cmkOptions.namedExports\` is set to \`true\`.",
        },
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
          "text": "\`default\` is not allowed as names when \`cmkOptions.namedExports\` is set to \`true\`.",
        },
        {
          "category": "error",
          "file": {
            "fileName": "/a.module.css",
            "text": "",
          },
          "length": 0,
          "start": {
            "column": 5,
            "line": 1,
          },
          "text": "\`default\` is not allowed as names when \`cmkOptions.namedExports\` is set to \`true\`.",
        },
      ]
    `);
  });
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
      args.config,
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
      args.config,
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
      args.config,
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
      args.config,
      args.exportBuilder,
      (path: string) => path === '/a.module.css', // Only match the current module
      args.resolver,
      args.getCSSModule,
    );
    expect(diagnostics).toEqual([]);
  });
});
