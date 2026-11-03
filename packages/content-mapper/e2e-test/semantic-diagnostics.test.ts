import dedent from 'dedent';
import { expect, test } from 'vite-plus/test';
import { buildTSConfigJSON } from '../src/test/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { DiagnosticSeverity, launchLanguageClient } from './test-util/language-client.js';

const client = await launchLanguageClient(fixtureDir);

test('reports an unknown property access on a styles binding', async () => {
  const { iff, getFileSpan } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON(),
    'index.ts': dedent`
      import styles from './a.module.css';
      styles.unknown;
    `,
    'a.module.css': `.a_1 { color: red; }`,
  });
  await client.openFiles([iff.paths['index.ts']]);

  const diagnostics = await client.sendDocumentDiagnostic(iff.paths['index.ts']);

  const { range } = getFileSpan('index.ts', 'unknown');
  expect(diagnostics).toStrictEqual([
    {
      range,
      severity: DiagnosticSeverity.Error,
      code: 2339,
      source: 'ts',
      // The `message` is not asserted because the message is owned by the TypeScript compiler, not the content mapper.
      message: expect.any(String),
    },
  ]);
});

test('types a token on the styles binding as a readonly string', async () => {
  const { iff, getFileSpan } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON(),
    'index.ts': dedent`
      import styles from './a.module.css';
      const value: number = styles.a_1;
      styles.a_1 = '';
    `,
    'a.module.css': `.a_1 { color: red; }`,
  });
  await client.openFiles([iff.paths['index.ts']]);

  const diagnostics = await client.sendDocumentDiagnostic(iff.paths['index.ts']);

  const value = getFileSpan('index.ts', 'value');
  const assignment = getFileSpan('index.ts', 'a_1', { index: 1 });
  expect(diagnostics).toStrictEqual([
    {
      range: value.range,
      severity: DiagnosticSeverity.Error,
      code: 2322,
      source: 'ts',
      message: "Type 'string' is not assignable to type 'number'.",
    },
    {
      range: assignment.range,
      severity: DiagnosticSeverity.Error,
      code: 2540,
      source: 'ts',
      message: "Cannot assign to 'a_1' because it is a read-only property.",
    },
  ]);
});
