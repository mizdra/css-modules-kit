import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from './test-util/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { launchLSPClient } from './test-util/lsp-client.js';

const client = launchLSPClient(fixtureDir);

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  test('reports an unknown property access on a styles binding', async () => {
    const { iff, getRange } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.unknown;
      `,
      'a.module.css': `.a_1 { color: red; }`,
    });
    await client.openFile(iff.paths['index.ts']);

    const report = await client.sendDocumentDiagnostic(iff.paths['index.ts']);

    expect(report.items).toStrictEqual([
      expect.objectContaining({ code: 2339, range: getRange('index.ts', 'unknown') }),
    ]);
  });

  test('provides the mapper-generated type on the styles binding', async () => {
    const { iff } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        type Expected = { a_1: string };
        export const _t: Expected = styles;
      `,
      'a.module.css': `.a_1 { color: red; }`,
    });
    await client.openFile(iff.paths['index.ts']);

    const report = await client.sendDocumentDiagnostic(iff.paths['index.ts']);

    expect(report.items).toStrictEqual([]);
  });

  // NOTE: Unlike ts-plugin, which reports its own "Cannot import module" diagnostic on the bare
  // path, the unresolvable import is reported by TypeScript itself (TS2307) on the quoted
  // specifier.
  test('reports a semantic diagnostic on a CSS module file', async () => {
    const { iff, getRange } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'a.module.css': `@import './unresolvable.module.css';`,
    });
    await client.openFile(iff.paths['a.module.css']);

    const report = await client.sendDocumentDiagnostic(iff.paths['a.module.css']);

    expect(report.items).toStrictEqual([
      expect.objectContaining({ code: 2307, range: getRange('a.module.css', `'./unresolvable.module.css'`) }),
    ]);
  });

  test('reports a syntactic diagnostic on a CSS module file', async () => {
    const { iff, getRange } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'a.module.css': `@value;`,
    });
    await client.openFile(iff.paths['a.module.css']);

    const report = await client.sendDocumentDiagnostic(iff.paths['a.module.css']);

    expect(report.items).toStrictEqual([
      expect.objectContaining({
        message: '`@value` is a invalid syntax.',
        range: getRange('a.module.css', '@value;'),
      }),
    ]);
  });
});
