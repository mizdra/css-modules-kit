import dedent from 'dedent';
import { describe, expect, test } from 'vitest';
import { generateDts, type GenerateDtsOptions } from './dts-generator.js';
import { readAndParseCSSModule } from './test/css-module.js';
import { createIFF } from './test/fixture.js';

const options: GenerateDtsOptions = {
  namedExports: false,
  prioritizeNamedImports: false,
  forTsPlugin: false,
};

describe('generateDts', () => {
  test('generates d.ts file if css module file has no tokens', async () => {
    const iff = await createIFF({
      'test.module.css': '',
    });
    expect(generateDts(readAndParseCSSModule(iff.paths['test.module.css'])!, options).text).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
      };
      export default styles;
      "
    `);
  });
  test('generates d.ts file with local tokens', async () => {
    const iff = await createIFF({
      'test.module.css': dedent`
        .local1 { color: red; }
        .local2 { color: red; }
      `,
    });
    expect(generateDts(readAndParseCSSModule(iff.paths['test.module.css'])!, options).text).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
        local1: '' as readonly string,
        local2: '' as readonly string,
      };
      export default styles;
      "
    `);
  });
  test('generates types for token importers', async () => {
    const iff = await createIFF({
      'test.module.css': dedent`
        @import './a.module.css';
        @value imported1, imported2 as aliasedImported2 from './b.module.css';
      `,
    });
    expect(generateDts(readAndParseCSSModule(iff.paths['test.module.css'])!, options).text).toMatchInlineSnapshot(`
      "// @ts-nocheck
      function blockErrorType<T>(val: T): [0] extends [(1 & T)] ? {} : T;
      declare const styles = {
        ...blockErrorType((await import('./a.module.css')).default),
        imported1: (await import('./b.module.css')).default.imported1,
        aliasedImported2: (await import('./b.module.css')).default.imported2,
      };
      export default styles;
      "
    `);
  });
  test('does not generate types for URL token importers', async () => {
    const iff = await createIFF({
      'test.module.css': dedent`
        @import 'https://example.com/a.module.css';
        @value imported1 from 'https://example.com/b.module.css';
      `,
    });
    expect(generateDts(readAndParseCSSModule(iff.paths['test.module.css'])!, options).text).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
      };
      export default styles;
      "
    `);
  });
  test('does not generate types for invalid name', async () => {
    const iff = await createIFF({
      'test.module.css': dedent`
        .a-1 { color: red; }
        @value b-1 from './b.module.css';
        @value b_2 as a-2 from './b.module.css';
      `,
    });
    expect(generateDts(readAndParseCSSModule(iff.paths['test.module.css'])!, options).text).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
      };
      export default styles;
      "
    `);
  });
  test('generates d.ts file with named exports', async () => {
    const iff = await createIFF({
      'test.module.css': dedent`
        .local1 { color: red; }
        .local2 { color: red; }
        @import './a.module.css';
        @value imported1, imported2 as aliasedImported2 from './b.module.css';
      `,
    });
    expect(generateDts(readAndParseCSSModule(iff.paths['test.module.css'])!, { ...options, namedExports: true }).text)
      .toMatchInlineSnapshot(`
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
  test('exports styles as default when `namedExports` and `forTsPlugin` are true, but `prioritizeNamedImports` is false', async () => {
    const iff = await createIFF({
      'test.module.css': '.local1 { color: red; }',
    });
    expect(
      generateDts(readAndParseCSSModule(iff.paths['test.module.css'])!, {
        ...options,
        namedExports: true,
        forTsPlugin: true,
        prioritizeNamedImports: false,
      }).text,
    ).toMatchInlineSnapshot(`
      "// @ts-nocheck
      export var local1: string;
      declare const styles: {};
      export default styles;
      "
    `);
  });
});
