import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../src/test/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { type FileSpan, formatPath, launchLSPClient } from './test-util/lsp-client.js';
import { testFailsIf } from './test-util/test.js';

const client = launchLSPClient(fixtureDir);

function fileHeadSpan(path: string): FileSpan {
  return { file: formatPath(path), range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } };
}

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  test('returns the token definition when the token is defined once', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.a_1;
      `,
      'a.module.css': `.a_1 { color: red; }`,
    });
    await client.openFiles([iff.paths['index.ts'], iff.paths['a.module.css']]);

    const cases = [
      ['from the TS-side styles.<token>', getFileLocation('index.ts', 'a_1')],
      ['from the token definition', getFileLocation('a.module.css', 'a_1')],
    ] as const;
    const expected = [getFileSpan('a.module.css', 'a_1')];
    for (const [name, origin] of cases) {
      const definitions = await client.sendDefinition(origin);
      expect.soft(definitions, name).toStrictEqual(expected);
    }
  });

  // TODO(middleware): The context of a definition is derived from the generated code, not from the CSS rule.
  test.fails('returns the declaration of the token as the context of the token definition', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.a_1;
      `,
      'a.module.css': `.a_1 { color: red; }`,
    });
    await client.openFiles([iff.paths['index.ts'], iff.paths['a.module.css']]);

    const definitions = await client.sendDefinitionWithContext(getFileLocation('index.ts', 'a_1'));
    expect(definitions).toStrictEqual([getFileSpan('a.module.css', 'a_1', { context: '.a_1 { color: red; }' })]);
  });

  test('returns every token definition when the token is defined multiple times', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.a_1;
      `,
      'a.module.css': dedent`
        .a_1 { color: red; }
        .a_1 { color: red; }
      `,
    });
    await client.openFiles([iff.paths['index.ts'], iff.paths['a.module.css']]);

    const cases = [
      ['from the TS-side styles.<token>', getFileLocation('index.ts', 'a_1')],
      ['from the first token definition', getFileLocation('a.module.css', 'a_1', 0)],
      ['from the second token definition', getFileLocation('a.module.css', 'a_1', 1)],
    ] as const;
    const expected = [
      getFileSpan('a.module.css', 'a_1', { index: 0 }),
      getFileSpan('a.module.css', 'a_1', { index: 1 }),
    ];
    for (const [name, origin] of cases) {
      const definitions = await client.sendDefinition(origin);
      expect.soft(definitions, name).toStrictEqual(expected);
    }
  });

  test('follows an all token importer to the token definition', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.b_1;
      `,
      'a.module.css': `@import './b.module.css';`,
      'b.module.css': `.b_1 { color: red; }`,
    });
    await client.openFiles([iff.paths['index.ts'], iff.paths['a.module.css'], iff.paths['b.module.css']]);

    const cases = [
      ['from the TS-side styles.<token>', getFileLocation('index.ts', 'b_1')],
      ['from the token definition', getFileLocation('b.module.css', 'b_1')],
    ] as const;
    const expected = [getFileSpan('b.module.css', 'b_1')];
    for (const [name, origin] of cases) {
      const definitions = await client.sendDefinition(origin);
      expect.soft(definitions, name).toStrictEqual(expected);
    }
  });

  test('follows a chain of all token importers to the token definition', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.c_1;
      `,
      'a.module.css': `@import './b.module.css';`,
      'b.module.css': `@import './c.module.css';`,
      'c.module.css': `.c_1 { color: red; }`,
    });
    await client.openFiles([
      iff.paths['index.ts'],
      iff.paths['a.module.css'],
      iff.paths['b.module.css'],
      iff.paths['c.module.css'],
    ]);

    const definitions = await client.sendDefinition(getFileLocation('index.ts', 'c_1'));
    expect(definitions).toStrictEqual([getFileSpan('c.module.css', 'c_1')]);
  });

  // TODO(middleware): The named token importer itself is returned as a definition in default-export mode.
  testFailsIf(!namedExports)('follows a named token importer to the token definition', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.b_1;
      `,
      'a.module.css': `@value b_1 from './b.module.css';`,
      'b.module.css': `@value b_1: red;`,
    });
    await client.openFiles([iff.paths['index.ts'], iff.paths['a.module.css'], iff.paths['b.module.css']]);

    const cases = [
      ['from the TS-side styles.<name>', getFileLocation('index.ts', 'b_1')],
      ['from the <name>', getFileLocation('a.module.css', 'b_1')],
      ['from the token definition', getFileLocation('b.module.css', 'b_1')],
    ] as const;
    const expected = [getFileSpan('b.module.css', 'b_1')];
    for (const [name, origin] of cases) {
      const definitions = await client.sendDefinition(origin);
      expect.soft(definitions, name).toStrictEqual(expected);
    }
  });

  // TODO(middleware): The named token importer itself is returned as a definition in default-export mode.
  testFailsIf(!namedExports)('follows a named token importer with alias to the token definition', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.b_alias;
      `,
      'a.module.css': `@value b_1 as b_alias from './b.module.css';`,
      'b.module.css': `@value b_1: red;`,
    });
    await client.openFiles([iff.paths['index.ts'], iff.paths['a.module.css'], iff.paths['b.module.css']]);

    const cases = [
      ['from the TS-side styles.<alias>', getFileLocation('index.ts', 'b_alias')],
      ['from the <name>', getFileLocation('a.module.css', 'b_1')],
      ['from the <alias>', getFileLocation('a.module.css', 'b_alias')],
      ['from the token definition', getFileLocation('b.module.css', 'b_1')],
    ] as const;
    const expected = [getFileSpan('b.module.css', 'b_1')];
    for (const [name, origin] of cases) {
      const definitions = await client.sendDefinition(origin);
      expect.soft(definitions, name).toStrictEqual(expected);
    }
  });

  // TODO(middleware): The named token importer itself is returned as a definition in default-export mode.
  testFailsIf(!namedExports)('follows a chain of named token importers to the token definition', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles.c_1;
      `,
      'a.module.css': `@value c_1 from './b.module.css';`,
      'b.module.css': `@value c_1 from './c.module.css';`,
      'c.module.css': `@value c_1: red;`,
    });
    await client.openFiles([
      iff.paths['index.ts'],
      iff.paths['a.module.css'],
      iff.paths['b.module.css'],
      iff.paths['c.module.css'],
    ]);

    const cases = [
      ['from the TS-side styles.<name>', getFileLocation('index.ts', 'c_1')],
      ['from the <name> of the first named token importer', getFileLocation('a.module.css', 'c_1')],
    ] as const;
    const expected = [getFileSpan('c.module.css', 'c_1')];
    for (const [name, origin] of cases) {
      const definitions = await client.sendDefinition(origin);
      expect.soft(definitions, name).toStrictEqual(expected);
    }
  });

  test("returns the token definition from the TS-side styles['<token>']", async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'index.ts': dedent`
        ${buildStylesImport('./a.module.css', { namedExports })}
        styles['a_1'];
      `,
      'a.module.css': `.a_1 { color: red; }`,
    });
    await client.openFiles([iff.paths['index.ts'], iff.paths['a.module.css']]);

    const definitions = await client.sendDefinition(getFileLocation('index.ts', 'a_1'));
    expect(definitions).toStrictEqual([getFileSpan('a.module.css', 'a_1')]);
  });

  test('returns the token definition from a local token reference', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'a.module.css': dedent`
        .a_1 { color: red; }
        .a_2 { composes: a_1; }
      `,
    });
    await client.openFiles([iff.paths['a.module.css']]);

    const definitions = await client.sendDefinition(getFileLocation('a.module.css', 'a_1', 1));
    expect(definitions).toStrictEqual([getFileSpan('a.module.css', 'a_1', { index: 0 })]);
  });

  test('returns the token definition from an external token reference', async () => {
    const { iff, getFileLocation, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'a.module.css': `.a_1 { color: red; }`,
      'b.module.css': `.b_1 { composes: a_1 from './a.module.css'; }`,
    });
    await client.openFiles([iff.paths['a.module.css'], iff.paths['b.module.css']]);

    const definitions = await client.sendDefinition(getFileLocation('b.module.css', 'a_1'));
    expect(definitions).toStrictEqual([getFileSpan('a.module.css', 'a_1')]);
  });

  // TODO(tsgo): tsgo drops the definition of a namespace import binding that resolves to a mapped file in named-exports mode.
  testFailsIf(namedExports)(
    'returns the head of the imported file from the styles binding and the specifier of a TS-side import statement',
    async () => {
      const { iff, getFileLocation } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': buildStylesImport('./a.module.css', { namedExports }),
        'a.module.css': '',
      });
      await client.openFiles([iff.paths['index.ts'], iff.paths['a.module.css']]);

      const cases = [
        ['from the styles binding', getFileLocation('index.ts', 'styles')],
        ['from the specifier', getFileLocation('index.ts', "'./a.module.css'")],
      ] as const;
      const expected = [fileHeadSpan(iff.paths['a.module.css'])];
      for (const [name, origin] of cases) {
        const definitions = await client.sendDefinition(origin);
        expect.soft(definitions, name).toStrictEqual(expected);
      }
    },
  );

  // TODO(tsgo): tsgo returns no definition from the specifier of `typeof import(...)` and `export ... from` when it specifies a mapped file.
  test.fails('returns the head of the specified file from the specifier of a token importer and an external token reference', async () => {
    const { iff, getFileLocation } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'a.module.css': dedent`
        @import './b.module.css';
        @value c_1 from './c.module.css';
        .a_1 { composes: d_1 from './d.module.css'; }
      `,
      'b.module.css': `.b_1 { color: red; }`,
      'c.module.css': `@value c_1: red;`,
      'd.module.css': `.d_1 { color: red; }`,
    });
    await client.openFiles([
      iff.paths['a.module.css'],
      iff.paths['b.module.css'],
      iff.paths['c.module.css'],
      iff.paths['d.module.css'],
    ]);

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
      const definitions = await client.sendDefinition(origin);
      expect.soft(definitions, name).toStrictEqual([fileHeadSpan(specifiedFile)]);
    }
  });

  // TODO(tsgo): tsgo returns no definition from the specifier of `typeof import(...)` and `export ... from` when it specifies a mapped file.
  test.fails('returns the head of the specified file from a url() specifier', async () => {
    const { iff, getFileLocation } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
      'a.module.css': `@import url(./b.module.css);`,
      'b.module.css': '',
    });
    await client.openFiles([iff.paths['a.module.css'], iff.paths['b.module.css']]);

    const definitions = await client.sendDefinition(getFileLocation('a.module.css', './b.module.css'));
    expect(definitions).toStrictEqual([fileHeadSpan(iff.paths['b.module.css'])]);
  });
});
