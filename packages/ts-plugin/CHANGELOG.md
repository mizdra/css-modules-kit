# @css-modules-kit/ts-plugin

## 0.7.0

### Minor Changes

- [#269](https://github.com/mizdra/css-modules-kit/pull/269) [`60b7515`](https://github.com/mizdra/css-modules-kit/commit/60b7515151f426ed283e5e515d5056460c68926c) - feat: generate .d.ts files even if syntax or semantic errors are found

- [#272](https://github.com/mizdra/css-modules-kit/pull/272) [`c36be81`](https://github.com/mizdra/css-modules-kit/commit/c36be819ea5f405ade9d1aa6f0c47e428ca3755d) - feat!: report an error diagnostic when no files found by `include`/`exclude` pattern

### Patch Changes

- [#273](https://github.com/mizdra/css-modules-kit/pull/273) [`d1c2051`](https://github.com/mizdra/css-modules-kit/commit/d1c20511cbee75a39a306c28b8898d070404a180) - refactor: rename from `createDts` to `generateDts`

- [#274](https://github.com/mizdra/css-modules-kit/pull/274) [`87e1aef`](https://github.com/mizdra/css-modules-kit/commit/87e1aef2b6a2f308bf0af76dc1a914b4eebac283) - refactor: include diagnostics within `CSSModule` object

- Updated dependencies [[`d1c2051`](https://github.com/mizdra/css-modules-kit/commit/d1c20511cbee75a39a306c28b8898d070404a180), [`60b7515`](https://github.com/mizdra/css-modules-kit/commit/60b7515151f426ed283e5e515d5056460c68926c), [`4d661a1`](https://github.com/mizdra/css-modules-kit/commit/4d661a195a90b34c43d4f7e2fa7def83762ffee4), [`87e1aef`](https://github.com/mizdra/css-modules-kit/commit/87e1aef2b6a2f308bf0af76dc1a914b4eebac283), [`c36be81`](https://github.com/mizdra/css-modules-kit/commit/c36be819ea5f405ade9d1aa6f0c47e428ca3755d)]:
  - @css-modules-kit/core@0.7.0

## 0.6.0

### Minor Changes

- 1f44d73: feat: add `cmkOptions.keyframes` option

### Patch Changes

- Updated dependencies [b167f2c]
- Updated dependencies [1f44d73]
  - @css-modules-kit/core@0.6.0

## 0.5.1

### Patch Changes

- e0ebb5b: fix: fix missing quick fix actions
- d6566f3: deps: update dependencies
- Updated dependencies [d6566f3]
  - @css-modules-kit/core@0.5.1

## 0.5.0

### Minor Changes

- 9c20f15: fix: `default` is not allowed as names when `namedExports` is `true`
- 9c20f15: fix: `__proto__` is not allowed as names

### Patch Changes

- Updated dependencies [9c20f15]
- Updated dependencies [9c20f15]
- Updated dependencies [61e053d]
- Updated dependencies [15dcba8]
- Updated dependencies [b38f9d3]
- Updated dependencies [d0a6685]
  - @css-modules-kit/core@0.5.0

## 0.4.0

### Minor Changes

- 20858d7: feat: allow to add missing rules from non-component files

### Patch Changes

- 93cf8d1: fix: fix the issue that renaming classes from .css does not work in VS Code
- 20858d7: fix: fix failure to add missing rule for named exports
- 20858d7: fix: include similar class names in the missing rule addition target
- 93cf8d1: fix: fix the issue that Go to Definition for specifiers fails using import alias in VS Code

## 0.3.0

### Minor Changes

- 15209ea: feat: support "Definition Preview for Hover"

### Patch Changes

- bf01bee: fix: make ts-plugin report the import of files where .d.ts exists but .module.css does not exist
- 90ddb64: chore!: change `createDts` interface
- Updated dependencies [15209ea]
- Updated dependencies [5a8adb7]
- Updated dependencies [90ddb64]
  - @css-modules-kit/core@0.4.0

## 0.2.0

### Minor Changes

- 91c21eb: feat: support Node.js >=20.19.0
- fb0563d: feat: support `prioritizeNamedImports` option
- 9b40191: feat: support `namedExports` option

### Patch Changes

- 3ec5b22: fix: exclude files in `generated/` from completion candidates
- Updated dependencies [91c21eb]
- Updated dependencies [fb0563d]
- Updated dependencies [9b40191]
  - @css-modules-kit/core@0.3.0

## 0.1.1

### Patch Changes

- 2e460bf: Fix className completion entry to support single quotes
- a91b6fe: Prevent ts-plugin from processing `xxx.css`

## 0.1.0

### Minor Changes

- 385bdc3: refactor: change diagnostic interface
- 2b1f0fe: feat: implement resolver cache

### Patch Changes

- 88c9868: refactor: rename `diagnostics` of `SyntacticDiagnostic` to `syntacticDiagnostics`
- Updated dependencies [385bdc3]
- Updated dependencies [2b1f0fe]
- Updated dependencies [6ecc738]
- Updated dependencies [2fde8ec]
- Updated dependencies [819e023]
- Updated dependencies [2bd2165]
  - @css-modules-kit/core@0.2.0

## 0.0.6

### Patch Changes

- Updated dependencies [e899e5e]
  - @css-modules-kit/core@0.1.0

## 0.0.5

### Patch Changes

- 7df2e70: Release test
- Updated dependencies [7df2e70]
  - @css-modules-kit/core@0.0.5

## 0.0.4

### Patch Changes

- 2eb908f: Resolve import specifiers taking into account `baseUrl` and `imports`
- Updated dependencies [2eb908f]
  - @css-modules-kit/core@0.0.4

## 0.0.3

### Patch Changes

- 508b4b6: Retry publishing
- Updated dependencies [508b4b6]
  - @css-modules-kit/core@0.0.3

## 0.0.2

### Patch Changes

- 251ba5b: Fix infinite loop when the module graph has circular dependencies
- fa1d6a9: refactor: remove unused codes
- Updated dependencies [251ba5b]
- Updated dependencies [fa1d6a9]
  - @css-modules-kit/core@0.0.2

## 0.0.1

### Patch Changes

- 434f3da: first release
- Updated dependencies [434f3da]
  - @css-modules-kit/core@0.0.1
