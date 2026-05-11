---
'@css-modules-kit/codegen': patch
'@css-modules-kit/core': patch
---

refactor(core, codegen): do not emit token reference statements in generated `.d.ts` files

Statements like `styles['a_1'];` and `__self['a_1'];` (emitted for `animation-name` references to `@keyframes`) used to appear in the `.d.ts` files written by codegen. These statements exist solely to wire up editor language features such as Go to Definition, Find All References, and Rename, and are not needed at compile time. The visible types exported by these files are unchanged, but codegen output is no longer cluttered with statements that look meaningless to a reader of the type definition file. The statements are still emitted by the TS plugin, where the language features are actually served.
