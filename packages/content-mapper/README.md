# `@css-modules-kit/content-mapper`

A TypeScript content mapper that provides the language features of css-modules-kit on TypeScript 7.

> [!WARNING]
> This package is experimental. Breaking changes may be introduced in any release.

Only a part of the features of `@css-modules-kit/ts-plugin` is available. See [Support Status](#support-status) for details.

## What is a content mapper?

A content mapper is a TypeScript 7 feature that lets an external program transform non-TypeScript files into TypeScript. This package transforms `*.module.css` files, so that TypeScript loads them directly, both in the language server and in `tsc`.

This package replaces `@css-modules-kit/ts-plugin` and `@css-modules-kit/codegen`, which do not work on TypeScript 7. It provides both of their roles on its own: the language features in the editor, and the types for `tsc`. No `.d.ts` files are generated.

## Installation

This package requires TypeScript 7.1 or later.

```bash
npm i -D @css-modules-kit/content-mapper
```

## Usage

Register the package in `tsconfig.json`.

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

## Support Status

- **Supported**: Available now.
- **Planned**: Not available yet. It is planned to be supported in the future.
- **Undecided**: Not available yet. Whether to support it is not decided. See Notes for the reason.
- **Not needed**: Not available, because it has no use in this package.

### CSS Modules Syntax

| Syntax                                                            | Status    | Notes                                                                                                                     |
| ----------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| Local tokens: class names, `@value` definitions, `@keyframes`     | Supported |                                                                                                                           |
| Local tokens: container names, `<dashed-ident>`s                  | Planned   | Currently, they are not available on `styles`                                                                             |
| Local token reference: `animation-name`, `composes`, `@container` | Planned   | Currently, Go to Definition and Find All References do not work on them                                                   |
| External token reference: `composes: ... from`                    | Planned   | Currently, Go to Definition and Find All References do not work on them                                                   |
| All token importer: `@import`                                     | Planned   | Currently, tokens are not imported                                                                                        |
| Named token importer: `@value ... from`                           | Undecided | Currently, tokens are not imported. Not implemented because it [needs LSP middleware](#features-that-need-lsp-middleware) |

See [Glossary](https://github.com/mizdra/css-modules-kit/blob/main/AGENTS.md#glossary) for the terms.

### Language Features

The following features target the syntax that is supported in the table above.

| Feature                                                            | Status    | Notes                                                                                         |
| ------------------------------------------------------------------ | --------- | --------------------------------------------------------------------------------------------- |
| Go to Definition                                                   | Supported |                                                                                               |
| Find All References                                                | Supported |                                                                                               |
| Rename Symbol                                                      | Planned   | Currently, you can rename a token in a TypeScript file, but it does not update `*.module.css` |
| Update import statements when moving `*.module.css`                | Supported |                                                                                               |
| Diagnostics for invalid token names                                | Supported |                                                                                               |
| Diagnostics for unknown tokens on `styles`                         | Supported |                                                                                               |
| Diagnostics for CSS syntax errors                                  | Supported |                                                                                               |
| Diagnostics for unknown token references and unresolved specifiers | Planned   |                                                                                               |
| Definition Preview by Hover                                        | Undecided | Not implemented because it [needs LSP middleware](#features-that-need-lsp-middleware)         |
| Create CSS Module file for current file                            | Undecided | Not implemented because it [needs LSP middleware](#features-that-need-lsp-middleware)         |
| Complete `className={...}` instead of `className="..."`            | Undecided | Not implemented because it [needs LSP middleware](#features-that-need-lsp-middleware)         |
| Prioritize the `styles` import for the current component           | Undecided | Not implemented because it [needs LSP middleware](#features-that-need-lsp-middleware)         |
| Add missing CSS rule                                               | Undecided | Not implemented because it [needs LSP middleware](#features-that-need-lsp-middleware)         |

### Configuration

This package does not read `cmkOptions`. The options will be given as `options` of the `contentMappers` entry in `tsconfig.json`.

| Option                              | Status     | Notes                                              |
| ----------------------------------- | ---------- | -------------------------------------------------- |
| `cmkOptions.enabled`                | Not needed | Registering in `contentMappers` enables the mapper |
| `cmkOptions.dtsOutDir`              | Not needed | No `.d.ts` files are generated                     |
| `cmkOptions.arbitraryExtensions`    | Not needed | No `.d.ts` files are generated                     |
| `cmkOptions.namedExports`           | Planned    | Currently behaves as `false`                       |
| `cmkOptions.prioritizeNamedImports` | Planned    | Currently behaves as `false`                       |
| `cmkOptions.animation`              | Planned    | Currently behaves as `true`                        |
| `cmkOptions.dashedIdents`           | Planned    | Currently behaves as `false`                       |
| `cmkOptions.container`              | Planned    | Currently behaves as `false`                       |

### Features that need LSP middleware

`@css-modules-kit/ts-plugin` implements some language features by customizing the responses of the language server. A content mapper cannot customize them. [LSP middleware](https://github.com/microsoft/TypeScript/pull/64583) can, but it works only in VS Code.

css-modules-kit aims to support every editor, so implementing language features with LSP middleware goes against this goal. We have not decided whether to use LSP middleware anyway, look for another approach, or not implement these features at all. This is why their status is "Undecided".
