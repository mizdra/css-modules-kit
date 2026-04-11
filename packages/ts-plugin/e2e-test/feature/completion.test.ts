import { join } from '@css-modules-kit/core';
import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { createIFF } from '../test-util/fixture.js';
import { launchTsserver, normalizeCompletionEntry } from '../test-util/tsserver.js';

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
