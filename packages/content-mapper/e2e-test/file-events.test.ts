import { rm } from 'node:fs/promises';
import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../src/test/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { DiagnosticSeverity, launchLSPClient } from './test-util/lsp-client.js';

const client = launchLSPClient(fixtureDir);

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  test('reports no diagnostics on the importer after the CSS module is added', async () => {
    const { iff, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.a_1;
      `,
    });
    await client.openFiles([iff.paths['index.ts']]);

    const before = await client.sendDocumentDiagnostic(iff.paths['index.ts']);
    const { range } = getFileSpan('index.ts', "'./a.module.css'");
    expect(before).toStrictEqual([
      {
        range,
        severity: DiagnosticSeverity.Error,
        code: 2307,
        source: 'ts',
        message: "Cannot find module './a.module.css' or its corresponding type declarations.",
      },
    ]);

    await client.openFiles([{ file: iff.join('a.module.css'), content: '.a_1 { color: red; }' }]);

    const after = await client.sendDocumentDiagnostic(iff.paths['index.ts']);
    expect(after).toStrictEqual([]);
  });

  test('reports no diagnostics on the importer after the missing token is added to the CSS module', async () => {
    const { iff, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.a_1;
      `,
      'a.module.css': '',
    });
    await client.openFiles([iff.paths['index.ts'], iff.paths['a.module.css']]);

    const before = await client.sendDocumentDiagnostic(iff.paths['index.ts']);
    const { range } = getFileSpan('index.ts', 'a_1');
    expect(before).toStrictEqual([
      {
        range,
        severity: DiagnosticSeverity.Error,
        code: 2339,
        source: 'ts',
        message: expect.any(String),
      },
    ]);

    await client.changeFile(iff.paths['a.module.css'], `.a_1 {}`);

    const after = await client.sendDocumentDiagnostic(iff.paths['index.ts']);
    expect(after).toStrictEqual([]);
  });

  // NOTE: The server notices the removal of an unopened file through the file watcher of the client, which
  // the tests do not have. Closing an opened file makes the server check the file system right away.
  test('reports "Cannot find module" on the importer after the CSS module is removed', async () => {
    const { iff, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.a_1;
      `,
      'a.module.css': '.a_1 { color: red; }',
    });
    await client.openFiles([iff.paths['index.ts'], iff.paths['a.module.css']]);

    const before = await client.sendDocumentDiagnostic(iff.paths['index.ts']);
    expect(before).toStrictEqual([]);

    await rm(iff.paths['a.module.css']);
    await client.closeFiles([iff.paths['a.module.css']]);

    const after = await client.sendDocumentDiagnostic(iff.paths['index.ts']);
    const { range } = getFileSpan('index.ts', "'./a.module.css'");
    expect(after).toStrictEqual([
      {
        range,
        severity: DiagnosticSeverity.Error,
        code: 2307,
        source: 'ts',
        message: "Cannot find module './a.module.css' or its corresponding type declarations.",
      },
    ]);
  });
});
