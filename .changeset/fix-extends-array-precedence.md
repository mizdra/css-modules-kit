---
'@css-modules-kit/core': patch
'@css-modules-kit/ts-plugin': patch
'@css-modules-kit/codegen': patch
---

fix(core, ts-plugin, codegen): let a later entry of an `extends` array take precedence over an earlier one for `cmkOptions`, as TypeScript does for `compilerOptions`
