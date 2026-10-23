import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../src/test/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { launchLSPClient } from './test-util/lsp-client.js';

const client = launchLSPClient(fixtureDir);

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  test('returns the token definition even when the file contains invalid syntax elsewhere', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.a_1;
      `,
      'a.module.css': dedent`
        .a_1 { color: red; }
        .a_2 {
      `,
    });
    await client.openFiles([iff.paths['index.ts']]);

    const definitions = await client.sendDefinition(getFileLocation('index.ts', 'a_1'));

    expect(definitions).toStrictEqual([getFileSpan('a.module.css', 'a_1')]);
  });

  test('returns success responses even when all token importers form a cycle', async () => {
    const { iff, getFileLocation } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.b_1;
      `,
      'a.module.css': `@import './b.module.css';`,
      'b.module.css': dedent`
        @import './a.module.css';
        .b_1 { color: red; }
      `,
    });
    await client.openFiles([iff.paths['index.ts'], iff.paths['a.module.css'], iff.paths['b.module.css']]);

    const cases = [
      ['from the TS-side styles.<token>', getFileLocation('index.ts', 'b_1')],
      ['from the token definition', getFileLocation('b.module.css', 'b_1')],
      ['from the specifier of the first all token importer', getFileLocation('a.module.css', "'./b.module.css'")],
      ['from the specifier of the second all token importer', getFileLocation('b.module.css', "'./a.module.css'")],
    ] as const;
    for (const [name, origin] of cases) {
      await expect.soft(client.sendDefinition(origin), name).resolves.toBeDefined();
      await expect.soft(client.sendReferences(origin), name).resolves.toBeDefined();
      await expect.soft(client.sendRename(origin), name).resolves.toBeDefined();
    }
  });

  test('returns success responses even when named token importers form a cycle', async () => {
    const { iff, getFileLocation } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.unknown;
      `,
      'a.module.css': `@value unknown from './b.module.css';`,
      'b.module.css': `@value unknown from './a.module.css';`,
    });
    await client.openFiles([iff.paths['index.ts'], iff.paths['a.module.css'], iff.paths['b.module.css']]);

    const cases = [
      ['from the TS-side styles.<name>', getFileLocation('index.ts', 'unknown')],
      ['from the <name> of the first named token importer', getFileLocation('a.module.css', 'unknown')],
      ['from the <name> of the second named token importer', getFileLocation('b.module.css', 'unknown')],
    ] as const;
    for (const [name, origin] of cases) {
      await expect.soft(client.sendDefinition(origin), name).resolves.toBeDefined();
      await expect.soft(client.sendReferences(origin), name).resolves.toBeDefined();
      await expect.soft(client.sendRename(origin), name).resolves.toBeDefined();
    }
  });

  test('returns success responses even when a specifier cannot be resolved', async () => {
    const { iff, getFileLocation } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'a.module.css': dedent`
        @import './unresolvable-1.module.css';
        @value unknown_1 from './unresolvable-2.module.css';
        .a_1 { composes: unknown_2 from './unresolvable-3.module.css'; }
      `,
    });
    await client.openFiles([iff.paths['a.module.css']]);

    const cases = [
      ['from the <name>', getFileLocation('a.module.css', 'unknown_1')],
      ['from the external token reference', getFileLocation('a.module.css', 'unknown_2')],
      ['from the specifier of an all token importer', getFileLocation('a.module.css', "'./unresolvable-1.module.css'")],
      [
        'from the specifier of a named token importer',
        getFileLocation('a.module.css', "'./unresolvable-2.module.css'"),
      ],
      [
        'from the specifier of an external token reference',
        getFileLocation('a.module.css', "'./unresolvable-3.module.css'"),
      ],
    ] as const;
    for (const [name, origin] of cases) {
      await expect.soft(client.sendDefinition(origin), name).resolves.toBeDefined();
      await expect.soft(client.sendReferences(origin), name).resolves.toBeDefined();
      await expect.soft(client.sendRename(origin), name).resolves.toBeDefined();
    }
  });

  test('returns success responses even when a token does not exist', async () => {
    const { iff, getFileLocation } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'a.module.css': dedent`
        @value b_2 from './b.module.css';
        .a_1 { composes: a_2; }
        .a_3 { composes: b_3 from './b.module.css'; }
      `,
      'b.module.css': `.b_1 { color: red; }`,
    });
    await client.openFiles([iff.paths['a.module.css'], iff.paths['b.module.css']]);

    const cases = [
      ['from the <name>', getFileLocation('a.module.css', 'b_2')],
      ['from the local token reference', getFileLocation('a.module.css', 'a_2')],
      ['from the external token reference', getFileLocation('a.module.css', 'b_3')],
    ] as const;
    for (const [name, origin] of cases) {
      await expect.soft(client.sendDefinition(origin), name).resolves.toBeDefined();
      await expect.soft(client.sendReferences(origin), name).resolves.toBeDefined();
      await expect.soft(client.sendRename(origin), name).resolves.toBeDefined();
    }
  });
});
