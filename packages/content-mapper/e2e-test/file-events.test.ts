import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from './test-util/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { launchLSPClient } from './test-util/lsp-client.js';

const client = launchLSPClient(fixtureDir);

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  describe('when adding a CSS module', () => {
    test("updates the importer's diagnostic when a CSS module is added", async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_1;
        `,
      });
      await client.openFile(iff.paths['index.ts']);

      const before = await client.sendDocumentDiagnostic(iff.paths['index.ts']);
      expect(before.items).toStrictEqual([
        expect.objectContaining({ code: 2307, range: getRange('index.ts', `'./a.module.css'`) }),
      ]);

      await iff.addFixtures({ 'a.module.css': '.a_1 { color: red; }' });
      await client.openFile(iff.join('a.module.css'));

      const after = await client.sendDocumentDiagnostic(iff.paths['index.ts']);
      expect(after.items).toStrictEqual([]);
    });
  });

  describe('when updating a CSS module', () => {
    test("updates the importer's diagnostic when a CSS module is modified", async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_1;
        `,
        'a.module.css': '',
      });
      await client.openFile(iff.paths['index.ts']);

      const before = await client.sendDocumentDiagnostic(iff.paths['index.ts']);
      expect(before.items).toStrictEqual([expect.objectContaining({ code: 2339, range: getRange('index.ts', 'a_1') })]);

      await client.openFile(iff.paths['a.module.css']);
      await client.changeFile(iff.paths['a.module.css'], `.a_1 {}`);

      const after = await client.sendDocumentDiagnostic(iff.paths['index.ts']);
      expect(after.items).toStrictEqual([]);
    });
  });

  describe('when removing a CSS module', () => {
    test.todo("updates the importer's diagnostic when a CSS module is removed");
  });
});
