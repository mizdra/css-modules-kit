# @css-modules-kit/codegen

## 0.9.0

### Patch Changes

- [#335](https://github.com/mizdra/css-modules-kit/pull/335) [`01e89eb`](https://github.com/mizdra/css-modules-kit/commit/01e89eb26e99b2d42a375a948c798bd82e457947) - fix(codegen): ignore `node_modules` and `.git` directories in watch mode to prevent EMFILE errors

- Updated dependencies [[`d89f583`](https://github.com/mizdra/css-modules-kit/commit/d89f583c96176164dc05b5fd77cd5851738cd31b), [`9b9aeae`](https://github.com/mizdra/css-modules-kit/commit/9b9aeae02196db948975fecd5177e0de0a1477eb), [`9ca81da`](https://github.com/mizdra/css-modules-kit/commit/9ca81da5d6a8f101aaafd9ba1fce5eb329ac2ac9), [`61f228a`](https://github.com/mizdra/css-modules-kit/commit/61f228a13908f69588bae7d52dc0c656d5eaff17)]:
  - @css-modules-kit/core@0.9.0

## 0.8.1

### Patch Changes

- [#318](https://github.com/mizdra/css-modules-kit/pull/318) [`ece6603`](https://github.com/mizdra/css-modules-kit/commit/ece6603058cb303df389969aba74648f4ed7ef68) - chore: synchronize versions across all packages (except zed)

- Updated dependencies [[`61cb7a5`](https://github.com/mizdra/css-modules-kit/commit/61cb7a5d4d0f2514c85f2f430ee2080de2f1573a), [`df01b95`](https://github.com/mizdra/css-modules-kit/commit/df01b95d3177e8fd486b8b8a36873915b989de75), [`707df0c`](https://github.com/mizdra/css-modules-kit/commit/707df0c75939699bec4a1d438f04aebe2a17a3db), [`ece6603`](https://github.com/mizdra/css-modules-kit/commit/ece6603058cb303df389969aba74648f4ed7ef68)]:
  - @css-modules-kit/core@0.8.1

## 0.8.0

### Minor Changes

- [#288](https://github.com/mizdra/css-modules-kit/pull/288) [`89f11a5`](https://github.com/mizdra/css-modules-kit/commit/89f11a54af1dc86b344e151b63bc2708486c31bb) - feat: add --preserveWatchOutput option

- [#290](https://github.com/mizdra/css-modules-kit/pull/290) [`d75f75f`](https://github.com/mizdra/css-modules-kit/commit/d75f75f5d23e73e366edfdad590da1c695e48374) - feat: exit with error when `cmkOptions.enabled` is false

- [#302](https://github.com/mizdra/css-modules-kit/pull/302) [`32ecdc2`](https://github.com/mizdra/css-modules-kit/commit/32ecdc2f8b720bc9ab1d85d41e4fb45fe6510658) - feat!: include types in .d.ts files for unresolved or unmatched module imports

- [#290](https://github.com/mizdra/css-modules-kit/pull/290) [`d75f75f`](https://github.com/mizdra/css-modules-kit/commit/d75f75f5d23e73e366edfdad590da1c695e48374) - feat: warn when `cmkOptions.enabled` is not set

- [#286](https://github.com/mizdra/css-modules-kit/pull/286) [`352f53c`](https://github.com/mizdra/css-modules-kit/commit/352f53c2b9a3fbdfbf1493aa53c61bbb99246ee9) - chore: migrate from CJS to ESM

### Patch Changes

- [#300](https://github.com/mizdra/css-modules-kit/pull/300) [`96108ad`](https://github.com/mizdra/css-modules-kit/commit/96108ade58a14f42420423117c5611c74db23d20) - docs: update documentation

- Updated dependencies [[`673b45a`](https://github.com/mizdra/css-modules-kit/commit/673b45aa30152e80a251e1234aa1c8e4c327d6e9), [`b5cdd4a`](https://github.com/mizdra/css-modules-kit/commit/b5cdd4a1df3af54a156a9be886c056b2db48fcab), [`92d7918`](https://github.com/mizdra/css-modules-kit/commit/92d7918669a5cc79ad8c0de3e3a8bb784844b72e), [`0128985`](https://github.com/mizdra/css-modules-kit/commit/012898565db011194d30f7718f913a5053855794), [`32ecdc2`](https://github.com/mizdra/css-modules-kit/commit/32ecdc2f8b720bc9ab1d85d41e4fb45fe6510658), [`b5cdd4a`](https://github.com/mizdra/css-modules-kit/commit/b5cdd4a1df3af54a156a9be886c056b2db48fcab), [`4318015`](https://github.com/mizdra/css-modules-kit/commit/4318015b66dae10da4ebd15048628c9cc133bffe), [`b5cdd4a`](https://github.com/mizdra/css-modules-kit/commit/b5cdd4a1df3af54a156a9be886c056b2db48fcab), [`352f53c`](https://github.com/mizdra/css-modules-kit/commit/352f53c2b9a3fbdfbf1493aa53c61bbb99246ee9)]:
  - @css-modules-kit/core@0.8.0

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
