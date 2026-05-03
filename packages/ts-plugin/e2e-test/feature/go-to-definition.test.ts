import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../../test/builder.js';
import { setupFixture } from '../test-util/fixture.js';
import { formatPath, launchTsserver, normalizeDefinitions } from '../test-util/tsserver.js';

const tsserver = launchTsserver();

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  describe('jumps to the top of a CSS module file', () => {
    test('from the styles binding in the import statement', async () => {
      const { iff, getLoc } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': buildStylesImport('./a.module.css', { namedExports }),
        'a.module.css': '',
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const res = await tsserver.sendDefinitionAndBoundSpan({
        file: iff.paths['index.ts'],
        ...getLoc('index.ts', 'styles'),
      });

      expect(normalizeDefinitions(res.body?.definitions ?? [])).toStrictEqual(
        normalizeDefinitions([
          {
            file: formatPath(iff.paths['a.module.css']),
            start: { line: 1, offset: 1 },
            end: { line: 1, offset: 1 },
          },
        ]),
      );
    });

    test('from the import specifier string', async () => {
      const { iff, getLoc } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': buildStylesImport('./a.module.css', { namedExports }),
        'a.module.css': '',
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const res = await tsserver.sendDefinitionAndBoundSpan({
        file: iff.paths['index.ts'],
        ...getLoc('index.ts', "'./a.module.css'"),
      });

      expect(normalizeDefinitions(res.body?.definitions ?? [])).toStrictEqual(
        normalizeDefinitions([
          {
            file: formatPath(iff.paths['a.module.css']),
            start: { line: 1, offset: 1 },
            end: { line: 1, offset: 1 },
          },
        ]),
      );
    });

    test('from the @import specifier string', async () => {
      const { iff, getLoc } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': buildStylesImport('./a.module.css', { namedExports }),
        'a.module.css': `@import './b.module.css';`,
        'b.module.css': '',
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const res = await tsserver.sendDefinitionAndBoundSpan({
        file: iff.paths['a.module.css'],
        ...getLoc('a.module.css', "'./b.module.css'"),
      });

      expect(normalizeDefinitions(res.body?.definitions ?? [])).toStrictEqual(
        normalizeDefinitions([
          {
            file: formatPath(iff.paths['b.module.css']),
            start: { line: 1, offset: 1 },
            end: { line: 1, offset: 1 },
          },
        ]),
      );
    });

    test('from the @value ... from specifier string', async () => {
      const { iff, getLoc } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': buildStylesImport('./a.module.css', { namedExports }),
        'a.module.css': `@value b_1 from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const res = await tsserver.sendDefinitionAndBoundSpan({
        file: iff.paths['a.module.css'],
        ...getLoc('a.module.css', "'./b.module.css'"),
      });

      expect(normalizeDefinitions(res.body?.definitions ?? [])).toStrictEqual(
        normalizeDefinitions([
          {
            file: formatPath(iff.paths['b.module.css']),
            start: { line: 1, offset: 1 },
            end: { line: 1, offset: 1 },
          },
        ]),
      );
    });

    // NOTE: It is strange that `(` has a definition, but we allow it to keep the implementation simple.
    test('from inside the @import url(...) parenthesis', async () => {
      const { iff, getLoc } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': buildStylesImport('./a.module.css', { namedExports }),
        'a.module.css': `@import url(./b.module.css);`,
        'b.module.css': '',
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const res = await tsserver.sendDefinitionAndBoundSpan({
        file: iff.paths['a.module.css'],
        ...getLoc('a.module.css', '(./b.module.css)'),
      });

      expect(normalizeDefinitions(res.body?.definitions ?? [])).toStrictEqual(
        normalizeDefinitions([
          {
            file: formatPath(iff.paths['b.module.css']),
            start: { line: 1, offset: 1 },
            end: { line: 1, offset: 1 },
          },
        ]),
      );
    });
  });

  describe('jumps to a local token declaration', () => {
    test('from styles.<token> access', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_1;
        `,
        'a.module.css': `.a_1 { color: red; }`,
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

    test('from styles[<kebab-case token>] access', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles['a-1'];
        `,
        'a.module.css': `.a-1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const res = await tsserver.sendDefinitionAndBoundSpan({
        file: iff.paths['index.ts'],
        ...getLoc('index.ts', 'a-1'),
      });

      const { start: contextStart, end: contextEnd } = getRange('a.module.css', '.a-1 { color: red; }');
      expect(normalizeDefinitions(res.body?.definitions ?? [])).toStrictEqual(
        normalizeDefinitions([
          {
            file: formatPath(iff.paths['a.module.css']),
            ...getRange('a.module.css', 'a-1'),
            contextStart,
            contextEnd,
          },
        ]),
      );
    });

    test('returns all declarations when the same class is declared multiple times', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
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
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const res = await tsserver.sendDefinitionAndBoundSpan({
        file: iff.paths['index.ts'],
        ...getLoc('index.ts', 'a_1'),
      });

      const decl1Range = getRange('a.module.css', '.a_1 { color: red; }', 0);
      const decl2Range = getRange('a.module.css', '.a_1 { color: red; }', 1);
      expect(normalizeDefinitions(res.body?.definitions ?? [])).toStrictEqual(
        normalizeDefinitions([
          {
            file: formatPath(iff.paths['a.module.css']),
            ...getRange('a.module.css', 'a_1', 0),
            contextStart: decl1Range.start,
            contextEnd: decl1Range.end,
          },
          {
            file: formatPath(iff.paths['a.module.css']),
            ...getRange('a.module.css', 'a_1', 1),
            contextStart: decl2Range.start,
            contextEnd: decl2Range.end,
          },
        ]),
      );
    });
  });

  describe('transitively resolves a re-export to its source declaration', () => {
    test('class re-exported via @import', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.b_1;
        `,
        'a.module.css': `@import './b.module.css';`,
        'b.module.css': `.b_1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const res = await tsserver.sendDefinitionAndBoundSpan({
        file: iff.paths['index.ts'],
        ...getLoc('index.ts', 'b_1'),
      });

      const { start: contextStart, end: contextEnd } = getRange('b.module.css', '.b_1 { color: red; }');
      expect(normalizeDefinitions(res.body?.definitions ?? [])).toStrictEqual(
        normalizeDefinitions([
          {
            file: formatPath(iff.paths['b.module.css']),
            ...getRange('b.module.css', 'b_1'),
            contextStart,
            contextEnd,
          },
        ]),
      );
    });

    test('value re-exported via @value ... from', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.b_1;
        `,
        'a.module.css': `@value b_1 from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const res = await tsserver.sendDefinitionAndBoundSpan({
        file: iff.paths['index.ts'],
        ...getLoc('index.ts', 'b_1'),
      });

      const { start: contextStart, end: contextEnd } = getRange('b.module.css', '@value b_1: red');
      expect(normalizeDefinitions(res.body?.definitions ?? [])).toStrictEqual(
        normalizeDefinitions([
          {
            file: formatPath(iff.paths['b.module.css']),
            ...getRange('b.module.css', 'b_1'),
            contextStart,
            contextEnd,
          },
        ]),
      );
    });

    test('aliased value re-exported via @value ... from', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_alias;
        `,
        'a.module.css': `@value b_1 as a_alias from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const res = await tsserver.sendDefinitionAndBoundSpan({
        file: iff.paths['index.ts'],
        ...getLoc('index.ts', 'a_alias'),
      });

      const { start: contextStart, end: contextEnd } = getRange('b.module.css', '@value b_1: red');
      expect(normalizeDefinitions(res.body?.definitions ?? [])).toStrictEqual(
        normalizeDefinitions([
          {
            file: formatPath(iff.paths['b.module.css']),
            ...getRange('b.module.css', 'b_1'),
            contextStart,
            contextEnd,
          },
        ]),
      );
    });
  });

  describe('jumps from a CSS-side @value ... from binding to its source declaration', () => {
    test('from the import binding', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `@value b_1 from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const res = await tsserver.sendDefinitionAndBoundSpan({
        file: iff.paths['a.module.css'],
        ...getLoc('a.module.css', 'b_1'),
      });

      const { start: contextStart, end: contextEnd } = getRange('b.module.css', '@value b_1: red');
      expect(normalizeDefinitions(res.body?.definitions ?? [])).toStrictEqual(
        normalizeDefinitions([
          {
            file: formatPath(iff.paths['b.module.css']),
            ...getRange('b.module.css', 'b_1'),
            contextStart,
            contextEnd,
          },
        ]),
      );
    });

    test('from the alias name in `name as alias`', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `@value b_1 as a_alias from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const res = await tsserver.sendDefinitionAndBoundSpan({
        file: iff.paths['a.module.css'],
        ...getLoc('a.module.css', 'a_alias'),
      });

      const { start: contextStart, end: contextEnd } = getRange('b.module.css', '@value b_1: red');
      expect(normalizeDefinitions(res.body?.definitions ?? [])).toStrictEqual(
        normalizeDefinitions([
          {
            file: formatPath(iff.paths['b.module.css']),
            ...getRange('b.module.css', 'b_1'),
            contextStart,
            contextEnd,
          },
        ]),
      );
    });

    test('from the source name in `name as alias`', async () => {
      const { iff, getLoc, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.module.css': `@value b_1 as a_alias from './b.module.css';`,
        'b.module.css': `@value b_1: red;`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.module.css'] }] });

      const res = await tsserver.sendDefinitionAndBoundSpan({
        file: iff.paths['a.module.css'],
        ...getLoc('a.module.css', 'b_1'),
      });

      const { start: contextStart, end: contextEnd } = getRange('b.module.css', '@value b_1: red');
      expect(normalizeDefinitions(res.body?.definitions ?? [])).toStrictEqual(
        normalizeDefinitions([
          {
            file: formatPath(iff.paths['b.module.css']),
            ...getRange('b.module.css', 'b_1'),
            contextStart,
            contextEnd,
          },
        ]),
      );
    });
  });
});
