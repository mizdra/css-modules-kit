import { expect, test } from 'vite-plus/test';
import { buildTSConfigJSON } from '../src/test/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { formatPath, launchLanguageClient } from './test-util/language-client.js';

const client = await launchLanguageClient(fixtureDir);

test('rewrites the specifier of a TS-side import statement when the CSS module is renamed', async () => {
  const { iff, getFileSpan } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON(),
    'index.ts': `import styles from './a.module.css';`,
    'a.module.css': '',
  });
  await client.sendDidOpen([iff.paths['index.ts']]);

  const edits = await client.sendWillRenameFiles({
    oldFilePath: iff.paths['a.module.css'],
    newFilePath: iff.join('aa.module.css'),
  });

  const { range } = getFileSpan('index.ts', './a.module.css');
  expect(edits).toStrictEqual([
    {
      file: formatPath(iff.paths['index.ts']),
      textEdits: [{ range, newText: './aa.module.css' }],
    },
  ]);
});
