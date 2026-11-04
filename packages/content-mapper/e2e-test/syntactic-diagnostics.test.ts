import dedent from 'dedent';
import { expect, test } from 'vite-plus/test';
import { buildTSConfigJSON } from '../src/test/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { DiagnosticSeverity, launchLanguageClient } from './test-util/language-client.js';

const client = await launchLanguageClient(fixtureDir);

test('reports parse-phase diagnostics and CSS syntax errors on a CSS module', async () => {
  const { iff, getFileSpan } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON(),
    'a.module.css': dedent`
      @value;
      .a_1 {
    `,
  });
  await client.sendDidOpen([iff.paths['a.module.css']]);

  const diagnostics = await client.sendDocumentDiagnostic(iff.paths['a.module.css']);

  expect(diagnostics).toStrictEqual([
    {
      range: getFileSpan('a.module.css', '@value;').range,
      severity: DiagnosticSeverity.Error,
      code: 1000,
      source: 'cmk',
      message: '`@value` is a invalid syntax.',
    },
    {
      range: getFileSpan('a.module.css', '.').range,
      severity: DiagnosticSeverity.Error,
      code: 1000,
      source: 'cmk',
      message: 'Unclosed block',
    },
  ]);
});
