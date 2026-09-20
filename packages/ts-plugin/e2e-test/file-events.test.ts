import { rm } from 'node:fs/promises';
import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../src/test/builder.js';
import { setupFixture } from './test-util/fixture.js';
import { launchTsserver } from './test-util/tsserver.js';

const tsserver = launchTsserver();

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  // NOTE: A tsserver caching bug keeps the original `Cannot find module` diagnostic in place.
  test.fails('reports no diagnostics on the importer after the CSS module is added', async () => {
    const { iff, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.a_1;
      `,
    });
    await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

    const before = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['index.ts'] });
    const { start, end } = getFileSpan('index.ts', "'./a.module.css'");
    expect(before.body).toStrictEqual([
      {
        category: 'error',
        code: 2307,
        text: "Cannot find module './a.module.css' or its corresponding type declarations.",
        start,
        end,
      },
    ]);

    await tsserver.sendUpdateOpen({
      openFiles: [{ file: iff.join('a.module.css'), fileContent: '.a_1 { color: red; }' }],
    });

    const after = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['index.ts'] });
    expect(after.body).toStrictEqual([]);
  });

  test('reports no diagnostics on the importer after the missing token is added to the CSS module', async () => {
    const { iff, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.a_1;
      `,
      'a.module.css': '',
    });
    await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

    const before = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['index.ts'] });
    const { start, end } = getFileSpan('index.ts', 'a_1');
    expect(before.body).toStrictEqual([
      {
        category: 'error',
        code: 2339,
        start,
        end,
        text: expect.any(String),
      },
    ]);

    await tsserver.sendUpdateOpen({
      changedFiles: [
        {
          fileName: iff.paths['a.module.css'],
          textChanges: [
            {
              start: { line: 1, offset: 1 },
              end: { line: 1, offset: 1 },
              newText: `.a_1 {}`,
            },
          ],
        },
      ],
    });

    const after = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['index.ts'] });
    expect(after.body).toStrictEqual([]);
  });

  // NOTE: tsserver notices the removal of an unopened file through its file watcher, which is asynchronous.
  // Closing an opened file makes tsserver check the file system right away.
  test('reports "Cannot find module" on the importer after the CSS module is removed', async () => {
    const { iff, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.a_1;
      `,
      'a.module.css': '.a_1 { color: red; }',
    });
    await tsserver.sendUpdateOpen({
      openFiles: [{ file: iff.paths['index.ts'] }, { file: iff.paths['a.module.css'] }],
    });

    const before = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['index.ts'] });
    expect(before.body).toStrictEqual([]);

    await rm(iff.paths['a.module.css']);
    await tsserver.sendUpdateOpen({ closedFiles: [iff.paths['a.module.css']] });

    const after = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['index.ts'] });
    const { start, end } = getFileSpan('index.ts', "'./a.module.css'");
    expect(after.body).toStrictEqual([
      {
        category: 'error',
        code: 2307,
        text: "Cannot find module './a.module.css' or its corresponding type declarations.",
        start,
        end,
      },
    ]);
  });
});
