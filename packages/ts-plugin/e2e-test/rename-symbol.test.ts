import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../src/test/builder.js';
import { setupFixture } from './test-util/fixture.js';
import { launchTsserver } from './test-util/tsserver.js';

const tsserver = launchTsserver();

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  test('renames the token definition and the TS-side styles.<token>', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.a_1;
      `,
      'a.module.css': `.a_1 { color: red; }`,
    });
    await tsserver.sendUpdateOpen({
      openFiles: [{ file: iff.paths['index.ts'] }, { file: iff.paths['a.module.css'] }],
    });

    const cases = [
      ['from the TS-side styles.<token>', getFileLocation('index.ts', 'a_1')],
      ['from the token definition', getFileLocation('a.module.css', 'a_1')],
    ] as const;
    const expected = [getFileSpan('a.module.css', 'a_1'), getFileSpan('index.ts', 'a_1')];
    for (const [name, origin] of cases) {
      const { locs } = await tsserver.sendRename(origin);
      expect.soft(locs, name).toStrictEqual(expected);
    }
  });

  test('renames every token definition when the token is defined multiple times', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.a_1;
      `,
      'a.module.css': dedent`
        .a_1 { color: red; }
        .a_1 { color: red; }
      `,
    });
    await tsserver.sendUpdateOpen({
      openFiles: [{ file: iff.paths['index.ts'] }, { file: iff.paths['a.module.css'] }],
    });

    const cases = [
      ['from the TS-side styles.<token>', getFileLocation('index.ts', 'a_1')],
      ['from the first token definition', getFileLocation('a.module.css', 'a_1', 0)],
      ['from the second token definition', getFileLocation('a.module.css', 'a_1', 1)],
    ] as const;
    const expected = [
      getFileSpan('a.module.css', 'a_1', { index: 0 }),
      getFileSpan('a.module.css', 'a_1', { index: 1 }),
      getFileSpan('index.ts', 'a_1'),
    ];
    for (const [name, origin] of cases) {
      const { locs } = await tsserver.sendRename(origin);
      expect.soft(locs, name).toStrictEqual(expected);
    }
  });

  test('renames a reference that reaches the token definition through an all token importer', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.b_1;
      `,
      'a.module.css': `@import './b.module.css';`,
      'b.module.css': `.b_1 { color: red; }`,
    });
    await tsserver.sendUpdateOpen({
      openFiles: [
        { file: iff.paths['index.ts'] },
        { file: iff.paths['a.module.css'] },
        { file: iff.paths['b.module.css'] },
      ],
    });

    const cases = [
      ['from the TS-side styles.<token>', getFileLocation('index.ts', 'b_1')],
      ['from the token definition', getFileLocation('b.module.css', 'b_1')],
    ] as const;
    const expected = [getFileSpan('b.module.css', 'b_1'), getFileSpan('index.ts', 'b_1')];
    for (const [name, origin] of cases) {
      const { locs } = await tsserver.sendRename(origin);
      expect.soft(locs, name).toStrictEqual(expected);
    }
  });

  // NOTE: For simplicity of implementation, this is not the ideal behavior when renaming from the TS side.
  // The ideal behavior would attach `prefixText: 'b_1 as '` to the binding loc in `a.module.css`
  // so that renaming changes only the alias side. Currently the binding loc is rewritten directly.
  test('renames the <name> of a named token importer', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.b_1;
      `,
      'a.module.css': `@value b_1 from './b.module.css';`,
      'b.module.css': `@value b_1: red;`,
    });
    await tsserver.sendUpdateOpen({
      openFiles: [
        { file: iff.paths['index.ts'] },
        { file: iff.paths['a.module.css'] },
        { file: iff.paths['b.module.css'] },
      ],
    });

    const cases = [
      ['from the TS-side styles.<name>', getFileLocation('index.ts', 'b_1')],
      ['from the <name>', getFileLocation('a.module.css', 'b_1')],
      ['from the token definition', getFileLocation('b.module.css', 'b_1')],
    ] as const;
    const expected = [
      getFileSpan('a.module.css', 'b_1'),
      getFileSpan('b.module.css', 'b_1'),
      getFileSpan('index.ts', 'b_1'),
    ];
    for (const [name, origin] of cases) {
      const { locs } = await tsserver.sendRename(origin);
      expect.soft(locs, name).toStrictEqual(expected);
    }
  });

  // NOTE: Ideally, only the locations of the identifier at the origin (`b_1` or `b_alias`) should be returned,
  // but both are returned for implementation simplicity.
  test('renames both the <name> and the <alias> of a named token importer', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.b_alias;
      `,
      'a.module.css': `@value b_1 as b_alias from './b.module.css';`,
      'b.module.css': `@value b_1: red;`,
    });
    await tsserver.sendUpdateOpen({
      openFiles: [
        { file: iff.paths['index.ts'] },
        { file: iff.paths['a.module.css'] },
        { file: iff.paths['b.module.css'] },
      ],
    });

    const cases = [
      ['from the TS-side styles.<alias>', getFileLocation('index.ts', 'b_alias')],
      ['from the <name>', getFileLocation('a.module.css', 'b_1')],
      ['from the <alias>', getFileLocation('a.module.css', 'b_alias')],
      ['from the token definition', getFileLocation('b.module.css', 'b_1')],
    ] as const;
    const expected = [
      getFileSpan('a.module.css', 'b_1'),
      getFileSpan('a.module.css', 'b_alias'),
      getFileSpan('b.module.css', 'b_1'),
      getFileSpan('index.ts', 'b_alias'),
    ];
    for (const [name, origin] of cases) {
      const { locs } = await tsserver.sendRename(origin);
      expect.soft(locs, name).toStrictEqual(expected);
    }
  });

  test("renames the TS-side styles['<token>']", async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles['a_1'];
      `,
      'a.module.css': `.a_1 { color: red; }`,
    });
    await tsserver.sendUpdateOpen({
      openFiles: [{ file: iff.paths['index.ts'] }, { file: iff.paths['a.module.css'] }],
    });

    const cases = [
      ["from the TS-side styles['<token>']", getFileLocation('index.ts', 'a_1')],
      ['from the token definition', getFileLocation('a.module.css', 'a_1')],
    ] as const;
    const expected = [getFileSpan('a.module.css', 'a_1'), getFileSpan('index.ts', 'a_1')];
    for (const [name, origin] of cases) {
      const { locs } = await tsserver.sendRename(origin);
      expect.soft(locs, name).toStrictEqual(expected);
    }
  });

  test('renames a local token reference', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'a.module.css': dedent`
        .a_1 { color: red; }
        .a_2 { composes: a_1; }
      `,
    });
    await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

    const cases = [
      ['from the local token reference', getFileLocation('a.module.css', 'a_1', 1)],
      ['from the token definition', getFileLocation('a.module.css', 'a_1', 0)],
    ] as const;
    const expected = [
      getFileSpan('a.module.css', 'a_1', { index: 0 }),
      getFileSpan('a.module.css', 'a_1', { index: 1 }),
    ];
    for (const [name, origin] of cases) {
      const { locs } = await tsserver.sendRename(origin);
      expect.soft(locs, name).toStrictEqual(expected);
    }
  });

  test('renames an external token reference', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'a.module.css': `.a_1 { color: red; }`,
      'b.module.css': `.b_1 { composes: a_1 from './a.module.css'; }`,
    });
    await tsserver.sendUpdateOpen({
      openFiles: [{ file: iff.paths['a.module.css'] }, { file: iff.paths['b.module.css'] }],
    });

    const cases = [
      ['from the external token reference', getFileLocation('b.module.css', 'a_1')],
      ['from the token definition', getFileLocation('a.module.css', 'a_1')],
    ] as const;
    const expected = [getFileSpan('a.module.css', 'a_1'), getFileSpan('b.module.css', 'a_1')];
    for (const [name, origin] of cases) {
      const { locs } = await tsserver.sendRename(origin);
      expect.soft(locs, name).toStrictEqual(expected);
    }
  });
});
