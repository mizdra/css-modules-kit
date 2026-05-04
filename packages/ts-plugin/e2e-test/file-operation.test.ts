import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../src/test/builder.js';
import { setupFixture } from './test-util/fixture.js';
import { launchTsserver } from './test-util/tsserver.js';

const tsserver = launchTsserver();

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  describe('when adding a CSS module', () => {
    test('reports a missing module diagnostic before the CSS module exists', async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_1;
        `,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const res = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['index.ts'] });

      expect(res.body).toStrictEqual([
        {
          category: 'error',
          code: 2307,
          text: "Cannot find module './a.module.css' or its corresponding type declarations.",
          ...getRange('index.ts', "'./a.module.css'"),
        },
      ]);
    });

    // NOTE: After `sendUpdateOpen` adds the CSS module, the diagnostic should ideally clear,
    // but a tsserver caching bug keeps the original `Cannot find module` diagnostic in place.
    test('retains the missing module diagnostic after the CSS module is added', async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_1;
        `,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });
      await tsserver.sendUpdateOpen({
        openFiles: [{ file: iff.join('a.module.css'), fileContent: '.a_1 { color: red; }' }],
      });

      const res = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['index.ts'] });

      expect(res.body).toStrictEqual([
        {
          category: 'error',
          code: 2307,
          text: "Cannot find module './a.module.css' or its corresponding type declarations.",
          ...getRange('index.ts', "'./a.module.css'"),
        },
      ]);
    });
  });

  describe('when updating a CSS module', () => {
    test('propagates new CSS-side diagnostics when the CSS module is modified', async () => {
      const { iff } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': '',
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });
      await tsserver.sendUpdateOpen({
        changedFiles: [
          {
            fileName: iff.paths['a.module.css'],
            textChanges: [
              {
                start: { line: 1, offset: 1 },
                end: { line: 1, offset: 1 },
                newText: `@import './unresolvable.module.css';`,
              },
            ],
          },
        ],
      });

      const res = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['a.module.css'] });

      expect(res.body).toStrictEqual([
        {
          category: 'error',
          code: 0,
          source: 'css-modules-kit',
          text: "Cannot import module './unresolvable.module.css'",
          start: { line: 1, offset: 10 },
          end: { line: 1, offset: 35 },
        },
      ]);
    });

    test('clears the unknown property diagnostic on the importer when the missing token is added', async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_1;
        `,
        'a.module.css': '',
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const before = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['index.ts'] });
      expect(before.body).toStrictEqual([
        {
          category: 'error',
          code: 2339,
          ...getRange('index.ts', 'a_1'),
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
  });

  describe('when removing a CSS module', () => {
    test.todo('reports a missing module diagnostic on the importer after the CSS module is removed');
  });
});
