import dedent from 'dedent';
import { expect, test } from 'vite-plus/test';
import type { NormalizedMapperOptions } from './options.js';
import { SpanMapKind } from './protocol.js';
import { checkGeneratedTexts } from './test/ts-program.js';

const defaultOptions: NormalizedMapperOptions = {
  namedExports: false,
  prioritizeNamedImports: false,
  animation: true,
  dashedIdents: false,
  container: false,
};
const namedExportsOptions: NormalizedMapperOptions = { ...defaultOptions, namedExports: true };

const fullFixture = {
  '/a.module.css': dedent`
    @import './b.module.css';
    @value v1, v2 as v3 from './c.module.css';
    .foo { animation-name: pulse; }
    .bar { composes: baz from './d.module.css'; }
    @keyframes pulse {}
  `,
  '/b.module.css': '.b1 { color: red; }',
  '/c.module.css': dedent`
    @value v1: red;
    @value v2: blue;
  `,
  '/d.module.css': '.baz { color: red; }',
};

test('produces no ts diagnostics for generated text under strict compiler options', () => {
  const { diagnostics } = checkGeneratedTexts(fullFixture, defaultOptions);
  expect(diagnostics).toEqual([]);
});

test('produces no ts diagnostics for generated text under strict compiler options in named exports mode', () => {
  const { diagnostics } = checkGeneratedTexts(fullFixture, namedExportsOptions);
  expect(diagnostics).toEqual([]);
});

test('reports a module resolution error on the specifier span for unresolvable specifiers', () => {
  const { outputs, diagnostics } = checkGeneratedTexts(
    { '/a.module.css': `@import './missing.module.css';` },
    defaultOptions,
  );
  const text = outputs['/a.module.css']!.text;
  const specifierStart = text.indexOf(`'./missing.module.css'`);
  expect(diagnostics).toEqual([
    expect.objectContaining({
      code: 2307,
      fileName: '/a.module.css.ts',
      start: specifierStart,
      length: `'./missing.module.css'`.length,
    }),
  ]);
  expect(outputs['/a.module.css']!.mappings).toContainEqual([specifierStart, 22, 8, 22, SpanMapKind.Verbatim]);
});

test('reports a missing token error on the token span for named token importer entries', () => {
  const { outputs, diagnostics } = checkGeneratedTexts(
    {
      '/a.module.css': `@value missing from './b.module.css';`,
      '/b.module.css': '.b1 { color: red; }',
    },
    defaultOptions,
  );
  const text = outputs['/a.module.css']!.text;
  const keyStart = text.indexOf(`default['missing']`) + 'default['.length;
  expect(diagnostics).toEqual([
    expect.objectContaining({
      code: 2339,
      fileName: '/a.module.css.ts',
      start: keyStart,
      length: `'missing'`.length,
    }),
  ]);
  expect(outputs['/a.module.css']!.mappings).toContainEqual([keyStart + 1, 7, 7, 7, SpanMapKind.Verbatim]);
});

test('reports a missing token error on the token span for export from entries in named exports mode', () => {
  const { outputs, diagnostics } = checkGeneratedTexts(
    {
      '/a.module.css': `@value missing from './b.module.css';`,
      '/b.module.css': '.b1 { color: red; }',
    },
    namedExportsOptions,
  );
  const text = outputs['/a.module.css']!.text;
  const nameStart = text.indexOf(`'missing'`);
  // TS2614 (not TS2305) because the generated text of b.module.css also has a default export.
  expect(diagnostics).toEqual([
    expect.objectContaining({
      code: 2614,
      fileName: '/a.module.css.ts',
      start: nameStart,
      length: `'missing'`.length,
    }),
  ]);
});

test('reports an implicit any error for local token references to unknown tokens', () => {
  const { outputs, diagnostics } = checkGeneratedTexts(
    { '/a.module.css': '.foo { animation-name: missing; }' },
    defaultOptions,
  );
  const text = outputs['/a.module.css']!.text;
  const expressionStart = text.indexOf(`styles['missing']`);
  expect(diagnostics).toEqual([
    expect.objectContaining({
      code: 7053,
      fileName: '/a.module.css.ts',
      start: expressionStart,
      length: `styles['missing']`.length,
    }),
  ]);
});
