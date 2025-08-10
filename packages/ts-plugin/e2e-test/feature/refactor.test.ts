import dedent from 'dedent';
import { describe, expect, test } from 'vitest';
import { createCssModuleFileRefactor } from '../../src/language-service/feature/refactor.js';
import { createIFF } from '../test-util/fixture.js';
import { launchTsserver } from '../test-util/tsserver.js';

describe('Refactor', async () => {
  const tsserver = launchTsserver();
  const iff = await createIFF({
    'a.tsx': '',
    'b.ts': '',
    'tsconfig.json': dedent`
      {
        "compilerOptions": { "jsx": "react-jsx" },
        "cmkOptions": {
          "dtsOutDir": "generated"
        }
      }
    `,
  });
  await tsserver.sendUpdateOpen({
    openFiles: [{ file: iff.paths['a.tsx'] }],
  });
  test.each([
    {
      name: 'a.tsx',
      file: iff.paths['a.tsx'],
      line: 1,
      offset: 1,
      expected: [createCssModuleFileRefactor],
    },
    {
      name: 'b.ts',
      file: iff.paths['b.ts'],
      line: 1,
      offset: 1,
      expected: [],
    },
  ])('Get Applicable Refactors for $name', async ({ file, line, offset, expected }) => {
    const res = await tsserver.sendGetApplicableRefactors({
      file,
      line,
      offset,
    });
    expect(res.body).toStrictEqual(expected);
  });
  test.each([
    {
      name: 'a.tsx',
      file: iff.paths['a.tsx'],
      line: 1,
      offset: 1,
      expected: [
        {
          fileName: iff.join('a.module.css'),
          textChanges: [{ start: { line: 0, offset: 0 }, end: { line: 0, offset: 0 }, newText: '' }],
        },
      ],
    },
  ])('Get Edits For Refactor for $name', async ({ file, line, offset, expected }) => {
    const res = await tsserver.sendGetEditsForRefactor({
      refactor: createCssModuleFileRefactor.name,
      action: createCssModuleFileRefactor.actions[0].name,
      file,
      line,
      offset,
    });
    expect(res.body?.edits).toStrictEqual(expected);
  });
});
