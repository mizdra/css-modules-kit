import {
  basename,
  findComponentFile,
  findUsedTokenNames,
  getClassSelectors,
  isCSSModuleFile,
  parseCSSModule,
} from '@css-modules-kit/core';
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

    const text = root.source!.input.css;
    const cssModule = parseCSSModule(text, { fileName, includeSyntaxError: false, keyframes: true });
    const usedTokenNames = findUsedTokenNames(componentFile.text, cssModule);

    for (const classSelector of getClassSelectors(text, fileName)) {
      if (!usedTokenNames.has(classSelector.name)) {
        utils.report({
          result,
          ruleName,
          message: messages.disallow(classSelector.name, componentFile.fileName),
          node: root,
          start: { line: classSelector.loc.start.line, column: classSelector.loc.start.column },
          end: { line: classSelector.loc.end.line, column: classSelector.loc.end.column },
        });
      }
    }
  };
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

export const noUnusedClassNames = createPlugin(ruleName, ruleFunction);
