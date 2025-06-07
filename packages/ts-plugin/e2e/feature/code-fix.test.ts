import dedent from 'dedent';
import { describe, expect, test } from 'vitest';
import { PROPERTY_DOES_NOT_EXIST_ERROR_CODE } from '../../src/language-service/feature/code-fix.js';
import { createIFF } from '../test-util/fixture.js';
import { formatPath, launchTsserver } from '../test-util/tsserver.js';

describe('Get Code Fixes', async () => {
  const tsserver = launchTsserver();
  const iff = await createIFF({
    'a.tsx': dedent`
      import styles from './a.module.css';
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
      name: 'styles.a_1',
      file: iff.paths['a.tsx'],
      line: 3,
      offset: 11,
      expected: [
        {
          fixName: 'fixMissingCSSRule',
          description: `Add missing CSS rule '.a_1'`,
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
      expected: [
        {
          fixName: 'fixMissingCSSRule',
          description: `Add missing CSS rule '.b_2'`,
          changes: [
            {
              fileName: formatPath(iff.paths['b.module.css']),
              textChanges: [{ start: { line: 3, offset: 2 }, end: { line: 3, offset: 2 }, newText: '\n.b_2 {\n  \n}' }],
            },
          ],
        },
      ],
    },
  ])('$name', async ({ file, line, offset, expected }) => {
    const res = await tsserver.sendGetCodeFixes({
      errorCodes: [PROPERTY_DOES_NOT_EXIST_ERROR_CODE],
      file,
      startLine: line,
      startOffset: offset,
      endLine: line,
      endOffset: offset,
    });
    expect(res.body).toStrictEqual(expected);
  });
});
