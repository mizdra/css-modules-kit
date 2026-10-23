import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildTSConfigJSON } from '../src/test/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { DiagnosticSeverity, launchLSPClient } from './test-util/lsp-client.js';

const client = launchLSPClient(fixtureDir);

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  test('reports parse-phase diagnostics on a CSS module', async () => {
    const { iff, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'a.module.css': `@value;`,
    });
    await client.openFiles([iff.paths['a.module.css']]);

    const diagnostics = await client.sendDocumentDiagnostic(iff.paths['a.module.css']);

    const { range } = getFileSpan('a.module.css', '@value;');
    expect(diagnostics).toStrictEqual([
      {
        range,
        severity: DiagnosticSeverity.Error,
        code: 1000,
        source: 'cmk',
        message: '`@value` is a invalid syntax.',
      },
    ]);
  });

  // NOTE: Unlike ts-plugin, which leaves CSS syntax errors to the CSS language server, the content
  // mapper reports them by itself.
  test('reports a CSS syntax error on a CSS module', async () => {
    const { iff, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'a.module.css': dedent`
        .a_1 { color: red; }
        .a_2 {
      `,
    });
    await client.openFiles([iff.paths['a.module.css']]);

    const diagnostics = await client.sendDocumentDiagnostic(iff.paths['a.module.css']);

    const { range } = getFileSpan('a.module.css', '.', { index: 1 });
    expect(diagnostics).toStrictEqual([
      {
        range,
        severity: DiagnosticSeverity.Error,
        code: 1000,
        source: 'cmk',
        message: 'Unclosed block',
      },
    ]);
  });
});
