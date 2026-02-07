---
'@css-modules-kit/core': patch
---

fix(core): use `matchAll` instead of `exec` in `findUsedTokenNames` to avoid potential `lastIndex` state issues
