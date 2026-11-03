import dedent from 'dedent';
import { expect, test } from 'vite-plus/test';
import { buildTSConfigJSON } from '../src/test/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { type FileSpan, formatPath, launchLanguageClient } from './test-util/language-client.js';

const client = await launchLanguageClient(fixtureDir);

function fileHeadSpan(path: string): FileSpan {
  return { file: formatPath(path), range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } };
}

test('returns the token definition when the token is defined once', async () => {
  const { iff, getFileLocation, getFileSpan } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON(),
    'index.ts': dedent`
      import styles from './a.module.css';
      styles.a_1;
    `,
    'a.module.css': `.a_1 { color: red; }`,
  });
  await client.openFiles([iff.paths['index.ts'], iff.paths['a.module.css']]);

  const cases = [
    ['from the TS-side styles.<token>', getFileLocation('index.ts', 'a_1')],
    ['from the token definition', getFileLocation('a.module.css', 'a_1')],
  ] as const;
  const expected = [getFileSpan('a.module.css', 'a_1')];
  for (const [name, origin] of cases) {
    const definitions = await client.sendDefinition(origin);
    expect.soft(definitions, name).toStrictEqual(expected);
  }
});

test('returns every token definition when the token is defined multiple times', async () => {
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
  await client.openFiles([iff.paths['index.ts'], iff.paths['a.module.css']]);

  const cases = [
    ['from the TS-side styles.<token>', getFileLocation('index.ts', 'a_1')],
    ['from the first token definition', getFileLocation('a.module.css', 'a_1', 0)],
    ['from the second token definition', getFileLocation('a.module.css', 'a_1', 1)],
  ] as const;
  const expected = [getFileSpan('a.module.css', 'a_1', { index: 0 }), getFileSpan('a.module.css', 'a_1', { index: 1 })];
  for (const [name, origin] of cases) {
    const definitions = await client.sendDefinition(origin);
    expect.soft(definitions, name).toStrictEqual(expected);
  }
});

test("returns the token definition from the TS-side styles['<token>']", async () => {
  const { iff, getFileLocation, getFileSpan } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON(),
    'index.ts': dedent`
      import styles from './a.module.css';
      styles['a_1'];
    `,
    'a.module.css': `.a_1 { color: red; }`,
  });
  await client.openFiles([iff.paths['index.ts'], iff.paths['a.module.css']]);

  const definitions = await client.sendDefinition(getFileLocation('index.ts', 'a_1'));
  expect(definitions).toStrictEqual([getFileSpan('a.module.css', 'a_1')]);
});

test('returns the head of the imported file from the styles binding and the specifier of a TS-side import statement', async () => {
  const { iff, getFileLocation } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON(),
    'index.ts': `import styles from './a.module.css';`,
    'a.module.css': '',
  });
  await client.openFiles([iff.paths['index.ts'], iff.paths['a.module.css']]);

  const cases = [
    ['from the styles binding', getFileLocation('index.ts', 'styles')],
    ['from the specifier', getFileLocation('index.ts', "'./a.module.css'")],
  ] as const;
  const expected = [fileHeadSpan(iff.paths['a.module.css'])];
  for (const [name, origin] of cases) {
    const definitions = await client.sendDefinition(origin);
    expect.soft(definitions, name).toStrictEqual(expected);
  }
});
