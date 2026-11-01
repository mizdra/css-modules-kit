---
'@css-modules-kit/codegen': patch
'@css-modules-kit/eslint-plugin': patch
'@css-modules-kit/stylelint-plugin': patch
'@css-modules-kit/ts-plugin': patch
---

fix(ts-plugin, codegen, eslint-plugin, stylelint-plugin): depend on the exact version of `@css-modules-kit/core`, because its API may change in any release
