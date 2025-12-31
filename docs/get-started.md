# Get Started

## Install ts-plugin

To enable CSS Modules language features in your editor, you need to install [`@css-modules-kit/ts-plugin`](../packages/ts-plugin/README.md) (ts-plugin). The installation method varies by editor.

- For VS Code:
  - Install the [CSS Modules Kit extension](https://marketplace.visualstudio.com/items?itemName=mizdra.css-modules-kit-vscode)
- For Neovim:
  - Install [`@css-modules-kit/ts-plugin`](../packages/ts-plugin/README.md#installation) and [set up the configuration](../packages/ts-plugin/README.md)
- For Emacs:
  - Not yet supported
- For Zed:
  - See [crates/zed/README.md](../crates/zed/README.md)
- For WebStorm:
  - Not yet supported
- For StackBlitz Codeflow:
  - Install the [CSS Modules Kit extension](https://open-vsx.org/extension/mizdra/css-modules-kit-vscode)

## Install codegen

The ts-plugin provides type definitions for `styles` as `{ foo: string, bar: string }`. However, these types are not applied during type-checking with the `tsc` command.

To ensure `tsc` properly type-checks, you need to generate `*.module.css.d.ts` files. This is handled by codegen.

To install codegen, run the following command:

```bash
npm i -D @css-modules-kit/codegen
```

Configure npm-script to run `cmk` command before building and type checking. This command generates `*.module.css.d.ts` files in `generated` directory.

```json
{
  "scripts": {
    "gen": "cmk",
    "build": "run-s -c gen build:*",
    "build:vite": "vite build",
    "lint": "run-s -c gen lint:*",
    "lint:eslint": "eslint .",
    "lint:tsc": "tsc --noEmit",
    "lint:prettier": "prettier --check ."
  }
}
```

## Configure `tsconfig.json`

Finally, you need to configure your tsconfig.json so that css-modules-kit works correctly.

- Set `cmkOptions.enabled` to `true` to enable css-modules-kit.
- Omit the `include` options or ensure that `*.module.css` files are included when specifying them explicitly.
  - ✅ Good cases:
    - Omit `include` (equivalent to `["**/*"]`)
    - Use patterns like `["src"]`, `["src/**/*"]`
  - ❌ Bad cases:
    - `["src/**/*.ts"]`
    - `["src/index.ts"]` (excludes `*.module.css` files)
- Set the `rootDirs` option to include both the directory containing `tsconfig.json` and the `generated` directory.
  - Example: `[".", "generated"]`

Below is an example configuration:

```jsonc
{
  "compilerOptions": {
    "rootDirs": [".", "generated"],
    // ...
  },
  "cmkOptions": {
    "enabled": true,
  },
}
```

## Install linter plugin (Optional)

We provide linter plugin for CSS Modules. Currently, we support the following linters:

- [stylelint-plugin](../packages/stylelint-plugin/README.md)
- [eslint-plugin](../packages/eslint-plugin/README.md)

All linter plugins offer the same set of rules. So please choose and install one.

## Customization (Optional)

You can customize the behavior of codegen by adding the `cmkOptions` option to your `tsconfig.json`. For more details, please refer to [Configuration](../README.md#configuration).
