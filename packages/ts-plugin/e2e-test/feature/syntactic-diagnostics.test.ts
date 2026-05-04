import { describe, expect, test } from 'vite-plus/test';
import { buildTSConfigJSON } from '../../src/test/builder.js';
import { setupFixture } from '../test-util/fixture.js';
import { launchTsserver } from '../test-util/tsserver.js';

const tsserver = launchTsserver();

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  test('reports a syntactic diagnostic on a CSS module file', async () => {
    const { iff, getRange } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'a.module.css': `@value;`,
    });
    await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

    const res = await tsserver.sendSyntacticDiagnosticsSync({ file: iff.paths['a.module.css'] });

    expect(res.body).toStrictEqual([
      {
        category: 'error',
        code: 0,
        source: 'css-modules-kit',
        text: '`@value` is a invalid syntax.',
        ...getRange('a.module.css', '@value;'),
      },
    ]);
  });
});
