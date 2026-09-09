import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../src/test/builder.js';
import { setupFixture } from './test-util/fixture.js';
import { formatPath, launchTsserver } from './test-util/tsserver.js';

const tsserver = launchTsserver();

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  describe('for a TS-side import statement', () => {
    test('from the styles binding', async () => {
      const { iff, getFileLocation } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': buildStylesImport('./a.module.css', { namedExports }),
        'a.module.css': '',
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('index.ts', 'styles'));

      expect(definitions).toStrictEqual([
        {
          file: formatPath(iff.paths['a.module.css']),
          start: { line: 1, offset: 1 },
          end: { line: 1, offset: 1 },
        },
      ]);
    });

    test('from the import specifier', async () => {
      const { iff, getFileLocation } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': buildStylesImport('./a.module.css', { namedExports }),
        'a.module.css': '',
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('index.ts', "'./a.module.css'"));

      expect(definitions).toStrictEqual([
        {
          file: formatPath(iff.paths['a.module.css']),
          start: { line: 1, offset: 1 },
          end: { line: 1, offset: 1 },
        },
      ]);
    });
  });

  describe('for a token definition', () => {
    test('from a TS-side styles.<token>', async () => {
      const { iff, getFileLocation, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_1;
        `,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('index.ts', 'a_1'));

      expect(definitions).toStrictEqual([getFileSpan('a.module.css', 'a_1', { context: '.a_1 { color: red; }' })]);
    });

    test('from a TS-side styles[<kebab-case token>]', async () => {
      const { iff, getFileLocation, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles['a-1'];
        `,
        'a.module.css': `.a-1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('index.ts', 'a-1'));

      expect(definitions).toStrictEqual([getFileSpan('a.module.css', 'a-1', { context: '.a-1 { color: red; }' })]);
    });

    test('when the token is declared multiple times', async () => {
      const { iff, getFileLocation, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_1;
        `,
        'a.module.css': dedent`
          .a_1 { color: red; }
          .a_1 { color: red; }
        `,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('index.ts', 'a_1'));

      expect(definitions).toStrictEqual([
        getFileSpan('a.module.css', 'a_1', { index: 0, context: '.a_1 { color: red; }' }),
        getFileSpan('a.module.css', 'a_1', { index: 1, context: '.a_1 { color: red; }' }),
      ]);
    });

    test('from a CSS-side token definition', async () => {
      const { iff, getFileLocation, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_1;
        `,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('a.module.css', 'a_1'));

      expect(definitions).toStrictEqual([getFileSpan('a.module.css', 'a_1', { context: '.a_1 { color: red; }' })]);
    });
  });

  describe('for an all token importer', () => {
    test('from a TS-side styles.<token>', async () => {
      const { iff, getFileLocation, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.b_1;
        `,
        'a.module.css': `@import './b.module.css';`,
        'b.module.css': `.b_1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('index.ts', 'b_1'));

      expect(definitions).toStrictEqual([getFileSpan('b.module.css', 'b_1', { context: '.b_1 { color: red; }' })]);
    });

    test('from a CSS-side specifier', async () => {
      const { iff, getFileLocation } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': buildStylesImport('./a.module.css', { namedExports }),
        'a.module.css': `@import './b.module.css';`,
        'b.module.css': '',
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const definitions = await tsserver.sendDefinitionAndBoundSpan(
        getFileLocation('a.module.css', "'./b.module.css'"),
      );

      expect(definitions).toStrictEqual([
        {
          file: formatPath(iff.paths['b.module.css']),
          start: { line: 1, offset: 1 },
          end: { line: 1, offset: 1 },
        },
      ]);
    });

    // NOTE: It is strange that `(` has a definition, but we allow it to keep the implementation simple.
    test('from inside a CSS-side url() specifier', async () => {
      const { iff, getFileLocation } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': buildStylesImport('./a.module.css', { namedExports }),
        'a.module.css': `@import url(./b.module.css);`,
        'b.module.css': '',
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const definitions = await tsserver.sendDefinitionAndBoundSpan(
        getFileLocation('a.module.css', '(./b.module.css)'),
      );

      expect(definitions).toStrictEqual([
        {
          file: formatPath(iff.paths['b.module.css']),
          start: { line: 1, offset: 1 },
          end: { line: 1, offset: 1 },
        },
      ]);
    });
  });

  describe('for a named token importer', () => {
    test('from a TS-side styles.<name>', async () => {
      const { iff, getFileLocation, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.b_1;
        `,
        'a.module.css': `@value b_1 from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('index.ts', 'b_1'));

      expect(definitions).toStrictEqual([getFileSpan('b.module.css', 'b_1', { context: '@value b_1: red' })]);
    });

    test('from a TS-side styles.<alias>', async () => {
      const { iff, getFileLocation, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.b_alias;
        `,
        'a.module.css': `@value b_1 as b_alias from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('index.ts', 'b_alias'));

      expect(definitions).toStrictEqual([getFileSpan('b.module.css', 'b_1', { context: '@value b_1: red' })]);
    });

    test('from a CSS-side specifier', async () => {
      const { iff, getFileLocation } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': buildStylesImport('./a.module.css', { namedExports }),
        'a.module.css': `@value b_1 from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const definitions = await tsserver.sendDefinitionAndBoundSpan(
        getFileLocation('a.module.css', "'./b.module.css'"),
      );

      expect(definitions).toStrictEqual([
        {
          file: formatPath(iff.paths['b.module.css']),
          start: { line: 1, offset: 1 },
          end: { line: 1, offset: 1 },
        },
      ]);
    });

    test('from a CSS-side <name>', async () => {
      const { iff, getFileLocation, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `@value b_1 from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('a.module.css', 'b_1'));

      expect(definitions).toStrictEqual([getFileSpan('b.module.css', 'b_1', { context: '@value b_1: red' })]);
    });

    test('from a CSS-side <name> with alias', async () => {
      const { iff, getFileLocation, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `@value b_1 as b_alias from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('a.module.css', 'b_1'));

      expect(definitions).toStrictEqual([getFileSpan('b.module.css', 'b_1', { context: '@value b_1: red' })]);
    });

    test('from a CSS-side <alias>', async () => {
      const { iff, getFileLocation, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `@value b_1 as b_alias from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('a.module.css', 'b_alias'));

      expect(definitions).toStrictEqual([getFileSpan('b.module.css', 'b_1', { context: '@value b_1: red' })]);
    });
  });

  describe('for a local token reference', () => {
    test('from a local token reference', async () => {
      const { iff, getFileLocation, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': dedent`
          @keyframes a_1 { from {} to {} }
          .a_2 { animation-name: a_1; }
        `,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('a.module.css', 'a_1', 1));

      expect(definitions).toStrictEqual([
        getFileSpan('a.module.css', 'a_1', { index: 0, context: '@keyframes a_1 { from {} to {} }' }),
      ]);
    });

    test('from each <name> in a multi-value local token reference', async () => {
      const { iff, getFileLocation, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': dedent`
          @keyframes a_1 { from {} to {} }
          @keyframes a_2 { from {} to {} }
          .a_3 { animation-name: a_1, a_2; }
        `,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const a1Definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('a.module.css', 'a_1', 1));
      expect(a1Definitions).toStrictEqual([
        getFileSpan('a.module.css', 'a_1', { index: 0, context: '@keyframes a_1 { from {} to {} }' }),
      ]);

      const a2Definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('a.module.css', 'a_2', 1));
      expect(a2Definitions).toStrictEqual([
        getFileSpan('a.module.css', 'a_2', { index: 0, context: '@keyframes a_2 { from {} to {} }' }),
      ]);
    });

    test('from a kebab-case local token reference', async () => {
      const { iff, getFileLocation, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': dedent`
          @keyframes a-1 { from {} to {} }
          .a_2 { animation-name: a-1; }
        `,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('a.module.css', 'a-1', 1));

      expect(definitions).toStrictEqual([
        getFileSpan('a.module.css', 'a-1', { index: 0, context: '@keyframes a-1 { from {} to {} }' }),
      ]);
    });

    test('from a local token reference whose target is imported', async () => {
      const { iff, getFileLocation, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': dedent`
          @import './b.module.css';
          .a_1 { animation-name: b_1; }
        `,
        'b.module.css': `@keyframes b_1 { from {} to {} }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('a.module.css', 'b_1'));

      expect(definitions).toStrictEqual([
        getFileSpan('b.module.css', 'b_1', { context: '@keyframes b_1 { from {} to {} }' }),
      ]);
    });
  });

  describe('for an external token reference', () => {
    test('from an external token reference', async () => {
      const { iff, getFileLocation, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `.a_1 { composes: b_1 from './b.module.css'; }`,
        'b.module.css': `.b_1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('a.module.css', 'b_1'));

      expect(definitions).toStrictEqual([getFileSpan('b.module.css', 'b_1', { context: '.b_1 { color: red; }' })]);
    });
  });
});
