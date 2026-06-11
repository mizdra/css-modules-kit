---
'@css-modules-kit/core': minor
'@css-modules-kit/ts-plugin': minor
---

feat(core, ts-plugin): support `composes: <name> from '<specifier>'`

Class names referenced via `composes: foo from './other.module.css';` are now linked to the `.foo {...}` declaration in the referenced file. Go to Definition jumps from the reference to the declaration, Find All References lists reference sites across files, and Rename updates the declaration and every reference together.

Two diagnostics are also emitted in the check phase:

- `Cannot import module '<specifier>'` when the specifier cannot be resolved.
- `Module '<specifier>' has no exported token '<name>'.` when the referenced file does not export the token.
