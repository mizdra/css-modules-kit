import { expect, test } from 'vite-plus/test';
import { buildTSConfigJSON } from '../src/test/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { launchLSPClient } from './test-util/lsp-client.js';

const client = launchLSPClient(fixtureDir);

// ref: https://github.com/mizdra/css-modules-kit/issues/170
test('reports no diagnostics for a non-module .css file', async () => {
  const { iff } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON(),
    'global.css': `* { margin: 0; }`,
  });
  await client.openFiles([iff.paths['global.css']]);

  const diagnostics = await client.sendDocumentDiagnostic(iff.paths['global.css']);
  expect(diagnostics).toStrictEqual([]);
});
