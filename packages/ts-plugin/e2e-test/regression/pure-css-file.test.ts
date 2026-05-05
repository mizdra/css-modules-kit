import { expect, test } from 'vite-plus/test';
import { buildTSConfigJSON } from '../../src/test/builder.js';
import { setupFixture } from '../test-util/fixture.js';
import { launchTsserver } from '../test-util/tsserver.js';

const tsserver = launchTsserver();

// ref: https://github.com/mizdra/css-modules-kit/issues/170
test('reports no diagnostics for a non-module .css file', async () => {
  const { iff } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON(),
    'global.css': `* { margin: 0; }`,
  });
  await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['tsconfig.json'] }] });

  const syntactic = await tsserver.sendSyntacticDiagnosticsSync({ file: iff.paths['global.css'] });
  expect(syntactic.body).toStrictEqual([]);

  const semantic = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['global.css'] });
  expect(semantic.body).toStrictEqual([]);
});
