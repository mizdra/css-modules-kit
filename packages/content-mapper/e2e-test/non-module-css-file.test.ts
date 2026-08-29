import { expect, test } from 'vite-plus/test';
import { buildTSConfigJSON } from './test-util/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { launchLSPClient } from './test-util/lsp-client.js';

const client = launchLSPClient(fixtureDir);

test('resolves an import of a non-module CSS file', async () => {
  const { iff } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON(),
    'index.ts': `import './global.css';`,
    'global.css': `* { margin: 0; }`,
  });
  await client.openFile(iff.paths['index.ts']);

  const report = await client.sendDocumentDiagnostic(iff.paths['index.ts']);

  expect(report.items).toStrictEqual([]);
});

test('reports no diagnostics for a non-module CSS file with parse errors', async () => {
  const { iff } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON(),
    'global.css': `* {`,
  });
  await client.openFile(iff.paths['global.css']);

  const report = await client.sendDocumentDiagnostic(iff.paths['global.css']);

  expect(report.items).toStrictEqual([]);
});
