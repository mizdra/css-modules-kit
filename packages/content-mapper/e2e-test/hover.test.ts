import dedent from 'dedent';
import { expect, test } from 'vite-plus/test';
import { buildTSConfigJSON } from '../src/test/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { launchLanguageClient } from './test-util/language-client.js';

const client = await launchLanguageClient(fixtureDir);

test('returns no hover on the token definition', async () => {
  const { iff, getFileLocation } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON(),
    'a.module.css': `.a_1 { color: red; }`,
  });
  await client.sendDidOpen([iff.paths['a.module.css']]);

  const hover = await client.sendHover(getFileLocation('a.module.css', 'a_1'));

  expect(hover).toBeNull();
});

test('returns the type of the token on the TS-side styles.<token>', async () => {
  const { iff, getFileLocation, getFileSpan } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON(),
    'index.ts': dedent`
      import styles from './a.module.css';
      styles.a_1;
    `,
    'a.module.css': `.a_1 { color: red; }`,
  });
  await client.sendDidOpen([iff.paths['index.ts']]);

  const hover = await client.sendHover(getFileLocation('index.ts', 'a_1'));

  expect(hover).toStrictEqual({ ...getFileSpan('index.ts', 'a_1'), contents: "(property) Styles['a_1']: string" });
});
