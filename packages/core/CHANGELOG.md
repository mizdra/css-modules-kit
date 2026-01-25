# @css-modules-kit/core

## 0.8.1

### Patch Changes

- [#306](https://github.com/mizdra/css-modules-kit/pull/306) [`61cb7a5`](https://github.com/mizdra/css-modules-kit/commit/61cb7a5d4d0f2514c85f2f430ee2080de2f1573a) - chore: disable complexity and max-params ESLint rules

- [#311](https://github.com/mizdra/css-modules-kit/pull/311) [`df01b95`](https://github.com/mizdra/css-modules-kit/commit/df01b95d3177e8fd486b8b8a36873915b989de75) - fix(core): fix the issue where `*.css` import resolution fails

- [#317](https://github.com/mizdra/css-modules-kit/pull/317) [`707df0c`](https://github.com/mizdra/css-modules-kit/commit/707df0c75939699bec4a1d438f04aebe2a17a3db) - fix(core): remove unnecessary mappings

- [#318](https://github.com/mizdra/css-modules-kit/pull/318) [`ece6603`](https://github.com/mizdra/css-modules-kit/commit/ece6603058cb303df389969aba74648f4ed7ef68) - chore: synchronize versions across all packages (except zed)

## 0.8.0

### Minor Changes

- [#296](https://github.com/mizdra/css-modules-kit/pull/296) [`b5cdd4a`](https://github.com/mizdra/css-modules-kit/commit/b5cdd4a1df3af54a156a9be886c056b2db48fcab) - feat!: remove unused `isAbsolute`

- [#302](https://github.com/mizdra/css-modules-kit/pull/302) [`32ecdc2`](https://github.com/mizdra/css-modules-kit/commit/32ecdc2f8b720bc9ab1d85d41e4fb45fe6510658) - feat!: include types in .d.ts files for unresolved or unmatched module imports

- [#295](https://github.com/mizdra/css-modules-kit/pull/295) [`4318015`](https://github.com/mizdra/css-modules-kit/commit/4318015b66dae10da4ebd15048628c9cc133bffe) - refactor: consolidate `checkCSSModule` arguments into `CheckerArgs`

- [#286](https://github.com/mizdra/css-modules-kit/pull/286) [`352f53c`](https://github.com/mizdra/css-modules-kit/commit/352f53c2b9a3fbdfbf1493aa53c61bbb99246ee9) - chore: migrate from CJS to ESM

### Patch Changes

- [#297](https://github.com/mizdra/css-modules-kit/pull/297) [`673b45a`](https://github.com/mizdra/css-modules-kit/commit/673b45aa30152e80a251e1234aa1c8e4c327d6e9) - fix: prevent URL specifiers from being resolved by import aliases

- [#298](https://github.com/mizdra/css-modules-kit/pull/298) [`92d7918`](https://github.com/mizdra/css-modules-kit/commit/92d7918669a5cc79ad8c0de3e3a8bb784844b72e) - fix: fix .d.ts generation regression from #296

- [#303](https://github.com/mizdra/css-modules-kit/pull/303) [`0128985`](https://github.com/mizdra/css-modules-kit/commit/012898565db011194d30f7718f913a5053855794) - fix: prevent `styles` from becoming `any` type when importing unresolvable or unmatched modules

- [#296](https://github.com/mizdra/css-modules-kit/pull/296) [`b5cdd4a`](https://github.com/mizdra/css-modules-kit/commit/b5cdd4a1df3af54a156a9be886c056b2db48fcab) - fix: report "Cannot import module" diagnostic for unresolvable bare specifiers

- [#296](https://github.com/mizdra/css-modules-kit/pull/296) [`b5cdd4a`](https://github.com/mizdra/css-modules-kit/commit/b5cdd4a1df3af54a156a9be886c056b2db48fcab) - fix: return `undefined` for non-existent CSS module paths in resolver

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
