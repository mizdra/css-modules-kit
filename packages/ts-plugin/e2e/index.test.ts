/* eslint-disable @typescript-eslint/naming-convention */
import dedent from 'dedent';
import type ts from 'typescript';
import { describe, expect, test } from 'vitest';
import { createIFF } from './test/fixture.js';
import { launchTsserver } from './test/tsserver.js';

function formatPath(path: string) {
  // In windows, tsserver returns paths with '/' instead of '\\'.
  return path.replaceAll('\\', '/');
}

describe('Go to Definition', async () => {
  const tsserver = launchTsserver();
  const iff = await createIFF({
    'index.ts': dedent`
      import styles from './a.module.css';
      styles.a_1;
      styles.a_2;
      styles.a_3;
      styles.b_1;
      styles.c_1;
      styles.c_alias;
    `,
    'a.module.css': dedent`
      @import './b.module.css';
      @value c_1, c_2 as c_alias from './c.module.css';
      .a_1 { color: red; }
      .a_2 { color: red; }
      .a_2 { color: red; }
      @value a_3: red;
    `,
    'b.module.css': dedent`
      .b_1 { color: red; }
    `,
    'c.module.css': dedent`
      @value c_1: red;
      @value c_2: red;
    `,
    'hcm.config.mjs': dedent`
      export default {
        pattern: '**/*.module.css',
        dtsOutDir: 'generated',
      };
    `,
    'tsconfig.json': dedent`
      {
        "compilerOptions": {}
      }
    `,
  });
  await tsserver.sendUpdateOpen({
    openFiles: [{ file: iff.paths['index.ts'] }],
  });
  test.each([
    {
      name: 'styles in index.ts',
      file: iff.paths['index.ts'],
      line: 1,
      offset: 8,
      expected: [
        { file: formatPath(iff.paths['a.module.css']), start: { line: 1, offset: 1 }, end: { line: 1, offset: 1 } },
      ],
    },
    {
      name: "'./a.module.css' in index.ts",
      file: iff.paths['index.ts'],
      line: 1,
      offset: 20,
      expected: [
        { file: formatPath(iff.paths['a.module.css']), start: { line: 1, offset: 1 }, end: { line: 1, offset: 1 } },
      ],
    },
    {
      name: 'a_1 in index.ts',
      file: iff.paths['index.ts'],
      line: 2,
      offset: 8,
      expected: [
        { file: formatPath(iff.paths['a.module.css']), start: { line: 3, offset: 2 }, end: { line: 3, offset: 5 } },
      ],
    },
    {
      name: 'a_2 in index.ts',
      file: iff.paths['index.ts'],
      line: 3,
      offset: 8,
      expected: [
        { file: formatPath(iff.paths['a.module.css']), start: { line: 5, offset: 2 }, end: { line: 5, offset: 5 } },
        { file: formatPath(iff.paths['a.module.css']), start: { line: 4, offset: 2 }, end: { line: 4, offset: 5 } },
      ],
    },
    {
      name: 'a_3 in index.ts',
      file: iff.paths['index.ts'],
      line: 4,
      offset: 8,
      expected: [
        { file: formatPath(iff.paths['a.module.css']), start: { line: 6, offset: 8 }, end: { line: 6, offset: 11 } },
      ],
    },
    {
      name: 'b_1 in index.ts',
      file: iff.paths['index.ts'],
      line: 5,
      offset: 8,
      expected: [
        { file: formatPath(iff.paths['b.module.css']), start: { line: 1, offset: 2 }, end: { line: 1, offset: 5 } },
      ],
    },
    {
      name: 'c_1 in index.ts',
      file: iff.paths['index.ts'],
      line: 6,
      offset: 8,
      expected: [
        { file: formatPath(iff.paths['c.module.css']), start: { line: 1, offset: 8 }, end: { line: 1, offset: 11 } },
      ],
    },
  ])('Go to Definition for $name', async ({ file, line, offset, expected }) => {
    const res = await tsserver.sendDefinitionAndBoundSpan({
      file,
      line,
      offset,
    });
    expect(res.body?.definitions).toStrictEqual(expected);
  });
  // TODO: Pass following tests
  test.skip.each([
    {
      name: 'a_2 in a.module.ts',
      file: iff.paths['a.module.css'],
      line: 4,
      offset: 2,
      expected: [
        { file: formatPath(iff.paths['a.module.css']), start: { line: 5, offset: 2 }, end: { line: 5, offset: 5 } },
        { file: formatPath(iff.paths['a.module.css']), start: { line: 4, offset: 2 }, end: { line: 4, offset: 5 } },
      ],
    },
    {
      name: 'c_1 in a.module.ts',
      file: iff.paths['a.module.css'],
      line: 2,
      offset: 8,
      expected: [
        { file: formatPath(iff.paths['c.module.css']), start: { line: 1, offset: 8 }, end: { line: 1, offset: 11 } },
      ],
    },
    {
      name: 'c_alias in index.ts',
      file: iff.paths['index.ts'],
      line: 8,
      offset: 8,
      expected: [
        { file: formatPath(iff.paths['c.module.css']), start: { line: 2, offset: 8 }, end: { line: 2, offset: 11 } },
      ],
    },
    {
      name: 'c_alias in a.module.css',
      file: iff.paths['a.module.css'],
      line: 2,
      offset: 20,
      expected: [
        { file: formatPath(iff.paths['c.module.css']), start: { line: 2, offset: 8 }, end: { line: 2, offset: 11 } },
      ],
    },
    {
      name: 'c_2 in a.module.css',
      file: iff.paths['a.module.css'],
      line: 2,
      offset: 13,
      expected: [
        { file: formatPath(iff.paths['c.module.css']), start: { line: 2, offset: 8 }, end: { line: 2, offset: 11 } },
      ],
    },
  ])('Go to Definition for $name', async ({ file, line, offset, expected }) => {
    const res = await tsserver.sendDefinitionAndBoundSpan({
      file,
      line,
      offset,
    });
    expect(res.body?.definitions).toStrictEqual(expected);
  });
});

describe('Find All References', async () => {
  function simplifyRefs(refs: readonly ts.server.protocol.ReferencesResponseItem[]) {
    return refs.map((ref) => {
      return {
        file: formatPath(ref.file),
        start: ref.start,
        end: ref.end,
      };
    });
  }
  function sortRefs(refs: readonly Pick<ts.server.protocol.ReferencesResponseItem, 'file' | 'start'>[]) {
    return refs.toSorted((a, b) => {
      return a.file.localeCompare(b.file) || a.start.line - b.start.line || a.start.offset - b.start.offset;
    });
  }

  const tsserver = launchTsserver();
  const iff = await createIFF({
    'index.ts': dedent`
      import styles from './a.module.css';
      styles.a_1;
      styles.b_1;
      styles.c_1;
      styles.c_alias;
    `,
    'a.module.css': dedent`
      @import './b.module.css';
      @value c_1, c_2 as c_alias from './c.module.css';
      .a_1 { color: red; }
      .a_1 { color: red; }
    `,
    'b.module.css': dedent`
      .b_1 { color: red; }
    `,
    'c.module.css': dedent`
      @value c_1: red;
      @value c_2: red;
    `,
    'hcm.config.mjs': dedent`
      export default {
        pattern: '**/*.module.css',
        dtsOutDir: 'generated',
      };
    `,
    'tsconfig.json': dedent`
      {
        "compilerOptions": {}
      }
    `,
  });
  const a_1_in_index_ts = {
    file: formatPath(iff.paths['index.ts']),
    start: { line: 2, offset: 8 },
    end: { line: 2, offset: 11 },
  };
  const a_1_1_in_a_module_css = {
    file: formatPath(iff.paths['a.module.css']),
    start: { line: 3, offset: 2 },
    end: { line: 3, offset: 5 },
  };
  const a_1_2_in_a_module_css = {
    file: formatPath(iff.paths['a.module.css']),
    start: { line: 4, offset: 2 },
    end: { line: 4, offset: 5 },
  };
  const b_1_in_index_ts = {
    file: formatPath(iff.paths['index.ts']),
    start: { line: 3, offset: 8 },
    end: { line: 3, offset: 11 },
  };
  const b_1_in_b_module_css = {
    file: formatPath(iff.paths['b.module.css']),
    start: { line: 1, offset: 2 },
    end: { line: 1, offset: 5 },
  };
  const c_1_in_index_ts = {
    file: formatPath(iff.paths['index.ts']),
    start: { line: 4, offset: 8 },
    end: { line: 4, offset: 11 },
  };
  const c_1_in_a_module_css = {
    file: formatPath(iff.paths['a.module.css']),
    start: { line: 2, offset: 8 },
    end: { line: 2, offset: 11 },
  };
  const c_1_in_c_module_css = {
    file: formatPath(iff.paths['c.module.css']),
    start: { line: 1, offset: 8 },
    end: { line: 1, offset: 11 },
  };
  const c_alias_in_index_ts = {
    file: formatPath(iff.paths['index.ts']),
    start: { line: 5, offset: 8 },
    end: { line: 5, offset: 15 },
  };
  const c_alias_in_a_module_css = {
    file: formatPath(iff.paths['a.module.css']),
    start: { line: 2, offset: 20 },
    end: { line: 2, offset: 27 },
  };
  const c_2_in_a_module_css = {
    file: formatPath(iff.paths['a.module.css']),
    start: { line: 2, offset: 13 },
    end: { line: 2, offset: 16 },
  };
  const c_2_in_c_module_css = {
    file: formatPath(iff.paths['c.module.css']),
    start: { line: 2, offset: 8 },
    end: { line: 2, offset: 11 },
  };
  await tsserver.sendUpdateOpen({
    openFiles: [{ file: iff.paths['index.ts'] }],
  });
  test.each([
    {
      name: 'styles in index.ts',
      file: iff.paths['index.ts'],
      line: 1,
      offset: 8,
      expected: [
        { file: formatPath(iff.paths['index.ts']), start: { line: 1, offset: 8 }, end: { line: 1, offset: 14 } },
        { file: formatPath(iff.paths['index.ts']), start: { line: 2, offset: 1 }, end: { line: 2, offset: 7 } },
        { file: formatPath(iff.paths['index.ts']), start: { line: 3, offset: 1 }, end: { line: 3, offset: 7 } },
        { file: formatPath(iff.paths['index.ts']), start: { line: 4, offset: 1 }, end: { line: 4, offset: 7 } },
        { file: formatPath(iff.paths['index.ts']), start: { line: 5, offset: 1 }, end: { line: 5, offset: 7 } },
      ],
    },
    {
      name: "'./a.module.css' in index.ts",
      file: iff.paths['index.ts'],
      line: 1,
      offset: 20,
      expected: [
        { file: formatPath(iff.paths['index.ts']), start: { line: 1, offset: 21 }, end: { line: 1, offset: 35 } },
      ],
    },
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
      name: 'b_1 in b.module.css',
      file: b_1_in_b_module_css.file,
      ...b_1_in_b_module_css.start,
      expected: [b_1_in_index_ts, b_1_in_b_module_css],
    },
    {
      name: 'c_alias in index.ts',
      file: c_alias_in_index_ts.file,
      ...c_alias_in_index_ts.start,
      expected: [c_alias_in_index_ts, c_alias_in_a_module_css],
    },
    {
      name: 'c_alias in a.module.css',
      file: c_alias_in_a_module_css.file,
      ...c_alias_in_a_module_css.start,
      expected: [c_alias_in_index_ts, c_alias_in_a_module_css],
    },
  ])('Find All References for $name', async ({ file, line, offset, expected }) => {
    const res = await tsserver.sendReferences({
      file,
      line,
      offset,
    });
    expect(sortRefs(simplifyRefs(res.body?.refs ?? []))).toStrictEqual(sortRefs(expected));
  });
  // TODO: Pass following tests
  test.skip.each([
    {
      name: 'a_1 in a.module.css',
      file: a_1_1_in_a_module_css.file,
      ...a_1_1_in_a_module_css.start,
      expected: [a_1_in_index_ts, a_1_1_in_a_module_css, a_1_2_in_a_module_css],
    },
    {
      name: 'c_1 in index.ts',
      file: c_1_in_index_ts.file,
      ...c_1_in_index_ts.start,
      expected: [c_1_in_index_ts, c_1_in_a_module_css, c_1_in_c_module_css],
    },
    {
      name: 'c_1 in a.module.css',
      file: c_1_in_a_module_css.file,
      ...c_1_in_a_module_css.start,
      expected: [c_1_in_index_ts, c_1_in_a_module_css, c_1_in_c_module_css],
    },
    {
      name: 'c_1 in c.module.css',
      file: c_1_in_c_module_css.file,
      ...c_1_in_c_module_css.start,
      expected: [c_1_in_index_ts, c_1_in_a_module_css, c_1_in_c_module_css],
    },
    {
      name: 'c_2 in a.module.css',
      file: c_2_in_a_module_css.file,
      ...c_2_in_a_module_css.start,
      expected: [c_alias_in_index_ts, c_alias_in_a_module_css, c_2_in_a_module_css, c_2_in_c_module_css],
    },
    {
      name: 'c_2 in c.module.css',
      file: c_2_in_c_module_css.file,
      ...c_2_in_c_module_css.start,
      expected: [c_alias_in_index_ts, c_alias_in_a_module_css, c_2_in_a_module_css, c_2_in_c_module_css],
    },
  ])('Find All References for $name', async ({ file, line, offset, expected }) => {
    const res = await tsserver.sendReferences({
      file,
      line,
      offset,
    });
    expect(sortRefs(simplifyRefs(res.body?.refs ?? []))).toStrictEqual(sortRefs(expected));
  });
});
