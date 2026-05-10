---
'css-modules-kit-vscode': patch
'@css-modules-kit/ts-plugin': patch
---

fix(vscode, ts-plugin): support file rename from a CSS module `@import` / `@value ... from` specifier

Renaming a CSS module via the import specifier in VS Code (e.g. invoking Rename Symbol on `b.module.css` inside `@import './b.module.css';`) now performs a real file rename and updates every importer of the renamed file. Previously the located text span was blindly replaced with the user's input, which dropped the path prefix (`'./b.module.css'` became `'bb.module.css'`) and left the file on disk unchanged.

ts-plugin exposes a new internal protocol handler `_css-modules-kit:getEditsForFileRename` that wraps the standard tsserver `getEditsForFileRename` so the request can be reached through `typescript.tsserverRequest`.
