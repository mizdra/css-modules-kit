import dedent from 'dedent';
import { expect, test } from 'vite-plus/test';
import { renderTransformOutput } from './test/render.js';
import { transformCSS } from './transformer.js';

function run(source: string): string {
  return renderTransformOutput(source, transformCSS('/test/a.module.css', source));
}

test('generates an empty styles object when the CSS module has no tokens', () => {
  expect(run('')).toMatchInlineSnapshot(`
    "=== source ===

    ¦ #0

    === generated ===
    declare const styles: {};
                  ^^^^^^ #0 Atom(Definition)
    export default styles;
    "
  `);
});

test('generates a declaration for each occurrence of a local token', () => {
  const source = dedent`
    .a_1 { color: red; }
    .a_2 { color: red; }
    .a_2 { color: red; }
  `;
  expect(run(source)).toMatchInlineSnapshot(`
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
    interface Styles { readonly 'a_1': string }
                                ^^^^^ #0 Atom(All&~Rename)
    interface Styles { readonly 'a_2': string }
                                ^^^^^ #1 Atom(All&~Rename)
    interface Styles { readonly 'a_2': string }
                                ^^^^^ #2 Atom(All&~Rename)
    declare const styles: Styles;
                  ^^^^^^ #3 Atom(Definition)
    styles['a_1'];
            ^^^ #4 Verbatim(Rename)
    styles['a_2'];
            ^^^ #5 Verbatim(Rename)
    styles['a_2'];
            ^^^ #6 Verbatim(Rename)
    export default styles;
    "
  `);
});

test('omits token importers and token references', () => {
  const source = dedent`
    @import './b.module.css';
    @value b_1 from './b.module.css';
    .a_1 {
      composes: a_2;
      composes: b_2 from './b.module.css';
    }
  `;
  expect(run(source)).toMatchInlineSnapshot(`
    "=== source ===
    @import './b.module.css';
    ¦ #1
    @value b_1 from './b.module.css';
    .a_1 {
     ^^^ #0
     ^^^ #2
      composes: a_2;
      composes: b_2 from './b.module.css';
    }

    === generated ===
    interface Styles { readonly 'a_1': string }
                                ^^^^^ #0 Atom(All&~Rename)
    declare const styles: Styles;
                  ^^^^^^ #1 Atom(Definition)
    styles['a_1'];
            ^^^ #2 Verbatim(Rename)
    export default styles;
    "
  `);
});

test('omits tokens whose name fails validateTokenName', () => {
  expect(run(`.__proto__ { color: red; }`)).toMatchInlineSnapshot(`
    "=== source ===
    .__proto__ { color: red; }
     ^^^^^^^^^ diag#0
    ¦ #0

    === generated ===
    declare const styles: {};
                  ^^^^^^ #0 Atom(Definition)
    export default styles;


    === diagnostics ===
    diag#0: \`__proto__\` is not allowed as names."
  `);
});

test('converts parse diagnostics into mapper diagnostics', () => {
  const source = dedent`
    .a_1 { color: red; }
    .a_2 {
  `;
  expect(run(source)).toMatchInlineSnapshot(`
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
    interface Styles { readonly 'a_1': string }
                                ^^^^^ #0 Atom(All&~Rename)
    interface Styles { readonly 'a_2': string }
                                ^^^^^ #1 Atom(All&~Rename)
    declare const styles: Styles;
                  ^^^^^^ #2 Atom(Definition)
    styles['a_1'];
            ^^^ #3 Verbatim(Rename)
    styles['a_2'];
            ^^^ #4 Verbatim(Rename)
    export default styles;


    === diagnostics ===
    diag#0: Unclosed block"
  `);
});

test('generates an empty module for a non-module CSS file', () => {
  expect(transformCSS('/test/global.css', `* { margin: 0; }`)).toStrictEqual({
    text: 'export {};\n',
    mappings: [],
    diagnostics: [],
  });
});
