import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../src/test/builder.js';
import { setupFixture } from './test-util/fixture.js';
import { formatPath, launchTsserver, normalizeRefItems } from './test-util/tsserver.js';

const tsserver = launchTsserver();

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  describe('for a TS-side import statement', () => {
    test('from the styles binding', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_1;
          styles.a_2;
        `,
        'a.module.css': dedent`
          .a_1 { color: red; }
          .a_2 { color: red; }
        `,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const res = await tsserver.sendReferences({
        file: iff.paths['index.ts'],
        ...getLoc('index.ts', 'styles', 0),
      });

      expect(normalizeRefItems(res.body?.refs ?? [])).toStrictEqual(
        normalizeRefItems([
          { file: formatPath(iff.paths['index.ts']), ...getRange('index.ts', 'styles', 0) },
          { file: formatPath(iff.paths['index.ts']), ...getRange('index.ts', 'styles', 1) },
          { file: formatPath(iff.paths['index.ts']), ...getRange('index.ts', 'styles', 2) },
        ]),
      );
    });
  });

  describe('for a token definition', () => {
    test('from a TS-side styles.<token>', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_1;
        `,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const res = await tsserver.sendReferences({
        file: iff.paths['index.ts'],
        ...getLoc('index.ts', 'a_1'),
      });

      expect(normalizeRefItems(res.body?.refs ?? [])).toStrictEqual(
        normalizeRefItems([
          { file: formatPath(iff.paths['index.ts']), ...getRange('index.ts', 'a_1') },
          { file: formatPath(iff.paths['a.module.css']), ...getRange('a.module.css', 'a_1') },
        ]),
      );
    });

    test('from a TS-side styles[<kebab-case token>]', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles['a-1'];
        `,
        'a.module.css': `.a-1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const res = await tsserver.sendReferences({
        file: iff.paths['index.ts'],
        ...getLoc('index.ts', 'a-1'),
      });

      expect(normalizeRefItems(res.body?.refs ?? [])).toStrictEqual(
        normalizeRefItems([
          { file: formatPath(iff.paths['index.ts']), ...getRange('index.ts', 'a-1') },
          { file: formatPath(iff.paths['a.module.css']), ...getRange('a.module.css', 'a-1') },
        ]),
      );
    });

    test('when the token is declared multiple times', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
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

      const res = await tsserver.sendReferences({
        file: iff.paths['index.ts'],
        ...getLoc('index.ts', 'a_1'),
      });

      expect(normalizeRefItems(res.body?.refs ?? [])).toStrictEqual(
        normalizeRefItems([
          { file: formatPath(iff.paths['index.ts']), ...getRange('index.ts', 'a_1') },
          { file: formatPath(iff.paths['a.module.css']), ...getRange('a.module.css', 'a_1', 0) },
          { file: formatPath(iff.paths['a.module.css']), ...getRange('a.module.css', 'a_1', 1) },
        ]),
      );
    });

    test('from a CSS-side token definition', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_1;
        `,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const res = await tsserver.sendReferences({
        file: iff.paths['a.module.css'],
        ...getLoc('a.module.css', 'a_1'),
      });

      expect(normalizeRefItems(res.body?.refs ?? [])).toStrictEqual(
        normalizeRefItems([
          { file: formatPath(iff.paths['index.ts']), ...getRange('index.ts', 'a_1') },
          { file: formatPath(iff.paths['a.module.css']), ...getRange('a.module.css', 'a_1') },
        ]),
      );
    });
  });

  describe('for an all token importer', () => {
    test('from a TS-side styles.<token>', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.b_1;
        `,
        'a.module.css': `@import './b.module.css';`,
        'b.module.css': `.b_1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const res = await tsserver.sendReferences({
        file: iff.paths['index.ts'],
        ...getLoc('index.ts', 'b_1'),
      });

      expect(normalizeRefItems(res.body?.refs ?? [])).toStrictEqual(
        normalizeRefItems([
          { file: formatPath(iff.paths['index.ts']), ...getRange('index.ts', 'b_1') },
          { file: formatPath(iff.paths['b.module.css']), ...getRange('b.module.css', 'b_1') },
        ]),
      );
    });
  });

  describe('for a named token importer', () => {
    test('from a TS-side styles.<name>', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.b_1;
        `,
        'a.module.css': `@value b_1 from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const res = await tsserver.sendReferences({
        file: iff.paths['index.ts'],
        ...getLoc('index.ts', 'b_1'),
      });

      expect(normalizeRefItems(res.body?.refs ?? [])).toStrictEqual(
        normalizeRefItems([
          { file: formatPath(iff.paths['index.ts']), ...getRange('index.ts', 'b_1') },
          { file: formatPath(iff.paths['a.module.css']), ...getRange('a.module.css', 'b_1') },
          { file: formatPath(iff.paths['b.module.css']), ...getRange('b.module.css', 'b_1') },
        ]),
      );
    });

    // NOTE: Ideally only `b_alias` should be returned, but `b_1` is also returned for implementation simplicity.
    test('from a TS-side styles.<alias>', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.b_alias;
        `,
        'a.module.css': `@value b_1 as b_alias from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const res = await tsserver.sendReferences({
        file: iff.paths['index.ts'],
        ...getLoc('index.ts', 'b_alias'),
      });

      expect(normalizeRefItems(res.body?.refs ?? [])).toStrictEqual(
        normalizeRefItems([
          { file: formatPath(iff.paths['index.ts']), ...getRange('index.ts', 'b_alias') },
          { file: formatPath(iff.paths['a.module.css']), ...getRange('a.module.css', 'b_1') },
          { file: formatPath(iff.paths['a.module.css']), ...getRange('a.module.css', 'b_alias') },
          { file: formatPath(iff.paths['b.module.css']), ...getRange('b.module.css', 'b_1') },
        ]),
      );
    });

    test('from a CSS-side <name>', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `@value b_1 from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const res = await tsserver.sendReferences({
        file: iff.paths['a.module.css'],
        ...getLoc('a.module.css', 'b_1'),
      });

      expect(normalizeRefItems(res.body?.refs ?? [])).toStrictEqual(
        normalizeRefItems([
          { file: formatPath(iff.paths['a.module.css']), ...getRange('a.module.css', 'b_1') },
          { file: formatPath(iff.paths['b.module.css']), ...getRange('b.module.css', 'b_1') },
        ]),
      );
    });

    // NOTE: Ideally only `b_1` should be returned, but `b_alias` is also returned for implementation simplicity.
    test('from a CSS-side <name> with alias', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `@value b_1 as b_alias from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const res = await tsserver.sendReferences({
        file: iff.paths['a.module.css'],
        ...getLoc('a.module.css', 'b_1'),
      });

      expect(normalizeRefItems(res.body?.refs ?? [])).toStrictEqual(
        normalizeRefItems([
          { file: formatPath(iff.paths['a.module.css']), ...getRange('a.module.css', 'b_1') },
          { file: formatPath(iff.paths['a.module.css']), ...getRange('a.module.css', 'b_alias') },
          { file: formatPath(iff.paths['b.module.css']), ...getRange('b.module.css', 'b_1') },
        ]),
      );
    });

    // NOTE: Ideally only `b_alias` should be returned, but `b_1` is also returned for implementation simplicity.
    test('from a CSS-side <alias>', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `@value b_1 as b_alias from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const res = await tsserver.sendReferences({
        file: iff.paths['a.module.css'],
        ...getLoc('a.module.css', 'b_alias'),
      });

      expect(normalizeRefItems(res.body?.refs ?? [])).toStrictEqual(
        normalizeRefItems([
          { file: formatPath(iff.paths['a.module.css']), ...getRange('a.module.css', 'b_1') },
          { file: formatPath(iff.paths['a.module.css']), ...getRange('a.module.css', 'b_alias') },
          { file: formatPath(iff.paths['b.module.css']), ...getRange('b.module.css', 'b_1') },
        ]),
      );
    });
  });

  describe('for a token reference', () => {
    test('from a token definition', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': dedent`
          @keyframes a_1 { from {} to {} }
          .a_2 { animation-name: a_1; }
          .a_3 { animation-name: a_1; }
        `,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const res = await tsserver.sendReferences({
        file: iff.paths['a.module.css'],
        ...getLoc('a.module.css', 'a_1', 0),
      });

      expect(normalizeRefItems(res.body?.refs ?? [])).toStrictEqual(
        normalizeRefItems([
          { file: formatPath(iff.paths['a.module.css']), ...getRange('a.module.css', 'a_1', 0) },
          { file: formatPath(iff.paths['a.module.css']), ...getRange('a.module.css', 'a_1', 1) },
          { file: formatPath(iff.paths['a.module.css']), ...getRange('a.module.css', 'a_1', 2) },
        ]),
      );
    });

    test('from a token reference', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': dedent`
          @keyframes a_1 { from {} to {} }
          .a_2 { animation-name: a_1; }
          .a_3 { animation-name: a_1; }
        `,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const res = await tsserver.sendReferences({
        file: iff.paths['a.module.css'],
        ...getLoc('a.module.css', 'a_1', 1),
      });

      expect(normalizeRefItems(res.body?.refs ?? [])).toStrictEqual(
        normalizeRefItems([
          { file: formatPath(iff.paths['a.module.css']), ...getRange('a.module.css', 'a_1', 0) },
          { file: formatPath(iff.paths['a.module.css']), ...getRange('a.module.css', 'a_1', 1) },
          { file: formatPath(iff.paths['a.module.css']), ...getRange('a.module.css', 'a_1', 2) },
        ]),
      );
    });
  });
});
