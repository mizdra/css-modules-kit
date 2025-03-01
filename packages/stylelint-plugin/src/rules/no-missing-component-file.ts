import { findComponentFile, isCSSModuleFile } from '@css-modules-kit/core';
import type { Rule } from 'stylelint';
import stylelint from 'stylelint';
import { readFile } from '../util.js';

const { createPlugin, utils } = stylelint;

const ruleName = 'css-modules-kit/no-missing-component-file';

const messages = utils.ruleMessages(ruleName, {
  disallow: () => `The corresponding component file is not found.`,
});

const meta = {
  url: 'https://github.com/mizdra/css-modules-kit/blob/main/packages/stylelint-plugin/docs/rules/no-missing-component-file.md',
};

const ruleFunction: Rule = (_primaryOptions, _secondaryOptions, _context) => {
  return async (root, result) => {
    const fileName = root.source?.input.file;
    if (fileName === undefined || !isCSSModuleFile(fileName)) return;

    const componentFile = await findComponentFile(fileName, readFile);

    if (componentFile === undefined) {
      utils.report({
        result,
        ruleName,
        message: messages.disallow(),
        node: root,
        index: 0,
        endIndex: 0,
      });
    }
  };
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

export const noMissingComponentFile = createPlugin(ruleName, ruleFunction);
