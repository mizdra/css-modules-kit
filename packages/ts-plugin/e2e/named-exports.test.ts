/* eslint-disable @typescript-eslint/naming-convention */
import dedent from 'dedent';
import { describe, expect, test } from 'vitest';
import { createIFF } from './test/fixture.js';
import {
  compareCompletionEntries,
  formatPath,
  launchTsserver,
  mergeSpanGroups,
  simplifyCompletionEntry,
  simplifyRefItems,
  simplifySpanGroups,
  sortRefItems,
  sortSpanGroups,
} from './test/tsserver.js';

describe('supports navigation features', async () => {
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
    'completion.ts': dedent`
      styles;
      a_1;
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
    expect(sortSpanGroups(simplifySpanGroups(res.body?.locs ?? []))).toStrictEqual(sortSpanGroups(expected));
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
    expect(sortRefItems(simplifyRefItems(res.body?.refs ?? []))).toStrictEqual(sortRefItems(expected));
  });
  test.each([
    {
      name: 'styles',
      entryName: 'styles',
      file: iff.paths['completion.ts'],
      line: 1,
      offset: 7,
      expected: [
        { name: 'styles', sortText: '0', source: formatPath(iff.paths['a.module.css']) },
        { name: 'styles', sortText: '16', source: formatPath(iff.paths['b.module.css']) },
        { name: 'styles', sortText: '16', source: formatPath(iff.paths['c.module.css']) },
      ],
    },
    {
      name: 'a_1',
      entryName: 'a_1',
      file: iff.paths['completion.ts'],
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
      simplifyCompletionEntry(res.body?.entries.filter((entry) => entry.name === entryName) ?? []).sort(
        compareCompletionEntries,
      ),
    ).toStrictEqual(expected.sort(compareCompletionEntries));
  });
});
