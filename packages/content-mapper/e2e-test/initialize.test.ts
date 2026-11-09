import dedent from 'dedent';
import { expect, test } from 'vite-plus/test';
import { buildTSConfigJSON } from '../src/test/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { launchLanguageClient } from './test-util/language-client.js';

const client = await launchLanguageClient(fixtureDir);

// This test fails when the `positionEncoding` returned by `initialize` does not match the offsets of the transform.
test('maps a token following a non-ASCII character using the declared position encoding', async () => {
  const { iff, getFileLocation, getFileSpan } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON(),
    'index.ts': dedent`
      import styles from './a.module.css';
      styles.a_1;
    `,
    'a.module.css': `/* あ */ .a_1 { color: red; }`,
  });
  await client.sendDidOpen([iff.paths['index.ts'], iff.paths['a.module.css']]);

  const definitions = await client.sendDefinition(getFileLocation('index.ts', 'a_1'));

  expect(definitions).toStrictEqual([getFileSpan('a.module.css', 'a_1')]);
});
