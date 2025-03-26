import { basename, findComponentFile, findUsedTokenNames, isCSSModuleFile, parseRule } from '@css-modules-kit/core';
import type { Rule, RuleMeta } from 'stylelint';
import stylelint from 'stylelint';
import { readFile } from '../util.js';

const { createPlugin, utils } = stylelint;

const ruleName = 'css-modules-kit/no-unused-class-names';

const messages = utils.ruleMessages(ruleName, {
  disallow: (className: string, componentFileName: string) =>
    `"${className}" is defined but never used in "${basename(componentFileName)}"`,
});

const meta: RuleMeta = {
  url: 'https://github.com/mizdra/css-modules-kit/blob/main/packages/eslint-plugin/docs/rules/no-unused-class-names.md',
};

const ruleFunction: Rule = (_primaryOptions, _secondaryOptions, _context) => {
  return async (root, result) => {
    const fileName = root.source?.input.file;
    if (fileName === undefined || !isCSSModuleFile(fileName)) return;

    const componentFile = await findComponentFile(fileName, readFile);

    // If the corresponding component file is not found, it is treated as a CSS Module file shared by the entire project.
    // It is difficult to determine where class names in a shared CSS Module file are used. Therefore, it is
    // assumed that all class names are used.
    if (componentFile === undefined) return;

    const usedTokenNames = findUsedTokenNames(componentFile.text);

    root.walkRules((rule) => {
      const { classSelectors } = parseRule(rule);

      for (const classSelector of classSelectors) {
        if (!usedTokenNames.has(classSelector.name)) {
          utils.report({
            result,
            ruleName,
            message: messages.disallow(classSelector.name, componentFile.fileName),
            node: rule,
            index: classSelector.loc.start.offset,
            endIndex: classSelector.loc.end.offset,
            word: classSelector.name,
          });
        }
      }
    });
  };
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

export const noUnusedClassNames = createPlugin(ruleName, ruleFunction);
