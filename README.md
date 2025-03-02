# css-modules-kit

A toolkit for making CSS Modules useful.

## Intro

By default, CSS Modules have limited language features in editors. For example:

- Clicking on `styles.button` does not jump to its definition in `Button.module.css`.
- When renaming `styles.button`, the corresponding `.button {...}` in `Button.module.css` is not renamed.
- Performing "Find All References" on `styles.button` does not find its definition in `Button.module.css`.

It has been difficult to solve these issues because the TypeScript Language Server (tsserver) does not handle CSS files. Since tsserver does not hold information about CSS files, it cannot calculate jump destinations or determine which code should be renamed.

css-modules-kit addresses this by using a TypeScript Language Service Plugin. With this plugin, css-modules-kit extends tsserver to handle `*.module.css` files. As a result, many language features like code navigation and rename refactoring become available.

Additionally, css-modules-kit provides various development tools for CSS Modules, such as a stylelint plugin and a utility for generating `*.d.ts` files.

## Get Started

Please read the [Get Started](docs/get-started.md) guide.

## Supported Language Features

<details>
<summary>Go to Definition</summary>

https://github.com/user-attachments/assets/bdeb2c8a-d615-4223-bae4-e7446f62d353

</details>

<details>
<summary>Rename class names or `@value`</summary>

https://github.com/user-attachments/assets/db39a95e-2fc8-42a6-a64d-02f2822afbfe

</details>

<details>
<summary>Find all references</summary>

https://github.com/user-attachments/assets/df1e2feb-2a1a-4bf5-ae70-1cac36d90409

</details>

<details>
<summary>Automatically update import statements when moving `*.module.css`</summary>

https://github.com/user-attachments/assets/4af168fa-357d-44e1-b010-3053802bf1a2

</details>

<details>
<summary>Create CSS Module file for current file.</summary>

If there is no CSS Module file corresponding to `xxx.tsx`, create one.

https://github.com/user-attachments/assets/05f9e839-9617-43dc-a519-d5a20adf1146

</details>

<details>
<summary>Complete `className={...}` instead of `className="..."`</summary>

In projects where CSS Modules are used, the element is styled with `className={styles.xxx}`. However, when you type `className`, `className="..."` is completed. This is annoying to the user.

So, instead of `className="..."` instead of `className={...}` instead of `className="..."`.

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

## How to try demo

1. Open this repository with VS Code
2. Open `Run and Debug` menu
3. Select `vscode: debug` configuration and start debugging

## Configuration

css-modules-kit uses `tsconfig.json` as its configuration file.

### `include`/`exclude`

In TypeScript, the `include`/`exclude` properties specify which `*.ts` files to compile. css-modules-kit reuses these options to determine which `*.module.css` files to handle with codegen and ts-plugin. Therefore, make sure your `*.module.css` files are included in the `include` or `exclude` settings.

```jsonc
{
  // For example, if your project's `*.module.css` files are in `src/`:
  "include": ["src"], // Default is ["**/*"], so it can be omitted
  "compilerOptions": {
    // ...
  },
}
```

### `cmkOptions.dtsOutDir`

Specifies the directory where `*.d.ts` files are output. The default is `"generated"`.

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

Determines whether to generate `*.module.d.css.ts` instead of `*.module.css.d.ts`. The default is `false`.

## Limitations

- Sass/Less are not supported to simplify the implementation
- `:local .foo {...}` (without any arguments) is not supported to simplify the implementation
- `:global .foo {...}` (without any arguments) is not supported to simplify the implementation
- Some editors do not allow rename on `*.module.css`
  - See [#121](https://github.com/mizdra/css-modules-kit/issues/121) for more details.
