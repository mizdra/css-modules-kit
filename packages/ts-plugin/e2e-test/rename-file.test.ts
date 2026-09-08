import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../src/test/builder.js';
import { setupFixture } from './test-util/fixture.js';
import { formatPath, launchTsserver } from './test-util/tsserver.js';

const tsserver = launchTsserver();

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  describe('reports `fileToRename` so editors can initiate a file rename from a CSS specifier', () => {
    test('from all token importer', async () => {
      const { iff, getFileLocation } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `@import './b.module.css';`,
        'b.module.css': '',
      });
      await tsserver.sendConfigure({ preferences: { allowRenameOfImportPath: true } });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const { info } = await tsserver.sendRename(getFileLocation('a.module.css', 'b.module.css'));

      expect(info).toMatchObject({
        canRename: true,
        kind: 'module',
        fileToRename: formatPath(iff.paths['b.module.css']),
      });
    });

    test('from named token importer', async () => {
      const { iff, getFileLocation } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `@value b_1 from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendConfigure({ preferences: { allowRenameOfImportPath: true } });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const { info } = await tsserver.sendRename(getFileLocation('a.module.css', 'b.module.css'));

      expect(info).toMatchObject({
        canRename: true,
        kind: 'module',
        fileToRename: formatPath(iff.paths['b.module.css']),
      });
    });
  });

  describe('rewrites the import specifier when a CSS module is renamed', () => {
    test('from `import ... from` in TS', async () => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': buildStylesImport('./a.module.css', { namedExports }),
        'a.module.css': '',
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const res = await tsserver.sendGetEditsForFileRename({
        oldFilePath: iff.paths['a.module.css'],
        newFilePath: iff.join('aa.module.css'),
      });

      const { start, end } = getFileSpan('index.ts', './a.module.css');
      expect(res.body).toStrictEqual([
        {
          fileName: formatPath(iff.paths['index.ts']),
          textChanges: [{ start, end, newText: './aa.module.css' }],
        },
      ]);
    });

    test('from all token importer', async () => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `@import './b.module.css';`,
        'b.module.css': '',
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const res = await tsserver.sendGetEditsForFileRename({
        oldFilePath: iff.paths['b.module.css'],
        newFilePath: iff.join('bb.module.css'),
      });

      const { start, end } = getFileSpan('a.module.css', './b.module.css');
      expect(res.body).toStrictEqual([
        {
          fileName: formatPath(iff.paths['a.module.css']),
          textChanges: [{ start, end, newText: './bb.module.css' }],
        },
      ]);
    });

    test('from named token importer', async () => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `@value b_1 from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const res = await tsserver.sendGetEditsForFileRename({
        oldFilePath: iff.paths['b.module.css'],
        newFilePath: iff.join('bb.module.css'),
      });

      const { start, end } = getFileSpan('a.module.css', './b.module.css');
      expect(res.body).toStrictEqual([
        {
          fileName: formatPath(iff.paths['a.module.css']),
          textChanges: [{ start, end, newText: './bb.module.css' }],
        },
      ]);
    });
  });
});
