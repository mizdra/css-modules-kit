import dedent from 'dedent';
import { describe, expect, test } from 'vitest';
import { createIFF } from '../test-util/fixture.js';
import { formatPath, launchTsserver, normalizeDefinitions } from '../test-util/tsserver.js';

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
      styles['d-1'];
    `,
    'a.module.css': dedent`
      @import './b.module.css';
      @value c_1, c_2 as c_alias from './c.module.css';
      .a_1 { color: red; }
      .a_2 { color: red; }
      .a_2 { color: red; }
      @value a_3: red;
      @import url(./b.module.css);
      .d-1 { color: red; }
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
        "compilerOptions": {
          "paths": { "@/*": ["./*"] }
        },
        "cmkOptions": {
          "dtsOutDir": "generated"
        }
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
      name: "'./b.module.css' in a.module.css",
      file: iff.paths['a.module.css'],
      line: 1,
      offset: 9,
      expected: [
        { file: formatPath(iff.paths['b.module.css']), start: { line: 1, offset: 1 }, end: { line: 1, offset: 1 } },
      ],
    },
    {
      name: "'./c.module.css' in a.module.css",
      file: iff.paths['a.module.css'],
      line: 2,
      offset: 33,
      expected: [
        { file: formatPath(iff.paths['c.module.css']), start: { line: 1, offset: 1 }, end: { line: 1, offset: 1 } },
      ],
    },
    {
      name: 'a_1 in index.ts',
      file: iff.paths['index.ts'],
      line: 2,
      offset: 8,
      expected: [
        {
          file: formatPath(iff.paths['a.module.css']),
          start: { line: 3, offset: 2 },
          end: { line: 3, offset: 5 },
          contextStart: { line: 3, offset: 1 },
          contextEnd: { line: 3, offset: 21 },
        },
      ],
    },
    {
      name: 'a_2 in index.ts',
      file: iff.paths['index.ts'],
      line: 3,
      offset: 8,
      expected: [
        {
          file: formatPath(iff.paths['a.module.css']),
          start: { line: 4, offset: 2 },
          end: { line: 4, offset: 5 },
          contextStart: { line: 4, offset: 1 },
          contextEnd: { line: 4, offset: 21 },
        },
        {
          file: formatPath(iff.paths['a.module.css']),
          start: { line: 5, offset: 2 },
          end: { line: 5, offset: 5 },
          contextStart: { line: 5, offset: 1 },
          contextEnd: { line: 5, offset: 21 },
        },
      ],
    },
    {
      name: 'a_2 in a.module.ts',
      file: iff.paths['a.module.css'],
      line: 4,
      offset: 2,
      expected: [
        {
          file: formatPath(iff.paths['a.module.css']),
          start: { line: 4, offset: 2 },
          end: { line: 4, offset: 5 },
          contextStart: { line: 4, offset: 1 },
          contextEnd: { line: 4, offset: 21 },
        },
        {
          file: formatPath(iff.paths['a.module.css']),
          start: { line: 5, offset: 2 },
          end: { line: 5, offset: 5 },
          contextStart: { line: 5, offset: 1 },
          contextEnd: { line: 5, offset: 21 },
        },
      ],
    },
    {
      name: 'a_3 in index.ts',
      file: iff.paths['index.ts'],
      line: 4,
      offset: 8,
      expected: [
        {
          file: formatPath(iff.paths['a.module.css']),
          start: { line: 6, offset: 8 },
          end: { line: 6, offset: 11 },
          contextStart: { line: 6, offset: 1 },
          contextEnd: { line: 6, offset: 16 },
        },
      ],
    },
    {
      name: 'b_1 in index.ts',
      file: iff.paths['index.ts'],
      line: 5,
      offset: 8,
      expected: [
        {
          file: formatPath(iff.paths['b.module.css']),
          start: { line: 1, offset: 2 },
          end: { line: 1, offset: 5 },
          contextStart: { line: 1, offset: 1 },
          contextEnd: { line: 1, offset: 21 },
        },
      ],
    },
    {
      name: 'c_1 in index.ts',
      file: iff.paths['index.ts'],
      line: 6,
      offset: 8,
      // NOTE: For simplicity of implementation, this is not the ideal behavior. The ideal behavior is as follows:
      // expected: [
      //   { file: formatPath(iff.paths['c.module.css']), start: { line: 1, offset: 8 }, end: { line: 1, offset: 11 } },
      // ],
      expected: [
        {
          file: formatPath(iff.paths['a.module.css']),
          start: { line: 2, offset: 8 },
          end: { line: 2, offset: 11 },
          contextStart: { line: 2, offset: 8 },
          contextEnd: { line: 2, offset: 11 },
        },
        {
          file: formatPath(iff.paths['c.module.css']),
          start: { line: 1, offset: 8 },
          end: { line: 1, offset: 11 },
          contextStart: { line: 1, offset: 1 },
          contextEnd: { line: 1, offset: 16 },
        },
      ],
    },
    {
      name: 'c_1 in a.module.ts',
      file: iff.paths['a.module.css'],
      line: 2,
      offset: 8,
      // NOTE: For simplicity of implementation, this is not the ideal behavior. The ideal behavior is as follows:
      // expected: [
      //   { file: formatPath(iff.paths['c.module.css']), start: { line: 1, offset: 8 }, end: { line: 1, offset: 11 } },
      // ],
      expected: [
        {
          file: formatPath(iff.paths['a.module.css']),
          start: { line: 2, offset: 8 },
          end: { line: 2, offset: 11 },
          contextStart: { line: 2, offset: 8 },
          contextEnd: { line: 2, offset: 11 },
        },
        {
          file: formatPath(iff.paths['c.module.css']),
          start: { line: 1, offset: 8 },
          end: { line: 1, offset: 11 },
          contextStart: { line: 1, offset: 1 },
          contextEnd: { line: 1, offset: 16 },
        },
      ],
    },
    {
      name: 'c_alias in index.ts',
      file: iff.paths['index.ts'],
      line: 7,
      offset: 8,
      // NOTE: For simplicity of implementation, this is not the ideal behavior. The ideal behavior is as follows:
      // expected: [
      //   { file: formatPath(iff.paths['c.module.css']), start: { line: 2, offset: 8 }, end: { line: 2, offset: 11 } },
      // ],
      expected: [
        {
          file: formatPath(iff.paths['a.module.css']),
          start: { line: 2, offset: 20 },
          end: { line: 2, offset: 27 },
          contextStart: { line: 2, offset: 20 },
          contextEnd: { line: 2, offset: 27 },
        },
        {
          file: formatPath(iff.paths['c.module.css']),
          start: { line: 2, offset: 8 },
          end: { line: 2, offset: 11 },
          contextStart: { line: 2, offset: 1 },
          contextEnd: { line: 2, offset: 16 },
        },
      ],
    },
    {
      name: 'c_alias in a.module.css',
      file: iff.paths['a.module.css'],
      line: 2,
      offset: 20,
      // NOTE: For simplicity of implementation, this is not the ideal behavior. The ideal behavior is as follows:
      // expected: [
      //   { file: formatPath(iff.paths['c.module.css']), start: { line: 2, offset: 8 }, end: { line: 2, offset: 11 } },
      // ],
      expected: [
        {
          file: formatPath(iff.paths['a.module.css']),
          start: { line: 2, offset: 20 },
          end: { line: 2, offset: 27 },
          contextStart: { line: 2, offset: 20 },
          contextEnd: { line: 2, offset: 27 },
        },
        {
          file: formatPath(iff.paths['c.module.css']),
          start: { line: 2, offset: 8 },
          end: { line: 2, offset: 11 },
          contextStart: { line: 2, offset: 1 },
          contextEnd: { line: 2, offset: 16 },
        },
      ],
    },
    {
      name: 'c_2 in a.module.css',
      file: iff.paths['a.module.css'],
      line: 2,
      offset: 13,
      expected: [
        {
          file: formatPath(iff.paths['c.module.css']),
          start: { line: 2, offset: 8 },
          end: { line: 2, offset: 11 },
          contextStart: { line: 2, offset: 1 },
          contextEnd: { line: 2, offset: 16 },
        },
      ],
    },
    {
      // NOTE: It is strange that `(` has a definition, but we allow it to keep the implementation simple.
      name: '(./b.module.css) in a.module.css',
      file: iff.paths['a.module.css'],
      line: 7,
      offset: 12,
      expected: [
        { file: formatPath(iff.paths['b.module.css']), start: { line: 1, offset: 1 }, end: { line: 1, offset: 1 } },
      ],
    },
    {
      name: 'd-1 in index.ts',
      file: iff.paths['index.ts'],
      line: 8,
      offset: 8,
      expected: [
        {
          file: formatPath(iff.paths['a.module.css']),
          start: { line: 8, offset: 2 },
          end: { line: 8, offset: 5 },
        },
      ],
    },
  ])('Go to Definition for $name', async ({ file, line, offset, expected }) => {
    const res = await tsserver.sendDefinitionAndBoundSpan({
      file,
      line,
      offset,
    });
    expect(normalizeDefinitions(res.body?.definitions ?? [])).toStrictEqual(normalizeDefinitions(expected));
  });
});
