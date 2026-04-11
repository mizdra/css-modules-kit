import stylelint from 'stylelint';
import { describe, expect, test } from 'vite-plus/test';
import { createIFF } from '../test/fixture.js';
import { formatLinterResult } from '../test/stylelint.js';
import { noMissingComponentFile } from './no-missing-component-file.js';

async function lint(rootDir: string) {
  return stylelint.lint({
    config: {
      plugins: [noMissingComponentFile],
      rules: {
        'css-modules-kit/no-missing-component-file': true,
      },
    },
    files: ['**/*.module.css'],
    cwd: rootDir,
  });
}

describe('no-missing-component-file', () => {
  test('warns missing component file', async () => {
    const iff = await createIFF({
      'a.module.css': '.foo {}',
    });
    const results = await lint(iff.rootDir);
    expect(formatLinterResult(results, iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "source": "<rootDir>/a.module.css",
          "warnings": [
            {
              "column": 1,
              "endColumn": 2,
              "endLine": 1,
              "line": 1,
              "rule": "css-modules-kit/no-missing-component-file",
              "text": "The corresponding component file is not found. (css-modules-kit/no-missing-component-file)",
            },
          ],
        },
      ]
    `);
  });
  test('does not warn when component file exists', async () => {
    const iff = await createIFF({
      'a.module.css': '',
      'a.tsx': '',
    });
    const results = await lint(iff.rootDir);
    expect(formatLinterResult(results, iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "source": "<rootDir>/a.module.css",
          "warnings": [],
        },
      ]
    `);
  });
});
