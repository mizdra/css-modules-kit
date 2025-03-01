# `@css-modules-kit/ts-plugin`

A TypeScript Language Service Plugin for CSS Modules

## Features

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

## Installation

First, install the package.

```bash
npm i -D @css-modules-kit/ts-plugin
```

## Usage

Second, add the "plugin" option to your tsconfig.json file. For example:

```jsonc
{
  "compilerOptions": {
    "plugins": [{ "name": "@css-modules-kit/ts-plugin", "languages": ["css"] }],
  },
}
```

Then, add the followed options to your `.vscode/settings.json`.

```json
{
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Configuration

See [css-modules-kit's README](https://github.com/mizdra/css-modules-kit?tab=readme-ov-file#configuration).
