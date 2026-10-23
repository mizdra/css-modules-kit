import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../src/test/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { formatPath, launchLSPClient } from './test-util/lsp-client.js';

const client = launchLSPClient(fixtureDir);

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  test('reports the specified file as the file to rename from the specifier of a token importer and an external token reference', async () => {
    const { iff, getFileLocation } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'a.module.css': dedent`
        @import './b.module.css';
        @value c_1 from './c.module.css';
        .a_1 { composes: d_1 from './d.module.css'; }
      `,
      'b.module.css': '',
      'c.module.css': `@value c_1: red;`,
      'd.module.css': `.d_1 { color: red; }`,
    });
    await client.openFiles([iff.paths['a.module.css']]);

    const cases = [
      [
        'from the specifier of an all token importer',
        getFileLocation('a.module.css', 'b.module.css'),
        iff.paths['b.module.css'],
      ],
      [
        'from the specifier of a named token importer',
        getFileLocation('a.module.css', 'c.module.css'),
        iff.paths['c.module.css'],
      ],
      [
        'from the specifier of an external token reference',
        getFileLocation('a.module.css', 'd.module.css'),
        iff.paths['d.module.css'],
      ],
    ] as const;
    for (const [name, origin, specifiedFile] of cases) {
      const { fileRenames } = await client.sendRename(origin, 'renamed.module.css');
      expect
        .soft(fileRenames, name)
        .toStrictEqual([{ oldFile: formatPath(specifiedFile), newFile: formatPath(iff.join('renamed.module.css')) }]);
    }
  });

  test('rewrites the specifier of a TS-side import statement when the CSS module is renamed', async () => {
    const { iff, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'index.ts': buildStylesImport('./a.module.css', { namedExports }),
      'a.module.css': '',
    });
    await client.openFiles([iff.paths['index.ts']]);

    const edits = await client.sendWillRenameFiles({
      oldFilePath: iff.paths['a.module.css'],
      newFilePath: iff.join('aa.module.css'),
    });

    const { range } = getFileSpan('index.ts', './a.module.css');
    expect(edits).toStrictEqual([
      {
        file: formatPath(iff.paths['index.ts']),
        textEdits: [{ range, newText: './aa.module.css' }],
      },
    ]);
  });

  test('rewrites the specifiers of token importers and external token references when the CSS module is renamed', async () => {
    const { iff, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'a.module.css': dedent`
        @import './b.module.css';
        @value b_1 from './b.module.css';
        .a_1 { composes: b_2 from './b.module.css'; }
      `,
      'b.module.css': dedent`
        @value b_1: red;
        .b_2 { color: red; }
      `,
    });
    await client.openFiles([iff.paths['a.module.css']]);

    const edits = await client.sendWillRenameFiles({
      oldFilePath: iff.paths['b.module.css'],
      newFilePath: iff.join('bb.module.css'),
    });

    const allTokenImporter = getFileSpan('a.module.css', './b.module.css', { index: 0 });
    const namedTokenImporter = getFileSpan('a.module.css', './b.module.css', { index: 1 });
    const externalTokenReference = getFileSpan('a.module.css', './b.module.css', { index: 2 });
    expect(edits).toStrictEqual([
      {
        file: formatPath(iff.paths['a.module.css']),
        textEdits: [
          { range: allTokenImporter.range, newText: './bb.module.css' },
          { range: namedTokenImporter.range, newText: './bb.module.css' },
          { range: externalTokenReference.range, newText: './bb.module.css' },
        ],
      },
    ]);
  });
});
