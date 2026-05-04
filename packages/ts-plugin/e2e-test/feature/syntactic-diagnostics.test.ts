import { describe, expect, test } from 'vite-plus/test';
import { buildTSConfigJSON } from '../../src/test/builder.js';
import { setupFixture } from '../test-util/fixture.js';
import { launchTsserver } from '../test-util/tsserver.js';

const tsserver = launchTsserver();

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  test('reports `@value` with no name as invalid syntax', async () => {
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

  test('reports `:global(...)` inside `:local(...)` as not allowed', async () => {
    const { iff, getRange } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'a.module.css': `:local(:global(.a_1)) { color: red; }`,
    });
    await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

    const res = await tsserver.sendSyntacticDiagnosticsSync({ file: iff.paths['a.module.css'] });

    expect(res.body).toStrictEqual([
      {
        category: 'error',
        code: 0,
        source: 'css-modules-kit',
        text: 'A `:global(...)` is not allowed inside of `:local(...)`.',
        ...getRange('a.module.css', ':global(.a_1)'),
      },
    ]);
  });

  test('reports `:local` without parens as unsupported', async () => {
    const { iff, getRange } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'a.module.css': `:local .a_1 { color: red; }`,
    });
    await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

    const res = await tsserver.sendSyntacticDiagnosticsSync({ file: iff.paths['a.module.css'] });

    expect(res.body).toStrictEqual([
      {
        category: 'error',
        code: 0,
        source: 'css-modules-kit',
        text: 'css-modules-kit does not support `:local`. Use `:local(...)` instead.',
        ...getRange('a.module.css', ':local'),
      },
    ]);
  });
});
