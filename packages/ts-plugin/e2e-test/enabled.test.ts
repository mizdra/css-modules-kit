import dedent from 'dedent';
import { expect, test } from 'vite-plus/test';
import { setupFixture } from './test-util/fixture.js';
import { launchTsserver } from './test-util/tsserver.js';

const tsserver = launchTsserver();

test('returns no Go to Definition results when cmkOptions.enabled is false', async () => {
  const { iff, getFileLocation } = await setupFixture({
    'tsconfig.json': `{ "cmkOptions": { "enabled": false } }`,
    'index.ts': dedent`
      import styles from './a.module.css';
      styles.a_1;
    `,
    'a.module.css': `.a_1 { color: red; }`,
  });
  await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

  const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('index.ts', 'a_1'));

  expect(definitions).toStrictEqual([]);
});
