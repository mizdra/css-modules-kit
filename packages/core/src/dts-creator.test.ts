import { describe, expect, test } from 'vitest';
import type { CreateDtsHost } from './dts-creator.js';
import { createDts, type CreateDtsOptions } from './dts-creator.js';
import { fakeCSSModule } from './test/css-module.js';
import { fakeMatchesPattern, fakeResolver } from './test/faker.js';
import { fakeAtValueTokenImporter, fakeAtValueTokenImporterValue, fakeToken } from './test/token.js';

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
    expect(createDts(fakeCSSModule(), host, options).text).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
      };
      export default styles;
      "
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
      ).text,
    ).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
        local1: '' as readonly string,
        local2: '' as readonly string,
      };
      export default styles;
      "
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
      ).text,
    ).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
        ...(await import('./a.module.css')).default,
        imported1: (await import('./b.module.css')).default.imported1,
        aliasedImported2: (await import('./c.module.css')).default.imported2,
      };
      export default styles;
      "
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
      ).text,
    ).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
        local1: '' as readonly string,
        ...(await import('./a.module.css')).default,
      };
      export default styles;
      "
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
      ).text,
    ).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
        ...(await import('@/a.module.css')).default,
        imported1: (await import('@/b.module.css')).default.imported1,
        aliasedImported2: (await import('@/c.module.css')).default.imported2,
      };
      export default styles;
      "
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
      ).text,
    ).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
      };
      export default styles;
      "
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
      ).text,
    ).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
      };
      export default styles;
      "
    `);
  });
  test('does not create types for invalid name as JS identifier', () => {
    expect(
      createDts(
        fakeCSSModule({
          localTokens: [fakeToken({ name: 'a-1', loc: fakeLoc(0) })],
          tokenImporters: [
            fakeAtValueTokenImporter({
              from: './b.module.css',
              fromLoc: fakeLoc(1),
              values: [
                fakeAtValueTokenImporterValue({ name: 'b-1', loc: fakeLoc(2) }),
                fakeAtValueTokenImporterValue({
                  name: 'b_2',
                  loc: fakeLoc(3),
                  localName: 'a-2',
                  localLoc: fakeLoc(4),
                }),
              ],
            }),
          ],
        }),
        host,
        options,
      ).text,
    ).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
      };
      export default styles;
      "
    `);
  });
  test('does not create types for `__proto__`', () => {
    expect(
      createDts(
        fakeCSSModule({
          localTokens: [fakeToken({ name: '__proto__', loc: fakeLoc(0) })],
        }),
        host,
        options,
      ).text,
    ).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
      };
      export default styles;
      "
    `);
  });
  test('does not create types for `default` when `namedExports` is true', () => {
    expect(
      createDts(
        fakeCSSModule({
          localTokens: [fakeToken({ name: 'default', loc: fakeLoc(0) })],
        }),
        host,
        { ...options, namedExports: true },
      ).text,
    ).toMatchInlineSnapshot(`
      "// @ts-nocheck
      "
    `);
    expect(
      createDts(
        fakeCSSModule({
          localTokens: [fakeToken({ name: 'default', loc: fakeLoc(0) })],
        }),
        host,
        { ...options, namedExports: false },
      ).text,
    ).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
        default: '' as readonly string,
      };
      export default styles;
      "
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
      ).text,
    ).toMatchInlineSnapshot(`
      "// @ts-nocheck
      export var local1: string;
      export var local2: string;
      export * from './a.module.css';
      export {
        imported1,
        imported2 as aliasedImported2,
      } from './b.module.css';
      "
    `);
  });
  test('exports styles as default when `namedExports` and `forTsPlugin` are true, but `prioritizeNamedImports` is false', () => {
    expect(
      createDts(
        fakeCSSModule({
          localTokens: [{ name: 'local1', loc: fakeLoc(0) }],
        }),
        host,
        { ...options, namedExports: true, forTsPlugin: true, prioritizeNamedImports: false },
      ).text,
    ).toMatchInlineSnapshot(`
      "// @ts-nocheck
      export var local1: string;
      declare const styles: {};
      export default styles;
      "
    `);
  });
});
