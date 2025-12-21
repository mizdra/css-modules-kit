# @css-modules-kit/core

## 0.7.0

### Minor Changes

- [#273](https://github.com/mizdra/css-modules-kit/pull/273) [`d1c2051`](https://github.com/mizdra/css-modules-kit/commit/d1c20511cbee75a39a306c28b8898d070404a180) - refactor: rename from `createDts` to `generateDts`

- [#269](https://github.com/mizdra/css-modules-kit/pull/269) [`60b7515`](https://github.com/mizdra/css-modules-kit/commit/60b7515151f426ed283e5e515d5056460c68926c) - feat: generate .d.ts files even if syntax or semantic errors are found

- [#262](https://github.com/mizdra/css-modules-kit/pull/262) [`4d661a1`](https://github.com/mizdra/css-modules-kit/commit/4d661a195a90b34c43d4f7e2fa7def83762ffee4) - feat: add `wildcardDirectories` in `CMKConfig`

- [#274](https://github.com/mizdra/css-modules-kit/pull/274) [`87e1aef`](https://github.com/mizdra/css-modules-kit/commit/87e1aef2b6a2f308bf0af76dc1a914b4eebac283) - refactor: include diagnostics within `CSSModule` object

- [#272](https://github.com/mizdra/css-modules-kit/pull/272) [`c36be81`](https://github.com/mizdra/css-modules-kit/commit/c36be819ea5f405ade9d1aa6f0c47e428ca3755d) - feat!: report an error diagnostic when no files found by `include`/`exclude` pattern

## 0.6.0

### Minor Changes

- 1f44d73: feat: add `cmkOptions.keyframes` option

### Patch Changes

- b167f2c: fix: fix an issue where `prioritizeNamedImports` is ignored when used with `extends` of `tsconfig.json`

## 0.5.1

### Patch Changes

- d6566f3: deps: update dependencies

## 0.5.0

### Minor Changes

- 9c20f15: fix: `default` is not allowed as names when `namedExports` is `true`
- 9c20f15: fix: `__proto__` is not allowed as names
- 15dcba8, 61e053d: feat: improve non-JS identifier error message
- b38f9d3, 69095b7: feat: support `@keyframes`

### Patch Changes

- d0a6685: fix: disallow non-JavaScript identifier `@value`

## 0.4.0

### Minor Changes

- 15209ea: feat: support "Definition Preview for Hover"

### Patch Changes

- 5a8adb7: fix: calculate the correct range of CSS syntax errors
- 90ddb64: chore!: change `createDts` interface

## 0.3.0

### Minor Changes

- 91c21eb: feat: support Node.js >=20.19.0
- fb0563d: feat: support `prioritizeNamedImports` option
- 9b40191: feat: support `namedExports` option

## 0.2.0

### Minor Changes

- 385bdc3: refactor: change diagnostic interface
- 2b1f0fe: feat: implement resolver cache
- 6ecc738: refactor: move types to `type.ts`
- 2fde8ec: feat: format diagnostics and system errors by TypeScript Compiler API
- 819e023: feat: show source of diagnostic

### Patch Changes

- 2bd2165: refactor: remove unused property of `Diagnostic`

## 0.1.0

### Minor Changes

- e899e5e: refactor: move `findUsedTokenNames` to core

## 0.0.5

### Patch Changes

- 7df2e70: Release test

## 0.0.4

### Patch Changes

- 2eb908f: Resolve import specifiers taking into account `baseUrl` and `imports`

## 0.0.3

### Patch Changes

- 508b4b6: Retry publishing

## 0.0.2

### Patch Changes

- 251ba5b: Fix infinite loop when the module graph has circular dependencies
- fa1d6a9: refactor: remove unused codes

## 0.0.1

### Patch Changes

- 434f3da: first release
