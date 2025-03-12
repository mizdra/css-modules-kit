import type { Linter } from 'eslint';
import { describe, expect, test } from 'vitest';
import { createESLint, formatLintResults } from '../test/eslint.js';
import { createIFF } from '../test/fixture.js';

const config: Linter.Config = {
  rules: { 'css-modules-kit/no-missing-component-file': 'error' },
};

describe('no-missing-component-file', () => {
  test('warns missing component file', async () => {
    const iff = await createIFF({
      'a.module.css': '.foo {}',
    });
    const eslint = createESLint(iff.rootDir, config);
    const results = await eslint.lintFiles(iff.rootDir);
    expect(formatLintResults(results, iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "filePath": "<rootDir>/a.module.css",
          "messages": [
            {
              "column": 0,
              "endColumn": undefined,
              "endLine": undefined,
              "line": 1,
              "message": "The corresponding component file is not found.",
              "ruleId": "css-modules-kit/no-missing-component-file",
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
    const eslint = createESLint(iff.rootDir, config);
    const results = await eslint.lintFiles(iff.rootDir);
    expect(formatLintResults(results, iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "filePath": "<rootDir>/a.module.css",
          "messages": [],
        },
      ]
    `);
  });
});
