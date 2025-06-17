# @css-modules-kit/ts-plugin

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
