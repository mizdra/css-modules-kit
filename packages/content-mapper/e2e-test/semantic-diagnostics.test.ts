import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../src/test/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { DiagnosticSeverity, launchLSPClient } from './test-util/lsp-client.js';

const client = launchLSPClient(fixtureDir);

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  test('reports an unknown property access on a styles binding', async () => {
    const { iff, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.unknown;
      `,
      'a.module.css': `.a_1 { color: red; }`,
    });
    await client.openFiles([iff.paths['index.ts']]);

    const diagnostics = await client.sendDocumentDiagnostic(iff.paths['index.ts']);

    const { range } = getFileSpan('index.ts', 'unknown');
    expect(diagnostics).toStrictEqual([
      {
        range,
        severity: DiagnosticSeverity.Error,
        code: 2339,
        source: 'ts',
        // The `message` is not asserted because the message contains the type shape that
        // varies with `namedExports` and is owned by the TypeScript compiler, not the content mapper.
        message: expect.any(String),
      },
    ]);
  });

  test('types a token on the styles binding as a readonly string', async () => {
    const { iff, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        const value: number = styles.a_1;
        styles.a_1 = '';
      `,
      'a.module.css': `.a_1 { color: red; }`,
    });
    await client.openFiles([iff.paths['index.ts']]);

    const diagnostics = await client.sendDocumentDiagnostic(iff.paths['index.ts']);

    const value = getFileSpan('index.ts', 'value');
    const assignment = getFileSpan('index.ts', 'a_1', { index: 1 });
    expect(diagnostics).toStrictEqual([
      {
        range: value.range,
        severity: DiagnosticSeverity.Error,
        code: 2322,
        source: 'ts',
        message: "Type 'string' is not assignable to type 'number'.",
      },
      {
        range: assignment.range,
        severity: DiagnosticSeverity.Error,
        code: 2540,
        source: 'ts',
        message: "Cannot assign to 'a_1' because it is a read-only property.",
      },
    ]);
  });

  // NOTE: Unlike ts-plugin, which reports its own "Cannot import module" diagnostic on the bare
  // path, the unresolvable specifier is reported by TypeScript itself on the quoted specifier.
  test('reports an unresolvable specifier on a CSS module', async () => {
    const { iff, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'a.module.css': `@import './unresolvable.module.css';`,
    });
    await client.openFiles([iff.paths['a.module.css']]);

    const diagnostics = await client.sendDocumentDiagnostic(iff.paths['a.module.css']);

    const { range } = getFileSpan('a.module.css', "'./unresolvable.module.css'");
    expect(diagnostics).toStrictEqual([
      {
        range,
        severity: DiagnosticSeverity.Error,
        code: 2307,
        source: 'ts',
        message: "Cannot find module './unresolvable.module.css' or its corresponding type declarations.",
      },
    ]);
  });
});
