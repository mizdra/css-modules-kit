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
        ¦ #2
     ¦ #0
     ^^^ #1
    .bar {}
        ¦ #5
     ¦ #3
     ^^^ #4

    === generated ===
    interface Styles { readonly 'foo': string; }
                                    ^ #2 Atom(Definition|TypeDefinition|Implementation|References)
                                 ^^^ #1 Verbatim
                                ^ #0 Atom(Definition|TypeDefinition|Implementation|References)
    interface Styles { readonly 'bar': string; }
                                    ^ #5 Atom(Definition|TypeDefinition|Implementation|References)
                                 ^^^ #4 Verbatim
                                ^ #3 Atom(Definition|TypeDefinition|Implementation|References)
    declare const styles: Styles;
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
                       ¦ #9
                     ¦ #7
                     ^^ #8
                 ¦ #12
               ¦ #10
               ^^ #11
             ¦ #3
             ¦ #6
           ¦ #1
           ^^ #2
           ¦ #4
           ^^ #5

    === generated ===
    import * as _import_0 from './c.module.css';
                               ^^^^^^^^^^^^^^^^ #0 Verbatim
    interface Styles { readonly 'v1': typeof _import_0.default['v1']; }
                                                                  ^ #6 Atom(Definition|TypeDefinition|Implementation|References)
                                                                ^^ #5 Verbatim
                                                               ^ #4 Atom(Definition|TypeDefinition|Implementation|References)
                                   ^ #3 Atom(Definition|TypeDefinition|Implementation|References)
                                 ^^ #2 Verbatim
                                ^ #1 Atom(Definition|TypeDefinition|Implementation|References)
    interface Styles { readonly 'v3': typeof _import_0.default['v2']; }
                                                                  ^ #12 Atom(Definition|TypeDefinition|Implementation|References)
                                                                ^^ #11 Verbatim
                                                               ^ #10 Atom(Definition|TypeDefinition|Implementation|References)
                                   ^ #9 Atom(Definition|TypeDefinition|Implementation|References)
                                 ^^ #8 Verbatim
                                ^ #7 Atom(Definition|TypeDefinition|Implementation|References)
    declare const styles: Styles;
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
                                ¦ #8
                           ¦ #6
                           ^^^^^ #7
        ¦ #2
     ¦ #0
     ^^^ #1
    @keyframes pulse {}
                    ¦ #5
               ¦ #3
               ^^^^^ #4

    === generated ===
    interface Styles { readonly 'foo': string; }
                                    ^ #2 Atom(Definition|TypeDefinition|Implementation|References)
                                 ^^^ #1 Verbatim
                                ^ #0 Atom(Definition|TypeDefinition|Implementation|References)
    interface Styles { readonly 'pulse': string; }
                                      ^ #5 Atom(Definition|TypeDefinition|Implementation|References)
                                 ^^^^^ #4 Verbatim
                                ^ #3 Atom(Definition|TypeDefinition|Implementation|References)
    declare const styles: Styles;
    styles['pulse'];
                 ^ #8 Atom(Definition|TypeDefinition|Implementation|References)
            ^^^^^ #7 Verbatim
           ^ #6 Atom(Definition|TypeDefinition|Implementation|References)
    export default styles;
    "
  `);
});

test('generates imports and expression statements for external token references', () => {
  expect(run(`.foo { composes: baz from './d.module.css'; }`)).toMatchInlineSnapshot(`
    "=== source ===
    .foo { composes: baz from './d.module.css'; }
                              ^^^^^^^^^^^^^^^^ #0
                        ¦ #6
                     ¦ #4
                     ^^^ #5
        ¦ #3
     ¦ #1
     ^^^ #2

    === generated ===
    import * as _import_0 from './d.module.css';
                               ^^^^^^^^^^^^^^^^ #0 Verbatim
    interface Styles { readonly 'foo': string; }
                                    ^ #3 Atom(Definition|TypeDefinition|Implementation|References)
                                 ^^^ #2 Verbatim
                                ^ #1 Atom(Definition|TypeDefinition|Implementation|References)
    declare const styles: Styles;
    _import_0.default['baz'];
                          ^ #6 Atom(Definition|TypeDefinition|Implementation|References)
                       ^^^ #5 Verbatim
                      ^ #4 Atom(Definition|TypeDefinition|Implementation|References)
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
        ¦ #2
     ¦ #0
     ^^^ #1
    .foo:hover {}
        ¦ #5
     ¦ #3
     ^^^ #4

    === generated ===
    interface Styles { readonly 'foo': string; }
                                    ^ #2 Atom(Definition|TypeDefinition|Implementation|References)
                                 ^^^ #1 Verbatim
                                ^ #0 Atom(Definition|TypeDefinition|Implementation|References)
    interface Styles { readonly 'foo': string; }
                                    ^ #5 Atom(Definition|TypeDefinition|Implementation|References)
                                 ^^^ #4 Verbatim
                                ^ #3 Atom(Definition|TypeDefinition|Implementation|References)
    declare const styles: Styles;
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
        ¦ #2
     ¦ #0
     ^^^ #1
    .bar {
        ¦ #5
     ¦ #3
     ^^^ #4
    ^ diag#0

    === generated ===
    interface Styles { readonly 'foo': string; }
                                    ^ #2 Atom(Definition|TypeDefinition|Implementation|References)
                                 ^^^ #1 Verbatim
                                ^ #0 Atom(Definition|TypeDefinition|Implementation|References)
    interface Styles { readonly 'bar': string; }
                                    ^ #5 Atom(Definition|TypeDefinition|Implementation|References)
                                 ^^^ #4 Verbatim
                                ^ #3 Atom(Definition|TypeDefinition|Implementation|References)
    declare const styles: Styles;
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
          ¦ #4
       ^^^ #0
       ¦ #2
       ^^^ #3
      .foo:hover {}
       ^^^ #1
      .bar {}
          ¦ #8
       ^^^ #5
       ¦ #6
       ^^^ #7

      === generated ===
      var _token_0: string;
          ^^^^^^^^ #0 Alias(All~Rename)
      var _token_0: string;
          ^^^^^^^^ #1 Alias(All~Rename)
      export { _token_0 as 'foo' };
                               ^ #4 Atom(Definition|TypeDefinition|Implementation|References)
                            ^^^ #3 Verbatim
                           ^ #2 Atom(Definition|TypeDefinition|Implementation|References)
      var _token_1: string;
          ^^^^^^^^ #5 Alias(All~Rename)
      export { _token_1 as 'bar' };
                               ^ #8 Atom(Definition|TypeDefinition|Implementation|References)
                            ^^^ #7 Verbatim
                           ^ #6 Atom(Definition|TypeDefinition|Implementation|References)
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
                               ^^^^^^^^^^^^^^^^ #12
                         ¦ #11
                       ¦ #9
                       ^^ #10
                   ¦ #8
                 ¦ #6
                 ^^ #7
               ¦ #2
               ¦ #5
             ¦ #0
             ^^ #1
             ¦ #3
             ^^ #4

      === generated ===
      export {
        'v1' as 'v1',
                   ^ #5 Atom(Definition|TypeDefinition|Implementation|References)
                 ^^ #4 Verbatim
                ^ #3 Atom(Definition|TypeDefinition|Implementation|References)
           ^ #2 Atom(Definition|TypeDefinition|Implementation|References)
         ^^ #1 Verbatim
        ^ #0 Atom(Definition|TypeDefinition|Implementation|References)
        'v2' as 'v3',
                   ^ #11 Atom(Definition|TypeDefinition|Implementation|References)
                 ^^ #10 Verbatim
                ^ #9 Atom(Definition|TypeDefinition|Implementation|References)
           ^ #8 Atom(Definition|TypeDefinition|Implementation|References)
         ^^ #7 Verbatim
        ^ #6 Atom(Definition|TypeDefinition|Implementation|References)
      } from './c.module.css';
             ^^^^^^^^^^^^^^^^ #12 Verbatim
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
                                  ¦ #10
                             ¦ #8
                             ^^^^^ #9
          ¦ #3
       ^^^ #0
       ¦ #1
       ^^^ #2
      @keyframes pulse {}
                      ¦ #7
                 ^^^^^ #4
                 ¦ #5
                 ^^^^^ #6

      === generated ===
      var _token_0: string;
          ^^^^^^^^ #0 Alias(All~Rename)
      export { _token_0 as 'foo' };
                               ^ #3 Atom(Definition|TypeDefinition|Implementation|References)
                            ^^^ #2 Verbatim
                           ^ #1 Atom(Definition|TypeDefinition|Implementation|References)
      var _token_1: string;
          ^^^^^^^^ #4 Alias(All~Rename)
      export { _token_1 as 'pulse' };
                                 ^ #7 Atom(Definition|TypeDefinition|Implementation|References)
                            ^^^^^ #6 Verbatim
                           ^ #5 Atom(Definition|TypeDefinition|Implementation|References)
      declare const __self: typeof import('./a.module.css');
      __self['pulse'];
                   ^ #10 Atom(Definition|TypeDefinition|Implementation|References)
              ^^^^^ #9 Verbatim
             ^ #8 Atom(Definition|TypeDefinition|Implementation|References)
      declare const styles: {};
      export default styles;
      "
    `);
  });

  test('generates namespace element accesses for external token references', () => {
    expect(run(`.foo { composes: baz from './d.module.css'; }`, namedExportsOptions)).toMatchInlineSnapshot(`
      "=== source ===
      .foo { composes: baz from './d.module.css'; }
                                ^^^^^^^^^^^^^^^^ #4
                          ¦ #7
                       ¦ #5
                       ^^^ #6
          ¦ #3
       ^^^ #0
       ¦ #1
       ^^^ #2

      === generated ===
      var _token_0: string;
          ^^^^^^^^ #0 Alias(All~Rename)
      export { _token_0 as 'foo' };
                               ^ #3 Atom(Definition|TypeDefinition|Implementation|References)
                            ^^^ #2 Verbatim
                           ^ #1 Atom(Definition|TypeDefinition|Implementation|References)
      import * as _import_0 from './d.module.css';
                                 ^^^^^^^^^^^^^^^^ #4 Verbatim
      _import_0['baz'];
                    ^ #7 Atom(Definition|TypeDefinition|Implementation|References)
                 ^^^ #6 Verbatim
                ^ #5 Atom(Definition|TypeDefinition|Implementation|References)
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
