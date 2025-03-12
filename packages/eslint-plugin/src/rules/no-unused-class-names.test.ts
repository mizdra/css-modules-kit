import dedent from 'dedent';
import type { Linter } from 'eslint';
import { describe, expect, test } from 'vitest';
import { createESLint, formatLintResults } from '../test/eslint.js';
import { createIFF } from '../test/fixture.js';

const config: Linter.Config = {
  rules: { 'css-modules-kit/no-unused-class-names': 'error' },
};

describe('no-unused-class-names', () => {
  test('warns unused class names', async () => {
    const iff = await createIFF({
      'a.module.css': dedent`
      .local1 {}
      .local2 {}
      .local3 {}
    `,
      'a.tsx': dedent`
      import styles from './a.module.css';
      styles.local1;
    `,
    });
    const eslint = createESLint(iff.rootDir, config);
    const results = await eslint.lintFiles(iff.rootDir);
    expect(formatLintResults(results, iff.rootDir)).toMatchInlineSnapshot(`
      [
        {
          "filePath": "<rootDir>/a.module.css",
          "messages": [
            {
              "column": 2,
              "endColumn": 8,
              "endLine": 2,
              "line": 2,
              "message": ""local2" is defined but never used in "a.tsx"",
              "ruleId": "css-modules-kit/no-unused-class-names",
            },
            {
              "column": 2,
              "endColumn": 8,
              "endLine": 3,
              "line": 3,
              "message": ""local3" is defined but never used in "a.tsx"",
              "ruleId": "css-modules-kit/no-unused-class-names",
            },
          ],
        },
      ]
    `);
  });
  test('does not warn global class names', async () => {
    const iff = await createIFF({
      'a.module.css': dedent`
        .local1, :global(.global1) {}
      `,
      'a.ts': dedent`
        import styles from './a.module.css';
        styles.local1;
      `,
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
  test('does not warn if ts file is not found', async () => {
    const iff = await createIFF({
      'a.module.css': dedent`
        .local1 {}
      `,
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
