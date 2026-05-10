---
'@css-modules-kit/core': patch
---

fix(core): ensure the `.d.ts` generated in named exports mode is always treated as a module

When a CSS Module file had no exported tokens or importers (e.g. an empty file), the generated `.d.ts` in named exports mode contained no top-level `export`/`import`, so TypeScript treated it as a global script and reported `TS2306` on `import * as styles from './a.module.css'`. The generator now appends `export {};` whenever it does not emit any other top-level `export` / `import`, so the generated `.d.ts` is always treated as a module.
