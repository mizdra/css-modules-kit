import dedent from 'dedent';
import { expect, test } from 'vite-plus/test';
import { buildTSConfigJSON } from '../src/test/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { launchLanguageClient } from './test-util/language-client.js';

const client = await launchLanguageClient(fixtureDir);

test('renames the token definition and the TS-side styles.<token>', async () => {
  const { iff, getFileLocation, getFileSpan } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON(),
    'index.ts': dedent`
      import styles from './a.module.css';
      styles.a_1;
    `,
    'a.module.css': `.a_1 { color: red; }`,
  });
  await client.sendDidOpen([iff.paths['index.ts'], iff.paths['a.module.css']]);

  const cases = [
    ['from the TS-side styles.<token>', getFileLocation('index.ts', 'a_1')],
    ['from the token definition', getFileLocation('a.module.css', 'a_1')],
  ] as const;
  const expected = [getFileSpan('a.module.css', 'a_1'), getFileSpan('index.ts', 'a_1')];
  for (const [name, origin] of cases) {
    const locs = await client.sendRename(origin);
    expect.soft(locs, name).toStrictEqual(expected);
  }
});

test('renames every token definition when the token is defined multiple times', async () => {
  const { iff, getFileLocation, getFileSpan } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON(),
    'index.ts': dedent`
      import styles from './a.module.css';
      styles.a_1;
    `,
    'a.module.css': dedent`
      .a_1 { color: red; }
      .a_1 { color: red; }
    `,
  });
  await client.sendDidOpen([iff.paths['index.ts'], iff.paths['a.module.css']]);

  const cases = [
    ['from the TS-side styles.<token>', getFileLocation('index.ts', 'a_1')],
    ['from the first token definition', getFileLocation('a.module.css', 'a_1', 0)],
    ['from the second token definition', getFileLocation('a.module.css', 'a_1', 1)],
  ] as const;
  const expected = [
    getFileSpan('a.module.css', 'a_1', { index: 0 }),
    getFileSpan('a.module.css', 'a_1', { index: 1 }),
    getFileSpan('index.ts', 'a_1'),
  ];
  for (const [name, origin] of cases) {
    const locs = await client.sendRename(origin);
    expect.soft(locs, name).toStrictEqual(expected);
  }
});

test("renames the TS-side styles['<token>']", async () => {
  const { iff, getFileLocation, getFileSpan } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON(),
    'index.ts': dedent`
      import styles from './a.module.css';
      styles['a_1'];
    `,
    'a.module.css': `.a_1 { color: red; }`,
  });
  await client.sendDidOpen([iff.paths['index.ts'], iff.paths['a.module.css']]);

  const cases = [
    ["from the TS-side styles['<token>']", getFileLocation('index.ts', 'a_1')],
    ['from the token definition', getFileLocation('a.module.css', 'a_1')],
  ] as const;
  const expected = [getFileSpan('a.module.css', 'a_1'), getFileSpan('index.ts', 'a_1')];
  for (const [name, origin] of cases) {
    const locs = await client.sendRename(origin);
    expect.soft(locs, name).toStrictEqual(expected);
  }
});
