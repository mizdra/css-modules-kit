---
'@css-modules-kit/core': minor
---

refactor(core): parse `@value` with postcss-value-parser

The `@value` parser is reimplemented on top of postcss-value-parser. Behavior for syntax supported by css-loader is unchanged.

For syntax that css-loader does not support (where css-modules-kit does not guarantee a specific behavior), the result changed:

- `@value \\c: #000;` and `@value \'d: #000;` are now parsed as a token declaration instead of reporting an error.
- `@value \31 e: #000;` is now read as the token name `\31` instead of `e`.
