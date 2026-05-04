import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../../src/test/builder.js';
import { setupFixture } from '../test-util/fixture.js';
import { formatPath, launchTsserver } from '../test-util/tsserver.js';

const tsserver = launchTsserver();

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  describe('rewrites the import specifier when a CSS module is renamed', () => {
    test('from `import ... from` in TS', async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': buildStylesImport('./a.module.css', { namedExports }),
        'a.module.css': '',
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const res = await tsserver.sendGetEditsForFileRename({
        oldFilePath: iff.paths['a.module.css'],
        newFilePath: iff.join('aa.module.css'),
      });

      expect(res.body).toStrictEqual([
        {
          fileName: formatPath(iff.paths['index.ts']),
          textChanges: [{ ...getRange('index.ts', './a.module.css'), newText: './aa.module.css' }],
        },
      ]);
    });

    test('from `@import` in CSS', async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `@import './b.module.css';`,
        'b.module.css': '',
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const res = await tsserver.sendGetEditsForFileRename({
        oldFilePath: iff.paths['b.module.css'],
        newFilePath: iff.join('bb.module.css'),
      });

      expect(res.body).toStrictEqual([
        {
          fileName: formatPath(iff.paths['a.module.css']),
          textChanges: [{ ...getRange('a.module.css', './b.module.css'), newText: './bb.module.css' }],
        },
      ]);
    });

    test('from `@value ... from` in CSS', async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `@value b_1 from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const res = await tsserver.sendGetEditsForFileRename({
        oldFilePath: iff.paths['b.module.css'],
        newFilePath: iff.join('bb.module.css'),
      });

      expect(res.body).toStrictEqual([
        {
          fileName: formatPath(iff.paths['a.module.css']),
          textChanges: [{ ...getRange('a.module.css', './b.module.css'), newText: './bb.module.css' }],
        },
      ]);
    });
  });
});
