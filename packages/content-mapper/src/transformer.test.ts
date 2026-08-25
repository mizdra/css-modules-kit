import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import type { NormalizedMapperOptions } from './options.js';
import { renderTransformOutput } from './test/render.js';
import { transformCSS } from './transformer.js';

const defaultOptions: NormalizedMapperOptions = {
  namedExports: false,
  prioritizeNamedImports: false,
  animation: true,
  dashedIdents: false,
  container: false,
};
const namedExportsOptions: NormalizedMapperOptions = { ...defaultOptions, namedExports: true };

function run(source: string, options: NormalizedMapperOptions = defaultOptions): string {
  return renderTransformOutput(source, transformCSS('/test/a.module.css', source, options));
}

test('generates interface declarations for local tokens', () => {
  const result = run(dedent`
    .foo {}
    .bar {}
  `);
  expect(result).toMatchInlineSnapshot(`
    "=== source ===
    .foo {}
     ^^^ #0
     ^^^ #2
    .bar {}
     ^^^ #1
     ^^^ #3

    === generated ===
    interface Styles { readonly 'foo': string; }
                                ^^^^^ #0 Atom(All~Rename)
    interface Styles { readonly 'bar': string; }
                                ^^^^^ #1 Atom(All~Rename)
    declare const styles: Styles;
    styles['foo'];
            ^^^ #2 Verbatim(All~Hover)
    ^^^^^^^^^^^^^^ ignore#0
    styles['bar'];
            ^^^ #3 Verbatim(All~Hover)
    ^^^^^^^^^^^^^^ ignore#1
    export default styles;
    "
  `);
});

test('generates a namespace import and an intersection type for all token importers', () => {
  expect(run(`@import './b.module.css';`)).toMatchInlineSnapshot(`
    "=== source ===
    @import './b.module.css';
            ^^^^^^^^^^^^^^^^ #0

    === generated ===
    import * as _import_0 from './b.module.css';
                               ^^^^^^^^^^^^^^^^ #0 Verbatim
    type __BlockErrorType<T> = [0] extends [1 & T] ? {} : T;
    interface Styles {}
    declare const styles: Styles & __BlockErrorType<typeof _import_0.default>;
    export default styles;
    "
  `);
});

test('generates indexed access type members for named token importer entries', () => {
  expect(run(`@value v1, v2 as v3 from './c.module.css';`)).toMatchInlineSnapshot(`
    "=== source ===
    @value v1, v2 as v3 from './c.module.css';
                             ^^^^^^^^^^^^^^^^ #0
                     ^^ #3
                     ^^ #7
               ^^ #4
               ^^ #8
           ^^ #1
           ^^ #2
           ^^ #5
           ^^ #6

    === generated ===
    import * as _import_0 from './c.module.css';
                               ^^^^^^^^^^^^^^^^ #0 Verbatim
    interface Styles { readonly 'v1': typeof _import_0.default['v1']; }
                                                               ^^^^ #2 Atom(All~Rename)
                                ^^^^ #1 Atom(All~Rename)
    interface Styles { readonly 'v3': typeof _import_0.default['v2']; }
                                                               ^^^^ #4 Atom(All~Rename)
                                ^^^^ #3 Atom(All~Rename)
    declare const styles: Styles;
    styles['v1'];
            ^^ #5 Verbatim(All~Hover)
    ^^^^^^^^^^^^^ ignore#0
    _import_0.default['v1'];
                       ^^ #6 Verbatim(All~Hover)
    ^^^^^^^^^^^^^^^^^^^^^^^^ ignore#1
    styles['v3'];
            ^^ #7 Verbatim(All~Hover)
    ^^^^^^^^^^^^^ ignore#2
    _import_0.default['v2'];
                       ^^ #8 Verbatim(All~Hover)
    ^^^^^^^^^^^^^^^^^^^^^^^^ ignore#3
    export default styles;
    "
  `);
});

test('omits imports for URL specifiers and non css module specifiers', () => {
  const result = run(dedent`
    @import 'https://example.com/a.module.css';
    @import './plain.css';
  `);
  expect(result).toMatchInlineSnapshot(`
    "=== source ===
    @import 'https://example.com/a.module.css';
    @import './plain.css';

    === generated ===
    interface Styles {}
    declare const styles: Styles;
    export default styles;
    "
  `);
});

test('generates expression statements for local token references', () => {
  const result = run(dedent`
    .foo { animation-name: pulse; }
    @keyframes pulse {}
  `);
  expect(result).toMatchInlineSnapshot(`
    "=== source ===
    .foo { animation-name: pulse; }
                           ^^^^^ #4
                           ^^^^^ #5
     ^^^ #0
     ^^^ #2
    @keyframes pulse {}
               ^^^^^ #1
               ^^^^^ #3

    === generated ===
    interface Styles { readonly 'foo': string; }
                                ^^^^^ #0 Atom(All~Rename)
    interface Styles { readonly 'pulse': string; }
                                ^^^^^^^ #1 Atom(All~Rename)
    declare const styles: Styles;
    styles['foo'];
            ^^^ #2 Verbatim(All~Hover)
    ^^^^^^^^^^^^^^ ignore#0
    styles['pulse'];
            ^^^^^ #3 Verbatim(All~Hover)
    ^^^^^^^^^^^^^^^^ ignore#1
    styles['pulse'];
           ^^^^^^^ #4 Atom(All~Rename)
    styles['pulse'];
            ^^^^^ #5 Verbatim(All~Hover)
    ^^^^^^^^^^^^^^^^ ignore#2
    export default styles;
    "
  `);
});

test('generates imports and expression statements for external token references', () => {
  expect(run(`.foo { composes: baz from './d.module.css'; }`)).toMatchInlineSnapshot(`
    "=== source ===
    .foo { composes: baz from './d.module.css'; }
                              ^^^^^^^^^^^^^^^^ #0
                     ^^^ #3
                     ^^^ #4
     ^^^ #1
     ^^^ #2

    === generated ===
    import * as _import_0 from './d.module.css';
                               ^^^^^^^^^^^^^^^^ #0 Verbatim
    interface Styles { readonly 'foo': string; }
                                ^^^^^ #1 Atom(All~Rename)
    declare const styles: Styles;
    styles['foo'];
            ^^^ #2 Verbatim(All~Hover)
    ^^^^^^^^^^^^^^ ignore#0
    _import_0.default['baz'];
                      ^^^^^ #3 Atom(All~Rename)
    _import_0.default['baz'];
                       ^^^ #4 Verbatim(All~Hover)
    ^^^^^^^^^^^^^^^^^^^^^^^^^ ignore#1
    export default styles;
    "
  `);
});

test('generates an interface declaration for every occurrence of a duplicated token name', () => {
  const result = run(dedent`
    .foo {}
    .foo:hover {}
  `);
  expect(result).toMatchInlineSnapshot(`
    "=== source ===
    .foo {}
     ^^^ #0
     ^^^ #2
    .foo:hover {}
     ^^^ #1
     ^^^ #3

    === generated ===
    interface Styles { readonly 'foo': string; }
                                ^^^^^ #0 Atom(All~Rename)
    interface Styles { readonly 'foo': string; }
                                ^^^^^ #1 Atom(All~Rename)
    declare const styles: Styles;
    styles['foo'];
            ^^^ #2 Verbatim(All~Hover)
    ^^^^^^^^^^^^^^ ignore#0
    styles['foo'];
            ^^^ #3 Verbatim(All~Hover)
    ^^^^^^^^^^^^^^ ignore#1
    export default styles;
    "
  `);
});

test('generates a default export for an empty file', () => {
  expect(run('')).toMatchInlineSnapshot(`
    "=== source ===


    === generated ===
    interface Styles {}
    declare const styles: Styles;
    export default styles;
    "
  `);
});

test('quotes generated specifiers with the original quote character', () => {
  expect(run(`@import "./b.module.css";`)).toMatchInlineSnapshot(`
    "=== source ===
    @import "./b.module.css";
            ^^^^^^^^^^^^^^^^ #0

    === generated ===
    import * as _import_0 from "./b.module.css";
                               ^^^^^^^^^^^^^^^^ #0 Verbatim
    type __BlockErrorType<T> = [0] extends [1 & T] ? {} : T;
    interface Styles {}
    declare const styles: Styles & __BlockErrorType<typeof _import_0.default>;
    export default styles;
    "
  `);
});

test('synthesizes quotes for unquoted url() specifiers and maps them as zero-width spans', () => {
  expect(run(`@import url(./b.module.css);`)).toMatchInlineSnapshot(`
    "=== source ===
    @import url(./b.module.css);
                              ¦ #2
                ¦ #0
                ^^^^^^^^^^^^^^ #1

    === generated ===
    import * as _import_0 from './b.module.css';
                                              ^ #2 Atom(Definition|TypeDefinition|Implementation|References)
                                ^^^^^^^^^^^^^^ #1 Verbatim
                               ^ #0 Atom(Definition|TypeDefinition|Implementation|References)
    type __BlockErrorType<T> = [0] extends [1 & T] ? {} : T;
    interface Styles {}
    declare const styles: Styles & __BlockErrorType<typeof _import_0.default>;
    export default styles;
    "
  `);
});

test('converts parse diagnostics into mapper diagnostics', () => {
  const result = run(dedent`
    .foo { color: red; }
    .bar {
  `);
  expect(result).toMatchInlineSnapshot(`
    "=== source ===
    .foo { color: red; }
     ^^^ #0
     ^^^ #2
    .bar {
     ^^^ #1
     ^^^ #3
    ^ diag#0

    === generated ===
    interface Styles { readonly 'foo': string; }
                                ^^^^^ #0 Atom(All~Rename)
    interface Styles { readonly 'bar': string; }
                                ^^^^^ #1 Atom(All~Rename)
    declare const styles: Styles;
    styles['foo'];
            ^^^ #2 Verbatim(All~Hover)
    ^^^^^^^^^^^^^^ ignore#0
    styles['bar'];
            ^^^ #3 Verbatim(All~Hover)
    ^^^^^^^^^^^^^^ ignore#1
    export default styles;


    === diagnostics ===
    diag#0: Unclosed block"
  `);
});

test('excludes invalid token names and reports diagnostics', () => {
  expect(run('.__proto__ {}')).toMatchInlineSnapshot(`
    "=== source ===
    .__proto__ {}
     ^^^^^^^^^ diag#0

    === generated ===
    interface Styles {}
    declare const styles: Styles;
    export default styles;


    === diagnostics ===
    diag#0: \`__proto__\` is not allowed as names."
  `);
});

test('omits keyframes tokens when animation is false', () => {
  expect(run('@keyframes pulse {}', { ...defaultOptions, animation: false })).toMatchInlineSnapshot(`
    "=== source ===
    @keyframes pulse {}

    === generated ===
    interface Styles {}
    declare const styles: Styles;
    export default styles;
    "
  `);
});

test('generates an empty module for a non-module CSS file', () => {
  expect(transformCSS('/test/global.css', `* { margin: 0; }`, defaultOptions)).toStrictEqual({
    text: 'export {};\n',
    mappings: [],
    diagnostics: [],
  });
});

describe('namedExports', () => {
  test('generates var declarations and export clauses for local tokens', () => {
    const result = run(
      dedent`
        .foo {}
        .foo:hover {}
        .bar {}
      `,
      namedExportsOptions,
    );
    expect(result).toMatchInlineSnapshot(`
      "=== source ===
      .foo {}
       ^^^ #0
       ^^^ #2
       ^^^ #5
      .foo:hover {}
       ^^^ #1
       ^^^ #6
      .bar {}
       ^^^ #3
       ^^^ #4
       ^^^ #7

      === generated ===
      var _token_0: string;
          ^^^^^^^^ #0 Alias(All~Rename)
      var _token_0: string;
          ^^^^^^^^ #1 Alias(All~Rename)
      export { _token_0 as 'foo' };
                           ^^^^^ #2 Atom(All~Rename)
      var _token_1: string;
          ^^^^^^^^ #3 Alias(All~Rename)
      export { _token_1 as 'bar' };
                           ^^^^^ #4 Atom(All~Rename)
      declare const __self: typeof import('./a.module.css');
      __self['foo'];
              ^^^ #5 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#0
      __self['foo'];
              ^^^ #6 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#1
      __self['bar'];
              ^^^ #7 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#2
      declare const styles: {};
      export default styles;
      "
    `);
  });

  test('generates export star for all token importers', () => {
    expect(run(`@import './b.module.css';`, namedExportsOptions)).toMatchInlineSnapshot(`
      "=== source ===
      @import './b.module.css';
              ^^^^^^^^^^^^^^^^ #0

      === generated ===
      export * from './b.module.css';
                    ^^^^^^^^^^^^^^^^ #0 Verbatim
      declare const styles: {};
      export default styles;
      "
    `);
  });

  test('generates export from clauses for named token importer entries', () => {
    expect(run(`@value v1, v2 as v3 from './c.module.css';`, namedExportsOptions)).toMatchInlineSnapshot(`
      "=== source ===
      @value v1, v2 as v3 from './c.module.css';
                               ^^^^^^^^^^^^^^^^ #4
                               ^^^^^^^^^^^^^^^^ #5
                       ^^ #3
                       ^^ #8
                 ^^ #2
                 ^^ #9
             ^^ #0
             ^^ #1
             ^^ #6
             ^^ #7

      === generated ===
      export {
        'v1' as 'v1',
                ^^^^ #1 Atom(All~Rename)
        ^^^^ #0 Atom(All~Rename)
        'v2' as 'v3',
                ^^^^ #3 Atom(All~Rename)
        ^^^^ #2 Atom(All~Rename)
      } from './c.module.css';
             ^^^^^^^^^^^^^^^^ #4 Verbatim
      import * as _import_0 from './c.module.css';
                                 ^^^^^^^^^^^^^^^^ #5 Verbatim
      declare const __self: typeof import('./a.module.css');
      __self['v1'];
              ^^ #6 Verbatim(All~Hover)
      ^^^^^^^^^^^^^ ignore#0
      _import_0['v1'];
                 ^^ #7 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^^^ ignore#1
      __self['v3'];
              ^^ #8 Verbatim(All~Hover)
      ^^^^^^^^^^^^^ ignore#2
      _import_0['v2'];
                 ^^ #9 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^^^ ignore#3
      declare const styles: {};
      export default styles;
      "
    `);
  });

  test('generates self references for local token references', () => {
    const result = run(
      dedent`
        .foo { animation-name: pulse; }
        @keyframes pulse {}
      `,
      namedExportsOptions,
    );
    expect(result).toMatchInlineSnapshot(`
      "=== source ===
      .foo { animation-name: pulse; }
                             ^^^^^ #6
                             ^^^^^ #7
       ^^^ #0
       ^^^ #1
       ^^^ #4
      @keyframes pulse {}
                 ^^^^^ #2
                 ^^^^^ #3
                 ^^^^^ #5

      === generated ===
      var _token_0: string;
          ^^^^^^^^ #0 Alias(All~Rename)
      export { _token_0 as 'foo' };
                           ^^^^^ #1 Atom(All~Rename)
      var _token_1: string;
          ^^^^^^^^ #2 Alias(All~Rename)
      export { _token_1 as 'pulse' };
                           ^^^^^^^ #3 Atom(All~Rename)
      declare const __self: typeof import('./a.module.css');
      __self['foo'];
              ^^^ #4 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#0
      __self['pulse'];
              ^^^^^ #5 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^^^ ignore#1
      __self['pulse'];
             ^^^^^^^ #6 Atom(All~Rename)
      __self['pulse'];
              ^^^^^ #7 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^^^ ignore#2
      declare const styles: {};
      export default styles;
      "
    `);
  });

  test('generates namespace element accesses for external token references', () => {
    expect(run(`.foo { composes: baz from './d.module.css'; }`, namedExportsOptions)).toMatchInlineSnapshot(`
      "=== source ===
      .foo { composes: baz from './d.module.css'; }
                                ^^^^^^^^^^^^^^^^ #2
                       ^^^ #4
                       ^^^ #5
       ^^^ #0
       ^^^ #1
       ^^^ #3

      === generated ===
      var _token_0: string;
          ^^^^^^^^ #0 Alias(All~Rename)
      export { _token_0 as 'foo' };
                           ^^^^^ #1 Atom(All~Rename)
      import * as _import_0 from './d.module.css';
                                 ^^^^^^^^^^^^^^^^ #2 Verbatim
      declare const __self: typeof import('./a.module.css');
      __self['foo'];
              ^^^ #3 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^ ignore#0
      _import_0['baz'];
                ^^^^^ #4 Atom(All~Rename)
      _import_0['baz'];
                 ^^^ #5 Verbatim(All~Hover)
      ^^^^^^^^^^^^^^^^^ ignore#1
      declare const styles: {};
      export default styles;
      "
    `);
  });

  test('generates a dummy default export when prioritizeNamedImports is false', () => {
    expect(run('', namedExportsOptions)).toMatchInlineSnapshot(`
      "=== source ===


      === generated ===
      declare const styles: {};
      export default styles;
      "
    `);
  });

  test('keeps the generated text a module when prioritizeNamedImports is true', () => {
    expect(run('', { ...namedExportsOptions, prioritizeNamedImports: true })).toMatchInlineSnapshot(`
      "=== source ===


      === generated ===
      export {};
      "
    `);
  });
});
