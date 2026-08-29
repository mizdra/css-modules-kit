import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from './test-util/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { launchLSPClient, normalizeWorkspaceEdit, toFileUri } from './test-util/lsp-client.js';

const client = launchLSPClient(fixtureDir);

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  describe('for a token definition', () => {
    test('from a TS-side styles.<token>', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_1;
        `,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await client.openFile(iff.paths['index.ts']);

      const edit = await client.sendRename(iff.paths['index.ts'], getPosition('index.ts', 'a_1'), 'a_renamed');

      expect(normalizeWorkspaceEdit(edit)).toStrictEqual({
        [toFileUri(iff.paths['index.ts'])]: [{ range: getRange('index.ts', 'a_1'), newText: 'a_renamed' }],
        [toFileUri(iff.paths['a.module.css'])]: [{ range: getRange('a.module.css', 'a_1'), newText: 'a_renamed' }],
      });
    });

    test('from a TS-side styles[<kebab-case token>]', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles['a-1'];
        `,
        'a.module.css': `.a-1 { color: red; }`,
      });
      await client.openFile(iff.paths['index.ts']);

      const edit = await client.sendRename(iff.paths['index.ts'], getPosition('index.ts', 'a-1'), 'a_renamed');

      expect(normalizeWorkspaceEdit(edit)).toStrictEqual({
        [toFileUri(iff.paths['index.ts'])]: [{ range: getRange('index.ts', 'a-1'), newText: 'a_renamed' }],
        [toFileUri(iff.paths['a.module.css'])]: [{ range: getRange('a.module.css', 'a-1'), newText: 'a_renamed' }],
      });
    });

    test('when the token is declared multiple times', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_1;
        `,
        'a.module.css': dedent`
          .a_1 { color: red; }
          .a_1 { color: red; }
        `,
      });
      await client.openFile(iff.paths['index.ts']);

      const edit = await client.sendRename(iff.paths['index.ts'], getPosition('index.ts', 'a_1'), 'a_renamed');

      expect(normalizeWorkspaceEdit(edit)).toStrictEqual({
        [toFileUri(iff.paths['index.ts'])]: [{ range: getRange('index.ts', 'a_1'), newText: 'a_renamed' }],
        [toFileUri(iff.paths['a.module.css'])]: [
          { range: getRange('a.module.css', 'a_1', 0), newText: 'a_renamed' },
          { range: getRange('a.module.css', 'a_1', 1), newText: 'a_renamed' },
        ],
      });
    });

    test('from a CSS-side token definition', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_1;
        `,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await client.openFile(iff.paths['a.module.css']);

      const edit = await client.sendRename(iff.paths['a.module.css'], getPosition('a.module.css', 'a_1'), 'a_renamed');

      expect(normalizeWorkspaceEdit(edit)).toStrictEqual({
        [toFileUri(iff.paths['index.ts'])]: [{ range: getRange('index.ts', 'a_1'), newText: 'a_renamed' }],
        [toFileUri(iff.paths['a.module.css'])]: [{ range: getRange('a.module.css', 'a_1'), newText: 'a_renamed' }],
      });
    });
  });

  describe('for an all token importer', () => {
    test('from a TS-side styles.<token>', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.b_1;
        `,
        'a.module.css': `@import './b.module.css';`,
        'b.module.css': `.b_1 { color: red; }`,
      });
      await client.openFile(iff.paths['index.ts']);

      const edit = await client.sendRename(iff.paths['index.ts'], getPosition('index.ts', 'b_1'), 'b_renamed');

      expect(normalizeWorkspaceEdit(edit)).toStrictEqual({
        [toFileUri(iff.paths['index.ts'])]: [{ range: getRange('index.ts', 'b_1'), newText: 'b_renamed' }],
        [toFileUri(iff.paths['b.module.css'])]: [{ range: getRange('b.module.css', 'b_1'), newText: 'b_renamed' }],
      });
    });
  });

  describe('for a named token importer', () => {
    test('from a TS-side styles.<name>', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.b_1;
        `,
        'a.module.css': `@value b_1 from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await client.openFile(iff.paths['index.ts']);

      const edit = await client.sendRename(iff.paths['index.ts'], getPosition('index.ts', 'b_1'), 'b_renamed');

      expect(normalizeWorkspaceEdit(edit)).toStrictEqual({
        [toFileUri(iff.paths['index.ts'])]: [{ range: getRange('index.ts', 'b_1'), newText: 'b_renamed' }],
        [toFileUri(iff.paths['a.module.css'])]: [{ range: getRange('a.module.css', 'b_1'), newText: 'b_renamed' }],
        [toFileUri(iff.paths['b.module.css'])]: [{ range: getRange('b.module.css', 'b_1'), newText: 'b_renamed' }],
      });
    });

    // NOTE: The expectation matches ts-plugin, which also rewrites the paired `b_1`.
    test('from a TS-side styles.<alias>', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.b_alias;
        `,
        'a.module.css': `@value b_1 as b_alias from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await client.openFile(iff.paths['index.ts']);

      const edit = await client.sendRename(iff.paths['index.ts'], getPosition('index.ts', 'b_alias'), 'b_renamed');

      expect(normalizeWorkspaceEdit(edit)).toStrictEqual({
        [toFileUri(iff.paths['index.ts'])]: [{ range: getRange('index.ts', 'b_alias'), newText: 'b_renamed' }],
        [toFileUri(iff.paths['a.module.css'])]: [
          { range: getRange('a.module.css', 'b_1'), newText: 'b_renamed' },
          { range: getRange('a.module.css', 'b_alias'), newText: 'b_renamed' },
        ],
        [toFileUri(iff.paths['b.module.css'])]: [{ range: getRange('b.module.css', 'b_1'), newText: 'b_renamed' }],
      });
    });

    test('from a CSS-side <name>', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'a.module.css': `@value b_1 from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await client.openFile(iff.paths['a.module.css']);

      const edit = await client.sendRename(iff.paths['a.module.css'], getPosition('a.module.css', 'b_1'), 'b_renamed');

      expect(normalizeWorkspaceEdit(edit)).toStrictEqual({
        [toFileUri(iff.paths['a.module.css'])]: [{ range: getRange('a.module.css', 'b_1'), newText: 'b_renamed' }],
        [toFileUri(iff.paths['b.module.css'])]: [{ range: getRange('b.module.css', 'b_1'), newText: 'b_renamed' }],
      });
    });

    // NOTE: The expectation matches ts-plugin, which also rewrites the paired `b_alias`.
    test('from a CSS-side <name> with alias', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'a.module.css': `@value b_1 as b_alias from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await client.openFile(iff.paths['a.module.css']);

      const edit = await client.sendRename(iff.paths['a.module.css'], getPosition('a.module.css', 'b_1'), 'b_renamed');

      expect(normalizeWorkspaceEdit(edit)).toStrictEqual({
        [toFileUri(iff.paths['a.module.css'])]: [
          { range: getRange('a.module.css', 'b_1'), newText: 'b_renamed' },
          { range: getRange('a.module.css', 'b_alias'), newText: 'b_renamed' },
        ],
        [toFileUri(iff.paths['b.module.css'])]: [{ range: getRange('b.module.css', 'b_1'), newText: 'b_renamed' }],
      });
    });

    // NOTE: The expectation matches ts-plugin, which also rewrites the paired `b_1`.
    test('from a CSS-side <alias>', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'a.module.css': `@value b_1 as b_alias from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await client.openFile(iff.paths['a.module.css']);

      const edit = await client.sendRename(
        iff.paths['a.module.css'],
        getPosition('a.module.css', 'b_alias'),
        'b_renamed',
      );

      expect(normalizeWorkspaceEdit(edit)).toStrictEqual({
        [toFileUri(iff.paths['a.module.css'])]: [
          { range: getRange('a.module.css', 'b_1'), newText: 'b_renamed' },
          { range: getRange('a.module.css', 'b_alias'), newText: 'b_renamed' },
        ],
        [toFileUri(iff.paths['b.module.css'])]: [{ range: getRange('b.module.css', 'b_1'), newText: 'b_renamed' }],
      });
    });
  });

  describe('for a local token reference', () => {
    test('from a token definition', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'a.module.css': dedent`
          @keyframes a_1 { from {} to {} }
          .a_2 { animation-name: a_1; }
          .a_3 { animation-name: a_1; }
        `,
      });
      await client.openFile(iff.paths['a.module.css']);

      const edit = await client.sendRename(
        iff.paths['a.module.css'],
        getPosition('a.module.css', 'a_1', 0),
        'a_renamed',
      );

      expect(normalizeWorkspaceEdit(edit)).toStrictEqual({
        [toFileUri(iff.paths['a.module.css'])]: [
          { range: getRange('a.module.css', 'a_1', 0), newText: 'a_renamed' },
          { range: getRange('a.module.css', 'a_1', 1), newText: 'a_renamed' },
          { range: getRange('a.module.css', 'a_1', 2), newText: 'a_renamed' },
        ],
      });
    });

    test('from a local token reference', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'a.module.css': dedent`
          @keyframes a_1 { from {} to {} }
          .a_2 { animation-name: a_1; }
          .a_3 { animation-name: a_1; }
        `,
      });
      await client.openFile(iff.paths['a.module.css']);

      const edit = await client.sendRename(
        iff.paths['a.module.css'],
        getPosition('a.module.css', 'a_1', 1),
        'a_renamed',
      );

      expect(normalizeWorkspaceEdit(edit)).toStrictEqual({
        [toFileUri(iff.paths['a.module.css'])]: [
          { range: getRange('a.module.css', 'a_1', 0), newText: 'a_renamed' },
          { range: getRange('a.module.css', 'a_1', 1), newText: 'a_renamed' },
          { range: getRange('a.module.css', 'a_1', 2), newText: 'a_renamed' },
        ],
      });
    });
  });

  describe('for an external token reference', () => {
    test('from an external token reference', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'a.module.css': `.a_1 { composes: b_1 from './b.module.css'; }`,
        'b.module.css': `.b_1 { color: red; }`,
      });
      await client.openFile(iff.paths['a.module.css']);

      const edit = await client.sendRename(iff.paths['a.module.css'], getPosition('a.module.css', 'b_1'), 'b_renamed');

      expect(normalizeWorkspaceEdit(edit)).toStrictEqual({
        [toFileUri(iff.paths['a.module.css'])]: [{ range: getRange('a.module.css', 'b_1'), newText: 'b_renamed' }],
        [toFileUri(iff.paths['b.module.css'])]: [{ range: getRange('b.module.css', 'b_1'), newText: 'b_renamed' }],
      });
    });
  });
});
