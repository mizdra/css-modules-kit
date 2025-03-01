import { join } from '@css-modules-kit/core';
import dedent from 'dedent';
import type ts from 'typescript';
import { describe, expect, test } from 'vitest';
import { createIFF } from './test/fixture.js';
import { formatPath, launchTsserver } from './test/tsserver.js';

// eslint-disable-next-line n/no-extraneous-require
const reactDtsPath = join(require.resolve('@types/react/package.json'), '../index.d.ts');

describe('Completion', async () => {
  function simplifyEntry(entries: readonly ts.server.protocol.CompletionEntry[]) {
    return entries.map((entry) => {
      return {
        name: entry.name,
        sortText: entry.sortText,
        ...('source' in entry ? { source: entry.source } : {}),
        ...('insertText' in entry ? { insertText: entry.insertText } : {}),
      };
    });
  }
  const tsserver = launchTsserver();
  const iff = await createIFF({
    'a.tsx': dedent`
      styles;
      const jsx = <div className />;
    `,
    'a.module.css': '',
    'b.module.css': '',
    'tsconfig.json': dedent`
      {
        "compilerOptions": {
          "plugins": [{ "name": "@css-modules-kit/ts-plugin", "languages": ["css"] }],
          "jsx": "react-jsx",
          "types": ["${reactDtsPath}"]
        },
        "cmkOptions": {
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
    },
  });
  test.each([
    {
      name: 'styles',
      file: iff.paths['a.tsx'],
      line: 1,
      offset: 7,
      expected: [
        { name: 'styles', sortText: '0', source: formatPath(iff.paths['a.module.css']) },
        { name: 'styles', sortText: '16', source: formatPath(iff.paths['b.module.css']) },
      ],
    },
    {
      name: 'className',
      file: iff.paths['a.tsx'],
      line: 2,
      offset: 27,
      expected: [{ name: 'className', insertText: 'className={$1}', sortText: expect.anything() }],
    },
  ])('Completions for $name', async ({ name, file, line, offset, expected }) => {
    const res = await tsserver.sendCompletionInfo({
      file,
      line,
      offset,
    });
    expect(simplifyEntry(res.body?.entries.filter((entry) => entry.name === name) ?? [])).toStrictEqual(expected);
  });
});
