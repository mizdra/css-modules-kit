import dedent from 'dedent';
import type ts from 'typescript';
import { describe, expect, test } from 'vitest';
import { createIFF } from './test/fixture.js';
import { formatPath, launchTsserver } from './test/tsserver.js';

function simplifyLocs(locs: ts.server.protocol.RenameResponseBody['locs']) {
  return locs.map((loc) => {
    return {
      file: formatPath(loc.file),
      locs: loc.locs.map((loc) => ({
        start: loc.start,
        end: loc.end,
        ...('prefixText' in loc ? { prefixText: loc.prefixText } : {}),
        ...('suffixText' in loc ? { suffixText: loc.suffixText } : {}),
      })),
    };
  });
}
function sortLocs(locs: { file: string; locs: Pick<ts.server.protocol.RenameTextSpan, 'start' | 'end'>[] }[]) {
  const sortedLocs = locs.toSorted((a, b) => {
    return a.file.localeCompare(b.file);
  });
  for (const loc of sortedLocs) {
    loc.locs.sort((a, b) => {
      return a.start.line - b.start.line || a.start.offset - b.start.offset;
    });
  }
  return sortedLocs;
}

describe('Rename Symbol', async () => {
  const tsserver = launchTsserver();
  const iff = await createIFF({
    'index.ts': dedent`
      import styles from './a.module.css';
      styles.a_1;
      styles.a_1;
      styles.a_2;
      styles.b_1;
      styles.c_1;
      styles.c_alias;
      styles.d_1;
    `,
    'a.module.css': dedent`
      @import './b.module.css';
      @value c_1, c_2 as c_alias, d_1 from './c.module.css';
      .a_1 { color: red; }
      .a_1 { color: red; }
      @value a_2: red;
    `,
    'b.module.css': dedent`
      .b_1 { color: red; }
    `,
    'c.module.css': dedent`
      @value c_1: red;
      @value c_2: red;
      @value d_1 from './d.module.css';
    `,
    'd.module.css': dedent`
      @value d_1: red;
    `,
    'tsconfig.json': dedent`
      {
        "compilerOptions": {
          "plugins": [{ "name": "@css-modules-kit/ts-plugin", "languages": ["css"] }],
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
      name: 'a_1 in index.ts',
      file: iff.paths['index.ts'],
      line: 2,
      offset: 8,
      expected: [
        {
          file: formatPath(iff.paths['index.ts']),
          locs: [
            { start: { line: 2, offset: 8 }, end: { line: 2, offset: 11 } },
            { start: { line: 3, offset: 8 }, end: { line: 3, offset: 11 } },
          ],
        },
        {
          file: formatPath(iff.paths['a.module.css']),
          locs: [
            { start: { line: 3, offset: 2 }, end: { line: 3, offset: 5 } },
            { start: { line: 4, offset: 2 }, end: { line: 4, offset: 5 } },
          ],
        },
      ],
    },
    {
      name: 'a_1 in a.module.css',
      file: iff.paths['a.module.css'],
      line: 3,
      offset: 2,
      expected: [
        {
          file: formatPath(iff.paths['index.ts']),
          locs: [
            { start: { line: 2, offset: 8 }, end: { line: 2, offset: 11 } },
            { start: { line: 3, offset: 8 }, end: { line: 3, offset: 11 } },
          ],
        },
        {
          file: formatPath(iff.paths['a.module.css']),
          locs: [
            { start: { line: 3, offset: 2 }, end: { line: 3, offset: 5 } },
            { start: { line: 4, offset: 2 }, end: { line: 4, offset: 5 } },
          ],
        },
      ],
    },
    {
      name: 'a_2 in index.ts',
      file: iff.paths['index.ts'],
      line: 4,
      offset: 8,
      expected: [
        {
          file: formatPath(iff.paths['index.ts']),
          locs: [{ start: { line: 4, offset: 8 }, end: { line: 4, offset: 11 } }],
        },
        {
          file: formatPath(iff.paths['a.module.css']),
          locs: [{ start: { line: 5, offset: 8 }, end: { line: 5, offset: 11 } }],
        },
      ],
    },
    {
      name: 'a_2 in a.module.css',
      file: iff.paths['a.module.css'],
      line: 5,
      offset: 8,
      expected: [
        {
          file: formatPath(iff.paths['index.ts']),
          locs: [{ start: { line: 4, offset: 8 }, end: { line: 4, offset: 11 } }],
        },
        {
          file: formatPath(iff.paths['a.module.css']),
          locs: [{ start: { line: 5, offset: 8 }, end: { line: 5, offset: 11 } }],
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
          file: formatPath(iff.paths['index.ts']),
          locs: [{ start: { line: 5, offset: 8 }, end: { line: 5, offset: 11 } }],
        },
        {
          file: formatPath(iff.paths['b.module.css']),
          locs: [{ start: { line: 1, offset: 2 }, end: { line: 1, offset: 5 } }],
        },
      ],
    },
    {
      name: 'b_1 in b.module.css',
      file: iff.paths['b.module.css'],
      line: 1,
      offset: 2,
      expected: [
        {
          file: formatPath(iff.paths['index.ts']),
          locs: [{ start: { line: 5, offset: 8 }, end: { line: 5, offset: 11 } }],
        },
        {
          file: formatPath(iff.paths['b.module.css']),
          locs: [{ start: { line: 1, offset: 2 }, end: { line: 1, offset: 5 } }],
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
      //   {
      //     file: formatPath(iff.paths['index.ts']),
      //     locs: [{ start: { line: 6, offset: 8 }, end: { line: 6, offset: 11 } }],
      //   },
      //   {
      //     file: formatPath(iff.paths['a.module.css']),
      //     locs: [{ start: { line: 2, offset: 8 }, end: { line: 2, offset: 11 }, prefixText: 'c_1 as ' }],
      //   },
      // ],
      expected: [
        {
          file: formatPath(iff.paths['index.ts']),
          locs: [{ start: { line: 6, offset: 8 }, end: { line: 6, offset: 11 } }],
        },
        {
          file: formatPath(iff.paths['a.module.css']),
          locs: [{ start: { line: 2, offset: 8 }, end: { line: 2, offset: 11 } }],
        },
        {
          file: formatPath(iff.paths['c.module.css']),
          locs: [{ start: { line: 1, offset: 8 }, end: { line: 1, offset: 11 } }],
        },
      ],
    },
    {
      name: 'c_1 in a.module.css',
      file: iff.paths['a.module.css'],
      line: 2,
      offset: 8,
      // NOTE: For simplicity of implementation, this is not the ideal behavior. The ideal behavior is as follows:
      // expected: [
      //   {
      //     file: formatPath(iff.paths['index.ts']),
      //     locs: [{ start: { line: 6, offset: 8 }, end: { line: 6, offset: 11 } }],
      //   },
      //   {
      //     file: formatPath(iff.paths['a.module.css']),
      //     locs: [{ start: { line: 2, offset: 8 }, end: { line: 2, offset: 11 }, prefixText: 'c_1 as ' }],
      //   },
      // ],
      expected: [
        {
          file: formatPath(iff.paths['index.ts']),
          locs: [{ start: { line: 6, offset: 8 }, end: { line: 6, offset: 11 } }],
        },
        {
          file: formatPath(iff.paths['a.module.css']),
          locs: [{ start: { line: 2, offset: 8 }, end: { line: 2, offset: 11 } }],
        },
        {
          file: formatPath(iff.paths['c.module.css']),
          locs: [{ start: { line: 1, offset: 8 }, end: { line: 1, offset: 11 } }],
        },
      ],
    },
    {
      name: 'c_1 in c.module.css',
      file: iff.paths['c.module.css'],
      line: 1,
      offset: 8,
      // NOTE: For simplicity of implementation, this is not the ideal behavior. The ideal behavior is as follows:
      // expected: [
      //   {
      //     file: formatPath(iff.paths['a.module.css']),
      //     locs: [{ start: { line: 2, offset: 8 }, end: { line: 2, offset: 11 }, suffixText: ' as c_1' }],
      //   },
      //   {
      //     file: formatPath(iff.paths['c.module.css']),
      //     locs: [{ start: { line: 1, offset: 8 }, end: { line: 1, offset: 11 } }],
      //   },
      // ],
      expected: [
        {
          file: formatPath(iff.paths['index.ts']),
          locs: [{ start: { line: 6, offset: 8 }, end: { line: 6, offset: 11 } }],
        },
        {
          file: formatPath(iff.paths['a.module.css']),
          locs: [{ start: { line: 2, offset: 8 }, end: { line: 2, offset: 11 } }],
        },
        {
          file: formatPath(iff.paths['c.module.css']),
          locs: [{ start: { line: 1, offset: 8 }, end: { line: 1, offset: 11 } }],
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
      //   {
      //     file: formatPath(iff.paths['index.ts']),
      //     locs: [{ start: { line: 7, offset: 8 }, end: { line: 7, offset: 15 } }],
      //   },
      //   {
      //     file: formatPath(iff.paths['a.module.css']),
      //     locs: [{ start: { line: 2, offset: 20 }, end: { line: 2, offset: 27 } }],
      //   },
      // ],
      expected: [
        {
          file: formatPath(iff.paths['index.ts']),
          locs: [{ start: { line: 7, offset: 8 }, end: { line: 7, offset: 15 } }],
        },
        {
          file: formatPath(iff.paths['a.module.css']),
          locs: [
            { start: { line: 2, offset: 13 }, end: { line: 2, offset: 16 } },
            { start: { line: 2, offset: 20 }, end: { line: 2, offset: 27 } },
          ],
        },
        {
          file: formatPath(iff.paths['c.module.css']),
          locs: [{ start: { line: 2, offset: 8 }, end: { line: 2, offset: 11 } }],
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
      //   {
      //     file: formatPath(iff.paths['index.ts']),
      //     locs: [{ start: { line: 7, offset: 8 }, end: { line: 7, offset: 15 } }],
      //   },
      //   {
      //     file: formatPath(iff.paths['a.module.css']),
      //     locs: [{ start: { line: 2, offset: 20 }, end: { line: 2, offset: 27 } }],
      //   },
      // ],
      expected: [
        {
          file: formatPath(iff.paths['index.ts']),
          locs: [{ start: { line: 7, offset: 8 }, end: { line: 7, offset: 15 } }],
        },
        {
          file: formatPath(iff.paths['a.module.css']),
          locs: [
            { start: { line: 2, offset: 13 }, end: { line: 2, offset: 16 } },
            { start: { line: 2, offset: 20 }, end: { line: 2, offset: 27 } },
          ],
        },
        {
          file: formatPath(iff.paths['c.module.css']),
          locs: [{ start: { line: 2, offset: 8 }, end: { line: 2, offset: 11 } }],
        },
      ],
    },
    {
      name: 'c_2 in c.module.css',
      file: iff.paths['c.module.css'],
      line: 2,
      offset: 8,
      // NOTE: For simplicity of implementation, this is not the ideal behavior. The ideal behavior is as follows:
      // expected: [
      //   {
      //     file: formatPath(iff.paths['a.module.css']),
      //     locs: [{ start: { line: 2, offset: 13 }, end: { line: 2, offset: 16 } }],
      //   },
      //   {
      //     file: formatPath(iff.paths['c.module.css']),
      //     locs: [{ start: { line: 2, offset: 8 }, end: { line: 2, offset: 11 } }],
      //   },
      // ],
      expected: [
        {
          file: formatPath(iff.paths['index.ts']),
          locs: [{ start: { line: 7, offset: 8 }, end: { line: 7, offset: 15 } }],
        },
        {
          file: formatPath(iff.paths['a.module.css']),
          locs: [
            { start: { line: 2, offset: 13 }, end: { line: 2, offset: 16 } },
            { start: { line: 2, offset: 20 }, end: { line: 2, offset: 27 } },
          ],
        },
        {
          file: formatPath(iff.paths['c.module.css']),
          locs: [{ start: { line: 2, offset: 8 }, end: { line: 2, offset: 11 } }],
        },
      ],
    },
    {
      name: 'd_1 in d.module.css',
      file: iff.paths['d.module.css'],
      line: 1,
      offset: 8,
      // NOTE: For simplicity of implementation, this is not the ideal behavior. The ideal behavior is as follows:
      // expected: [
      //   {
      //     file: formatPath(iff.paths['c.module.css']),
      //     locs: [{ start: { line: 3, offset: 8 }, end: { line: 3, offset: 11 }, suffixText: ' as d_1' }],
      //   },
      //   {
      //     file: formatPath(iff.paths['d.module.css']),
      //     locs: [{ start: { line: 1, offset: 8 }, end: { line: 1, offset: 11 } }],
      //   },
      // ],
      expected: [
        {
          file: formatPath(iff.paths['index.ts']),
          locs: [{ start: { line: 8, offset: 8 }, end: { line: 8, offset: 11 } }],
        },
        {
          file: formatPath(iff.paths['a.module.css']),
          locs: [{ start: { line: 2, offset: 29 }, end: { line: 2, offset: 32 } }],
        },
        {
          file: formatPath(iff.paths['c.module.css']),
          locs: [{ start: { line: 3, offset: 8 }, end: { line: 3, offset: 11 } }],
        },
        {
          file: formatPath(iff.paths['d.module.css']),
          locs: [{ start: { line: 1, offset: 8 }, end: { line: 1, offset: 11 } }],
        },
      ],
    },
  ])('Rename Symbol for $name', async ({ file, line, offset, expected }) => {
    const res = await tsserver.sendRename({
      file,
      line,
      offset,
    });
    expect(sortLocs(simplifyLocs(res.body?.locs ?? []))).toStrictEqual(sortLocs(expected));
  });
});
