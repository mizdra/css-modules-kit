import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import type { NormalizedMapperOptions } from './options.js';
import { renderTransformOutput } from './test/render.js';
import { transformCSS } from './transformer.js';

const defaultExportOptions: NormalizedMapperOptions = {
  namedExports: false,
  prioritizeNamedImports: false,
  animation: true,
  dashedIdents: false,
  container: false,
};

const namedExportOptions: NormalizedMapperOptions = { ...defaultExportOptions, namedExports: true };

function run(source: string, options: NormalizedMapperOptions): string {
  return renderTransformOutput(source, transformCSS('/test/a.module.css', source, options));
}

describe('generates an empty module when the CSS module has no tokens', () => {
  test('default export', () => {
    expect(run('', defaultExportOptions)).toMatchInlineSnapshot(`
      "=== source ===

      ¦ #0

      === generated ===
      declare const styles: {};
                    ^^^^^^ #0 Atom(Definition)
      export default styles;
      "
    `);
  });
  test('named export', () => {
    expect(run('', namedExportOptions)).toMatchInlineSnapshot(`
      "=== source ===


      === generated ===
      export {};
      declare const styles: {};
      export default styles;
      "
    `);
  });
});

describe('creates an entry for each local token declaration', () => {
  const source = dedent`
    .a_1 { color: red; }
    .a_2 { color: red; }
    .a_2 { color: red; }
  `;
  test('default export', () => {
    expect(run(source, defaultExportOptions)).toMatchInlineSnapshot(`
      "=== source ===
      .a_1 { color: red; }
          ¦ #6
       ^^^ #0
       ¦ #4
       ^^^ #5
      ¦ #3
      .a_2 { color: red; }
          ¦ #9
       ^^^ #1
       ¦ #7
       ^^^ #8
      .a_2 { color: red; }
          ¦ #12
       ^^^ #2
       ¦ #10
       ^^^ #11

      === generated ===
      interface Styles { readonly 'a_1': string }
                                  ^^^^^ #0 Atom(All~Rename)
      interface Styles { readonly 'a_2': string }
                                  ^^^^^ #1 Atom(All~Rename)
      interface Styles { readonly 'a_2': string }
                                  ^^^^^ #2 Atom(All~Rename)
      declare const styles: Styles;
                    ^^^^^^ #3 Atom(Definition)
      styles['a_1'];
                 ^^ #6 Atom()
              ^^^ #5 Verbatim(All~Hover)
      ^^^^^^^^ #4 Atom()
      styles['a_2'];
                 ^^ #9 Atom()
              ^^^ #8 Verbatim(All~Hover)
      ^^^^^^^^ #7 Atom()
      styles['a_2'];
                 ^^ #12 Atom()
              ^^^ #11 Verbatim(All~Hover)
      ^^^^^^^^ #10 Atom()
      export default styles;
      "
    `);
  });
  test('named export', () => {
    expect(run(source, namedExportOptions)).toMatchInlineSnapshot(`
      "=== source ===
      .a_1 { color: red; }
          ¦ #3
          ¦ #11
       ^^^ #0
       ¦ #1
       ^^^ #2
       ¦ #9
       ^^^ #10
      .a_2 { color: red; }
          ¦ #8
          ¦ #14
       ^^^ #4
       ¦ #6
       ^^^ #7
       ¦ #12
       ^^^ #13
      .a_2 { color: red; }
          ¦ #17
       ^^^ #5
       ¦ #15
       ^^^ #16

      === generated ===
      var _token_0: string;
          ^^^^^^^^ #0 Alias(All~Rename)
      export { _token_0 as 'a_1' };
                               ^ #3 Atom()
                            ^^^ #2 Verbatim
                           ^ #1 Atom()
      var _token_1: string;
          ^^^^^^^^ #4 Alias(All~Rename)
      var _token_1: string;
          ^^^^^^^^ #5 Alias(All~Rename)
      export { _token_1 as 'a_2' };
                               ^ #8 Atom()
                            ^^^ #7 Verbatim
                           ^ #6 Atom()
      import { 'a_1' as __ref_0 } from './a.module.css';
                   ^ #11 Atom()
                ^^^ #10 Verbatim(All~Hover)
               ^ #9 Atom()
      import { 'a_2' as __ref_1 } from './a.module.css';
                   ^ #14 Atom()
                ^^^ #13 Verbatim(All~Hover)
               ^ #12 Atom()
      import { 'a_2' as __ref_2 } from './a.module.css';
                   ^ #17 Atom()
                ^^^ #16 Verbatim(All~Hover)
               ^ #15 Atom()
      declare const styles: {};
      export default styles;
      "
    `);
  });
});

describe('re-exports tokens from an all token importer', () => {
  const source = dedent`
    @import './b.module.css';
    @import './c.module.css';
    @import './c.module.css';
  `;
  test('default export', () => {
    expect(run(source, defaultExportOptions)).toMatchInlineSnapshot(`
      "=== source ===
      @import './b.module.css';
              ^^^^^^^^^^^^^^^^ #1
      ¦ #0
      @import './c.module.css';
              ^^^^^^^^^^^^^^^^ #2
      @import './c.module.css';
              ^^^^^^^^^^^^^^^^ #3

      === generated ===
      type BlockErrorType<T> = [0] extends [1 & T] ? {} : T;
      declare const styles: BlockErrorType<typeof import('./b.module.css').default>
                                                         ^^^^^^^^^^^^^^^^ #1 Verbatim
                    ^^^^^^ #0 Atom(Definition)
        & BlockErrorType<typeof import('./c.module.css').default>
                                       ^^^^^^^^^^^^^^^^ #2 Verbatim
        & BlockErrorType<typeof import('./c.module.css').default>;
                                       ^^^^^^^^^^^^^^^^ #3 Verbatim
      export default styles;
      "
    `);
  });
  test('named export', () => {
    expect(run(source, namedExportOptions)).toMatchInlineSnapshot(`
      "=== source ===
      @import './b.module.css';
              ^^^^^^^^^^^^^^^^ #0
      @import './c.module.css';
              ^^^^^^^^^^^^^^^^ #1
      @import './c.module.css';
              ^^^^^^^^^^^^^^^^ #2

      === generated ===
      export * from './b.module.css';
                    ^^^^^^^^^^^^^^^^ #0 Verbatim
      export * from './c.module.css';
                    ^^^^^^^^^^^^^^^^ #1 Verbatim
      export * from './c.module.css';
                    ^^^^^^^^^^^^^^^^ #2 Verbatim
      declare const styles: {};
      export default styles;
      "
    `);
  });
});

describe('re-exports tokens from a named token importer', () => {
  const source = dedent`
    @value b_1, b_2 as b_alias from './b.module.css';
    @value c_1 from './c.module.css';
    @value c_1 from './c.module.css';
  `;
  test('default export', () => {
    expect(run(source, defaultExportOptions)).toMatchInlineSnapshot(`
      "=== source ===
      @value b_1, b_2 as b_alias from './b.module.css';
                                      ^^^^^^^^^^^^^^^^ #1
                                ¦ #25
                         ^^^^^^^ #5
                         ¦ #23
                         ^^^^^^^ #24
                     ¦ #8
                  ¦ #6
                  ^^^ #7
                ¦ #4
                ¦ #22
             ^^^ #0
             ¦ #2
             ^^^ #3
             ¦ #20
             ^^^ #21
      ¦ #19
      @value c_1 from './c.module.css';
                      ^^^^^^^^^^^^^^^^ #10
                ¦ #13
                ¦ #28
             ^^^ #9
             ¦ #11
             ^^^ #12
             ¦ #26
             ^^^ #27
      @value c_1 from './c.module.css';
                      ^^^^^^^^^^^^^^^^ #15
                ¦ #18
                ¦ #31
             ^^^ #14
             ¦ #16
             ^^^ #17
             ¦ #29
             ^^^ #30

      === generated ===
      interface Styles { readonly 'b_1': typeof import('./b.module.css').default['b_1'] }
                                                                                     ^ #4 Atom()
                                                                                  ^^^ #3 Verbatim
                                                                                 ^ #2 Atom()
                                                       ^^^^^^^^^^^^^^^^ #1 Verbatim
                                  ^^^^^ #0 Atom(All~Rename)
      interface Styles { readonly 'b_alias': typeof import('./b.module.css').default['b_2'] }
                                                                                         ^ #8 Atom()
                                                                                      ^^^ #7 Verbatim
                                                                                     ^ #6 Atom()
                                                           ^^^^^^^^^^^^^^^^ ignore#0
                                  ^^^^^^^^^ #5 Atom(All~Rename)
      interface Styles { readonly 'c_1': typeof import('./c.module.css').default['c_1'] }
                                                                                     ^ #13 Atom()
                                                                                  ^^^ #12 Verbatim
                                                                                 ^ #11 Atom()
                                                       ^^^^^^^^^^^^^^^^ #10 Verbatim
                                  ^^^^^ #9 Atom(All~Rename)
      interface Styles { readonly 'c_1': typeof import('./c.module.css').default['c_1'] }
                                                                                     ^ #18 Atom()
                                                                                  ^^^ #17 Verbatim
                                                                                 ^ #16 Atom()
                                                       ^^^^^^^^^^^^^^^^ #15 Verbatim
                                  ^^^^^ #14 Atom(All~Rename)
      declare const styles: Styles;
                    ^^^^^^ #19 Atom(Definition)
      ({} as any)['b_2'];
      styles['b_1'];
                 ^^ #22 Atom()
              ^^^ #21 Verbatim(All~Hover)
      ^^^^^^^^ #20 Atom()
      styles['b_alias'];
                     ^^ #25 Atom()
              ^^^^^^^ #24 Verbatim(All~Hover)
      ^^^^^^^^ #23 Atom()
      styles['c_1'];
                 ^^ #28 Atom()
              ^^^ #27 Verbatim(All~Hover)
      ^^^^^^^^ #26 Atom()
      styles['c_1'];
                 ^^ #31 Atom()
              ^^^ #30 Verbatim(All~Hover)
      ^^^^^^^^ #29 Atom()
      export default styles;
      "
    `);
  });
  test('named export', () => {
    expect(run(source, namedExportOptions)).toMatchInlineSnapshot(`
      "=== source ===
      @value b_1, b_2 as b_alias from './b.module.css';
                                      ^^^^^^^^^^^^^^^^ #9
                                ¦ #8
                         ¦ #6
                         ^^^^^^^ #7
                     ¦ #5
                  ¦ #3
                  ^^^ #4
                ¦ #2
             ¦ #0
             ^^^ #1
      @value c_1 from './c.module.css';
                      ^^^^^^^^^^^^^^^^ #13
                ¦ #12
             ¦ #10
             ^^^ #11
      @value c_1 from './c.module.css';
                      ^^^^^^^^^^^^^^^^ #14

      === generated ===
      export {
        'b_1',
            ^ #2 Atom()
         ^^^ #1 Verbatim
        ^ #0 Atom()
        'b_2' as 'b_alias',
                         ^ #8 Atom()
                  ^^^^^^^ #7 Verbatim
                 ^ #6 Atom()
            ^ #5 Atom()
         ^^^ #4 Verbatim
        ^ #3 Atom()
      } from './b.module.css';
             ^^^^^^^^^^^^^^^^ #9 Verbatim
      export {
        'c_1',
            ^ #12 Atom()
         ^^^ #11 Verbatim
        ^ #10 Atom()
      } from './c.module.css';
             ^^^^^^^^^^^^^^^^ #13 Verbatim
      export {
      } from './c.module.css';
             ^^^^^^^^^^^^^^^^ #14 Verbatim
      declare const styles: {};
      export default styles;
      "
    `);
  });
});

describe('emits token reference statements', () => {
  const source = dedent`
    @keyframes a_1 {}
    .a_2 { animation-name: a_1; }
  `;
  test('default export', () => {
    expect(run(source, defaultExportOptions)).toMatchInlineSnapshot(`
      "=== source ===
      @keyframes a_1 {}
                    ¦ #5
                 ^^^ #0
                 ¦ #3
                 ^^^ #4
      ¦ #2
      .a_2 { animation-name: a_1; }
                                ¦ #11
                             ¦ #9
                             ^^^ #10
          ¦ #8
       ^^^ #1
       ¦ #6
       ^^^ #7

      === generated ===
      interface Styles { readonly 'a_1': string }
                                  ^^^^^ #0 Atom(All~Rename)
      interface Styles { readonly 'a_2': string }
                                  ^^^^^ #1 Atom(All~Rename)
      declare const styles: Styles;
                    ^^^^^^ #2 Atom(Definition)
      styles['a_1'];
                 ^^ #5 Atom()
              ^^^ #4 Verbatim(All~Hover)
      ^^^^^^^^ #3 Atom()
      styles['a_2'];
                 ^^ #8 Atom()
              ^^^ #7 Verbatim(All~Hover)
      ^^^^^^^^ #6 Atom()
      styles['a_1'];
                 ^^ #11 Atom()
              ^^^ #10 Verbatim
      ^^^^^^^^ #9 Atom()
      export default styles;
      "
    `);
  });
  test('named export', () => {
    expect(run(source, namedExportOptions)).toMatchInlineSnapshot(`
      "=== source ===
      @keyframes a_1 {}
                    ¦ #3
                    ¦ #10
                 ^^^ #0
                 ¦ #1
                 ^^^ #2
                 ¦ #8
                 ^^^ #9
      .a_2 { animation-name: a_1; }
                                ¦ #16
                             ¦ #14
                             ^^^ #15
          ¦ #7
          ¦ #13
       ^^^ #4
       ¦ #5
       ^^^ #6
       ¦ #11
       ^^^ #12

      === generated ===
      var _token_0: string;
          ^^^^^^^^ #0 Alias(All~Rename)
      export { _token_0 as 'a_1' };
                               ^ #3 Atom()
                            ^^^ #2 Verbatim
                           ^ #1 Atom()
      var _token_1: string;
          ^^^^^^^^ #4 Alias(All~Rename)
      export { _token_1 as 'a_2' };
                               ^ #7 Atom()
                            ^^^ #6 Verbatim
                           ^ #5 Atom()
      import { 'a_1' as __ref_0 } from './a.module.css';
                   ^ #10 Atom()
                ^^^ #9 Verbatim(All~Hover)
               ^ #8 Atom()
      import { 'a_2' as __ref_1 } from './a.module.css';
                   ^ #13 Atom()
                ^^^ #12 Verbatim(All~Hover)
               ^ #11 Atom()
      import { 'a_1' as __ref_2 } from './a.module.css';
                   ^ #16 Atom()
                ^^^ #15 Verbatim
               ^ #14 Atom()
      declare const styles: {};
      export default styles;
      "
    `);
  });
});

describe('emits external token reference statements', () => {
  // `b_1` and `b_2` share one `from` clause. The `from` clause of `b_3` has the same specifier
  // as the first one, but is a separate clause.
  const source = `.a_1 { composes: b_1 b_2 from './b.module.css', b_3 from './b.module.css'; }`;
  test('default export', () => {
    expect(run(source, defaultExportOptions)).toMatchInlineSnapshot(`
      "=== source ===
      .a_1 { composes: b_1 b_2 from './b.module.css', b_3 from './b.module.css'; }
                                                               ^^^^^^^^^^^^^^^^ #12
                                                         ¦ #15
                                                      ¦ #13
                                                      ^^^ #14
                                    ^^^^^^^^^^^^^^^^ #5
                              ¦ #11
                           ¦ #9
                           ^^^ #10
                          ¦ #8
                       ¦ #6
                       ^^^ #7
          ¦ #4
       ^^^ #0
       ¦ #2
       ^^^ #3
      ¦ #1

      === generated ===
      interface Styles { readonly 'a_1': string }
                                  ^^^^^ #0 Atom(All~Rename)
      declare const styles: Styles;
                    ^^^^^^ #1 Atom(Definition)
      styles['a_1'];
                 ^^ #4 Atom()
              ^^^ #3 Verbatim(All~Hover)
      ^^^^^^^^ #2 Atom()
      import __ref_0 from './b.module.css';
                          ^^^^^^^^^^^^^^^^ #5 Verbatim
      __ref_0['b_1'];
                  ^^ #8 Atom()
               ^^^ #7 Verbatim
      ^^^^^^^^^ #6 Atom()
      __ref_0['b_2'];
                  ^^ #11 Atom()
               ^^^ #10 Verbatim
      ^^^^^^^^^ #9 Atom()
      import __ref_1 from './b.module.css';
                          ^^^^^^^^^^^^^^^^ #12 Verbatim
      __ref_1['b_3'];
                  ^^ #15 Atom()
               ^^^ #14 Verbatim
      ^^^^^^^^^ #13 Atom()
      export default styles;
      "
    `);
  });
  test('named export', () => {
    expect(run(source, namedExportOptions)).toMatchInlineSnapshot(`
      "=== source ===
      .a_1 { composes: b_1 b_2 from './b.module.css', b_3 from './b.module.css'; }
                                                               ^^^^^^^^^^^^^^^^ #17
                                                         ¦ #16
                                                      ¦ #14
                                                      ^^^ #15
                                    ^^^^^^^^^^^^^^^^ #13
                              ¦ #12
                           ¦ #10
                           ^^^ #11
                          ¦ #9
                       ¦ #7
                       ^^^ #8
          ¦ #3
          ¦ #6
       ^^^ #0
       ¦ #1
       ^^^ #2
       ¦ #4
       ^^^ #5

      === generated ===
      var _token_0: string;
          ^^^^^^^^ #0 Alias(All~Rename)
      export { _token_0 as 'a_1' };
                               ^ #3 Atom()
                            ^^^ #2 Verbatim
                           ^ #1 Atom()
      import { 'a_1' as __ref_0 } from './a.module.css';
                   ^ #6 Atom()
                ^^^ #5 Verbatim(All~Hover)
               ^ #4 Atom()
      import { 'b_1' as __ref_1, 'b_2' as __ref_2 } from './b.module.css';
                                                         ^^^^^^^^^^^^^^^^ #13 Verbatim
                                     ^ #12 Atom()
                                  ^^^ #11 Verbatim
                                 ^ #10 Atom()
                   ^ #9 Atom()
                ^^^ #8 Verbatim
               ^ #7 Atom()
      import { 'b_3' as __ref_3 } from './b.module.css';
                                       ^^^^^^^^^^^^^^^^ #17 Verbatim
                   ^ #16 Atom()
                ^^^ #15 Verbatim
               ^ #14 Atom()
      declare const styles: {};
      export default styles;
      "
    `);
  });
});

test('omits external token reference statements whose specifier is a URL', () => {
  const source = `.a_1 { composes: b_1 from 'https://example.com/b.module.css'; }`;
  expect(run(source, defaultExportOptions)).toMatchInlineSnapshot(`
    "=== source ===
    .a_1 { composes: b_1 from 'https://example.com/b.module.css'; }
        ¦ #4
     ^^^ #0
     ¦ #2
     ^^^ #3
    ¦ #1

    === generated ===
    interface Styles { readonly 'a_1': string }
                                ^^^^^ #0 Atom(All~Rename)
    declare const styles: Styles;
                  ^^^^^^ #1 Atom(Definition)
    styles['a_1'];
               ^^ #4 Atom()
            ^^^ #3 Verbatim(All~Hover)
    ^^^^^^^^ #2 Atom()
    export default styles;
    "
  `);
});

describe('omits importers whose specifier is a URL or a non-module CSS file', () => {
  const source = dedent`
    @import 'https://example.com/b.module.css';
    @value c_1 from 'https://example.com/c.module.css';
    @import './d.css';
  `;
  test('default export', () => {
    expect(run(source, defaultExportOptions)).toMatchInlineSnapshot(`
      "=== source ===
      @import 'https://example.com/b.module.css';
      ¦ #0
      @value c_1 from 'https://example.com/c.module.css';
      @import './d.css';

      === generated ===
      declare const styles: {};
                    ^^^^^^ #0 Atom(Definition)
      export default styles;
      "
    `);
  });
  test('named export', () => {
    expect(run(source, namedExportOptions)).toMatchInlineSnapshot(`
      "=== source ===
      @import 'https://example.com/b.module.css';
      @value c_1 from 'https://example.com/c.module.css';
      @import './d.css';

      === generated ===
      export {};
      declare const styles: {};
      export default styles;
      "
    `);
  });
});

describe('omits tokens whose name fails validateTokenName', () => {
  const source = dedent`
    .__proto__ { color: red; }
    @value __proto__ from './b.module.css';
    @value b_1 as __proto__ from './b.module.css';
  `;
  test('default export', () => {
    expect(run(source, defaultExportOptions)).toMatchInlineSnapshot(`
      "=== source ===
      .__proto__ { color: red; }
       ^^^^^^^^^ diag#0
      ¦ #0
      @value __proto__ from './b.module.css';
             ^^^^^^^^^ diag#1
      @value b_1 as __proto__ from './b.module.css';
                    ^^^^^^^^^ diag#2

      === generated ===
      declare const styles: {};
                    ^^^^^^ #0 Atom(Definition)
      export default styles;


      === diagnostics ===
      diag#0: \`__proto__\` is not allowed as names.
      diag#1: \`__proto__\` is not allowed as names.
      diag#2: \`__proto__\` is not allowed as names."
    `);
  });
  test('named export', () => {
    expect(run(source, namedExportOptions)).toMatchInlineSnapshot(`
      "=== source ===
      .__proto__ { color: red; }
       ^^^^^^^^^ diag#0
      @value __proto__ from './b.module.css';
                            ^^^^^^^^^^^^^^^^ #0
             ^^^^^^^^^ diag#1
      @value b_1 as __proto__ from './b.module.css';
                                   ^^^^^^^^^^^^^^^^ #1
                    ^^^^^^^^^ diag#2

      === generated ===
      export {
      } from './b.module.css';
             ^^^^^^^^^^^^^^^^ #0 Verbatim
      export {
      } from './b.module.css';
             ^^^^^^^^^^^^^^^^ #1 Verbatim
      declare const styles: {};
      export default styles;


      === diagnostics ===
      diag#0: \`__proto__\` is not allowed as names.
      diag#1: \`__proto__\` is not allowed as names.
      diag#2: \`__proto__\` is not allowed as names."
    `);
  });
});

test('quotes generated specifiers with the original quote character', () => {
  expect(run(`@import "./b.module.css";`, defaultExportOptions)).toMatchInlineSnapshot(`
    "=== source ===
    @import "./b.module.css";
            ^^^^^^^^^^^^^^^^ #1
    ¦ #0

    === generated ===
    type BlockErrorType<T> = [0] extends [1 & T] ? {} : T;
    declare const styles: BlockErrorType<typeof import("./b.module.css").default>;
                                                       ^^^^^^^^^^^^^^^^ #1 Verbatim
                  ^^^^^^ #0 Atom(Definition)
    export default styles;
    "
  `);
});

test('synthesizes quotes for unquoted url() specifiers and maps them as zero-width spans', () => {
  expect(run(`@import url(./b.module.css);`, defaultExportOptions)).toMatchInlineSnapshot(`
    "=== source ===
    @import url(./b.module.css);
                              ¦ #3
                ¦ #1
                ^^^^^^^^^^^^^^ #2
    ¦ #0

    === generated ===
    type BlockErrorType<T> = [0] extends [1 & T] ? {} : T;
    declare const styles: BlockErrorType<typeof import('./b.module.css').default>;
                                                                      ^ #3 Atom(Definition|TypeDefinition|Implementation|References)
                                                        ^^^^^^^^^^^^^^ #2 Verbatim
                                                       ^ #1 Atom(Definition|TypeDefinition|Implementation|References)
                  ^^^^^^ #0 Atom(Definition)
    export default styles;
    "
  `);
});

test('converts parse diagnostics into mapper diagnostics', () => {
  const source = dedent`
    .a_1 { color: red; }
    .a_2 {
  `;
  expect(run(source, defaultExportOptions)).toMatchInlineSnapshot(`
    "=== source ===
    .a_1 { color: red; }
        ¦ #5
     ^^^ #0
     ¦ #3
     ^^^ #4
    ¦ #2
    .a_2 {
        ¦ #8
     ^^^ #1
     ¦ #6
     ^^^ #7
    ^ diag#0

    === generated ===
    interface Styles { readonly 'a_1': string }
                                ^^^^^ #0 Atom(All~Rename)
    interface Styles { readonly 'a_2': string }
                                ^^^^^ #1 Atom(All~Rename)
    declare const styles: Styles;
                  ^^^^^^ #2 Atom(Definition)
    styles['a_1'];
               ^^ #5 Atom()
            ^^^ #4 Verbatim(All~Hover)
    ^^^^^^^^ #3 Atom()
    styles['a_2'];
               ^^ #8 Atom()
            ^^^ #7 Verbatim(All~Hover)
    ^^^^^^^^ #6 Atom()
    export default styles;


    === diagnostics ===
    diag#0: Unclosed block"
  `);
});

test('omits keyframes tokens when animation is false', () => {
  expect(run('@keyframes a_1 {}', { ...defaultExportOptions, animation: false })).toMatchInlineSnapshot(`
    "=== source ===
    @keyframes a_1 {}
    ¦ #0

    === generated ===
    declare const styles: {};
                  ^^^^^^ #0 Atom(Definition)
    export default styles;
    "
  `);
});

test('generates an empty module for a non-module CSS file', () => {
  expect(transformCSS('/test/global.css', `* { margin: 0; }`, defaultExportOptions)).toStrictEqual({
    text: 'export {};\n',
    mappings: [],
    diagnostics: [],
  });
});

test('keeps the generated text a module when prioritizeNamedImports is true', () => {
  expect(run('', { ...namedExportOptions, prioritizeNamedImports: true })).toMatchInlineSnapshot(`
    "=== source ===


    === generated ===
    export {};
    "
  `);
});
