import dedent from 'dedent';
import { expect, test } from 'vite-plus/test';
import { buildTSConfigJSON } from '../src/test/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { DiagnosticSeverity, launchLanguageClient } from './test-util/language-client.js';

const client = await launchLanguageClient(fixtureDir);

test('reports parse-phase diagnostics on a CSS module', async () => {
  const { iff, getFileSpan } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON(),
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

test('reports a CSS syntax error on a CSS module', async () => {
  const { iff, getFileSpan } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON(),
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
