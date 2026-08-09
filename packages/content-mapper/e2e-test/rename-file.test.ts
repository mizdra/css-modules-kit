import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from './test-util/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { launchLSPClient, normalizeFileRenames, normalizeWorkspaceEdit, toFileUri } from './test-util/lsp-client.js';

const client = launchLSPClient(fixtureDir);

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  describe('returns a file rename operation so editors can initiate a file rename from a CSS specifier', () => {
    test('from all token importer', async () => {
      const { iff, getPosition } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'a.module.css': `@import './b.module.css';`,
        'b.module.css': '',
      });
      await client.openFile(iff.paths['a.module.css']);

      const edit = await client.sendRename(
        iff.paths['a.module.css'],
        getPosition('a.module.css', 'b.module.css'),
        'bb.module.css',
      );

      expect(normalizeFileRenames(edit)).toStrictEqual([
        { kind: 'rename', oldUri: toFileUri(iff.paths['b.module.css']), newUri: toFileUri(iff.join('bb.module.css')) },
      ]);
    });

    test('from named token importer', async () => {
      const { iff, getPosition } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'a.module.css': `@value b_1 from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await client.openFile(iff.paths['a.module.css']);

      const edit = await client.sendRename(
        iff.paths['a.module.css'],
        getPosition('a.module.css', 'b.module.css'),
        'bb.module.css',
      );

      expect(normalizeFileRenames(edit)).toStrictEqual([
        { kind: 'rename', oldUri: toFileUri(iff.paths['b.module.css']), newUri: toFileUri(iff.join('bb.module.css')) },
      ]);
    });
  });

  describe('rewrites the import specifier when a CSS module is renamed', () => {
    test('from `import ... from` in TS', async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': buildStylesImport('./a.module.css', { namedExports }),
        'a.module.css': '',
      });
      await client.openFile(iff.paths['index.ts']);

      const edit = await client.sendWillRenameFiles(iff.paths['a.module.css'], iff.join('aa.module.css'));

      expect(normalizeWorkspaceEdit(edit)).toStrictEqual({
        [toFileUri(iff.paths['index.ts'])]: [
          { range: getRange('index.ts', './a.module.css'), newText: './aa.module.css' },
        ],
      });
    });

    test('from all token importer', async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'a.module.css': `@import './b.module.css';`,
        'b.module.css': '',
      });
      await client.openFile(iff.paths['a.module.css']);

      const edit = await client.sendWillRenameFiles(iff.paths['b.module.css'], iff.join('bb.module.css'));

      expect(normalizeWorkspaceEdit(edit)).toStrictEqual({
        [toFileUri(iff.paths['a.module.css'])]: [
          { range: getRange('a.module.css', './b.module.css'), newText: './bb.module.css' },
        ],
      });
    });

    test('from named token importer', async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'a.module.css': `@value b_1 from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await client.openFile(iff.paths['a.module.css']);

      const edit = await client.sendWillRenameFiles(iff.paths['b.module.css'], iff.join('bb.module.css'));

      expect(normalizeWorkspaceEdit(edit)).toStrictEqual({
        [toFileUri(iff.paths['a.module.css'])]: [
          { range: getRange('a.module.css', './b.module.css'), newText: './bb.module.css' },
        ],
      });
    });
  });
});
