import dedent from 'dedent';
import { SpanMapFeature, SpanMapKind } from 'typescript/ast';
import { expect, test } from 'vite-plus/test';
import type { TransformOutput } from '../transformer.js';
import { renderTransformOutput } from './render.js';

test('renders the mappings and the diagnostics as markers under the source and the generated text', () => {
  const source = dedent`
    .a_1 {}
    .a_2 {
  `;
  const text = dedent`
    interface Styles { readonly 'a_1': string }
    interface Styles { readonly 'a_2': string }
    declare const styles: Styles;
  `;
  const output: TransformOutput = {
    text,
    mappings: [
      [text.indexOf("'a_1'"), 5, source.indexOf('a_1'), 3, SpanMapKind.Atom],
      [
        text.indexOf("'a_2'"),
        5,
        source.indexOf('a_2'),
        3,
        SpanMapKind.Atom,
        SpanMapFeature.Definition | SpanMapFeature.References,
      ],
      [text.indexOf('styles'), 6, 0, 0, SpanMapKind.Atom, SpanMapFeature.Definition],
    ],
    diagnostics: [{ messageText: 'Unclosed block', start: source.indexOf('.a_2'), length: 1, code: 0 }],
  };
  expect(renderTransformOutput(source, output)).toMatchInlineSnapshot(`
    "=== source ===
    .a_1 {}
     ^^^ #0
    ¦ #2
    .a_2 {
     ^^^ #1
    ^ diag#0

    === generated ===
    interface Styles { readonly 'a_1': string }
                                ^^^^^ #0 Atom
    interface Styles { readonly 'a_2': string }
                                ^^^^^ #1 Atom(Definition|References)
    declare const styles: Styles;
                  ^^^^^^ #2 Atom(Definition)

    === diagnostics ===
    diag#0: Unclosed block"
  `);
});

test('renders the features as the ones excluded from All when most features are included', () => {
  const source = '.a_1 {}';
  const text = "interface Styles { readonly 'a_1': string }";
  const output: TransformOutput = {
    text,
    mappings: [
      [
        text.indexOf("'a_1'"),
        5,
        source.indexOf('a_1'),
        3,
        SpanMapKind.Atom,
        SpanMapFeature.All & ~SpanMapFeature.Rename & ~SpanMapFeature.Hover,
      ],
    ],
    diagnostics: [],
  };
  expect(renderTransformOutput(source, output)).toMatchInlineSnapshot(`
    "=== source ===
    .a_1 {}
     ^^^ #0

    === generated ===
    interface Styles { readonly 'a_1': string }
                                ^^^^^ #0 Atom(All&~Hover&~Rename)"
  `);
});
