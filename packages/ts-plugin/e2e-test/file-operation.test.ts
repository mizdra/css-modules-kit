import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../src/test/builder.js';
import { setupFixture } from './test-util/fixture.js';
import { launchTsserver } from './test-util/tsserver.js';

const tsserver = launchTsserver();

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  describe('when adding a CSS module', () => {
    test("updates the importer's diagnostic when a CSS module is added", async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_1;
        `,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const before = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['index.ts'] });
      expect(before.body).toStrictEqual([
        {
          category: 'error',
          code: 2307,
          text: "Cannot find module './a.module.css' or its corresponding type declarations.",
          ...getRange('index.ts', "'./a.module.css'"),
        },
      ]);

      await tsserver.sendUpdateOpen({
        openFiles: [{ file: iff.join('a.module.css'), fileContent: '.a_1 { color: red; }' }],
      });

      const after = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['index.ts'] });
      // NOTE: Ideally `after` should be `[]`, but a tsserver caching bug keeps the
      // original `Cannot find module` diagnostic in place.
      expect(after.body).toStrictEqual([
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
    test("updates the importer's diagnostic when a CSS module is modified", async () => {
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
    test.todo("updates the importer's diagnostic when a CSS module is removed");
  });
});
