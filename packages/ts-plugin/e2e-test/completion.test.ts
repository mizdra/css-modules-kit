import { join } from '@css-modules-kit/core';
import dedent from 'dedent';
import ts from 'typescript';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../src/test/builder.js';
import { setupFixture } from './test-util/fixture.js';
import { launchTsserver, normalizeCompletionDetails, normalizeCompletionEntry } from './test-util/tsserver.js';

const reactDtsPath = join(require.resolve('@types/react/package.json'), '../index.d.ts');
const tsserver = launchTsserver();

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  describe('styles binding suggestion', () => {
    test('prioritizes the CSS module corresponding to the current component file', async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'a.tsx': `styles;`,
        'a.module.css': '',
        'b.module.css': '',
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.tsx'] }] });
      await tsserver.sendConfigure({
        preferences: {
          includeCompletionsForModuleExports: true,
          quotePreference: 'single',
        },
      });

      const res = await tsserver.sendCompletionInfo({
        file: iff.paths['a.tsx'],
        ...getRange('a.tsx', 'styles').end,
      });

      expect(
        normalizeCompletionEntry(res.body?.entries.filter((entry) => entry.name === 'styles') ?? []),
      ).toStrictEqual(
        normalizeCompletionEntry([
          { name: 'styles', sortText: '0', source: './a.module.css' },
          { name: 'styles', sortText: '16', source: './b.module.css' },
        ]),
      );
    });

    test('excludes generated files from suggestions', async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({
          cmkOptions: { namedExports, dtsOutDir: 'generated' },
        }),
        'a.tsx': `styles;`,
        'a.module.css': '',
        'generated/b.module.css.d.ts': dedent`
          const styles: {};
          export default styles;
        `,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.tsx'] }] });
      await tsserver.sendConfigure({
        preferences: {
          includeCompletionsForModuleExports: true,
          quotePreference: 'single',
        },
      });

      const res = await tsserver.sendCompletionInfo({
        file: iff.paths['a.tsx'],
        ...getRange('a.tsx', 'styles').end,
      });

      expect(
        normalizeCompletionEntry(res.body?.entries.filter((entry) => entry.name === 'styles') ?? []),
      ).toStrictEqual(normalizeCompletionEntry([{ name: 'styles', sortText: '0', source: './a.module.css' }]));
    });

    test('inserts the import statement when accepted', async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': `styles;`,
        'a.module.css': '',
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });
      await tsserver.sendConfigure({
        preferences: { quotePreference: 'single' },
      });

      const res = await tsserver.sendCompletionDetails({
        file: iff.paths['index.ts'],
        ...getRange('index.ts', 'styles').end,
        entryNames: [
          {
            name: 'styles',
            source: './a.module.css',
            data: {
              exportName: ts.InternalSymbolName.Default,
              fileName: iff.paths['a.module.css'],
              moduleSpecifier: './a.module.css',
            },
          },
        ],
      });

      const importStatement = buildStylesImport('./a.module.css', { namedExports });
      expect(normalizeCompletionDetails(res.body!)).toStrictEqual([
        {
          codeActions: [
            {
              changes: [
                {
                  fileName: iff.paths['index.ts'],
                  textChanges: [
                    {
                      start: { line: 1, offset: 1 },
                      end: { line: 1, offset: 1 },
                      newText: `${importStatement}${ts.sys.newLine}${ts.sys.newLine}`,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);
    });
  });

  describe('className attribute snippet', () => {
    test.each([{ quotePreference: 'single' as const }, { quotePreference: 'double' as const }])(
      'completes as className={$$1} with quotePreference: $quotePreference',
      async ({ quotePreference }) => {
        const { iff, getRange } = await setupFixture({
          'tsconfig.json': buildTSConfigJSON({
            compilerOptions: { jsx: 'react-jsx', types: [reactDtsPath] },
            cmkOptions: { namedExports },
          }),
          'a.tsx': dedent`
            ${buildStylesImport('./a.module.css', { namedExports })}
            const jsx = <div className />;
          `,
          'a.module.css': '',
        });
        await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.tsx'] }] });
        await tsserver.sendConfigure({
          preferences: {
            includeCompletionsWithSnippetText: true,
            includeCompletionsWithInsertText: true,
            jsxAttributeCompletionStyle: 'auto',
            quotePreference,
          },
        });

        const res = await tsserver.sendCompletionInfo({
          file: iff.paths['a.tsx'],
          ...getRange('a.tsx', 'className').end,
        });

        expect(
          normalizeCompletionEntry(res.body?.entries.filter((entry) => entry.name === 'className') ?? []),
        ).toStrictEqual(
          normalizeCompletionEntry([{ name: 'className', insertText: 'className={$1}', sortText: expect.anything() }]),
        );
      },
    );
  });
});

describe('named token completion (namedExports: true)', () => {
  describe('prioritizeNamedImports: false', () => {
    test('omits named tokens from suggestions', async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({
          cmkOptions: { namedExports: true, prioritizeNamedImports: false },
        }),
        'index.ts': `a_1;`,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });
      await tsserver.sendConfigure({
        preferences: { includeCompletionsForModuleExports: true },
      });

      const res = await tsserver.sendCompletionInfo({
        file: iff.paths['index.ts'],
        ...getRange('index.ts', 'a_1').end,
      });

      expect(normalizeCompletionEntry(res.body?.entries.filter((entry) => entry.name === 'a_1') ?? [])).toStrictEqual(
        [],
      );
    });
  });

  describe('prioritizeNamedImports: true', () => {
    test('omits the default styles binding from suggestions', async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({
          cmkOptions: { namedExports: true, prioritizeNamedImports: true },
        }),
        'index.ts': `styles;`,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });
      await tsserver.sendConfigure({
        preferences: { includeCompletionsForModuleExports: true },
      });

      const res = await tsserver.sendCompletionInfo({
        file: iff.paths['index.ts'],
        ...getRange('index.ts', 'styles').end,
      });

      expect(
        normalizeCompletionEntry(res.body?.entries.filter((entry) => entry.name === 'styles') ?? []),
      ).toStrictEqual([]);
    });

    test('suggests named token bindings', async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({
          cmkOptions: { namedExports: true, prioritizeNamedImports: true },
        }),
        'index.ts': `a_1;`,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });
      await tsserver.sendConfigure({
        preferences: { includeCompletionsForModuleExports: true },
      });

      const res = await tsserver.sendCompletionInfo({
        file: iff.paths['index.ts'],
        ...getRange('index.ts', 'a_1').end,
      });

      expect(normalizeCompletionEntry(res.body?.entries.filter((entry) => entry.name === 'a_1') ?? [])).toStrictEqual(
        normalizeCompletionEntry([{ name: 'a_1', sortText: '16', source: './a.module.css' }]),
      );
    });
  });
});
