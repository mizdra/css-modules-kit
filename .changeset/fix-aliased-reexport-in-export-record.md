---
'@css-modules-kit/core': patch
---

fix(core): use the alias name when collecting re-exported tokens via `@value ... as ... from ...`

`createExportBuilder` was recording the source-side name (`entry.name`) into the importing module's `ExportRecord` instead of the alias the importing module actually exposes (`entry.localName`). This caused downstream consumers to look up the wrong name, e.g. `checkCSSModule` would emit a false "no exported token" diagnostic for an aliased token re-imported from another module.
