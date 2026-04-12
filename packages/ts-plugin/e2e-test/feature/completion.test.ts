import { join } from '@css-modules-kit/core';
import dedent from 'dedent';
import ts from 'typescript';
import { describe, expect, test } from 'vite-plus/test';
import { createIFF } from '../test-util/fixture.js';
import { launchTsserver, normalizeCompletionDetails, normalizeCompletionEntry } from '../test-util/tsserver.js';

const reactDtsPath = join(require.resolve('@types/react/package.json'), '../index.d.ts');

describe('Completion', async () => {
  const tsserver = launchTsserver();
  const iff = await createIFF({
    'a.tsx': dedent`
      styles;
      const jsx = <div className />;
    `,
    'b.tsx': dedent`
      import styles from './b.module.css';
      const jsx = <div className />;
    `,
    'a.module.css': '',
    'b.module.css': '',
    // Generated files should be excluded from import statement suggestions
    'generated/generated.module.css.d.ts': dedent`
      const styles: {};
      export default styles;
    `,
    'tsconfig.json': dedent`
      {
        "compilerOptions": {
          "jsx": "react-jsx",
          "types": ["${reactDtsPath}"]
        },
        "cmkOptions": {
          "enabled": true,
          "dtsOutDir": "generated"
        }
      }
    `,
  });
  await tsserver.sendUpdateOpen({
    openFiles: [{ file: iff.paths['tsconfig.json'] }],
  });
  await tsserver.sendConfigure({
    preferences: {
      includeCompletionsForModuleExports: true,
      includeCompletionsWithSnippetText: true,
      includeCompletionsWithInsertText: true,
      jsxAttributeCompletionStyle: 'auto',
      quotePreference: 'single',
    },
  });
  test.each([
    {
      name: 'styles',
      entryName: 'styles',
      file: iff.paths['a.tsx'],
      line: 1,
      offset: 7,
      expected: [
        { name: 'styles', sortText: '0', source: './a.module.css' },
        { name: 'styles', sortText: '16', source: './b.module.css' },
      ],
    },
    {
      name: "className with `quotePreference: 'double'`",
      entryName: 'className',
      quotePreference: 'double' as const,
      file: iff.paths['a.tsx'],
      line: 2,
      offset: 27,
      expected: [{ name: 'className', insertText: 'className={$1}', sortText: expect.anything() }],
    },
    {
      name: "className with `quotePreference: 'single'`",
      entryName: 'className',
      quotePreference: 'single' as const,
      file: iff.paths['b.tsx'],
      line: 2,
      offset: 27,
      expected: [{ name: 'className', insertText: 'className={$1}', sortText: expect.anything() }],
    },
  ])('Completions for $name', async ({ entryName, quotePreference, file, line, offset, expected }) => {
    await tsserver.sendConfigure({
      preferences: {
        quotePreference: quotePreference ?? 'auto',
      },
    });
    const res = await tsserver.sendCompletionInfo({
      file,
      line,
      offset,
    });
    expect(normalizeCompletionEntry(res.body?.entries.filter((entry) => entry.name === entryName) ?? [])).toStrictEqual(
      normalizeCompletionEntry(expected),
    );
  });
});

test.each([
  {
    name: 'auto-import inserts default import statement if namedExports is false',
    namedExports: false,
    importStatement: `import styles from './a.module.css';`,
  },
  {
    name: 'auto-import inserts namespace import statement if namedExports is true',
    namedExports: true,
    importStatement: `import * as styles from './a.module.css';`,
  },
])('$name', async ({ namedExports, importStatement }) => {
  const tsserver = launchTsserver();
  const iff = await createIFF({
    'index.ts': dedent`
      styles;
    `,
    'a.module.css': '',
    'tsconfig.json': dedent`
      {
        "cmkOptions": {
          "enabled": true,
          "namedExports": ${namedExports}
        }
      }
    `,
  });
  await tsserver.sendUpdateOpen({
    openFiles: [{ file: iff.paths['tsconfig.json'] }],
  });
  await tsserver.sendConfigure({
    preferences: { quotePreference: 'single' },
  });
  const res = await tsserver.sendCompletionDetails({
    file: iff.paths['index.ts'],
    line: 1,
    offset: 7,
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

describe('auto-import suggests named exports instead of namespace import when prioritizeNamedImports is true', async () => {
  const tsserver = launchTsserver();
  const iff = await createIFF({
    'index.ts': dedent`
      styles;
      a_1;
    `,
    'a.module.css': dedent`
      .a_1 { color: red; }
    `,
    'tsconfig.json': dedent`
      {
        "cmkOptions": {
          "enabled": true,
          "namedExports": true,
          "prioritizeNamedImports": true
        }
      }
    `,
  });
  await tsserver.sendUpdateOpen({
    openFiles: [{ file: iff.paths['tsconfig.json'] }],
  });
  await tsserver.sendConfigure({
    preferences: {
      includeCompletionsForModuleExports: true,
    },
  });
  test.each([
    {
      name: 'styles',
      entryName: 'styles',
      file: iff.paths['index.ts'],
      line: 1,
      offset: 7,
      expected: [],
    },
    {
      name: 'a_1',
      entryName: 'a_1',
      file: iff.paths['index.ts'],
      line: 2,
      offset: 4,
      expected: [{ name: 'a_1', sortText: '16', source: './a.module.css' }],
    },
  ])('Completions for $name', async ({ entryName, file, line, offset, expected }) => {
    const res = await tsserver.sendCompletionInfo({
      file,
      line,
      offset,
    });
    expect(normalizeCompletionEntry(res.body?.entries.filter((entry) => entry.name === entryName) ?? [])).toStrictEqual(
      normalizeCompletionEntry(expected),
    );
  });
});
