# @css-modules-kit/ts-plugin

## 0.9.0

### Minor Changes

- [#330](https://github.com/mizdra/css-modules-kit/pull/330) [`d89f583`](https://github.com/mizdra/css-modules-kit/commit/d89f583c96176164dc05b5fd77cd5851738cd31b) - feat(core, ts-plugin): support non-JavaScript identifier token in default export

### Patch Changes

- [#336](https://github.com/mizdra/css-modules-kit/pull/336) [`6115ee6`](https://github.com/mizdra/css-modules-kit/commit/6115ee6c8b9918a0209fc401684b19f20cecae5f) - docs(ts-plugin): fix typo in Zed settings path in README

- Updated dependencies [[`d89f583`](https://github.com/mizdra/css-modules-kit/commit/d89f583c96176164dc05b5fd77cd5851738cd31b), [`9b9aeae`](https://github.com/mizdra/css-modules-kit/commit/9b9aeae02196db948975fecd5177e0de0a1477eb), [`9ca81da`](https://github.com/mizdra/css-modules-kit/commit/9ca81da5d6a8f101aaafd9ba1fce5eb329ac2ac9), [`61f228a`](https://github.com/mizdra/css-modules-kit/commit/61f228a13908f69588bae7d52dc0c656d5eaff17)]:
  - @css-modules-kit/core@0.9.0

## 0.8.1

### Patch Changes

- [#306](https://github.com/mizdra/css-modules-kit/pull/306) [`61cb7a5`](https://github.com/mizdra/css-modules-kit/commit/61cb7a5d4d0f2514c85f2f430ee2080de2f1573a) - chore: disable complexity and max-params ESLint rules

- [#315](https://github.com/mizdra/css-modules-kit/pull/315) [`f5a008a`](https://github.com/mizdra/css-modules-kit/commit/f5a008a6e984b74e27b1b49fbf27829d5acaaac0) - fix(ts-plugin): fix incorrect Definition Preview

- [#318](https://github.com/mizdra/css-modules-kit/pull/318) [`ece6603`](https://github.com/mizdra/css-modules-kit/commit/ece6603058cb303df389969aba74648f4ed7ef68) - chore: synchronize versions across all packages (except zed)

- Updated dependencies [[`61cb7a5`](https://github.com/mizdra/css-modules-kit/commit/61cb7a5d4d0f2514c85f2f430ee2080de2f1573a), [`df01b95`](https://github.com/mizdra/css-modules-kit/commit/df01b95d3177e8fd486b8b8a36873915b989de75), [`707df0c`](https://github.com/mizdra/css-modules-kit/commit/707df0c75939699bec4a1d438f04aebe2a17a3db), [`ece6603`](https://github.com/mizdra/css-modules-kit/commit/ece6603058cb303df389969aba74648f4ed7ef68)]:
  - @css-modules-kit/core@0.8.1

## 0.8.0

### Minor Changes

- [#299](https://github.com/mizdra/css-modules-kit/pull/299) [`4c604fe`](https://github.com/mizdra/css-modules-kit/commit/4c604feb795eccb561d7992402346890541cc6f6) - feat: disable ts-plugin if `cmkConfig.enabled` is `false`

- [#286](https://github.com/mizdra/css-modules-kit/pull/286) [`352f53c`](https://github.com/mizdra/css-modules-kit/commit/352f53c2b9a3fbdfbf1493aa53c61bbb99246ee9) - chore: migrate modules other than entry points from CJS to ESM

- [#302](https://github.com/mizdra/css-modules-kit/pull/302) [`32ecdc2`](https://github.com/mizdra/css-modules-kit/commit/32ecdc2f8b720bc9ab1d85d41e4fb45fe6510658) - feat!: include types in .d.ts files for unresolved or unmatched module imports

### Patch Changes

- [#305](https://github.com/mizdra/css-modules-kit/pull/305) [`51a78a7`](https://github.com/mizdra/css-modules-kit/commit/51a78a7751703ae17f38ec7fd7d20c7f22ec521d) - fix: prevent tsserver crash when adding new files

- [#295](https://github.com/mizdra/css-modules-kit/pull/295) [`4318015`](https://github.com/mizdra/css-modules-kit/commit/4318015b66dae10da4ebd15048628c9cc133bffe) - refactor: consolidate `checkCSSModule` arguments into `CheckerArgs`

- [#300](https://github.com/mizdra/css-modules-kit/pull/300) [`96108ad`](https://github.com/mizdra/css-modules-kit/commit/96108ade58a14f42420423117c5611c74db23d20) - docs: update documentation

- Updated dependencies [[`673b45a`](https://github.com/mizdra/css-modules-kit/commit/673b45aa30152e80a251e1234aa1c8e4c327d6e9), [`b5cdd4a`](https://github.com/mizdra/css-modules-kit/commit/b5cdd4a1df3af54a156a9be886c056b2db48fcab), [`92d7918`](https://github.com/mizdra/css-modules-kit/commit/92d7918669a5cc79ad8c0de3e3a8bb784844b72e), [`0128985`](https://github.com/mizdra/css-modules-kit/commit/012898565db011194d30f7718f913a5053855794), [`32ecdc2`](https://github.com/mizdra/css-modules-kit/commit/32ecdc2f8b720bc9ab1d85d41e4fb45fe6510658), [`b5cdd4a`](https://github.com/mizdra/css-modules-kit/commit/b5cdd4a1df3af54a156a9be886c056b2db48fcab), [`4318015`](https://github.com/mizdra/css-modules-kit/commit/4318015b66dae10da4ebd15048628c9cc133bffe), [`b5cdd4a`](https://github.com/mizdra/css-modules-kit/commit/b5cdd4a1df3af54a156a9be886c056b2db48fcab), [`352f53c`](https://github.com/mizdra/css-modules-kit/commit/352f53c2b9a3fbdfbf1493aa53c61bbb99246ee9)]:
  - @css-modules-kit/core@0.8.0

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
