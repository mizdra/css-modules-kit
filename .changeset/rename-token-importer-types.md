---
'@css-modules-kit/core': patch
---

refactor(core): rename TokenImporter variants to ESTree-style names

Rename the public types so they describe the abstract shape of the import
(matching ESTree's `ExportAllDeclaration` / `ExportNamedDeclaration`)
rather than the CSS syntax that produced them:

- `AtImportTokenImporter` → `AllTokenImporter` (`type: 'all'`)
- `AtValueTokenImporter` → `NamedTokenImporter` (`type: 'named'`)
- `AtValueTokenImporterValue` → `NamedTokenImporterSpecifier`
- `NamedTokenImporter.values` → `NamedTokenImporter.specifiers`

The `core` package is an internal building block — end users interact
with CSS Modules Kit through `ts-plugin`, `codegen`, `eslint-plugin`,
and `stylelint-plugin`, none of which reference the renamed names. This
change is therefore released as a patch.
