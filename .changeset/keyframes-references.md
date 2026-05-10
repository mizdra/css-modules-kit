---
'@css-modules-kit/core': minor
'@css-modules-kit/ts-plugin': minor
'@css-modules-kit/eslint-plugin': patch
'@css-modules-kit/stylelint-plugin': patch
---

feat(core, ts-plugin, eslint-plugin, stylelint-plugin): support animation-name property

`animation-name: foo;` is now linked back to the `@keyframes foo {...}` declaration. Go to Definition jumps from a reference to the declaration, Find All References lists every reference site, and Rename updates the declaration and every reference together. Comma-separated names (`animation-name: foo, bar;`), `local()` / `global()` notation, and vendor prefixes (`-webkit-animation-name`) are all supported. References to `@keyframes` defined in another file via `@import` are resolved as well.

Two diagnostics are also emitted for invalid usage:

- Parse phase: malformed `local(...)` calls (empty, multiple identifiers, or non-identifier nodes such as a nested function) are reported.
- Check phase: token references that resolve to neither a locally defined token nor an imported token are reported as `Cannot find token '<name>'.`.

The `no-unused-class-names` rule in eslint-plugin and stylelint-plugin now treats names referenced via `animation-name` from within the same CSS as used, so they are no longer reported as unused.
