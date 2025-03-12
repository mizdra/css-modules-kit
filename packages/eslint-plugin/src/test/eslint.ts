import { resolve } from '@css-modules-kit/core';
import css from '@eslint/css';
import type { Linter } from 'eslint';
import { ESLint } from 'eslint';
import plugin from '../index.js';

function filterMessage(warning: Linter.LintMessage) {
  return {
    line: warning.line,
    column: warning.column,
    endLine: warning.endLine,
    endColumn: warning.endColumn,
    ruleId: warning.ruleId,
    message: warning.message,
  };
}

function formatLintResult(lintResult: ESLint.LintResult, rootDir: string) {
  return {
    filePath: resolve(lintResult.filePath).replace(rootDir, '<rootDir>'),
    messages: lintResult.messages.map(filterMessage),
  };
}

export function formatLintResults(results: ESLint.LintResult[], rootDir: string) {
  return results.map((result) => formatLintResult(result, rootDir));
}

export function createESLint(rootDir: string, config: Linter.Config) {
  return new ESLint({
    cwd: rootDir,
    overrideConfigFile: true,
    baseConfig: [
      {
        files: ['**/*.css'],
        language: 'css/css',
        languageOptions: {
          tolerant: true,
        },
        plugins: {
          css,
          'css-modules-kit': plugin,
        },
      },
      config,
    ],
  });
}
