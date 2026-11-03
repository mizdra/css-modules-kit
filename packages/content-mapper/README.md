# `@css-modules-kit/content-mapper`

A TypeScript content mapper that provides the language features of css-modules-kit on TypeScript 7.

> [!WARNING]
> This package is experimental. Breaking changes may be introduced in any release.

Only a part of the features of `@css-modules-kit/ts-plugin` is available. See [Support Status](#support-status) for details.

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

| Syntax                                                            | Status    | Notes                                                                                                                       |
| ----------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------- |
| Local tokens: class names, `@value` definitions, `@keyframes`     | Supported |                                                                                                                             |
| Local tokens: container names, `<dashed-ident>`s                  | Planned   |                                                                                                                             |
| Local token reference: `animation-name`, `composes`, `@container` | Planned   |                                                                                                                             |
| External token reference: `composes: ... from`                    | Planned   |                                                                                                                             |
| All token importer: `@import`                                     | Planned   |                                                                                                                             |
| Named token importer: `@value ... from`                           | Undecided | A content mapper alone can provide the types of tokens. Navigation needs LSP middleware, which is only available in VS Code |

See [Glossary](https://github.com/mizdra/css-modules-kit/blob/main/AGENTS.md#glossary) for the terms.

### Language Features

The following features target the syntax that is supported in the table above.

| Feature                                                  | Status    | Notes                                                                                |
| -------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------ |
| Go to Definition                                         | Supported |                                                                                      |
| Find All References                                      | Supported |                                                                                      |
| Rename Symbol                                            | Planned   | Blocked until TypeScript fixes the rename input, which shows token names with quotes |
| Update import statements when moving `*.module.css`      | Supported |                                                                                      |
| Diagnostics for invalid token names                      | Supported |                                                                                      |
| Diagnostics for unknown tokens on `styles`               | Supported |                                                                                      |
| Diagnostics for CSS syntax errors                        | Supported |                                                                                      |
| Definition Preview by Hover                              | Undecided | Needs LSP middleware, which is only available in VS Code                             |
| Create CSS Module file for current file                  | Undecided | Needs LSP middleware, which is only available in VS Code                             |
| Complete `className={...}` instead of `className="..."`  | Undecided | Needs LSP middleware, which is only available in VS Code                             |
| Prioritize the `styles` import for the current component | Undecided | Needs LSP middleware, which is only available in VS Code                             |
| Add missing CSS rule                                     | Undecided | Needs LSP middleware, which is only available in VS Code                             |

### Configuration

This package does not read `cmkOptions`. The options will be given as `options` of the `contentMappers` entry in `tsconfig.json`.

| Option                              | Status     | Notes                                              |
| ----------------------------------- | ---------- | -------------------------------------------------- |
| `cmkOptions.enabled`                | Not needed | Registering in `contentMappers` enables the mapper |
| `cmkOptions.dtsOutDir`              | Not needed | No `.d.ts` files are generated                     |
| `cmkOptions.arbitraryExtensions`    | Not needed | No `.d.ts` files are generated                     |
| `cmkOptions.namedExports`           | Planned    |                                                    |
| `cmkOptions.prioritizeNamedImports` | Planned    |                                                    |
| `cmkOptions.animation`              | Planned    | Currently behaves as `true`                        |
| `cmkOptions.dashedIdents`           | Planned    |                                                    |
| `cmkOptions.container`              | Planned    |                                                    |

### LSP Middleware

A content mapper cannot customize language server responses. [LSP middleware](https://github.com/microsoft/TypeScript/pull/64583) can, but it is only available in VS Code, while css-modules-kit aims to support every editor. For this reason, whether to support the features that need it is undecided.
