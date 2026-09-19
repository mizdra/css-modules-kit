import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../src/test/builder.js';
import { setupFixture } from './test-util/fixture.js';
import { type FileSpanWithContext, formatPath, launchTsserver } from './test-util/tsserver.js';

const tsserver = launchTsserver();

function fileHeadSpan(path: string): FileSpanWithContext {
  return { file: formatPath(path), start: { line: 1, offset: 1 }, end: { line: 1, offset: 1 } };
}

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  test('returns the token definition when the token is defined once', async () => {
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
    const expected = [getFileSpan('a.module.css', 'a_1', { context: '.a_1 { color: red; }' })];
    for (const [name, origin] of cases) {
      const definitions = await tsserver.sendDefinitionAndBoundSpan(origin);
      expect.soft(definitions, name).toStrictEqual(expected);
    }
  });

  test('returns every token definition when the token is defined multiple times', async () => {
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
      getFileSpan('a.module.css', 'a_1', { index: 0, context: '.a_1 { color: red; }' }),
      getFileSpan('a.module.css', 'a_1', { index: 1, context: '.a_1 { color: red; }' }),
    ];
    for (const [name, origin] of cases) {
      const definitions = await tsserver.sendDefinitionAndBoundSpan(origin);
      expect.soft(definitions, name).toStrictEqual(expected);
    }
  });

  test('follows an all token importer to the token definition', async () => {
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
    const expected = [getFileSpan('b.module.css', 'b_1', { context: '.b_1 { color: red; }' })];
    for (const [name, origin] of cases) {
      const definitions = await tsserver.sendDefinitionAndBoundSpan(origin);
      expect.soft(definitions, name).toStrictEqual(expected);
    }
  });

  test('follows a chain of all token importers to the token definition', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.c_1;
      `,
      'a.module.css': `@import './b.module.css';`,
      'b.module.css': `@import './c.module.css';`,
      'c.module.css': `.c_1 { color: red; }`,
    });
    await tsserver.sendUpdateOpen({
      openFiles: [
        { file: iff.paths['index.ts'] },
        { file: iff.paths['a.module.css'] },
        { file: iff.paths['b.module.css'] },
        { file: iff.paths['c.module.css'] },
      ],
    });

    const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('index.ts', 'c_1'));
    expect(definitions).toStrictEqual([getFileSpan('c.module.css', 'c_1', { context: '.c_1 { color: red; }' })]);
  });

  test('follows a named token importer to the token definition', async () => {
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
    const expected = [getFileSpan('b.module.css', 'b_1', { context: '@value b_1: red' })];
    for (const [name, origin] of cases) {
      const definitions = await tsserver.sendDefinitionAndBoundSpan(origin);
      expect.soft(definitions, name).toStrictEqual(expected);
    }
  });

  test('follows a named token importer with alias to the token definition', async () => {
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
    const expected = [getFileSpan('b.module.css', 'b_1', { context: '@value b_1: red' })];
    for (const [name, origin] of cases) {
      const definitions = await tsserver.sendDefinitionAndBoundSpan(origin);
      expect.soft(definitions, name).toStrictEqual(expected);
    }
  });

  test('follows a chain of named token importers to the token definition', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.c_1;
      `,
      'a.module.css': `@value c_1 from './b.module.css';`,
      'b.module.css': `@value c_1 from './c.module.css';`,
      'c.module.css': `@value c_1: red;`,
    });
    await tsserver.sendUpdateOpen({
      openFiles: [
        { file: iff.paths['index.ts'] },
        { file: iff.paths['a.module.css'] },
        { file: iff.paths['b.module.css'] },
        { file: iff.paths['c.module.css'] },
      ],
    });

    const cases = [
      ['from the TS-side styles.<name>', getFileLocation('index.ts', 'c_1')],
      ['from the <name> of the first named token importer', getFileLocation('a.module.css', 'c_1')],
    ] as const;
    const expected = [getFileSpan('c.module.css', 'c_1', { context: '@value c_1: red' })];
    for (const [name, origin] of cases) {
      const definitions = await tsserver.sendDefinitionAndBoundSpan(origin);
      expect.soft(definitions, name).toStrictEqual(expected);
    }
  });

  test("returns the token definition from the TS-side styles['<token>']", async () => {
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

    const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('index.ts', 'a_1'));
    expect(definitions).toStrictEqual([getFileSpan('a.module.css', 'a_1', { context: '.a_1 { color: red; }' })]);
  });

  test('returns the token definition from a local token reference', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'a.module.css': dedent`
        .a_1 { color: red; }
        .a_2 { composes: a_1; }
      `,
    });
    await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

    const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('a.module.css', 'a_1', 1));
    expect(definitions).toStrictEqual([
      getFileSpan('a.module.css', 'a_1', { index: 0, context: '.a_1 { color: red; }' }),
    ]);
  });

  test('returns the token definition from an external token reference', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'a.module.css': `.a_1 { color: red; }`,
      'b.module.css': `.b_1 { composes: a_1 from './a.module.css'; }`,
    });
    await tsserver.sendUpdateOpen({
      openFiles: [{ file: iff.paths['a.module.css'] }, { file: iff.paths['b.module.css'] }],
    });

    const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('b.module.css', 'a_1'));
    expect(definitions).toStrictEqual([getFileSpan('a.module.css', 'a_1', { context: '.a_1 { color: red; }' })]);
  });

  test('returns the head of the imported file from the styles binding and the specifier of a TS-side import statement', async () => {
    const { iff, getFileLocation } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'index.ts': buildStylesImport('./a.module.css', { namedExports }),
      'a.module.css': '',
    });
    await tsserver.sendUpdateOpen({
      openFiles: [{ file: iff.paths['index.ts'] }, { file: iff.paths['a.module.css'] }],
    });

    const cases = [
      ['from the styles binding', getFileLocation('index.ts', 'styles')],
      ['from the specifier', getFileLocation('index.ts', "'./a.module.css'")],
    ] as const;
    const expected = [fileHeadSpan(iff.paths['a.module.css'])];
    for (const [name, origin] of cases) {
      const definitions = await tsserver.sendDefinitionAndBoundSpan(origin);
      expect.soft(definitions, name).toStrictEqual(expected);
    }
  });

  test('returns the head of the specified file from the specifier of a token importer and an external token reference', async () => {
    const { iff, getFileLocation } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'a.module.css': dedent`
        @import './b.module.css';
        @value c_1 from './c.module.css';
        .a_1 { composes: d_1 from './d.module.css'; }
      `,
      'b.module.css': `.b_1 { color: red; }`,
      'c.module.css': `@value c_1: red;`,
      'd.module.css': `.d_1 { color: red; }`,
    });
    await tsserver.sendUpdateOpen({
      openFiles: [
        { file: iff.paths['a.module.css'] },
        { file: iff.paths['b.module.css'] },
        { file: iff.paths['c.module.css'] },
        { file: iff.paths['d.module.css'] },
      ],
    });

    const cases = [
      [
        'from the specifier of an all token importer',
        getFileLocation('a.module.css', "'./b.module.css'"),
        iff.paths['b.module.css'],
      ],
      [
        'from the specifier of a named token importer',
        getFileLocation('a.module.css', "'./c.module.css'"),
        iff.paths['c.module.css'],
      ],
      [
        'from the specifier of an external token reference',
        getFileLocation('a.module.css', "'./d.module.css'"),
        iff.paths['d.module.css'],
      ],
    ] as const;
    for (const [name, origin, specifiedFile] of cases) {
      const definitions = await tsserver.sendDefinitionAndBoundSpan(origin);
      expect.soft(definitions, name).toStrictEqual([fileHeadSpan(specifiedFile)]);
    }
  });

  // NOTE: It is strange that `(` has a definition, but we allow it to keep the implementation simple.
  test('returns the head of the specified file from a url() specifier, even from its opening parenthesis', async () => {
    const { iff, getFileLocation } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
      'a.module.css': `@import url(./b.module.css);`,
      'b.module.css': '',
    });
    await tsserver.sendUpdateOpen({
      openFiles: [{ file: iff.paths['a.module.css'] }, { file: iff.paths['b.module.css'] }],
    });

    const definitions = await tsserver.sendDefinitionAndBoundSpan(getFileLocation('a.module.css', '(./b.module.css)'));
    expect(definitions).toStrictEqual([fileHeadSpan(iff.paths['b.module.css'])]);
  });
});
