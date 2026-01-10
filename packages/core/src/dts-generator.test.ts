import dedent from 'dedent';
import { describe, expect, test } from 'vitest';
import { generateDts, type GenerateDtsHost, type GenerateDtsOptions } from './dts-generator.js';
import { readAndParseCSSModule } from './test/css-module.js';
import { fakeMatchesPattern, fakeResolver } from './test/faker.js';
import { createIFF } from './test/fixture.js';

const host: GenerateDtsHost = {
  resolver: fakeResolver(),
  matchesPattern: fakeMatchesPattern(),
};
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
    expect(generateDts(readAndParseCSSModule(iff.paths['test.module.css'])!, host, options).text)
      .toMatchInlineSnapshot(`
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
    expect(generateDts(readAndParseCSSModule(iff.paths['test.module.css'])!, host, options).text)
      .toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
        local1: '' as readonly string,
        local2: '' as readonly string,
      };
      export default styles;
      "
    `);
  });
  test('generates d.ts file with token importers', async () => {
    const iff = await createIFF({
      'test.module.css': dedent`
        @import './a.module.css';
        @value imported1 from './b.module.css';
        @value imported2 as aliasedImported2 from './c.module.css';
      `,
      'a.module.css': '',
      'b.module.css': '',
      'c.module.css': '',
    });
    expect(generateDts(readAndParseCSSModule(iff.paths['test.module.css'])!, host, options).text)
      .toMatchInlineSnapshot(`
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
  test('resolves specifiers', async () => {
    const iff = await createIFF({
      'test.module.css': dedent`
        @import '@/a.module.css';
        @value imported1 from '@/b.module.css';
        @value imported2 as aliasedImported2 from '@/c.module.css';
      `,
      'a.module.css': '',
      'b.module.css': '',
      'c.module.css': '',
    });
    const resolver = (specifier: string) => specifier.replace('@', '/src');
    expect(generateDts(readAndParseCSSModule(iff.paths['test.module.css'])!, { ...host, resolver }, options).text)
      .toMatchInlineSnapshot(`
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
  test('does not generate `@import` types for unmatched or unresolvable modules', async () => {
    const iff = await createIFF({
      'test.module.css': dedent`
        @import './unmatched.module.css';
        @import './unresolvable.module.css';
      `,
      'unmatched.module.css': '.unmatched_1 { color: red; }',
    });
    // FIXME: Currently, the type for unresolvable modules is still generated.
    expect(
      generateDts(
        readAndParseCSSModule(iff.paths['test.module.css'])!,
        { ...host, matchesPattern: (path) => path.endsWith('.module.css') && !path.endsWith('unmatched.module.css') },
        options,
      ).text,
    ).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
        ...(await import('./unresolvable.module.css')).default,
      };
      export default styles;
      "
    `);
  });
  test('generates `@value` types for unmatched or unresolvable modules', async () => {
    const iff = await createIFF({
      'test.module.css': dedent`
        @value unmatched_1 from './unmatched.module.css';
        @value unresolvable_1 from './unresolvable.module.css';
      `,
      'unmatched.module.css': '.unmatched_1 { color: red; }',
    });
    // FIXME: Currently, the type for unmatched modules is missing.
    expect(
      generateDts(
        readAndParseCSSModule(iff.paths['test.module.css'])!,
        { ...host, matchesPattern: (path) => path.endsWith('.module.css') && !path.endsWith('unmatched.module.css') },
        options,
      ).text,
    ).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
        unresolvable_1: (await import('./unresolvable.module.css')).default.unresolvable_1,
      };
      export default styles;
      "
    `);
  });
  test('does not generate types for invalid name as JS identifier', async () => {
    const iff = await createIFF({
      'test.module.css': dedent`
        .a-1 { color: red; }
        @value b-1 from './b.module.css';
        @value b_2 as a-2 from './b.module.css';
      `,
      'b.module.css': dedent`
        @value b-1: red;
        @value b_2: red;
      `,
    });
    expect(generateDts(readAndParseCSSModule(iff.paths['test.module.css'])!, host, options).text)
      .toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
      };
      export default styles;
      "
    `);
  });
  test('does not generate types for `__proto__`', async () => {
    const iff = await createIFF({
      'test.module.css': '.__proto__ { color: red; }',
    });
    expect(generateDts(readAndParseCSSModule(iff.paths['test.module.css'])!, host, options).text)
      .toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
      };
      export default styles;
      "
    `);
  });
  test('does not generate types for `default` when `namedExports` is true', async () => {
    const iff = await createIFF({
      'test.module.css': '.default { color: red; }',
    });
    expect(
      generateDts(readAndParseCSSModule(iff.paths['test.module.css'])!, host, { ...options, namedExports: true }).text,
    ).toMatchInlineSnapshot(`
      "// @ts-nocheck
      "
    `);
    expect(
      generateDts(readAndParseCSSModule(iff.paths['test.module.css'])!, host, { ...options, namedExports: false }).text,
    ).toMatchInlineSnapshot(`
      "// @ts-nocheck
      declare const styles = {
        default: '' as readonly string,
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
      'a.module.css': '',
      'b.module.css': dedent`
        @value imported1: red;
        @value imported2: red;
      `,
    });
    expect(
      generateDts(readAndParseCSSModule(iff.paths['test.module.css'])!, host, { ...options, namedExports: true }).text,
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
  test('exports styles as default when `namedExports` and `forTsPlugin` are true, but `prioritizeNamedImports` is false', async () => {
    const iff = await createIFF({
      'test.module.css': '.local1 { color: red; }',
    });
    expect(
      generateDts(readAndParseCSSModule(iff.paths['test.module.css'])!, host, {
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
