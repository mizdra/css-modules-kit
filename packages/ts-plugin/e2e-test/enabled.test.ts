import { expect, test } from 'vite-plus/test';
import { buildTSConfigJSON } from '../src/test/builder.js';
import { setupFixture } from './test-util/fixture.js';
import { launchTsserver } from './test-util/tsserver.js';

const tsserver = launchTsserver();

test('leaves a CSS module import unresolved when cmkOptions.enabled is false', async () => {
  const { iff, getFileSpan } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON({ cmkOptions: { enabled: false } }),
    'index.ts': `import styles from './a.module.css';`,
    'a.module.css': '',
  });
  await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

  const res = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['index.ts'] });

  const { start, end } = getFileSpan('index.ts', `'./a.module.css'`);
  expect(res.body).toStrictEqual([
    {
      category: 'error',
      code: 2307,
      start,
      end,
      text: `Cannot find module './a.module.css' or its corresponding type declarations.`,
    },
  ]);
});
