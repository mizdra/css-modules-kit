# @css-modules-kit/codegen

## 0.7.0

### Minor Changes

- [#269](https://github.com/mizdra/css-modules-kit/pull/269) [`60b7515`](https://github.com/mizdra/css-modules-kit/commit/60b7515151f426ed283e5e515d5056460c68926c) - feat: generate .d.ts files even if syntax or semantic errors are found

- [#278](https://github.com/mizdra/css-modules-kit/pull/278) [`f33b0a6`](https://github.com/mizdra/css-modules-kit/commit/f33b0a6adf7a90765cb2b061ae338e8c2a5ceea0) - feat: add `--watch` option

- [#272](https://github.com/mizdra/css-modules-kit/pull/272) [`c36be81`](https://github.com/mizdra/css-modules-kit/commit/c36be819ea5f405ade9d1aa6f0c47e428ca3755d) - feat!: report an error diagnostic when no files found by `include`/`exclude` pattern

### Patch Changes

- [#273](https://github.com/mizdra/css-modules-kit/pull/273) [`d1c2051`](https://github.com/mizdra/css-modules-kit/commit/d1c20511cbee75a39a306c28b8898d070404a180) - refactor: rename from `createDts` to `generateDts`

- [#275](https://github.com/mizdra/css-modules-kit/pull/275) [`412f33e`](https://github.com/mizdra/css-modules-kit/commit/412f33e25ed5a1d6245d17c5cb87229a37f55820) - feat: log internal errors with logger

- [#274](https://github.com/mizdra/css-modules-kit/pull/274) [`87e1aef`](https://github.com/mizdra/css-modules-kit/commit/87e1aef2b6a2f308bf0af76dc1a914b4eebac283) - refactor: include diagnostics within `CSSModule` object

- Updated dependencies [[`d1c2051`](https://github.com/mizdra/css-modules-kit/commit/d1c20511cbee75a39a306c28b8898d070404a180), [`60b7515`](https://github.com/mizdra/css-modules-kit/commit/60b7515151f426ed283e5e515d5056460c68926c), [`4d661a1`](https://github.com/mizdra/css-modules-kit/commit/4d661a195a90b34c43d4f7e2fa7def83762ffee4), [`87e1aef`](https://github.com/mizdra/css-modules-kit/commit/87e1aef2b6a2f308bf0af76dc1a914b4eebac283), [`c36be81`](https://github.com/mizdra/css-modules-kit/commit/c36be819ea5f405ade9d1aa6f0c47e428ca3755d)]:
  - @css-modules-kit/core@0.7.0

## 0.6.0

### Minor Changes

- f559992: chore!: make codegen internal API private
- 1f44d73: feat: add `cmkOptions.keyframes` option

### Patch Changes

- Updated dependencies [b167f2c]
- Updated dependencies [1f44d73]
  - @css-modules-kit/core@0.6.0

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

## 0.4.1

### Patch Changes

- 1489b9c: fix: fix the error that occurs when the output directory does not exist

## 0.4.0

### Minor Changes

- 7e0ea4b: feat: support `--clean` option

### Patch Changes

- 5a8adb7: fix: calculate the correct range of CSS syntax errors
- 90ddb64: chore!: change `createDts` interface
- Updated dependencies [15209ea]
- Updated dependencies [5a8adb7]
- Updated dependencies [90ddb64]
  - @css-modules-kit/core@0.4.0

## 0.3.0

### Minor Changes

- 91c21eb: feat: support Node.js >=20.19.0
- 9b40191: feat: support `namedExports` option

### Patch Changes

- Updated dependencies [91c21eb]
- Updated dependencies [fb0563d]
- Updated dependencies [9b40191]
  - @css-modules-kit/core@0.3.0

## 0.2.0

### Minor Changes

- 385bdc3: refactor: change diagnostic interface
- 2b1f0fe: feat: implement resolver cache
- 2fde8ec: feat: format diagnostics and system errors by TypeScript Compiler API
- bf7d0d8: feat: support `--pretty` option
- 1512c07: feat!: drop support for `NODE_DISABLE_COLORS` and `FORCE_COLOR`
- 9ce6d25: feat: print error cause of `SystemError`

### Patch Changes

- b8c8198: fix: handle CLI argument parsing errors
- 2bd2165: refactor: remove unused property of `Diagnostic`
- 3772c14: fix: fix invalid `cause` object of `SystemError`
- Updated dependencies [385bdc3]
- Updated dependencies [2b1f0fe]
- Updated dependencies [6ecc738]
- Updated dependencies [2fde8ec]
- Updated dependencies [819e023]
- Updated dependencies [2bd2165]
  - @css-modules-kit/core@0.2.0

## 0.1.4

### Patch Changes

- Updated dependencies [e899e5e]
  - @css-modules-kit/core@0.1.0

## 0.1.3

### Patch Changes

- 7df2e70: Release test
- Updated dependencies [7df2e70]
  - @css-modules-kit/core@0.0.5

## 0.1.2

### Patch Changes

- 2eb908f: Resolve import specifiers taking into account `baseUrl` and `imports`
- 984ae9e: Fix problem with `tsc` reporting an error with `--skipLibCheck=false`
- Updated dependencies [2eb908f]
  - @css-modules-kit/core@0.0.4

## 0.1.1

### Patch Changes

- 508b4b6: Retry publishing
- Updated dependencies [508b4b6]
  - @css-modules-kit/core@0.0.3

## 0.1.0

### Minor Changes

- 47b769c: Add `--help`/`--version`/`--project` options

### Patch Changes

- fa1d6a9: refactor: remove unused codes
- Updated dependencies [251ba5b]
- Updated dependencies [fa1d6a9]
  - @css-modules-kit/core@0.0.2

## 0.0.1

### Patch Changes

- 434f3da: first release
- Updated dependencies [434f3da]
  - @css-modules-kit/core@0.0.1
