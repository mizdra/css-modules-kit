import { join } from '@css-modules-kit/core';
import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../src/test/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { launchLSPClient } from './test-util/lsp-client.js';
import { testFailsIf } from './test-util/test.js';

const reactDtsPath = join(require.resolve('@types/react/package.json'), '../index.d.ts');
const client = launchLSPClient(fixtureDir);

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  describe('styles binding suggestion', () => {
    // Without the middleware, the CSS module corresponding to the current component file has the same priority as the others.
    test.fails('prioritizes the CSS module corresponding to the current component file', async () => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'a.tsx': `styles;`,
        'a.module.css': '',
        'b.module.css': '',
      });
      await client.openFiles([iff.paths['a.tsx']]);
      await client.sendConfigure({
        preferences: {
          includeCompletionsForModuleExports: true,
          quotePreference: 'single',
        },
      });

      const entries = await client.sendCompletion({
        file: iff.paths['a.tsx'],
        position: getFileSpan('a.tsx', 'styles').range.end,
      });

      expect(entries.filter((entry) => entry.name === 'styles')).toStrictEqual([
        { name: 'styles', sortText: '0', source: './a.module.css' },
        { name: 'styles', sortText: '16', source: './b.module.css' },
      ]);
    });

    // Without the middleware, the default import is inserted even in named-exports mode.
    testFailsIf(namedExports)('inserts the import statement when accepted', async () => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': `styles;`,
        'a.module.css': '',
      });
      await client.openFiles([iff.paths['index.ts']]);
      await client.sendConfigure({
        preferences: { quotePreference: 'single' },
      });

      const details = await client.sendCompletionDetails({
        file: iff.paths['index.ts'],
        position: getFileSpan('index.ts', 'styles').range.end,
        name: 'styles',
        source: './a.module.css',
      });

      const importStatement = buildStylesImport('./a.module.css', { namedExports });
      expect(details).toStrictEqual({
        additionalTextEdits: [
          {
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            newText: `${importStatement}\n\n`,
          },
        ],
      });
    });

    test('suggests the styles entry with an import-alias source', async () => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({
          compilerOptions: { paths: { '@/*': ['./*'] } },
          mapperOptions: { namedExports },
        }),
        'index.ts': `styles;`,
        'a.module.css': '',
      });
      await client.openFiles([iff.paths['index.ts']]);
      await client.sendConfigure({
        preferences: {
          includeCompletionsForModuleExports: true,
          importModuleSpecifierPreference: 'non-relative',
        },
      });

      const entries = await client.sendCompletion({
        file: iff.paths['index.ts'],
        position: getFileSpan('index.ts', 'styles').range.end,
      });

      expect(entries.filter((entry) => entry.name === 'styles')).toStrictEqual([
        { name: 'styles', sortText: '16', source: '@/a.module.css' },
      ]);
    });
  });

  describe.runIf(namedExports)('prioritizeNamedImports: false', () => {
    // Without the middleware, the named exports of a CSS module are suggested like the ones of any other module.
    test.fails('omits named token auto-imports', async () => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({
          mapperOptions: { namedExports, prioritizeNamedImports: false },
        }),
        'index.ts': `a_1;`,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await client.openFiles([iff.paths['index.ts']]);
      await client.sendConfigure({
        preferences: { includeCompletionsForModuleExports: true },
      });

      const entries = await client.sendCompletion({
        file: iff.paths['index.ts'],
        position: getFileSpan('index.ts', 'a_1').range.end,
      });

      expect(entries.filter((entry) => entry.name === 'a_1')).toStrictEqual([]);
    });

    // Without the middleware, the default export for the styles binding suggestion is a member of the namespace.
    test.fails('omits the default export from namespace member completion', async () => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({
          mapperOptions: { namedExports, prioritizeNamedImports: false },
        }),
        'index.ts': dedent`
          import * as styles from './a.module.css';
          styles.
        `,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await client.openFiles([iff.paths['index.ts']]);
      await client.sendConfigure({
        preferences: { includeCompletionsForModuleExports: true },
      });

      const entries = await client.sendCompletion({
        file: iff.paths['index.ts'],
        position: getFileSpan('index.ts', 'styles.').range.end,
      });

      const names = entries.map((entry) => entry.name);
      expect(names).toContain('a_1');
      expect(names).not.toContain('default');
    });
  });

  describe.runIf(namedExports)('prioritizeNamedImports: true', () => {
    test('omits the styles binding auto-import', async () => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({
          mapperOptions: { namedExports, prioritizeNamedImports: true },
        }),
        'index.ts': `styles;`,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await client.openFiles([iff.paths['index.ts']]);
      await client.sendConfigure({
        preferences: { includeCompletionsForModuleExports: true },
      });

      const entries = await client.sendCompletion({
        file: iff.paths['index.ts'],
        position: getFileSpan('index.ts', 'styles').range.end,
      });

      expect(entries.filter((entry) => entry.name === 'styles')).toStrictEqual([]);
    });

    test('suggests named token auto-imports', async () => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({
          mapperOptions: { namedExports, prioritizeNamedImports: true },
        }),
        'index.ts': `a_1;`,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await client.openFiles([iff.paths['index.ts']]);
      await client.sendConfigure({
        preferences: { includeCompletionsForModuleExports: true },
      });

      const entries = await client.sendCompletion({
        file: iff.paths['index.ts'],
        position: getFileSpan('index.ts', 'a_1').range.end,
      });

      expect(entries.filter((entry) => entry.name === 'a_1')).toStrictEqual([
        { name: 'a_1', sortText: '16', source: './a.module.css' },
      ]);
    });
  });
});

// Without the middleware, the className attribute is completed with a string literal or braces depending on its type.
test.fails.each([{ quotePreference: 'single' as const }, { quotePreference: 'double' as const }])(
  'completes the className attribute as className={$$1} with quotePreference: $quotePreference',
  async ({ quotePreference }) => {
    const { iff, getFileSpan } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ compilerOptions: { jsx: 'react-jsx', types: [reactDtsPath] } }),
      'a.tsx': `const jsx = <div className />;`,
    });
    await client.openFiles([iff.paths['a.tsx']]);
    await client.sendConfigure({
      preferences: {
        includeCompletionsWithSnippetText: true,
        includeCompletionsWithInsertText: true,
        jsxAttributeCompletionStyle: 'auto',
        quotePreference,
      },
    });

    const entries = await client.sendCompletion({
      file: iff.paths['a.tsx'],
      position: getFileSpan('a.tsx', 'className').range.end,
    });

    // tsgo appends `?` to the label of an optional member.
    expect(entries.filter((entry) => entry.name === 'className?')).toStrictEqual([
      { name: 'className?', insertText: 'className={$1}', sortText: expect.anything() },
    ]);
  },
);
