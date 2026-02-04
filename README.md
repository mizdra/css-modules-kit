# CSS Modules Kit

A toolkit for making CSS Modules useful.

<p align="center">
  <img alt="Logo" width="256" height="256" src="./docs/logo.png" />
</p>

## Intro

By default, CSS Modules have limited language features in editors. For example:

- Clicking on `styles.button` does not "Go to Definition" in `Button.module.css`.
- Renaming `styles.button` modifies the code in `Button.tsx` but not in `Button.module.css`.
- Performing "Find All References" for `styles.button` finds references in `Button.tsx`, not in `Button.module.css`.

It has been difficult to solve these issues because the TypeScript Language Server (tsserver) does not load CSS files. TSServer does not know which part of the code to "Go to Definition" for, nor which part of the code to rename.

CSS Modules Kit solves this problem by using the [TypeScript Language Service Plugin](https://github.com/microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin) and [Volar.js](https://volarjs.dev/). They extend tsserver to load `*.module.css` files. As a result, [rich language features](#supported-language-features) become available. Moreover, it works with various editors.

In addition, CSS Modules Kit provides various tools for CSS Modules (e.g., codegen, linter-plugin). CSS Modules Kit provides you everything you need. It saves you from the hassle of combining multiple third-party tools.

## Get Started

See [docs/get-started.md](./docs/get-started.md).

## Playground

1. Open https://stackblitz.com/~/github.com/mizdra/css-modules-kit-example
2. After waiting a moment, a message will appear in the bottom-right saying `you want to install the recommended extensions`. Click `Install` and wait for the installation to complete.
3. Open `src/a.tsx`. CSS Modules language features should now be enabled.

## Available Tools

- [`@css-modules-kit/ts-plugin`](./packages/ts-plugin/README.md)
- [`@css-modules-kit/codegen`](./packages/codegen/README.md)
- [`@css-modules-kit/stylelint-plugin`](./packages/stylelint-plugin/README.md)
- [`@css-modules-kit/eslint-plugin`](./packages/eslint-plugin/README.md)

## Supported Language Features

<details>
<summary>Go to Definition</summary>

https://github.com/user-attachments/assets/bdeb2c8a-d615-4223-bae4-e7446f62d353

</details>

<details>
<summary>Rename Symbol</summary>

https://github.com/user-attachments/assets/db39a95e-2fc8-42a6-a64d-02f2822afbfe

</details>

<details>
<summary>Find All References</summary>

https://github.com/user-attachments/assets/df1e2feb-2a1a-4bf5-ae70-1cac36d90409

</details>

<details>
<summary>Definition Preview by Hover</summary>

You can preview the definition with <kbd>Command</kbd> + <kbd>Hover</kbd> on macOS and VS Code (key bindings may vary depending on your OS and editor).

https://github.com/user-attachments/assets/8d42acb8-2822-4fe6-89ce-8472c7065b8b

</details>

<details>
<summary>Automatically update import statements when moving `*.module.css`</summary>

https://github.com/user-attachments/assets/4af168fa-357d-44e1-b010-3053802bf1a2

</details>

<details>
<summary>Create CSS Module file for current file</summary>

If there is no CSS Module file corresponding to `xxx.tsx`, create one.

https://github.com/user-attachments/assets/05f9e839-9617-43dc-a519-d5a20adf1146

</details>

<details>
<summary>Complete `className={...}` instead of `className="..."`</summary>

In projects where CSS Modules are used, the element is styled with `className={styles.xxx}`. However, when you type `className`, `className="..."` is completed. This is annoying to the user.

Therefore, instead of completing `className="..."`, it should complete `className={...}`.

https://github.com/user-attachments/assets/b3609c8a-123f-4f4b-af8c-3c8bf7ab4363

</details>

<details>
<summary>Prioritize the `styles' import for the current component file</summary>

When you request `styles` completion, the CSS Module file `styles` will be suggested. If there are many CSS Module files in the project, more items will be suggested. This can be confusing to the user.

So I have made it so that the `styles` of the CSS Module file corresponding to the current file is shown first.

<img width="821" alt="image" src="https://github.com/user-attachments/assets/413373ec-1258-484d-9248-bc173e4f6d4a" />

</details>

<details>
<summary>Add missing CSS rule</summary>

If you are trying to use a class name that is not defined, you can add it with Quick Fixes.

https://github.com/user-attachments/assets/3502150a-985d-45f3-9912-bbc183e41c03

</details>

## Configuration

css-modules-kit uses `tsconfig.json` as its configuration file. This configuration only affects the ts-plugin and codegen.

### `cmkOptions.enabled`

Type: `boolean`, Default: `true`

Enables or disables css-modules-kit. When set to `false`, codegen will exit with an error. Currently, both codegen and the ts-plugin will work even if this option is omitted, but in the future, they will not work unless this option is set to `true`. For more details, see [#289](https://github.com/mizdra/css-modules-kit/issues/289).

```jsonc
{
  "compilerOptions": {
    // ...
  },
  "cmkOptions": {
    "enabled": true,
  },
}
```

### `cmkOptions.dtsOutDir`

Type: `string`, Default: `"generated"`

Specifies the directory where `*.d.ts` files are output.

```jsonc
{
  "compilerOptions": {
    // ...
  },
  "cmkOptions": {
    "dtsOutDir": "generated/cmk",
  },
}
```

### `cmkOptions.arbitraryExtensions`

Type: `boolean`, Default: `false`

Determines whether to generate `*.module.d.css.ts` instead of `*.module.css.d.ts`.

```jsonc
{
  "compilerOptions": {
    // ...
  },
  "cmkOptions": {
    "arbitraryExtensions": true,
  },
}
```

### `cmkOptions.namedExports`

Type: `boolean`, Default: `false`

Determines whether to generate named exports in the d.ts file instead of a default export.

```jsonc
{
  "compilerOptions": {
    // ...
  },
  "cmkOptions": {
    "namedExports": true,
  },
}
```

### `cmkOptions.prioritizeNamedImports`

Type: `boolean`, Default: `false`

Whether to prioritize named imports over namespace imports when adding import statements. This option only takes effect when `cmkOptions.namedExports` is `true`.

When this option is `true`, `import { button } from '...'` will be added. When this option is `false`, `import button from '...'` will be added.

```jsonc
{
  "compilerOptions": {
    // ...
  },
  "cmkOptions": {
    "namedExports": true,
    "prioritizeNamedImports": true,
  },
}
```

### `cmkOptions.keyframes`

Type: `boolean`, Default: `true`

Determines whether to generate the [token](docs/glossary.md#token) of keyframes in the d.ts file.

```jsonc
{
  "compilerOptions": {
    // ...
  },
  "cmkOptions": {
    "keyframes": false,
  },
}
```

## Limitations

Due to implementation constraints and technical reasons, css-modules-kit has various limitations.

- Sass and Less are not supported.
  - If you want to use Sass and Less, please use [happy-css-modules](https://github.com/mizdra/happy-css-modules). Although it does not offer as rich language features as css-modules-kit, it provides basic features such as code completion and Go to Definition.
- Case conversion for [token](docs/glossary.md#token) names is not supported.
  - For example, if you have a CSS class `.foo-bar`, it will be exported as `styles['foo-bar']`, not `styles.fooBar` or `styles.foo_bar`.
- The [token](docs/glossary.md#token) names must be valid JavaScript identifiers when `cmkOptions.namedExports` is `true`.
  - For example, `.fooBar` and `.foo_bar` are supported, but `.foo-bar` is not supported.
  - This restriction may be lifted in the future.
- The specifiers in `@import '<specifier>'` and `@value ... from '<specifier>'` are resolved according to TypeScript's module resolution method.
  - This may differ from the resolution methods of bundlers like Turbopack or Vite.
  - If you want to use import aliases, use [`compilerOptions.paths`](https://www.typescriptlang.org/tsconfig/#paths) or [`imports`](https://nodejs.org/api/packages.html#imports) in `package.json`.
    - Example: `"paths": { "@/*": ["src/*"] }`
  - If you want to omit `.css`, use [`compilerOptions.moduleSuffixes`](https://www.typescriptlang.org/tsconfig/#moduleSuffixes).
    - Example: `"moduleSuffixes": [".css", ""]`
  - If you want to resolve the `style` condition, use [`compilerOptions.customConditions`](https://www.typescriptlang.org/tsconfig/#customConditions).
    - Example: `"customConditions": ["style"]`
- `:local .foo {...}` is not supported.
  - Use `:local(.foo) {...}` instead.
- `:global .foo {...}` is not supported.
  - Use `:global(.foo) {...}` instead.
- `@keyframes :local(foo) {...}` is not supported.
  - Use `@keyframes foo {...}` instead.
  - Meanwhile, `@keyframes :global(foo) { ... }` is supported.
- VS Code for Web is not supported.

## Comparison

### [Viijay-Kr/react-ts-css](https://github.com/Viijay-Kr/react-ts-css)

Viijay-Kr/react-ts-css also provides rich language features for CSS Modules. However, it is implemented using the VS Code Extension API. Therefore, it only supports VS Code.

On the other hand, css-modules-kit is implemented using the TypeScript Language Service Plugin. It is a technology that does not depend on the editor. css-modules-kit supports editors other than VS Code.

### [mrmckeb/typescript-plugin-css-modules](https://github.com/mrmckeb/typescript-plugin-css-modules)

mrmckeb/typescript-plugin-css-modules is also implemented using the TypeScript Language Service Plugin. However, it only supports basic language features such as completion, typed `styles`, and Go to Definition. Cross-file language features between `*.tsx` and `.module.css`—such as Rename and Find All References—are not supported.

This is because mrmckeb/typescript-plugin-css-modules does not extend tsserver to handle `*.module.css` files. Due to the lack of information about `*.module.css` files, tsserver cannot provide cross-file language features between `*.tsx` and `.module.css`.

On the other hand, css-modules-kit extends tsserver to handle `*.module.css` files. The extension is realized by [Volar.js](https://volarjs.dev/). Please read the following slides for details (in Japanese).

- https://speakerdeck.com/mizdra/css-modules-kit
