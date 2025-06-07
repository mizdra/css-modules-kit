import dedent from 'dedent';
import ts from 'typescript';
import { describe, expect, test } from 'vitest';
import {
  CANNOT_FIND_NAME_ERROR_CODE,
  PROPERTY_DOES_NOT_EXIST_ERROR_CODE,
} from '../../src/language-service/feature/code-fix.js';
import { createIFF } from '../test-util/fixture.js';
import { formatPath, launchTsserver, normalizeCodeFixActions } from '../test-util/tsserver.js';

describe('Get Code Fixes', async () => {
  const tsserver = launchTsserver();
  const iff = await createIFF({
    'a.tsx': dedent`
      import styles from './a.module.css';
      import bStyles from './b.module.css';
      styles.a_1;
      bStyles.b_2;
    `,
    'b.tsx': dedent`
      styles;
    `,
    'a.module.css': '',
    'b.module.css': dedent`
      .b_1 {
        color: red;
      }
    `,
    // Generated files should be excluded from completion candidates.
    'generated/generated.module.css.d.ts': dedent`
      const styles: {};
      export default styles;
    `,
    'tsconfig.json': dedent`
      {
        "compilerOptions": {},
        "cmkOptions": {
          "dtsOutDir": "generated"
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
      file: iff.paths['b.tsx'],
      line: 1,
      offset: 1,
      errorCodes: [CANNOT_FIND_NAME_ERROR_CODE],
      expected: [
        {
          fixName: 'import',
          changes: [
            {
              fileName: formatPath(iff.paths['b.tsx']),
              textChanges: [
                {
                  start: { line: 1, offset: 1 },
                  end: { line: 1, offset: 1 },
                  newText: `import styles from "./a.module.css";${ts.sys.newLine}${ts.sys.newLine}`,
                },
              ],
            },
          ],
        },
        {
          fixName: 'import',
          changes: [
            {
              fileName: formatPath(iff.paths['b.tsx']),
              textChanges: [
                {
                  start: { line: 1, offset: 1 },
                  end: { line: 1, offset: 1 },
                  newText: `import styles from "./b.module.css";${ts.sys.newLine}${ts.sys.newLine}`,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'styles.a_1',
      file: iff.paths['a.tsx'],
      line: 3,
      offset: 11,
      errorCodes: [PROPERTY_DOES_NOT_EXIST_ERROR_CODE],
      expected: [
        {
          fixName: 'fixMissingCSSRule',
          changes: [
            {
              fileName: formatPath(iff.paths['a.module.css']),
              textChanges: [{ start: { line: 1, offset: 1 }, end: { line: 1, offset: 1 }, newText: '\n.a_1 {\n  \n}' }],
            },
          ],
        },
      ],
    },
    {
      name: 'bStyles.b_2',
      file: iff.paths['a.tsx'],
      line: 4,
      offset: 12,
      errorCodes: [PROPERTY_DOES_NOT_EXIST_ERROR_CODE],
      expected: [
        {
          fixName: 'fixMissingCSSRule',
          changes: [
            {
              fileName: formatPath(iff.paths['b.module.css']),
              textChanges: [{ start: { line: 3, offset: 2 }, end: { line: 3, offset: 2 }, newText: '\n.b_2 {\n  \n}' }],
            },
          ],
        },
      ],
    },
  ])('$name', async ({ file, line, offset, errorCodes, expected }) => {
    const res = await tsserver.sendGetCodeFixes({
      errorCodes,
      file,
      startLine: line,
      startOffset: offset,
      endLine: line,
      endOffset: offset,
    });
    expect(normalizeCodeFixActions(res.body!)).toStrictEqual(normalizeCodeFixActions(expected));
  });
});
