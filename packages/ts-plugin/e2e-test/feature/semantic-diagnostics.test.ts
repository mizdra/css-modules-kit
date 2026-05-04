import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../../src/test/builder.js';
import { setupFixture } from '../test-util/fixture.js';
import { launchTsserver } from '../test-util/tsserver.js';

const tsserver = launchTsserver();

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  describe('from a TS file', () => {
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
  });

  describe('from a CSS file', () => {
    test('reports a missing exported token in @value ... from', async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `@value b_1, b_2 from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const res = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['a.module.css'] });

      expect(res.body).toStrictEqual([
        {
          category: 'error',
          code: 0,
          source: 'css-modules-kit',
          text: "Module './b.module.css' has no exported token 'b_2'.",
          ...getRange('a.module.css', 'b_2'),
        },
      ]);
    });

    test('reports an unresolvable @import specifier', async () => {
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
});
