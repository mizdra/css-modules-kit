import dedent from 'dedent';
import { expect, test } from 'vite-plus/test';
import { setupFixture } from './test-util/fixture.js';
import { launchTsserver, normalizeDefinitions } from './test-util/tsserver.js';

const tsserver = launchTsserver();

test('returns no Go to Definition results when cmkOptions.enabled is false', async () => {
  const { iff, getLoc } = await setupFixture({
    'tsconfig.json': `{ "cmkOptions": { "enabled": false } }`,
    'index.ts': dedent`
      import styles from './a.module.css';
      styles.a_1;
    `,
    'a.module.css': `.a_1 { color: red; }`,
  });
  await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

  const res = await tsserver.sendDefinitionAndBoundSpan({
    file: iff.paths['index.ts'],
    ...getLoc('index.ts', 'a_1'),
  });

  expect(normalizeDefinitions(res.body?.definitions ?? [])).toStrictEqual([]);
});
