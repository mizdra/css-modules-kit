import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from './test-util/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import type { Location } from './test-util/lsp-client.js';
import { launchLSPClient, normalizeLocations, toFileUri } from './test-util/lsp-client.js';

const client = launchLSPClient(fixtureDir);

function fileStartLocation(filePath: string): Location {
  return { uri: toFileUri(filePath), range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } };
}

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  describe('for a TS-side import statement', () => {
    test('from the styles binding', async () => {
      const { iff, getPosition } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': buildStylesImport('./a.module.css', { namedExports }),
        'a.module.css': '',
      });
      await client.openFile(iff.paths['index.ts']);

      const locations = await client.sendDefinition(iff.paths['index.ts'], getPosition('index.ts', 'styles'));

      expect(normalizeLocations(locations)).toStrictEqual([fileStartLocation(iff.paths['a.module.css'])]);
    });

    test('from the import specifier', async () => {
      const { iff, getPosition } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': buildStylesImport('./a.module.css', { namedExports }),
        'a.module.css': '',
      });
      await client.openFile(iff.paths['index.ts']);

      const locations = await client.sendDefinition(iff.paths['index.ts'], getPosition('index.ts', "'./a.module.css'"));

      expect(normalizeLocations(locations)).toStrictEqual([fileStartLocation(iff.paths['a.module.css'])]);
    });
  });

  describe('for a token definition', () => {
    test('from a TS-side styles.<token>', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_1;
        `,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await client.openFile(iff.paths['index.ts']);

      const locations = await client.sendDefinition(iff.paths['index.ts'], getPosition('index.ts', 'a_1'));

      expect(normalizeLocations(locations)).toStrictEqual([
        { uri: toFileUri(iff.paths['a.module.css']), range: getRange('a.module.css', 'a_1') },
      ]);
    });

    test('from a TS-side styles[<kebab-case token>]', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles['a-1'];
        `,
        'a.module.css': `.a-1 { color: red; }`,
      });
      await client.openFile(iff.paths['index.ts']);

      const locations = await client.sendDefinition(iff.paths['index.ts'], getPosition('index.ts', 'a-1'));

      expect(normalizeLocations(locations)).toStrictEqual([
        { uri: toFileUri(iff.paths['a.module.css']), range: getRange('a.module.css', 'a-1') },
      ]);
    });

    test('when the token is declared multiple times', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
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
      await client.openFile(iff.paths['index.ts']);

      const locations = await client.sendDefinition(iff.paths['index.ts'], getPosition('index.ts', 'a_1'));

      expect(normalizeLocations(locations)).toStrictEqual([
        { uri: toFileUri(iff.paths['a.module.css']), range: getRange('a.module.css', 'a_1', 0) },
        { uri: toFileUri(iff.paths['a.module.css']), range: getRange('a.module.css', 'a_1', 1) },
      ]);
    });

    test('from a CSS-side token definition', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_1;
        `,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await client.openFile(iff.paths['a.module.css']);

      const locations = await client.sendDefinition(iff.paths['a.module.css'], getPosition('a.module.css', 'a_1'));

      expect(normalizeLocations(locations)).toStrictEqual([
        { uri: toFileUri(iff.paths['a.module.css']), range: getRange('a.module.css', 'a_1') },
      ]);
    });
  });

  describe('for an all token importer', () => {
    test('from a TS-side styles.<token>', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.b_1;
        `,
        'a.module.css': `@import './b.module.css';`,
        'b.module.css': `.b_1 { color: red; }`,
      });
      await client.openFile(iff.paths['index.ts']);

      const locations = await client.sendDefinition(iff.paths['index.ts'], getPosition('index.ts', 'b_1'));

      expect(normalizeLocations(locations)).toStrictEqual([
        { uri: toFileUri(iff.paths['b.module.css']), range: getRange('b.module.css', 'b_1') },
      ]);
    });

    test('from a CSS-side specifier', async () => {
      const { iff, getPosition } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': buildStylesImport('./a.module.css', { namedExports }),
        'a.module.css': `@import './b.module.css';`,
        'b.module.css': '',
      });
      await client.openFile(iff.paths['a.module.css']);

      const locations = await client.sendDefinition(
        iff.paths['a.module.css'],
        getPosition('a.module.css', "'./b.module.css'"),
      );

      expect(normalizeLocations(locations)).toStrictEqual([fileStartLocation(iff.paths['b.module.css'])]);
    });

    test('from inside a CSS-side url() specifier', async () => {
      const { iff, getPosition } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': buildStylesImport('./a.module.css', { namedExports }),
        'a.module.css': `@import url(./b.module.css);`,
        'b.module.css': '',
      });
      await client.openFile(iff.paths['a.module.css']);

      const locations = await client.sendDefinition(
        iff.paths['a.module.css'],
        getPosition('a.module.css', './b.module.css'),
      );

      expect(normalizeLocations(locations)).toStrictEqual([fileStartLocation(iff.paths['b.module.css'])]);
    });
  });

  describe('for a named token importer', () => {
    test('from a TS-side styles.<name>', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.b_1;
        `,
        'a.module.css': `@value b_1 from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await client.openFile(iff.paths['index.ts']);

      const locations = await client.sendDefinition(iff.paths['index.ts'], getPosition('index.ts', 'b_1'));

      expect(normalizeLocations(locations)).toStrictEqual([
        { uri: toFileUri(iff.paths['b.module.css']), range: getRange('b.module.css', 'b_1') },
      ]);
    });

    test('from a TS-side styles.<alias>', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.b_alias;
        `,
        'a.module.css': `@value b_1 as b_alias from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await client.openFile(iff.paths['index.ts']);

      const locations = await client.sendDefinition(iff.paths['index.ts'], getPosition('index.ts', 'b_alias'));

      expect(normalizeLocations(locations)).toStrictEqual([
        { uri: toFileUri(iff.paths['b.module.css']), range: getRange('b.module.css', 'b_1') },
      ]);
    });

    test('from a CSS-side specifier', async () => {
      const { iff, getPosition } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': buildStylesImport('./a.module.css', { namedExports }),
        'a.module.css': `@value b_1 from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await client.openFile(iff.paths['a.module.css']);

      const locations = await client.sendDefinition(
        iff.paths['a.module.css'],
        getPosition('a.module.css', "'./b.module.css'"),
      );

      expect(normalizeLocations(locations)).toStrictEqual([fileStartLocation(iff.paths['b.module.css'])]);
    });

    test('from a CSS-side <name>', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'a.module.css': `@value b_1 from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await client.openFile(iff.paths['a.module.css']);

      const locations = await client.sendDefinition(iff.paths['a.module.css'], getPosition('a.module.css', 'b_1'));

      expect(normalizeLocations(locations)).toStrictEqual([
        { uri: toFileUri(iff.paths['b.module.css']), range: getRange('b.module.css', 'b_1') },
      ]);
    });

    test('from a CSS-side <name> with alias', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'a.module.css': `@value b_1 as b_alias from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await client.openFile(iff.paths['a.module.css']);

      const locations = await client.sendDefinition(iff.paths['a.module.css'], getPosition('a.module.css', 'b_1'));

      expect(normalizeLocations(locations)).toStrictEqual([
        { uri: toFileUri(iff.paths['b.module.css']), range: getRange('b.module.css', 'b_1') },
      ]);
    });

    test('from a CSS-side <alias>', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'a.module.css': `@value b_1 as b_alias from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await client.openFile(iff.paths['a.module.css']);

      const locations = await client.sendDefinition(iff.paths['a.module.css'], getPosition('a.module.css', 'b_alias'));

      expect(normalizeLocations(locations)).toStrictEqual([
        { uri: toFileUri(iff.paths['b.module.css']), range: getRange('b.module.css', 'b_1') },
      ]);
    });
  });

  describe('for a local token reference', () => {
    test('from a local token reference', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'a.module.css': dedent`
          @keyframes a_1 { from {} to {} }
          .a_2 { animation-name: a_1; }
        `,
      });
      await client.openFile(iff.paths['a.module.css']);

      const locations = await client.sendDefinition(iff.paths['a.module.css'], getPosition('a.module.css', 'a_1', 1));

      expect(normalizeLocations(locations)).toStrictEqual([
        { uri: toFileUri(iff.paths['a.module.css']), range: getRange('a.module.css', 'a_1', 0) },
      ]);
    });

    test('from each <name> in a multi-value local token reference', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'a.module.css': dedent`
          @keyframes a_1 { from {} to {} }
          @keyframes a_2 { from {} to {} }
          .a_3 { animation-name: a_1, a_2; }
        `,
      });
      await client.openFile(iff.paths['a.module.css']);

      const a1Locations = await client.sendDefinition(iff.paths['a.module.css'], getPosition('a.module.css', 'a_1', 1));
      expect(normalizeLocations(a1Locations)).toStrictEqual([
        { uri: toFileUri(iff.paths['a.module.css']), range: getRange('a.module.css', 'a_1', 0) },
      ]);

      const a2Locations = await client.sendDefinition(iff.paths['a.module.css'], getPosition('a.module.css', 'a_2', 1));
      expect(normalizeLocations(a2Locations)).toStrictEqual([
        { uri: toFileUri(iff.paths['a.module.css']), range: getRange('a.module.css', 'a_2', 0) },
      ]);
    });

    test('from a kebab-case local token reference', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'a.module.css': dedent`
          @keyframes a-1 { from {} to {} }
          .a_2 { animation-name: a-1; }
        `,
      });
      await client.openFile(iff.paths['a.module.css']);

      const locations = await client.sendDefinition(iff.paths['a.module.css'], getPosition('a.module.css', 'a-1', 1));

      expect(normalizeLocations(locations)).toStrictEqual([
        { uri: toFileUri(iff.paths['a.module.css']), range: getRange('a.module.css', 'a-1', 0) },
      ]);
    });

    test('from a local token reference whose target is imported', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'a.module.css': dedent`
          @import './b.module.css';
          .a_1 { animation-name: b_1; }
        `,
        'b.module.css': `@keyframes b_1 { from {} to {} }`,
      });
      await client.openFile(iff.paths['a.module.css']);

      const locations = await client.sendDefinition(iff.paths['a.module.css'], getPosition('a.module.css', 'b_1'));

      expect(normalizeLocations(locations)).toStrictEqual([
        { uri: toFileUri(iff.paths['b.module.css']), range: getRange('b.module.css', 'b_1') },
      ]);
    });
  });

  describe('for an external token reference', () => {
    test('from an external token reference', async () => {
      const { iff, getPosition, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'a.module.css': `.a_1 { composes: b_1 from './b.module.css'; }`,
        'b.module.css': `.b_1 { color: red; }`,
      });
      await client.openFile(iff.paths['a.module.css']);

      const locations = await client.sendDefinition(iff.paths['a.module.css'], getPosition('a.module.css', 'b_1'));

      expect(normalizeLocations(locations)).toStrictEqual([
        { uri: toFileUri(iff.paths['b.module.css']), range: getRange('b.module.css', 'b_1') },
      ]);
    });
  });
});
