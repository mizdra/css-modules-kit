---
'@css-modules-kit/core': patch
'@css-modules-kit/core-strada': patch
'@css-modules-kit/ts-plugin': patch
'@css-modules-kit/codegen': patch
'@css-modules-kit/eslint-plugin': patch
'@css-modules-kit/stylelint-plugin': patch
---

deps: move the code shared by ts-plugin and codegen, the tools that run on the API of TypeScript 6 or earlier, from `@css-modules-kit/core` to the new `@css-modules-kit/core-strada`
