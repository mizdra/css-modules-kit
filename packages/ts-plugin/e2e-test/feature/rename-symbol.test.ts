import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../../src/test/builder.js';
import { setupFixture } from '../test-util/fixture.js';
import { formatPath, launchTsserver, normalizeSpanGroups } from '../test-util/tsserver.js';

const tsserver = launchTsserver();

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  describe('renames a local token', () => {
    test('from styles.<token> access', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_1;
        `,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const res = await tsserver.sendRename({
        file: iff.paths['index.ts'],
        ...getLoc('index.ts', 'a_1'),
      });

      expect(normalizeSpanGroups(res.body?.locs ?? [])).toStrictEqual(
        normalizeSpanGroups([
          { file: formatPath(iff.paths['index.ts']), locs: [getRange('index.ts', 'a_1')] },
          { file: formatPath(iff.paths['a.module.css']), locs: [getRange('a.module.css', 'a_1')] },
        ]),
      );
    });

    test('from styles[<kebab-case token>] access', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles['a-1'];
        `,
        'a.module.css': `.a-1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const res = await tsserver.sendRename({
        file: iff.paths['index.ts'],
        ...getLoc('index.ts', 'a-1'),
      });

      expect(normalizeSpanGroups(res.body?.locs ?? [])).toStrictEqual(
        normalizeSpanGroups([
          { file: formatPath(iff.paths['index.ts']), locs: [getRange('index.ts', 'a-1')] },
          { file: formatPath(iff.paths['a.module.css']), locs: [getRange('a.module.css', 'a-1')] },
        ]),
      );
    });

    test('returns all declarations when the same class is declared multiple times', async () => {
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

      const res = await tsserver.sendRename({
        file: iff.paths['index.ts'],
        ...getLoc('index.ts', 'a_1'),
      });

      expect(normalizeSpanGroups(res.body?.locs ?? [])).toStrictEqual(
        normalizeSpanGroups([
          { file: formatPath(iff.paths['index.ts']), locs: [getRange('index.ts', 'a_1')] },
          {
            file: formatPath(iff.paths['a.module.css']),
            locs: [getRange('a.module.css', 'a_1', 0), getRange('a.module.css', 'a_1', 1)],
          },
        ]),
      );
    });
  });

  describe('transitively resolves a re-export to its source declaration', () => {
    test('class re-exported via @import', async () => {
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

      const res = await tsserver.sendRename({
        file: iff.paths['index.ts'],
        ...getLoc('index.ts', 'b_1'),
      });

      expect(normalizeSpanGroups(res.body?.locs ?? [])).toStrictEqual(
        normalizeSpanGroups([
          { file: formatPath(iff.paths['index.ts']), locs: [getRange('index.ts', 'b_1')] },
          { file: formatPath(iff.paths['b.module.css']), locs: [getRange('b.module.css', 'b_1')] },
        ]),
      );
    });

    // NOTE: For simplicity of implementation, this is not the ideal behavior.
    // The ideal behavior would attach `prefixText: 'b_1 as '` to the binding loc in `a.module.css`
    // so that renaming changes only the alias side. Currently the binding loc is rewritten directly.
    test('value re-exported via @value ... from', async () => {
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

      const res = await tsserver.sendRename({
        file: iff.paths['index.ts'],
        ...getLoc('index.ts', 'b_1'),
      });

      expect(normalizeSpanGroups(res.body?.locs ?? [])).toStrictEqual(
        normalizeSpanGroups([
          { file: formatPath(iff.paths['index.ts']), locs: [getRange('index.ts', 'b_1')] },
          { file: formatPath(iff.paths['a.module.css']), locs: [getRange('a.module.css', 'b_1')] },
          { file: formatPath(iff.paths['b.module.css']), locs: [getRange('b.module.css', 'b_1')] },
        ]),
      );
    });

    // NOTE: Ideally only `b_alias` should be returned, but `b_1` is also returned for implementation simplicity.
    test('aliased value re-exported via @value ... from', async () => {
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

      const res = await tsserver.sendRename({
        file: iff.paths['index.ts'],
        ...getLoc('index.ts', 'b_alias'),
      });

      expect(normalizeSpanGroups(res.body?.locs ?? [])).toStrictEqual(
        normalizeSpanGroups([
          { file: formatPath(iff.paths['index.ts']), locs: [getRange('index.ts', 'b_alias')] },
          {
            file: formatPath(iff.paths['a.module.css']),
            locs: [getRange('a.module.css', 'b_1'), getRange('a.module.css', 'b_alias')],
          },
          { file: formatPath(iff.paths['b.module.css']), locs: [getRange('b.module.css', 'b_1')] },
        ]),
      );
    });
  });

  describe('renames from a CSS-side class declaration', () => {
    test('from a .<token> declaration', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_1;
        `,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const res = await tsserver.sendRename({
        file: iff.paths['a.module.css'],
        ...getLoc('a.module.css', 'a_1'),
      });

      expect(normalizeSpanGroups(res.body?.locs ?? [])).toStrictEqual(
        normalizeSpanGroups([
          { file: formatPath(iff.paths['index.ts']), locs: [getRange('index.ts', 'a_1')] },
          { file: formatPath(iff.paths['a.module.css']), locs: [getRange('a.module.css', 'a_1')] },
        ]),
      );
    });
  });

  describe('renames from a CSS-side @value ... from binding', () => {
    test('from the import binding', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `@value b_1 from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const res = await tsserver.sendRename({
        file: iff.paths['a.module.css'],
        ...getLoc('a.module.css', 'b_1'),
      });

      expect(normalizeSpanGroups(res.body?.locs ?? [])).toStrictEqual(
        normalizeSpanGroups([
          { file: formatPath(iff.paths['a.module.css']), locs: [getRange('a.module.css', 'b_1')] },
          { file: formatPath(iff.paths['b.module.css']), locs: [getRange('b.module.css', 'b_1')] },
        ]),
      );
    });

    // NOTE: Ideally only `b_alias` should be returned, but `b_1` is also returned for implementation simplicity.
    test('from the alias name in `name as alias`', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `@value b_1 as b_alias from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const res = await tsserver.sendRename({
        file: iff.paths['a.module.css'],
        ...getLoc('a.module.css', 'b_alias'),
      });

      expect(normalizeSpanGroups(res.body?.locs ?? [])).toStrictEqual(
        normalizeSpanGroups([
          {
            file: formatPath(iff.paths['a.module.css']),
            locs: [getRange('a.module.css', 'b_1'), getRange('a.module.css', 'b_alias')],
          },
          { file: formatPath(iff.paths['b.module.css']), locs: [getRange('b.module.css', 'b_1')] },
        ]),
      );
    });

    // NOTE: Ideally only `b_1` should be returned, but `b_alias` is also returned for implementation simplicity.
    test('from the source name in `name as alias`', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `@value b_1 as b_alias from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const res = await tsserver.sendRename({
        file: iff.paths['a.module.css'],
        ...getLoc('a.module.css', 'b_1'),
      });

      expect(normalizeSpanGroups(res.body?.locs ?? [])).toStrictEqual(
        normalizeSpanGroups([
          {
            file: formatPath(iff.paths['a.module.css']),
            locs: [getRange('a.module.css', 'b_1'), getRange('a.module.css', 'b_alias')],
          },
          { file: formatPath(iff.paths['b.module.css']), locs: [getRange('b.module.css', 'b_1')] },
        ]),
      );
    });
  });
});
