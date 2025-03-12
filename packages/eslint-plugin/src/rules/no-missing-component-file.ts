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
