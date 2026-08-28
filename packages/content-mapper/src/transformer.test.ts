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
      interface Styles {}
      declare const styles: Styles;
                    ^^^^^^ #0 Atom(Definition)
      export default styles;
      "
    `);
  });
  test('named export', () => {
    expect(run('', namedExportOptions)).toMatchInlineSnapshot(`
      "=== source ===


      === generated ===
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
       ^^^ #0
       ^^^ #4
      ¦ #3
      .a_2 { color: red; }
       ^^^ #1
       ^^^ #5
      .a_2 { color: red; }
       ^^^ #2
       ^^^ #6

      === generated ===
      interface Styles { readonly 'a_1': string; }
                                  ^^^^^ #0 Atom(All~Rename)
      interface Styles { readonly 'a_2': string; }
                                  ^^^^^ #1 Atom(All~Rename)
      interface Styles { readonly 'a_2': string; }
                                  ^^^^^ #2 Atom(All~Rename)
      declare const styles: Styles;
                    ^^^^^^ #3 Atom(Definition)
      styles['a_1'];
              ^^^ #4 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#0
      styles['a_2'];
              ^^^ #5 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#1
      styles['a_2'];
              ^^^ #6 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#2
      export default styles;
      "
    `);
  });
  test('named export', () => {
    expect(run(source, namedExportOptions)).toMatchInlineSnapshot(`
      "=== source ===
      .a_1 { color: red; }
       ^^^ #0
       ^^^ #1
       ^^^ #5
      .a_2 { color: red; }
       ^^^ #2
       ^^^ #4
       ^^^ #6
      .a_2 { color: red; }
       ^^^ #3
       ^^^ #7

      === generated ===
      var _token_0: string;
          ^^^^^^^^ #0 Alias(All~Rename)
      export { _token_0 as 'a_1' };
                            ^^^ #1 Verbatim
      var _token_1: string;
          ^^^^^^^^ #2 Alias(All~Rename)
      var _token_1: string;
          ^^^^^^^^ #3 Alias(All~Rename)
      export { _token_1 as 'a_2' };
                            ^^^ #4 Verbatim
      import * as __self from './a.module.css';
      __self['a_1'];
              ^^^ #5 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#0
      __self['a_2'];
              ^^^ #6 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#1
      __self['a_2'];
              ^^^ #7 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#2
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
              ^^^^^^^^^^^^^^^^ #0
      ¦ #3
      @import './c.module.css';
              ^^^^^^^^^^^^^^^^ #1
      @import './c.module.css';
              ^^^^^^^^^^^^^^^^ #2

      === generated ===
      import * as _import_0 from './b.module.css';
                                 ^^^^^^^^^^^^^^^^ #0 Verbatim
      import * as _import_1 from './c.module.css';
                                 ^^^^^^^^^^^^^^^^ #1 Verbatim
      import * as _import_2 from './c.module.css';
                                 ^^^^^^^^^^^^^^^^ #2 Verbatim
      type __BlockErrorType<T> = [0] extends [1 & T] ? {} : T;
      interface Styles {}
      declare const styles: Styles & __BlockErrorType<typeof _import_0.default> & __BlockErrorType<typeof _import_1.default> & __BlockErrorType<typeof _import_2.default>;
                    ^^^^^^ #3 Atom(Definition)
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
                                      ^^^^^^^^^^^^^^^^ #0
                         ^^^^^^^ #5
                         ^^^^^^^ #14
                  ^^^ #6
                  ^^^ #15
             ^^^ #3
             ^^^ #4
             ^^^ #12
             ^^^ #13
      ¦ #11
      @value c_1 from './c.module.css';
                      ^^^^^^^^^^^^^^^^ #1
             ^^^ #7
             ^^^ #8
             ^^^ #16
             ^^^ #17
      @value c_1 from './c.module.css';
                      ^^^^^^^^^^^^^^^^ #2
             ^^^ #9
             ^^^ #10
             ^^^ #18
             ^^^ #19

      === generated ===
      import * as _import_0 from './b.module.css';
                                 ^^^^^^^^^^^^^^^^ #0 Verbatim
      import * as _import_1 from './c.module.css';
                                 ^^^^^^^^^^^^^^^^ #1 Verbatim
      import * as _import_2 from './c.module.css';
                                 ^^^^^^^^^^^^^^^^ #2 Verbatim
      interface Styles { readonly 'b_1': typeof _import_0.default['b_1']; }
                                                                  ^^^^^ #4 Atom(All~Rename)
                                  ^^^^^ #3 Atom(All~Rename)
      interface Styles { readonly 'b_alias': typeof _import_0.default['b_2']; }
                                                                      ^^^^^ #6 Atom(All~Rename)
                                  ^^^^^^^^^ #5 Atom(All~Rename)
      interface Styles { readonly 'c_1': typeof _import_1.default['c_1']; }
                                                                  ^^^^^ #8 Atom(All~Rename)
                                  ^^^^^ #7 Atom(All~Rename)
      interface Styles { readonly 'c_1': typeof _import_2.default['c_1']; }
                                                                  ^^^^^ #10 Atom(All~Rename)
                                  ^^^^^ #9 Atom(All~Rename)
      declare const styles: Styles;
                    ^^^^^^ #11 Atom(Definition)
      styles['b_1'];
              ^^^ #12 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#0
      _import_0.default['b_1'];
                         ^^^ #13 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^^^^^^^^^^^^ ignore#1
      styles['b_alias'];
              ^^^^^^^ #14 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^^^^^ ignore#2
      _import_0.default['b_2'];
                         ^^^ #15 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^^^^^^^^^^^^ ignore#3
      styles['c_1'];
              ^^^ #16 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#4
      _import_1.default['c_1'];
                         ^^^ #17 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^^^^^^^^^^^^ ignore#5
      styles['c_1'];
              ^^^ #18 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#6
      _import_2.default['c_1'];
                         ^^^ #19 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^^^^^^^^^^^^ ignore#7
      export default styles;
      "
    `);
  });
  test('named export', () => {
    expect(run(source, namedExportOptions)).toMatchInlineSnapshot(`
      "=== source ===
      @value b_1, b_2 as b_alias from './b.module.css';
                                      ^^^^^^^^^^^^^^^^ #4
                                      ^^^^^^^^^^^^^^^^ #5
                         ^^^^^^^ #3
                         ^^^^^^^ #16
                  ^^^ #2
                  ^^^ #17
             ^^^ #0
             ^^^ #1
             ^^^ #14
             ^^^ #15
      @value c_1 from './c.module.css';
                      ^^^^^^^^^^^^^^^^ #8
                      ^^^^^^^^^^^^^^^^ #9
             ^^^ #6
             ^^^ #7
             ^^^ #18
             ^^^ #19
      @value c_1 from './c.module.css';
                      ^^^^^^^^^^^^^^^^ #12
                      ^^^^^^^^^^^^^^^^ #13
             ^^^ #10
             ^^^ #11
             ^^^ #20
             ^^^ #21

      === generated ===
      export {
        'b_1' as 'b_1',
                  ^^^ #1 Verbatim
         ^^^ #0 Verbatim
        'b_2' as 'b_alias',
                  ^^^^^^^ #3 Verbatim
         ^^^ #2 Verbatim
      } from './b.module.css';
             ^^^^^^^^^^^^^^^^ #4 Verbatim
      import * as _import_0 from './b.module.css';
                                 ^^^^^^^^^^^^^^^^ #5 Verbatim
      export {
        'c_1' as 'c_1',
                  ^^^ #7 Verbatim
         ^^^ #6 Verbatim
      } from './c.module.css';
             ^^^^^^^^^^^^^^^^ #8 Verbatim
      import * as _import_1 from './c.module.css';
                                 ^^^^^^^^^^^^^^^^ #9 Verbatim
      export {
        'c_1' as 'c_1',
                  ^^^ #11 Verbatim
         ^^^ #10 Verbatim
      } from './c.module.css';
             ^^^^^^^^^^^^^^^^ #12 Verbatim
      import * as _import_2 from './c.module.css';
                                 ^^^^^^^^^^^^^^^^ #13 Verbatim
      import * as __self from './a.module.css';
      __self['b_1'];
              ^^^ #14 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#0
      _import_0['b_1'];
                 ^^^ #15 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^^^^ ignore#1
      __self['b_alias'];
              ^^^^^^^ #16 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^^^^^ ignore#2
      _import_0['b_2'];
                 ^^^ #17 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^^^^ ignore#3
      __self['c_1'];
              ^^^ #18 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#4
      _import_1['c_1'];
                 ^^^ #19 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^^^^ ignore#5
      __self['c_1'];
              ^^^ #20 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#6
      _import_2['c_1'];
                 ^^^ #21 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^^^^ ignore#7
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
                 ^^^ #0
                 ^^^ #3
      ¦ #2
      .a_2 { animation-name: a_1; }
                             ^^^ #5
                             ^^^ #6
       ^^^ #1
       ^^^ #4

      === generated ===
      interface Styles { readonly 'a_1': string; }
                                  ^^^^^ #0 Atom(All~Rename)
      interface Styles { readonly 'a_2': string; }
                                  ^^^^^ #1 Atom(All~Rename)
      declare const styles: Styles;
                    ^^^^^^ #2 Atom(Definition)
      styles['a_1'];
              ^^^ #3 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#0
      styles['a_2'];
              ^^^ #4 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#1
      styles['a_1'];
             ^^^^^ #5 Atom(All~Rename)
      styles['a_1'];
              ^^^ #6 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#2
      export default styles;
      "
    `);
  });
  test('named export', () => {
    expect(run(source, namedExportOptions)).toMatchInlineSnapshot(`
      "=== source ===
      @keyframes a_1 {}
                 ^^^ #0
                 ^^^ #1
                 ^^^ #4
      .a_2 { animation-name: a_1; }
                             ^^^ #6
                             ^^^ #7
       ^^^ #2
       ^^^ #3
       ^^^ #5

      === generated ===
      var _token_0: string;
          ^^^^^^^^ #0 Alias(All~Rename)
      export { _token_0 as 'a_1' };
                            ^^^ #1 Verbatim
      var _token_1: string;
          ^^^^^^^^ #2 Alias(All~Rename)
      export { _token_1 as 'a_2' };
                            ^^^ #3 Verbatim
      import * as __self from './a.module.css';
      __self['a_1'];
              ^^^ #4 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#0
      __self['a_2'];
              ^^^ #5 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#1
      __self['a_1'];
             ^^^^^ #6 Atom(All~Rename)
      __self['a_1'];
              ^^^ #7 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#2
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
                                                               ^^^^^^^^^^^^^^^^ #1
                                                      ^^^ #9
                                                      ^^^ #10
                                    ^^^^^^^^^^^^^^^^ #0
                           ^^^ #7
                           ^^^ #8
                       ^^^ #5
                       ^^^ #6
       ^^^ #2
       ^^^ #4
      ¦ #3

      === generated ===
      import * as _import_0 from './b.module.css';
                                 ^^^^^^^^^^^^^^^^ #0 Verbatim
      import * as _import_1 from './b.module.css';
                                 ^^^^^^^^^^^^^^^^ #1 Verbatim
      interface Styles { readonly 'a_1': string; }
                                  ^^^^^ #2 Atom(All~Rename)
      declare const styles: Styles;
                    ^^^^^^ #3 Atom(Definition)
      styles['a_1'];
              ^^^ #4 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#0
      _import_0.default['b_1'];
                        ^^^^^ #5 Atom(All~Rename)
      _import_0.default['b_1'];
                         ^^^ #6 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^^^^^^^^^^^^ ignore#1
      _import_0.default['b_2'];
                        ^^^^^ #7 Atom(All~Rename)
      _import_0.default['b_2'];
                         ^^^ #8 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^^^^^^^^^^^^ ignore#2
      _import_1.default['b_3'];
                        ^^^^^ #9 Atom(All~Rename)
      _import_1.default['b_3'];
                         ^^^ #10 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^^^^^^^^^^^^ ignore#3
      export default styles;
      "
    `);
  });
  test('named export', () => {
    expect(run(source, namedExportOptions)).toMatchInlineSnapshot(`
      "=== source ===
      .a_1 { composes: b_1 b_2 from './b.module.css', b_3 from './b.module.css'; }
                                                               ^^^^^^^^^^^^^^^^ #3
                                                      ^^^ #9
                                                      ^^^ #10
                                    ^^^^^^^^^^^^^^^^ #2
                           ^^^ #7
                           ^^^ #8
                       ^^^ #5
                       ^^^ #6
       ^^^ #0
       ^^^ #1
       ^^^ #4

      === generated ===
      var _token_0: string;
          ^^^^^^^^ #0 Alias(All~Rename)
      export { _token_0 as 'a_1' };
                            ^^^ #1 Verbatim
      import * as _import_0 from './b.module.css';
                                 ^^^^^^^^^^^^^^^^ #2 Verbatim
      import * as _import_1 from './b.module.css';
                                 ^^^^^^^^^^^^^^^^ #3 Verbatim
      import * as __self from './a.module.css';
      __self['a_1'];
              ^^^ #4 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#0
      _import_0['b_1'];
                ^^^^^ #5 Atom(All~Rename)
      _import_0['b_1'];
                 ^^^ #6 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^^^^ ignore#1
      _import_0['b_2'];
                ^^^^^ #7 Atom(All~Rename)
      _import_0['b_2'];
                 ^^^ #8 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^^^^ ignore#2
      _import_1['b_3'];
                ^^^^^ #9 Atom(All~Rename)
      _import_1['b_3'];
                 ^^^ #10 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^^^^ ignore#3
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
     ^^^ #0
     ^^^ #2
    ¦ #1

    === generated ===
    interface Styles { readonly 'a_1': string; }
                                ^^^^^ #0 Atom(All~Rename)
    declare const styles: Styles;
                  ^^^^^^ #1 Atom(Definition)
    styles['a_1'];
            ^^^ #2 Verbatim(All~Hover)
    ^^^^^^^^^^^^^^ ignore#0
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
      interface Styles {}
      declare const styles: Styles;
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
      ¦ #2
      @value __proto__ from './b.module.css';
                            ^^^^^^^^^^^^^^^^ #0
             ^^^^^^^^^ diag#1
      @value b_1 as __proto__ from './b.module.css';
                                   ^^^^^^^^^^^^^^^^ #1
                    ^^^^^^^^^ diag#2

      === generated ===
      import './b.module.css';
             ^^^^^^^^^^^^^^^^ #0 Verbatim
      import './b.module.css';
             ^^^^^^^^^^^^^^^^ #1 Verbatim
      interface Styles {}
      declare const styles: Styles;
                    ^^^^^^ #2 Atom(Definition)
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
            ^^^^^^^^^^^^^^^^ #0
    ¦ #1

    === generated ===
    import * as _import_0 from "./b.module.css";
                               ^^^^^^^^^^^^^^^^ #0 Verbatim
    type __BlockErrorType<T> = [0] extends [1 & T] ? {} : T;
    interface Styles {}
    declare const styles: Styles & __BlockErrorType<typeof _import_0.default>;
                  ^^^^^^ #1 Atom(Definition)
    export default styles;
    "
  `);
});

test('synthesizes quotes for unquoted url() specifiers and maps them as zero-width spans', () => {
  expect(run(`@import url(./b.module.css);`, defaultExportOptions)).toMatchInlineSnapshot(`
    "=== source ===
    @import url(./b.module.css);
                              ¦ #2
                ¦ #0
                ^^^^^^^^^^^^^^ #1
    ¦ #3

    === generated ===
    import * as _import_0 from './b.module.css';
                                              ^ #2 Atom(Definition|TypeDefinition|Implementation|References)
                                ^^^^^^^^^^^^^^ #1 Verbatim
                               ^ #0 Atom(Definition|TypeDefinition|Implementation|References)
    type __BlockErrorType<T> = [0] extends [1 & T] ? {} : T;
    interface Styles {}
    declare const styles: Styles & __BlockErrorType<typeof _import_0.default>;
                  ^^^^^^ #3 Atom(Definition)
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
     ^^^ #0
     ^^^ #3
    ¦ #2
    .a_2 {
     ^^^ #1
     ^^^ #4
    ^ diag#0

    === generated ===
    interface Styles { readonly 'a_1': string; }
                                ^^^^^ #0 Atom(All~Rename)
    interface Styles { readonly 'a_2': string; }
                                ^^^^^ #1 Atom(All~Rename)
    declare const styles: Styles;
                  ^^^^^^ #2 Atom(Definition)
    styles['a_1'];
            ^^^ #3 Verbatim(All~Hover)
    ^^^^^^^^^^^^^^ ignore#0
    styles['a_2'];
            ^^^ #4 Verbatim(All~Hover)
    ^^^^^^^^^^^^^^ ignore#1
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
    interface Styles {}
    declare const styles: Styles;
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
