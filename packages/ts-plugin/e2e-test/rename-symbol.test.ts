import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../src/test/builder.js';
import { setupFixture } from './test-util/fixture.js';
import { launchTsserver } from './test-util/tsserver.js';

const tsserver = launchTsserver();

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
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

      const { locs } = await tsserver.sendRename(getFileLocation('index.ts', 'a_1'));

      expect(locs).toStrictEqual([getFileSpan('a.module.css', 'a_1'), getFileSpan('index.ts', 'a_1')]);
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

      const { locs } = await tsserver.sendRename(getFileLocation('index.ts', 'a-1'));

      expect(locs).toStrictEqual([getFileSpan('a.module.css', 'a-1'), getFileSpan('index.ts', 'a-1')]);
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

      const { locs } = await tsserver.sendRename(getFileLocation('index.ts', 'a_1'));

      expect(locs).toStrictEqual([
        getFileSpan('a.module.css', 'a_1', { index: 0 }),
        getFileSpan('a.module.css', 'a_1', { index: 1 }),
        getFileSpan('index.ts', 'a_1'),
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

      const { locs } = await tsserver.sendRename(getFileLocation('a.module.css', 'a_1'));

      expect(locs).toStrictEqual([getFileSpan('a.module.css', 'a_1'), getFileSpan('index.ts', 'a_1')]);
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

      const { locs } = await tsserver.sendRename(getFileLocation('index.ts', 'b_1'));

      expect(locs).toStrictEqual([getFileSpan('b.module.css', 'b_1'), getFileSpan('index.ts', 'b_1')]);
    });
  });

  describe('for a named token importer', () => {
    // NOTE: For simplicity of implementation, this is not the ideal behavior.
    // The ideal behavior would attach `prefixText: 'b_1 as '` to the binding loc in `a.module.css`
    // so that renaming changes only the alias side. Currently the binding loc is rewritten directly.
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

      const { locs } = await tsserver.sendRename(getFileLocation('index.ts', 'b_1'));

      expect(locs).toStrictEqual([
        getFileSpan('a.module.css', 'b_1'),
        getFileSpan('b.module.css', 'b_1'),
        getFileSpan('index.ts', 'b_1'),
      ]);
    });

    // NOTE: Ideally only `b_alias` should be returned, but `b_1` is also returned for implementation simplicity.
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

      const { locs } = await tsserver.sendRename(getFileLocation('index.ts', 'b_alias'));

      expect(locs).toStrictEqual([
        getFileSpan('a.module.css', 'b_1'),
        getFileSpan('a.module.css', 'b_alias'),
        getFileSpan('b.module.css', 'b_1'),
        getFileSpan('index.ts', 'b_alias'),
      ]);
    });

    test('from a CSS-side <name>', async () => {
      const { iff, getFileLocation, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `@value b_1 from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const { locs } = await tsserver.sendRename(getFileLocation('a.module.css', 'b_1'));

      expect(locs).toStrictEqual([getFileSpan('a.module.css', 'b_1'), getFileSpan('b.module.css', 'b_1')]);
    });

    // NOTE: Ideally only `b_1` should be returned, but `b_alias` is also returned for implementation simplicity.
    test('from a CSS-side <name> with alias', async () => {
      const { iff, getFileLocation, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `@value b_1 as b_alias from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const { locs } = await tsserver.sendRename(getFileLocation('a.module.css', 'b_1'));

      expect(locs).toStrictEqual([
        getFileSpan('a.module.css', 'b_1'),
        getFileSpan('a.module.css', 'b_alias'),
        getFileSpan('b.module.css', 'b_1'),
      ]);
    });

    // NOTE: Ideally only `b_alias` should be returned, but `b_1` is also returned for implementation simplicity.
    test('from a CSS-side <alias>', async () => {
      const { iff, getFileLocation, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `@value b_1 as b_alias from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const { locs } = await tsserver.sendRename(getFileLocation('a.module.css', 'b_alias'));

      expect(locs).toStrictEqual([
        getFileSpan('a.module.css', 'b_1'),
        getFileSpan('a.module.css', 'b_alias'),
        getFileSpan('b.module.css', 'b_1'),
      ]);
    });
  });

  describe('for a local token reference', () => {
    test('from a token definition', async () => {
      const { iff, getFileLocation, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': dedent`
          @keyframes a_1 { from {} to {} }
          .a_2 { animation-name: a_1; }
          .a_3 { animation-name: a_1; }
        `,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const { locs } = await tsserver.sendRename(getFileLocation('a.module.css', 'a_1', 0));

      expect(locs).toStrictEqual([
        getFileSpan('a.module.css', 'a_1', { index: 0 }),
        getFileSpan('a.module.css', 'a_1', { index: 1 }),
        getFileSpan('a.module.css', 'a_1', { index: 2 }),
      ]);
    });

    test('from a local token reference', async () => {
      const { iff, getFileLocation, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': dedent`
          @keyframes a_1 { from {} to {} }
          .a_2 { animation-name: a_1; }
          .a_3 { animation-name: a_1; }
        `,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const { locs } = await tsserver.sendRename(getFileLocation('a.module.css', 'a_1', 1));

      expect(locs).toStrictEqual([
        getFileSpan('a.module.css', 'a_1', { index: 0 }),
        getFileSpan('a.module.css', 'a_1', { index: 1 }),
        getFileSpan('a.module.css', 'a_1', { index: 2 }),
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

      const { locs } = await tsserver.sendRename(getFileLocation('a.module.css', 'b_1'));

      expect(locs).toStrictEqual([getFileSpan('a.module.css', 'b_1'), getFileSpan('b.module.css', 'b_1')]);
    });
  });
});
