import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from './test-util/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { launchLSPClient, normalizeLocations, toFileUri } from './test-util/lsp-client.js';

const client = launchLSPClient(fixtureDir);

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  test('resolves Go to Definition on a valid token even when later rules contain invalid syntax', async () => {
    const { iff, getPosition, getRange } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.a_1;
      `,
      'a.module.css': dedent`
        .a_1 { color: red; }
        .a_2 {
      `,
    });
    await client.openFile(iff.paths['index.ts']);

    const locations = await client.sendDefinition(iff.paths['index.ts'], getPosition('index.ts', 'a_1'));

    expect(normalizeLocations(locations)).toStrictEqual([
      { uri: toFileUri(iff.paths['a.module.css']), range: getRange('a.module.css', 'a_1') },
    ]);
  });

  // NOTE: Unlike ts-plugin, which leaves syntax errors to the CSS language server, the mapper
  // reports them itself via `includeSyntaxError`.
  test('reports a syntax error diagnostic for a CSS module with parse errors', async () => {
    const { iff } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'a.module.css': dedent`
        .a_1 { color: red; }
        .a_2 {
      `,
    });
    await client.openFile(iff.paths['a.module.css']);

    const report = await client.sendDocumentDiagnostic(iff.paths['a.module.css']);

    expect(report.items).toStrictEqual([
      expect.objectContaining({
        message: 'Unclosed block',
        range: { start: { line: 1, character: 0 }, end: { line: 1, character: 1 } },
      }),
    ]);
  });
});
