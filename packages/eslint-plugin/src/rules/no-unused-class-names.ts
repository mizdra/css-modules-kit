import { basename, findComponentFileSync, findUsedTokenNames, isCSSModuleFile, parseRule } from '@css-modules-kit/core';
import type { Rule } from 'eslint';
import safeParser from 'postcss-safe-parser';
import { readFile } from '../util.js';

export const noUnusedClassNames: Rule.RuleModule = {
  meta: {
    type: 'problem',
    language: 'css/css',
    messages: {
      disallow: '"{{className}}" is defined but never used in "{{componentFileName}}"',
    },
  },
  create(context) {
    const fileName = context.filename;
    if (fileName === undefined || !isCSSModuleFile(fileName)) return {};

    const componentFile = findComponentFileSync(fileName, readFile);

    // If the corresponding component file is not found, it is treated as a CSS Module file shared by the entire project.
    // It is difficult to determine where class names in a shared CSS Module file are used. Therefore, it is
    // assumed that all class names are used.
    if (componentFile === undefined) return {};

    const usedTokenNames = findUsedTokenNames(componentFile.text);

    const root = safeParser(context.sourceCode.text, { from: fileName });
    root.walkRules((rule) => {
      const { classSelectors } = parseRule(rule);

      for (const classSelector of classSelectors) {
        if (!usedTokenNames.has(classSelector.name)) {
          context.report({
            loc: {
              start: {
                line: classSelector.loc.start.line,
                column: classSelector.loc.start.column,
              },
              end: {
                line: classSelector.loc.end.line,
                column: classSelector.loc.end.column,
              },
            },
            messageId: 'disallow',
            data: {
              className: classSelector.name,
              componentFileName: basename(componentFile.fileName),
            },
          });
        }
      }
    });
    return {};
  },
};
