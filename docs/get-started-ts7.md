# Get Started (TypeScript 7)

> [!WARNING]
> TypeScript 7 support is experimental. Breaking changes may be introduced in any release.

This guide is for projects that use TypeScript 7.1 or later. If you use TypeScript 6 or earlier, see [Get Started](./get-started.md).

On TypeScript 7, CSS Modules Kit consists of the following two tools:

- content-mapper ([`@css-modules-kit/content-mapper`](../packages/content-mapper/README.md))
- linter-plugin ([`@css-modules-kit/stylelint-plugin`](../packages/stylelint-plugin/README.md) or [`@css-modules-kit/eslint-plugin`](../packages/eslint-plugin/README.md))

ts-plugin and codegen do not work on TypeScript 7. content-mapper replaces both of them.

This guide explains each tool and how to set it up.

## Install content-mapper

content-mapper is a TypeScript [content mapper](../packages/content-mapper/README.md#what-is-a-content-mapper) for CSS Modules. It makes TypeScript load `*.module.css` files directly, both in the editor and in `tsc`. Therefore, `.module.css.d.ts` files are not needed. Only a part of the features of ts-plugin is available. For details, see [Support Status](../packages/content-mapper/README.md#support-status).

To install content-mapper, run the following command:

```bash
npm i -D @css-modules-kit/content-mapper
```

Register content-mapper in `tsconfig.json`.

```json
{
  "contentMappers": [
    {
      "package": "@css-modules-kit/content-mapper",
      "extensions": [".css"]
    }
  ]
}
```

Make sure the [`include`](https://www.typescriptlang.org/tsconfig/#include) option includes `*.module.css` files. Otherwise, TypeScript does not load `*.module.css` files that are not imported from anywhere yet, so they get no diagnostics, and auto-import does not suggest them.

- ✅ Good cases:
  - Omit `include` (equivalent to `["**/*"]`)
  - `["src"]` (equivalent to `["src/**/*"]`)
  - `["src/**/*"]`
- ❌ Bad cases:
  - `["src/**/*.ts"]`
  - `["src/index.ts"]`

To type-check from the command line, pass `--runExternalCode` to `tsc`.

```bash
npx tsc --noEmit --runExternalCode
```

To use the language features in VS Code, install the [TypeScript 7](https://marketplace.visualstudio.com/items?itemName=TypeScriptTeam.native-preview) extension, and add the following to `.vscode/settings.json`. Then trust the workspace, and select "Allow" when asked whether to use the TypeScript 7 tsdk configured in the workspace.

```json
{
  "js/ts.experimental.useTsgo": true,
  "js/ts.tsdk.path": "node_modules/typescript"
}
```

## Install linter-plugin

The linter-plugin is a linter plugin for `*.module.css` files. Currently, we support the following linters:

- [stylelint-plugin](../packages/stylelint-plugin/README.md)
- [eslint-plugin](../packages/eslint-plugin/README.md)

All linter plugins provide the same set of rules—choose and install whichever you prefer. For installation instructions, refer to their README files.
