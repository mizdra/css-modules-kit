import dedent from 'dedent';
import ts from 'typescript';
import { describe, expect, test } from 'vite-plus/test';
import {
  CANNOT_FIND_NAME_ERROR_CODE,
  PROPERTY_DOES_NOT_EXIST_ERROR_CODES,
} from '../../src/language-service/feature/code-fix.js';
import { createIFF } from '../test-util/fixture.js';
import { formatPath, launchTsserver, normalizeCodeFixActions } from '../test-util/tsserver.js';

test.each([
  {
    namedExports: false,
    importStatement: "import styles from './a.module.css';",
  },
  {
    namedExports: true,
    importStatement: "import * as styles from './a.module.css';",
  },
])(
  'fixMissingCSSRule inserts a new CSS rule for a missing class property (namedExports: $namedExports)',
  async ({ namedExports, importStatement }) => {
    const tsserver = launchTsserver();
    const iff = await createIFF({
      'a.tsx': dedent`
        ${importStatement}
        import bStyles from './b.module.css';
        styles.a_1;
        bStyles.b_2;
      `,
      'a.module.css': '',
      'b.module.css': dedent`
        .b_1 {
          color: red;
        }
      `,
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

    const res1 = await tsserver.sendGetCodeFixes({
      errorCodes: [PROPERTY_DOES_NOT_EXIST_ERROR_CODES[0]],
      file: iff.paths['a.tsx'],
      startLine: 3,
      startOffset: 11,
      endLine: 3,
      endOffset: 11,
    });
    expect(normalizeCodeFixActions(res1.body!)).toStrictEqual(
      normalizeCodeFixActions([
        {
          fixName: 'fixMissingCSSRule',
          changes: [
            {
              fileName: formatPath(iff.paths['a.module.css']),
              textChanges: [{ start: { line: 1, offset: 1 }, end: { line: 1, offset: 1 }, newText: '\n.a_1 {\n  \n}' }],
            },
          ],
        },
      ]),
    );

    const res2 = await tsserver.sendGetCodeFixes({
      errorCodes: [PROPERTY_DOES_NOT_EXIST_ERROR_CODES[1]],
      file: iff.paths['a.tsx'],
      startLine: 3,
      startOffset: 11,
      endLine: 3,
      endOffset: 11,
    });
    expect(normalizeCodeFixActions(res2.body!)).toStrictEqual(
      normalizeCodeFixActions([
        {
          fixName: 'fixMissingCSSRule',
          changes: [
            {
              fileName: formatPath(iff.paths['a.module.css']),
              textChanges: [{ start: { line: 1, offset: 1 }, end: { line: 1, offset: 1 }, newText: '\n.a_1 {\n  \n}' }],
            },
          ],
        },
      ]),
    );

    const res3 = await tsserver.sendGetCodeFixes({
      errorCodes: [PROPERTY_DOES_NOT_EXIST_ERROR_CODES[0]],
      file: iff.paths['a.tsx'],
      startLine: 4,
      startOffset: 12,
      endLine: 4,
      endOffset: 12,
    });
    expect(normalizeCodeFixActions(res3.body!)).toStrictEqual(
      normalizeCodeFixActions([
        {
          fixName: 'fixMissingCSSRule',
          changes: [
            {
              fileName: formatPath(iff.paths['b.module.css']),
              textChanges: [{ start: { line: 3, offset: 2 }, end: { line: 3, offset: 2 }, newText: '\n.b_2 {\n  \n}' }],
            },
          ],
        },
      ]),
    );
  },
);

test.each([
  {
    name: 'auto-import inserts default import statement if namedExports is false',
    namedExports: false,
    importStatement: `import styles from "./a.module.css";`,
  },
  {
    name: 'auto-import inserts namespace import statement if namedExports is true',
    namedExports: true,
    importStatement: `import * as styles from "./a.module.css";`,
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
  const res = await tsserver.sendGetCodeFixes({
    errorCodes: [CANNOT_FIND_NAME_ERROR_CODE],
    file: iff.paths['index.ts'],
    startLine: 1,
    startOffset: 1,
    endLine: 1,
    endOffset: 7,
  });
  expect(normalizeCodeFixActions(res.body!)).toStrictEqual(
    normalizeCodeFixActions([
      {
        fixName: 'import',
        changes: [
          {
            fileName: formatPath(iff.paths['index.ts']),
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
    ]),
  );
});

test('auto-import excludes generated files from suggestions', async () => {
  const tsserver = launchTsserver();
  const iff = await createIFF({
    'index.ts': dedent`
      styles;
    `,
    'generated/a.module.css.d.ts': dedent`
      const styles: {};
      export default styles;
    `,
    'tsconfig.json': dedent`
      {
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
  const res = await tsserver.sendGetCodeFixes({
    errorCodes: [CANNOT_FIND_NAME_ERROR_CODE],
    file: iff.paths['index.ts'],
    startLine: 1,
    startOffset: 1,
    endLine: 1,
    endOffset: 7,
  });
  expect(normalizeCodeFixActions(res.body!)).toStrictEqual([]);
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
