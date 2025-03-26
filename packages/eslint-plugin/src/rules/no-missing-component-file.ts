import { findComponentFileSync, isCSSModuleFile } from '@css-modules-kit/core';
import type { Rule } from 'eslint';
import { readFile } from '../util.js';

export const noMissingComponentFile: Rule.RuleModule = {
  meta: {
    type: 'problem',
    language: 'css/css',
    messages: {
      disallow: 'The corresponding component file is not found.',
    },
    docs: {
      description: 'Enforce the existence of corresponding component files for CSS module files',
      recommended: true,
      url: 'https://github.com/mizdra/css-modules-kit/blob/main/packages/eslint-plugin/docs/rules/no-missing-component-file.md',
    },
  },
  create(context) {
    const fileName = context.filename;
    if (fileName === undefined || !isCSSModuleFile(fileName)) return {};

    const componentFile = findComponentFileSync(fileName, readFile);

    if (componentFile === undefined) {
      context.report({
        loc: { line: 1, column: 0 },
        messageId: 'disallow',
      });
    }
    return {};
  },
};
