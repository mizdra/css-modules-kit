# @css-modules-kit/core

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
