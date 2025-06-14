import { describe, expect, test } from 'vitest';
import type { CreateDtsHost } from './dts-creator.js';
import { createDts, type CreateDtsOptions } from './dts-creator.js';
import { fakeCSSModule } from './test/css-module.js';
import { fakeMatchesPattern, fakeResolver } from './test/faker.js';

const host: CreateDtsHost = {
  resolver: fakeResolver(),
  matchesPattern: fakeMatchesPattern(),
};
const options: CreateDtsOptions = {
  namedExports: false,
  prioritizeNamedImports: false,
  forTsPlugin: false,
};

function fakeLoc(offset: number) {
  return { start: { line: 1, column: 1, offset }, end: { line: 1, column: 1, offset } };
}

describe('createDts', () => {
  test('creates d.ts file if css module file has no tokens', () => {
    expect(createDts(fakeCSSModule(), host, options)).toMatchInlineSnapshot(`
      {
        "linkedCodeMapping": {
          "generatedLengths": [],
          "generatedOffsets": [],
          "lengths": [],
          "sourceOffsets": [],
        },
        "mapping": {
          "generatedOffsets": [],
          "lengths": [],
          "sourceOffsets": [],
        },
        "text": "// @ts-nocheck
      declare const styles = {
      };
      export default styles;
      ",
      }
    `);
  });
  test('creates d.ts file with local tokens', () => {
    expect(
      createDts(
        fakeCSSModule({
          localTokens: [
            {
              name: 'local1',
              loc: fakeLoc(0),
            },
            { name: 'local2', loc: fakeLoc(1) },
          ],
        }),
        host,
        options,
      ),
    ).toMatchInlineSnapshot(`
      {
        "linkedCodeMapping": {
          "generatedLengths": [],
          "generatedOffsets": [],
          "lengths": [],
          "sourceOffsets": [],
        },
        "mapping": {
          "generatedOffsets": [
            42,
            75,
          ],
          "lengths": [
            6,
            6,
          ],
          "sourceOffsets": [
            0,
            1,
          ],
        },
        "text": "// @ts-nocheck
      declare const styles = {
        local1: '' as readonly string,
        local2: '' as readonly string,
      };
      export default styles;
      ",
      }
    `);
  });
  test('creates d.ts file with token importers', () => {
    expect(
      createDts(
        fakeCSSModule({
          tokenImporters: [
            { type: 'import', from: './a.module.css', fromLoc: fakeLoc(0) },
            {
              type: 'value',
              values: [{ name: 'imported1', loc: fakeLoc(1) }],
              from: './b.module.css',
              fromLoc: fakeLoc(2),
            },
            {
              type: 'value',
              values: [
                {
                  localName: 'aliasedImported2',
                  localLoc: fakeLoc(3),
                  name: 'imported2',
                  loc: fakeLoc(4),
                },
              ],
              from: './c.module.css',
              fromLoc: fakeLoc(5),
            },
          ],
        }),
        host,
        options,
      ),
    ).toMatchInlineSnapshot(`
      {
        "linkedCodeMapping": {
          "generatedLengths": [
            9,
            9,
          ],
          "generatedOffsets": [
            141,
            213,
          ],
          "lengths": [
            9,
            16,
          ],
          "sourceOffsets": [
            89,
            154,
          ],
        },
        "mapping": {
          "generatedOffsets": [
            59,
            89,
            114,
            141,
            154,
            186,
            213,
          ],
          "lengths": [
            16,
            9,
            16,
            9,
            16,
            16,
            9,
          ],
          "sourceOffsets": [
            -1,
            1,
            1,
            1,
            3,
            4,
            4,
          ],
        },
        "text": "// @ts-nocheck
      declare const styles = {
        ...(await import('./a.module.css')).default,
        imported1: (await import('./b.module.css')).default.imported1,
        aliasedImported2: (await import('./c.module.css')).default.imported2,
      };
      export default styles;
      ",
      }
    `);
  });
  test('creates types in the order of local tokens and token importers', () => {
    expect(
      createDts(
        fakeCSSModule({
          localTokens: [{ name: 'local1', loc: fakeLoc(0) }],
          tokenImporters: [{ type: 'import', from: './a.module.css', fromLoc: fakeLoc(1) }],
        }),
        host,
        options,
      ),
    ).toMatchInlineSnapshot(`
      {
        "linkedCodeMapping": {
          "generatedLengths": [],
          "generatedOffsets": [],
          "lengths": [],
          "sourceOffsets": [],
        },
        "mapping": {
          "generatedOffsets": [
            42,
            92,
          ],
          "lengths": [
            6,
            16,
          ],
          "sourceOffsets": [
            0,
            0,
          ],
        },
        "text": "// @ts-nocheck
      declare const styles = {
        local1: '' as readonly string,
        ...(await import('./a.module.css')).default,
      };
      export default styles;
      ",
      }
    `);
  });
  test('resolves specifiers', () => {
    const resolver = (specifier: string) => specifier.replace('@', '/src');
    expect(
      createDts(
        fakeCSSModule({
          fileName: '/src/test.module.css',
          tokenImporters: [
            { type: 'import', from: '@/a.module.css', fromLoc: fakeLoc(0) },
            {
              type: 'value',
              values: [{ name: 'imported1', loc: fakeLoc(1) }],
              from: '@/b.module.css',
              fromLoc: fakeLoc(2),
            },
            {
              type: 'value',
              values: [
                {
                  localName: 'aliasedImported2',
                  localLoc: fakeLoc(3),
                  name: 'imported2',
                  loc: fakeLoc(4),
                },
              ],
              from: '@/c.module.css',
              fromLoc: fakeLoc(5),
            },
          ],
        }),
        { ...host, resolver },
        options,
      ),
    ).toMatchInlineSnapshot(`
      {
        "linkedCodeMapping": {
          "generatedLengths": [
            9,
            9,
          ],
          "generatedOffsets": [
            141,
            213,
          ],
          "lengths": [
            9,
            16,
          ],
          "sourceOffsets": [
            89,
            154,
          ],
        },
        "mapping": {
          "generatedOffsets": [
            59,
            89,
            114,
            141,
            154,
            186,
            213,
          ],
          "lengths": [
            16,
            9,
            16,
            9,
            16,
            16,
            9,
          ],
          "sourceOffsets": [
            -1,
            1,
            1,
            1,
            3,
            4,
            4,
          ],
        },
        "text": "// @ts-nocheck
      declare const styles = {
        ...(await import('@/a.module.css')).default,
        imported1: (await import('@/b.module.css')).default.imported1,
        aliasedImported2: (await import('@/c.module.css')).default.imported2,
      };
      export default styles;
      ",
      }
    `);
  });
  test('does not create types for external files', () => {
    expect(
      createDts(
        fakeCSSModule({
          tokenImporters: [
            { type: 'import', from: 'external.css', fromLoc: fakeLoc(0) },
            {
              type: 'value',
              values: [
                {
                  localName: 'imported',
                  localLoc: fakeLoc(1),
                  name: 'imported',
                  loc: fakeLoc(2),
                },
              ],
              from: 'external.css',
              fromLoc: fakeLoc(3),
            },
          ],
        }),
        { ...host, matchesPattern: () => false },
        options,
      ),
    ).toMatchInlineSnapshot(`
      {
        "linkedCodeMapping": {
          "generatedLengths": [],
          "generatedOffsets": [],
          "lengths": [],
          "sourceOffsets": [],
        },
        "mapping": {
          "generatedOffsets": [],
          "lengths": [],
          "sourceOffsets": [],
        },
        "text": "// @ts-nocheck
      declare const styles = {
      };
      export default styles;
      ",
      }
    `);
  });
  test('does not create types for unresolved files', () => {
    const resolver = (_specifier: string) => undefined;
    expect(
      createDts(
        fakeCSSModule({
          fileName: '/src/test.module.css',
          tokenImporters: [{ type: 'import', from: '@/a.module.css', fromLoc: fakeLoc(0) }],
        }),
        { ...host, resolver },
        options,
      ),
    ).toMatchInlineSnapshot(`
      {
        "linkedCodeMapping": {
          "generatedLengths": [],
          "generatedOffsets": [],
          "lengths": [],
          "sourceOffsets": [],
        },
        "mapping": {
          "generatedOffsets": [],
          "lengths": [],
          "sourceOffsets": [],
        },
        "text": "// @ts-nocheck
      declare const styles = {
      };
      export default styles;
      ",
      }
    `);
  });
  test('creates d.ts file with named exports', () => {
    expect(
      createDts(
        fakeCSSModule({
          localTokens: [
            { name: 'local1', loc: fakeLoc(0) },
            { name: 'local2', loc: fakeLoc(1) },
          ],
          tokenImporters: [
            { type: 'import', from: './a.module.css', fromLoc: fakeLoc(2) },
            {
              type: 'value',
              values: [
                { name: 'imported1', loc: fakeLoc(3) },
                { name: 'imported2', loc: fakeLoc(4), localName: 'aliasedImported2', localLoc: fakeLoc(5) },
              ],
              from: './b.module.css',
              fromLoc: fakeLoc(6),
            },
          ],
        }),
        host,
        { ...options, namedExports: true },
      ),
    ).toMatchInlineSnapshot(`
      {
        "linkedCodeMapping": {
          "generatedLengths": [
            9,
          ],
          "generatedOffsets": [
            125,
          ],
          "lengths": [
            16,
          ],
          "sourceOffsets": [
            138,
          ],
        },
        "mapping": {
          "generatedOffsets": [
            26,
            53,
            83,
            112,
            125,
            138,
            163,
          ],
          "lengths": [
            6,
            6,
            16,
            9,
            9,
            16,
            16,
          ],
          "sourceOffsets": [
            0,
            1,
            1,
            3,
            4,
            5,
            5,
          ],
        },
        "text": "// @ts-nocheck
      export var local1: string;
      export var local2: string;
      export * from './a.module.css';
      export {
        imported1,
        imported2 as aliasedImported2,
      } from './b.module.css';
      ",
      }
    `);
  });
});
