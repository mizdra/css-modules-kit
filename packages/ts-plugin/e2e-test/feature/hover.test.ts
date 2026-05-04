import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../../src/test/builder.js';
import { setupFixture } from '../test-util/fixture.js';
import { launchTsserver } from '../test-util/tsserver.js';

const tsserver = launchTsserver();

describe.each([
  { namedExports: false, expectedStylesA1Hover: `(property) 'a_1': string` },
  { namedExports: true, expectedStylesA1Hover: `(alias) var 'a_1': string\nexport 'a_1'` },
])('namedExports: $namedExports', ({ namedExports, expectedStylesA1Hover }) => {
  test('reports the type of a local class accessed via styles.<token>', async () => {
    const { iff, getLoc } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.a_1;
      `,
      'a.module.css': `.a_1 { color: red; }`,
    });
    await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

    const res = await tsserver.sendQuickInfo({
      file: iff.paths['index.ts'],
      ...getLoc('index.ts', 'a_1'),
    });

    expect(res.body?.displayString).toBe(expectedStylesA1Hover);
  });
});
