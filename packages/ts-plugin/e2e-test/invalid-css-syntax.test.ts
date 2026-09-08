import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../src/test/builder.js';
import { setupFixture } from './test-util/fixture.js';
import { launchTsserver } from './test-util/tsserver.js';

const tsserver = launchTsserver();

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  test('resolves Go to Definition on a valid token even when later rules contain invalid syntax', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.a_1;
      `,
      'a.module.css': dedent`
        .a_1 { color: red; }
        .a_2 {
      `,
    });
    await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

    const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('index.ts', 'a_1'));

    expect(definitions).toStrictEqual([getFileSpan('a.module.css', 'a_1', { context: '.a_1 { color: red; }' })]);
  });

  test('reports no syntactic diagnostics for a CSS module with parse errors', async () => {
    const { iff } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'a.module.css': dedent`
        .a_1 { color: red; }
        .a_2 {
      `,
    });
    await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

    const res = await tsserver.sendSyntacticDiagnosticsSync({
      file: iff.paths['a.module.css'],
    });

    expect(res.body).toStrictEqual([]);
  });
});
