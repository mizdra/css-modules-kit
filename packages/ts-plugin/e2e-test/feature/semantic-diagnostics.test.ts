import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../../src/test/builder.js';
import { setupFixture } from '../test-util/fixture.js';
import { launchTsserver } from '../test-util/tsserver.js';

const tsserver = launchTsserver();

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  test('reports an unknown property access on a styles binding', async () => {
    const { iff, getRange } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.unknown;
      `,
      'a.module.css': `.a_1 { color: red; }`,
    });
    await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

    const res = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['index.ts'] });

    expect(res.body).toStrictEqual([
      {
        category: 'error',
        code: 2339,
        ...getRange('index.ts', 'unknown'),
        // The `text` is not asserted because the message contains the type shape that
        // varies with `namedExports` and is owned by the TypeScript compiler, not ts-plugin.
        text: expect.any(String),
      },
    ]);
  });

  test('provides the .d.ts-generated type on the styles binding', async () => {
    const { iff } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        type Expected = { a_1: string };
        const _t: Expected = styles;
      `,
      'a.module.css': `.a_1 { color: red; }`,
    });
    await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

    const res = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['index.ts'] });

    expect(res.body).toStrictEqual([]);
  });

  test('reports a semantic diagnostic on a CSS module file', async () => {
    const { iff, getRange } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'a.module.css': `@import './unresolvable.module.css';`,
    });
    await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

    const res = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['a.module.css'] });

    expect(res.body).toStrictEqual([
      {
        category: 'error',
        code: 0,
        source: 'css-modules-kit',
        text: "Cannot import module './unresolvable.module.css'",
        ...getRange('a.module.css', './unresolvable.module.css'),
      },
    ]);
  });
});
