# @css-modules-kit/core

## 1.2.0

### Minor Changes

- [#389](https://github.com/mizdra/css-modules-kit/pull/389) [`ab602bf`](https://github.com/mizdra/css-modules-kit/commit/ab602bf9f4b8e82bcaf3d951b0cb7bb94719ee83) - feat(core, ts-plugin, eslint-plugin, stylelint-plugin): support animation-name property

  `animation-name: foo;` is now linked back to the `@keyframes foo {...}` declaration. Go to Definition jumps from a reference to the declaration, Find All References lists every reference site, and Rename updates the declaration and every reference together. Comma-separated names (`animation-name: foo, bar;`), `local()` / `global()` notation, and vendor prefixes (`-webkit-animation-name`) are all supported. References to `@keyframes` defined in another file via `@import` are resolved as well.

  Two diagnostics are also emitted for invalid usage:
  - Parse phase: malformed `local(...)` calls (empty, multiple identifiers, or non-identifier nodes such as a nested function) are reported.
  - Check phase: token references that resolve to neither a locally defined token nor an imported token are reported as `Cannot find token '<name>'.`.

  The `no-unused-class-names` rule in eslint-plugin and stylelint-plugin now treats names referenced via `animation-name` from within the same CSS as used, so they are no longer reported as unused.

### Patch Changes

- [#399](https://github.com/mizdra/css-modules-kit/pull/399) [`f758c23`](https://github.com/mizdra/css-modules-kit/commit/f758c23836878624553dcd44a920a76c5505b4d6) - refactor(core, codegen): do not emit token reference statements in generated `.d.ts` files

  Statements like `styles['a_1'];` and `__self['a_1'];` (emitted for `animation-name` references to `@keyframes`) used to appear in the `.d.ts` files written by codegen. These statements exist solely to wire up editor language features such as Go to Definition, Find All References, and Rename, and are not needed at compile time. The visible types exported by these files are unchanged, but codegen output is no longer cluttered with statements that look meaningless to a reader of the type definition file. The statements are still emitted by the TS plugin, where the language features are actually served.

- [#395](https://github.com/mizdra/css-modules-kit/pull/395) [`2d672a6`](https://github.com/mizdra/css-modules-kit/commit/2d672a68296d88922d1294268cee2eddcb62115b) - fix(core): make default-export `styles` type-readonly via `as const`

  The default-export `.d.ts` previously emitted each token as `'<name>': '' as readonly string,`. The `readonly` modifier is only valid on array/tuple types, so this was a TypeScript syntax error silently suppressed by `@ts-nocheck` — `styles` was not actually readonly and writes like `styles.foo = '...'` were accepted by `tsc`. The generator now emits `'<name>': '' as string,` per token and closes the object literal with `} as const`, so `typeof styles` is `Readonly<{ ... }>` and writes to it are now correctly reported as type errors.

- [#386](https://github.com/mizdra/css-modules-kit/pull/386) [`bf028b1`](https://github.com/mizdra/css-modules-kit/commit/bf028b15fd2503fa3596fb079755ea0138406e97) - fix(core): use the alias name when collecting re-exported tokens via `@value ... as ... from ...`

  `createExportBuilder` was recording the source-side name (`entry.name`) into the importing module's `ExportRecord` instead of the alias the importing module actually exposes (`entry.localName`). This caused downstream consumers to look up the wrong name, e.g. `checkCSSModule` would emit a false "no exported token" diagnostic for an aliased token re-imported from another module.

- [#390](https://github.com/mizdra/css-modules-kit/pull/390) [`feff13f`](https://github.com/mizdra/css-modules-kit/commit/feff13f30419511dc736594269425d2924c189f4) - fix(core): ensure the `.d.ts` generated in named exports mode is always treated as a module

  When a CSS Module file had no exported tokens or importers (e.g. an empty file), the generated `.d.ts` in named exports mode contained no top-level `export`/`import`, so TypeScript treated it as a global script and reported `TS2306` on `import * as styles from './a.module.css'`. The generator now appends `export {};` whenever it does not emit any other top-level `export` / `import`, so the generated `.d.ts` is always treated as a module.

- [#384](https://github.com/mizdra/css-modules-kit/pull/384) [`d0c1750`](https://github.com/mizdra/css-modules-kit/commit/d0c17500bf51450a3d722b13b0159a96890c786d) - refactor(core): rename TokenImporter variants to ESTree-style names

  Rename the public types so they describe the abstract shape of the import
  (matching ESTree's `ExportAllDeclaration` / `ExportNamedDeclaration`)
  rather than the CSS syntax that produced them:
  - `AtImportTokenImporter` → `AllTokenImporter` (`type: 'all'`)
  - `AtValueTokenImporter` → `NamedTokenImporter` (`type: 'named'`)
  - `AtValueTokenImporterValue` → `NamedTokenImporterEntry`
  - `NamedTokenImporter.values` → `NamedTokenImporter.entries`

  The `core` package is an internal building block — end users interact
  with CSS Modules Kit through `ts-plugin`, `codegen`, `eslint-plugin`,
  and `stylelint-plugin`, none of which reference the renamed names. This
  change is therefore released as a patch.

## 1.1.0

### Minor Changes

- [#367](https://github.com/mizdra/css-modules-kit/pull/367) [`cb89044`](https://github.com/mizdra/css-modules-kit/commit/cb890443d1bd1ec9985dca8e168e8ea0c1c12730) - feat(core, ts-plugin): support non-JavaScript identifier token in named export

### Patch Changes

- [#373](https://github.com/mizdra/css-modules-kit/pull/373) [`3da75ab`](https://github.com/mizdra/css-modules-kit/commit/3da75ab72251cd5c9465f4b7a92b9475b6436a39) - fix(core): resolve relative dtsOutDir against defining tsconfig directory

- [#363](https://github.com/mizdra/css-modules-kit/pull/363) [`efe7e30`](https://github.com/mizdra/css-modules-kit/commit/efe7e304333b93a9295c35efc4af987f3ad8e62c) - refactor(core, ts-plugin): replace secondaryMapping with CustomSourceMap

## 1.0.0

### Major Changes

- [#357](https://github.com/mizdra/css-modules-kit/pull/357) [`cc5f4c8`](https://github.com/mizdra/css-modules-kit/commit/cc5f4c8bd2c0cf49d582852150357669c1d9ea6b) - feat(core, ts-plugin, codegen)!: require `cmkOptions.enabled: true` to activate

  ts-plugin and codegen are now only enabled when `cmkOptions.enabled` is explicitly set to `true` in tsconfig.json.
  Previously they worked even without the option. See [#289](https://github.com/mizdra/css-modules-kit/issues/289) for background.

- [#362](https://github.com/mizdra/css-modules-kit/pull/362) [`e1f2983`](https://github.com/mizdra/css-modules-kit/commit/e1f2983c5040159ac97ba34f26c8b26f72d2f4ae) - Drop Node.js 20 support and require Node.js >=22.12.0.

### Minor Changes

- [#370](https://github.com/mizdra/css-modules-kit/pull/370) [`d51cf0f`](https://github.com/mizdra/css-modules-kit/commit/d51cf0fdcb7f8f9677cf40fc3e8f621a6e16b501) Thanks [@InSyncWithFoo](https://github.com/InSyncWithFoo)! - feat(core): support `${configDir}` in tsconfig options

### Patch Changes

- [#351](https://github.com/mizdra/css-modules-kit/pull/351) [`0f570c1`](https://github.com/mizdra/css-modules-kit/commit/0f570c17f698c7dd6239931ffcf6ae61ff40e867) - fix(core, codegen): support TypeScript v6

- [#350](https://github.com/mizdra/css-modules-kit/pull/350) [`f615cce`](https://github.com/mizdra/css-modules-kit/commit/f615cce4dc35f5b4c63215d57f98c05e13b4db47) - deps(core): update postcss and postcss-selector-parser

## 0.10.0

### Patch Changes

- [#343](https://github.com/mizdra/css-modules-kit/pull/343) [`727f295`](https://github.com/mizdra/css-modules-kit/commit/727f29598cc3256dfaccff1d1582e7f74189e4f4) - chore: migrate from ESLint to oxlint

- [#341](https://github.com/mizdra/css-modules-kit/pull/341) [`70660f4`](https://github.com/mizdra/css-modules-kit/commit/70660f4146ad499988c5239d839951495d8a0703) - chore: migrate from Prettier to oxfmt

## 0.9.0

### Minor Changes

- [#330](https://github.com/mizdra/css-modules-kit/pull/330) [`d89f583`](https://github.com/mizdra/css-modules-kit/commit/d89f583c96176164dc05b5fd77cd5851738cd31b) - feat(core, ts-plugin): support non-JavaScript identifier token in default export

### Patch Changes

- [#333](https://github.com/mizdra/css-modules-kit/pull/333) [`9b9aeae`](https://github.com/mizdra/css-modules-kit/commit/9b9aeae02196db948975fecd5177e0de0a1477eb) - fix(core): use `matchAll` instead of `exec` in `findUsedTokenNames` to avoid potential `lastIndex` state issues

- [#334](https://github.com/mizdra/css-modules-kit/pull/334) [`9ca81da`](https://github.com/mizdra/css-modules-kit/commit/9ca81da5d6a8f101aaafd9ba1fce5eb329ac2ac9) - fix(core): support `styles['foo']` and `styles["foo"]` bracket notation in `findUsedTokenNames`

- [#326](https://github.com/mizdra/css-modules-kit/pull/326) [`61f228a`](https://github.com/mizdra/css-modules-kit/commit/61f228a13908f69588bae7d52dc0c656d5eaff17) - fix(core): fix the incorrect position of the diagnostics for the escaped class selectors

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
