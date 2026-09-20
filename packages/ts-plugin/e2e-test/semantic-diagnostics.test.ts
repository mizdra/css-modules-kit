import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../src/test/builder.js';
import { setupFixture } from './test-util/fixture.js';
import { launchTsserver } from './test-util/tsserver.js';

const tsserver = launchTsserver();

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  test('reports an unknown property access on a styles binding', async () => {
    const { iff, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.unknown;
      `,
      'a.module.css': `.a_1 { color: red; }`,
    });
    await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

    const res = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['index.ts'] });

    const { start, end } = getFileSpan('index.ts', 'unknown');
    expect(res.body).toStrictEqual([
      {
        category: 'error',
        code: 2339,
        start,
        end,
        // The `text` is not asserted because the message contains the type shape that
        // varies with `namedExports` and is owned by the TypeScript compiler, not ts-plugin.
        text: expect.any(String),
      },
    ]);
  });

  test('types a token on the styles binding as a readonly string', async () => {
    const { iff, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        const value: number = styles.a_1;
        styles.a_1 = '';
      `,
      'a.module.css': `.a_1 { color: red; }`,
    });
    await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

    const res = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['index.ts'] });

    const value = getFileSpan('index.ts', 'value');
    const assignment = getFileSpan('index.ts', 'a_1', { index: 1 });
    expect(res.body).toStrictEqual([
      {
        category: 'error',
        code: 2322,
        text: "Type 'string' is not assignable to type 'number'.",
        start: value.start,
        end: value.end,
      },
      {
        category: 'error',
        code: 2540,
        text: "Cannot assign to 'a_1' because it is a read-only property.",
        start: assignment.start,
        end: assignment.end,
      },
    ]);
  });

  test('reports check-phase diagnostics on a CSS module', async () => {
    const { iff, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'a.module.css': `@import './unresolvable.module.css';`,
    });
    await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

    const res = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['a.module.css'] });

    const { start, end } = getFileSpan('a.module.css', './unresolvable.module.css');
    expect(res.body).toStrictEqual([
      {
        category: 'error',
        code: 0,
        source: 'css-modules-kit',
        text: "Cannot import module './unresolvable.module.css'",
        start,
        end,
      },
    ]);
  });
});
