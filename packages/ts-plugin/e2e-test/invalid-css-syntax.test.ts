import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../src/test/builder.js';
import { setupFixture } from './test-util/fixture.js';
import { formatPath, launchTsserver, normalizeDefinitions } from './test-util/tsserver.js';

const tsserver = launchTsserver();

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  test('resolves Go to Definition on a valid token even when later rules contain invalid syntax', async () => {
    const { iff, getLoc, getRange } = await setupFixture({
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

    const res = await tsserver.sendDefinitionAndBoundSpan({
      file: iff.paths['index.ts'],
      ...getLoc('index.ts', 'a_1'),
    });

    const { start: contextStart, end: contextEnd } = getRange('a.module.css', '.a_1 { color: red; }');
    expect(normalizeDefinitions(res.body?.definitions ?? [])).toStrictEqual(
      normalizeDefinitions([
        {
          file: formatPath(iff.paths['a.module.css']),
          ...getRange('a.module.css', 'a_1'),
          contextStart,
          contextEnd,
        },
      ]),
    );
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
