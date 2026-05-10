---
'@css-modules-kit/core': patch
---

fix(core): make default-export `styles` type-readonly via `as const`

The default-export `.d.ts` previously emitted each token as `'<name>': '' as readonly string,`. The `readonly` modifier is only valid on array/tuple types, so this was a TypeScript syntax error silently suppressed by `@ts-nocheck` — `styles` was not actually readonly and writes like `styles.foo = '...'` were accepted by `tsc`. The generator now emits `'<name>': '' as string,` per token and closes the object literal with `} as const`, so `typeof styles` is `Readonly<{ ... }>` and writes to it are now correctly reported as type errors.
