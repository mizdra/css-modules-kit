---
'@css-modules-kit/core': minor
'@css-modules-kit/ts-plugin': minor
'@css-modules-kit/eslint-plugin': patch
'@css-modules-kit/stylelint-plugin': patch
---

feat(core, ts-plugin, eslint-plugin, stylelint-plugin): support composes property

Class names referenced via `composes: foo;` are now linked back to the `.foo {...}` declaration. Go to Definition jumps from a reference to the declaration, Find All References lists every reference site, and Rename updates the declaration and every reference together. Space-separated names (`composes: foo bar;`), comma-separated names (`composes: foo, bar;`), and mixes of both are supported. `composes: global(foo);`, `composes: foo from global;`, and `composes: foo from '<specifier>';` do not produce references (support for `from '<specifier>'` is planned).

Two diagnostics are also emitted for invalid usage:

- Parse phase: a `from` clause not followed by a quoted specifier or the `global` keyword is reported.
- Check phase: references that resolve to neither a locally defined token nor an imported token are reported as `Cannot find token '<name>'.`.

The `no-unused-class-names` rule in eslint-plugin and stylelint-plugin now treats names referenced via `composes` from within the same CSS as used, so they are no longer reported as unused.
