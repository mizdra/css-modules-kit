import dedent from 'dedent';
import { expect, test } from 'vite-plus/test';
import { buildTSConfigJSON } from '../src/test/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { launchLanguageClient } from './test-util/language-client.js';

const client = await launchLanguageClient(fixtureDir);

test('highlights every token definition and the TS-side styles.<token>', async () => {
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
  const files = [iff.paths['index.ts'], iff.paths['a.module.css']];
  await client.sendDidOpen(files);

  const cases = [
    ['from the TS-side styles.<token>', getFileLocation('index.ts', 'a_1')],
    ['from the token definition', getFileLocation('a.module.css', 'a_1', 0)],
  ] as const;
  const expected = [
    getFileSpan('a.module.css', 'a_1', { index: 0 }),
    getFileSpan('a.module.css', 'a_1', { index: 1 }),
    getFileSpan('index.ts', 'a_1'),
  ];
  for (const [name, origin] of cases) {
    const highlights = await client.sendDocumentHighlight(origin, files);
    expect.soft(highlights, name).toStrictEqual(expected);
  }
});
