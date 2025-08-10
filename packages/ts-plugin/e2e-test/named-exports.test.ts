/* eslint-disable @typescript-eslint/naming-convention */
import dedent from 'dedent';
import ts from 'typescript';
import { describe, expect, test } from 'vitest';
import { PROPERTY_DOES_NOT_EXIST_ERROR_CODES } from '../src/language-service/feature/code-fix.js';
import { createIFF } from './test-util/fixture.js';
import {
  formatPath,
  launchTsserver,
  mergeSpanGroups,
  normalizeCodeFixActions,
  normalizeCompletionDetails,
  normalizeCompletionEntry,
  normalizeRefItems,
  normalizeSpanGroups,
} from './test-util/tsserver.js';

describe('supports basic language features', async () => {
  const tsserver = launchTsserver();
  const iff = await createIFF({
    'index.ts': dedent`
      import * as styles from './a.module.css';
      styles.a_1;
      styles.b_1;
      styles.c_1;
      styles.c_alias;
    `,
    'a.module.css': dedent`
      .a_1 { color: red; }
      .a_1 { color: red; }
      @import './b.module.css';
      @value c_1, c_2 as c_alias from './c.module.css';
    `,
    'b.module.css': dedent`
      .b_1 { color: red; }
    `,
    'c.module.css': dedent`
      @value c_1: red;
      @value c_2: red;
    `,
    'tsconfig.json': dedent`
      {
        "cmkOptions": {
          "namedExports": true
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
  const a_1_in_index_ts = {
    file: formatPath(iff.paths['index.ts']),
    start: { line: 2, offset: 8 },
    end: { line: 2, offset: 11 },
  };
  const b_1_in_index_ts = {
    file: formatPath(iff.paths['index.ts']),
    start: { line: 3, offset: 8 },
    end: { line: 3, offset: 11 },
  };
  const c_1_in_index_ts = {
    file: formatPath(iff.paths['index.ts']),
    start: { line: 4, offset: 8 },
    end: { line: 4, offset: 11 },
  };
  const c_alias_in_index_ts = {
    file: formatPath(iff.paths['index.ts']),
    start: { line: 5, offset: 8 },
    end: { line: 5, offset: 15 },
  };
  const a_1_1_in_a_module_css = {
    file: formatPath(iff.paths['a.module.css']),
    start: { line: 1, offset: 2 },
    end: { line: 1, offset: 5 },
  };
  const a_1_2_in_a_module_css = {
    file: formatPath(iff.paths['a.module.css']),
    start: { line: 2, offset: 2 },
    end: { line: 2, offset: 5 },
  };
  const b_1_in_b_module_css = {
    file: formatPath(iff.paths['b.module.css']),
    start: { line: 1, offset: 2 },
    end: { line: 1, offset: 5 },
  };
  const c_1_in_a_module_css = {
    file: formatPath(iff.paths['a.module.css']),
    start: { line: 4, offset: 8 },
    end: { line: 4, offset: 11 },
  };
  const c_2_in_a_module_css = {
    file: formatPath(iff.paths['a.module.css']),
    start: { line: 4, offset: 13 },
    end: { line: 4, offset: 16 },
  };
  const c_alias_in_a_module_css = {
    file: formatPath(iff.paths['a.module.css']),
    start: { line: 4, offset: 20 },
    end: { line: 4, offset: 27 },
  };
  const c_1_in_c_module_css = {
    file: formatPath(iff.paths['c.module.css']),
    start: { line: 1, offset: 8 },
    end: { line: 1, offset: 11 },
  };
  const c_2_in_c_module_css = {
    file: formatPath(iff.paths['c.module.css']),
    start: { line: 2, offset: 8 },
    end: { line: 2, offset: 11 },
  };
  test.each([
    {
      name: 'a_1 in index.ts',
      file: iff.paths['index.ts'],
      line: 2,
      offset: 8,
      expected: mergeSpanGroups([a_1_in_index_ts, a_1_1_in_a_module_css, a_1_2_in_a_module_css]),
    },
    {
      name: 'b_1 in index.ts',
      file: iff.paths['index.ts'],
      line: 3,
      offset: 8,
      expected: mergeSpanGroups([b_1_in_index_ts, b_1_in_b_module_css]),
    },
    {
      name: 'c_1 in index.ts',
      file: iff.paths['index.ts'],
      line: 4,
      offset: 8,
      expected: mergeSpanGroups([c_1_in_index_ts, c_1_in_a_module_css, c_1_in_c_module_css]),
    },
    {
      name: 'c_alias in index.ts',
      file: iff.paths['index.ts'],
      line: 5,
      offset: 8,
      expected: mergeSpanGroups([
        c_alias_in_index_ts,
        c_2_in_a_module_css,
        c_alias_in_a_module_css,
        c_2_in_c_module_css,
      ]),
    },
  ])('Rename Symbol for $name', async ({ file, line, offset, expected }) => {
    const res = await tsserver.sendRename({
      file,
      line,
      offset,
    });
    expect(normalizeSpanGroups(res.body?.locs ?? [])).toStrictEqual(normalizeSpanGroups(expected));
  });
  test.each([
    {
      name: 'a_1 in index.ts',
      file: a_1_in_index_ts.file,
      ...a_1_in_index_ts.start,
      expected: [a_1_in_index_ts, a_1_1_in_a_module_css, a_1_2_in_a_module_css],
    },
    {
      name: 'b_1 in index.ts',
      file: b_1_in_index_ts.file,
      ...b_1_in_index_ts.start,
      expected: [b_1_in_index_ts, b_1_in_b_module_css],
    },
    {
      name: 'c_1 in index.ts',
      file: c_1_in_index_ts.file,
      ...c_1_in_index_ts.start,
      expected: [c_1_in_index_ts, c_1_in_a_module_css, c_1_in_c_module_css],
    },
    {
      name: 'c_alias in index.ts',
      file: c_alias_in_index_ts.file,
      ...c_alias_in_index_ts.start,
      expected: [
        // For some reason, `c_alias_in_a_module_css` and `c_alias_in_index_ts` appear to be duplicated.
        // This is likely a bug in Volar.js.
        c_alias_in_index_ts,
        c_alias_in_index_ts,
        c_2_in_a_module_css,
        c_alias_in_a_module_css,
        c_alias_in_a_module_css,
        c_2_in_c_module_css,
      ],
    },
  ])('Find All References for $name', async ({ file, line, offset, expected }) => {
    const res = await tsserver.sendReferences({
      file,
      line,
      offset,
    });
    expect(normalizeRefItems(res.body?.refs ?? [])).toStrictEqual(normalizeRefItems(expected));
  });
});

describe('supports completions', async () => {
  const baseIff = await createIFF({
    'index.ts': dedent`
      styles;
      a_1;
    `,
    'a.module.css': dedent`
      .a_1 { color: red; }
    `,
  });
  describe('prioritize namespace imports by default', async () => {
    const iff = await baseIff.fork({
      'tsconfig.json': dedent`
        {
          "cmkOptions": {
            "namedExports": true
          }
        }
      `,
    });
    const tsserver = launchTsserver();
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
        expected: [{ name: 'styles', sortText: '16', source: formatPath(iff.paths['a.module.css']) }],
      },
      {
        name: 'a_1',
        entryName: 'a_1',
        file: iff.paths['index.ts'],
        line: 2,
        offset: 4,
        expected: [],
      },
    ])('Completions for $name', async ({ entryName, file, line, offset, expected }) => {
      const res = await tsserver.sendCompletionInfo({
        file,
        line,
        offset,
      });
      expect(
        normalizeCompletionEntry(res.body?.entries.filter((entry) => entry.name === entryName) ?? []),
      ).toStrictEqual(normalizeCompletionEntry(expected));
    });
    test('if the user completes `styles`, auto-import the namespace import', async () => {
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
            } satisfies ts.CompletionEntryData,
          },
        ],
      });
      expect(normalizeCompletionDetails(res.body!)).toStrictEqual([
        {
          codeActions: [
            {
              changes: [
                {
                  fileName: formatPath(iff.paths['index.ts']),
                  textChanges: [
                    {
                      start: { line: 1, offset: 1 },
                      end: { line: 1, offset: 1 },
                      newText: `import * as styles from "./a.module.css";${ts.sys.newLine}${ts.sys.newLine}`,
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
  describe('prioritize named imports if prioritizeNamedImports is true', async () => {
    const iff = await baseIff.fork({
      'tsconfig.json': dedent`
        {
          "cmkOptions": {
            "namedExports": true,
            "prioritizeNamedImports": true
          }
        }
      `,
    });
    const tsserver = launchTsserver();
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
        expected: [{ name: 'a_1', sortText: '16', source: formatPath(iff.paths['a.module.css']) }],
      },
    ])('Completions for $name', async ({ entryName, file, line, offset, expected }) => {
      const res = await tsserver.sendCompletionInfo({
        file,
        line,
        offset,
      });
      expect(
        normalizeCompletionEntry(res.body?.entries.filter((entry) => entry.name === entryName) ?? []),
      ).toStrictEqual(normalizeCompletionEntry(expected));
    });
  });
});

describe('supports code fixes', async () => {
  const baseIff = await createIFF({
    'index.ts': dedent`
      styles;
      a_1;
    `,
    'a.module.css': dedent`
      .a_1 { color: red; }
    `,
  });
  describe('prioritize namespace imports by default', async () => {
    const iff = await baseIff.fork({
      'tsconfig.json': dedent`
        {
          "cmkOptions": {
            "namedExports": true
          }
        }
    `,
    });
    const tsserver = launchTsserver();
    await tsserver.sendUpdateOpen({
      openFiles: [{ file: iff.paths['tsconfig.json'] }],
    });
    test.each([
      {
        name: 'styles',
        file: iff.paths['index.ts'],
        startLine: 1,
        startOffset: 1,
        endLine: 1,
        endOffset: 7,
        expected: [
          {
            fixName: 'import',
            changes: [
              {
                fileName: formatPath(iff.paths['index.ts']),
                textChanges: [
                  {
                    start: { line: 1, offset: 1 },
                    end: { line: 1, offset: 1 },
                    newText: `import * as styles from "./a.module.css";${ts.sys.newLine}${ts.sys.newLine}`,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'a_1',
        file: iff.paths['index.ts'],
        startLine: 2,
        startOffset: 1,
        endLine: 2,
        endOffset: 4,
        expected: [],
      },
    ])('$name', async ({ file, startLine, startOffset, endLine, endOffset, expected }) => {
      const res = await tsserver.sendGetCodeFixes({
        errorCodes: [2304],
        file,
        startLine,
        startOffset,
        endLine,
        endOffset,
      });
      expect(normalizeCodeFixActions(res.body!)).toStrictEqual(normalizeCodeFixActions(expected));
    });
  });
  describe('prioritize named imports if prioritizeNamedImports is true', async () => {
    const iff = await baseIff.fork({
      'tsconfig.json': dedent`
        {
          "cmkOptions": {
            "namedExports": true,
            "prioritizeNamedImports": true
          }
        }
      `,
    });
    const tsserver = launchTsserver();
    await tsserver.sendUpdateOpen({
      openFiles: [{ file: iff.paths['tsconfig.json'] }],
    });
    test.each([
      {
        name: 'styles',
        file: iff.paths['index.ts'],
        startLine: 1,
        startOffset: 1,
        endLine: 1,
        endOffset: 7,
        expected: [],
      },
      {
        name: 'a_1',
        file: iff.paths['index.ts'],
        startLine: 2,
        startOffset: 1,
        endLine: 2,
        endOffset: 4,
        expected: [
          {
            fixName: 'import',
            changes: [
              {
                fileName: formatPath(iff.paths['index.ts']),
                textChanges: [
                  {
                    start: { line: 1, offset: 1 },
                    end: { line: 1, offset: 1 },
                    newText: `import { a_1 } from "./a.module.css";${ts.sys.newLine}${ts.sys.newLine}`,
                  },
                ],
              },
            ],
          },
        ],
      },
    ])('$name', async ({ file, startLine, startOffset, endLine, endOffset, expected }) => {
      const res = await tsserver.sendGetCodeFixes({
        errorCodes: [2304],
        file,
        startLine,
        startOffset,
        endLine,
        endOffset,
      });
      expect(normalizeCodeFixActions(res.body!)).toStrictEqual(normalizeCodeFixActions(expected));
    });
  });
  test('supports adding missing CSS rules', async () => {
    const iff = await createIFF({
      'a.tsx': dedent`
        import * as styles from './a.module.css';
        styles.a_1;
      `,
      'a.module.css': '',
      'tsconfig.json': dedent`
        {
          "cmkOptions": {
            "namedExports": true
          }
        }
    `,
    });
    const tsserver = launchTsserver();
    await tsserver.sendUpdateOpen({
      openFiles: [{ file: iff.paths['tsconfig.json'] }],
    });
    const res = await tsserver.sendGetCodeFixes({
      errorCodes: [PROPERTY_DOES_NOT_EXIST_ERROR_CODES[0]],
      file: iff.paths['a.tsx'],
      startLine: 2,
      startOffset: 8,
      endLine: 2,
      endOffset: 11,
    });
    expect(normalizeCodeFixActions(res.body!)).toStrictEqual(
      normalizeCodeFixActions([
        {
          fixName: 'fixMissingCSSRule',
          changes: [
            {
              fileName: formatPath(iff.paths['a.module.css']),
              textChanges: [
                {
                  start: { line: 1, offset: 1 },
                  end: { line: 1, offset: 1 },
                  newText: '\n.a_1 {\n  \n}',
                },
              ],
            },
          ],
        },
      ]),
    );
  });
});
