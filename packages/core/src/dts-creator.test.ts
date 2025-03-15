import { describe, expect, test } from 'vitest';
import { createDts, type CreateDtsOptions } from './dts-creator.js';
import { dirname, join } from './path.js';
import { createCSSModule } from './test/css-module.js';

const options: CreateDtsOptions = {
  resolver: (specifier, { request }) => join(dirname(request), specifier),
  matchesPattern: () => true,
};

function fakeLoc(offset: number) {
  return { start: { line: 1, column: 1, offset }, end: { line: 1, column: 1, offset } };
}

describe('createDts', () => {
  test('creates d.ts file if css module file has no tokens', () => {
    expect(createDts(createCSSModule(), options)).toMatchInlineSnapshot(`
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
        createCSSModule({
          localTokens: [
            {
              name: 'local1',
              loc: fakeLoc(0),
            },
            { name: 'local2', loc: fakeLoc(1) },
          ],
        }),
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
        createCSSModule({
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
        createCSSModule({
          localTokens: [{ name: 'local1', loc: fakeLoc(0) }],
          tokenImporters: [{ type: 'import', from: './a.module.css', fromLoc: fakeLoc(1) }],
        }),
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
        createCSSModule({
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
        { ...options, resolver },
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
        createCSSModule({
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
        { ...options, matchesPattern: () => false },
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
        createCSSModule({
          fileName: '/src/test.module.css',
          tokenImporters: [{ type: 'import', from: '@/a.module.css', fromLoc: fakeLoc(0) }],
        }),
        { ...options, resolver },
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
});
