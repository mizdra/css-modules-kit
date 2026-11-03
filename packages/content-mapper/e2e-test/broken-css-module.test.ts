import dedent from 'dedent';
import { expect, test } from 'vite-plus/test';
import { buildTSConfigJSON } from '../src/test/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { launchLanguageClient } from './test-util/language-client.js';

const client = await launchLanguageClient(fixtureDir);

test('returns the token definition even when the file contains invalid syntax elsewhere', async () => {
  const { iff, getFileLocation, getFileSpan } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON(),
    'index.ts': dedent`
      import styles from './a.module.css';
      styles.a_1;
    `,
    'a.module.css': dedent`
      .a_1 { color: red; }
      .a_2 {
    `,
  });
  await client.sendDidOpen([iff.paths['index.ts']]);

  const definitions = await client.sendDefinition(getFileLocation('index.ts', 'a_1'));

  expect(definitions).toStrictEqual([getFileSpan('a.module.css', 'a_1')]);
});
