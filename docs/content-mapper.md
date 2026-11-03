# Content Mapper Support Status

`@css-modules-kit/content-mapper` provides the language features of css-modules-kit on TypeScript 7, where the TypeScript Language Service Plugin that `@css-modules-kit/ts-plugin` relies on is not available. It is experimental.

This document lists the support status of each feature. Features are added step by step, so this document must be updated together with them.

- **Supported**: Available now.
- **Planned**: Not available yet. It is planned to be supported in the future.
- **Undecided**: Not available yet. Whether to support it is not decided. See Notes for the reason.

## CSS Modules syntax

| Syntax                                                            | Status    | Notes                                                                                                                       |
| ----------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------- |
| Local tokens: class names, `@value` definitions, `@keyframes`     | Supported |                                                                                                                             |
| Local tokens: container names, `<dashed-ident>`s                  | Planned   |                                                                                                                             |
| Local token reference: `animation-name`, `composes`, `@container` | Planned   |                                                                                                                             |
| External token reference: `composes: ... from`                    | Planned   |                                                                                                                             |
| All token importer: `@import`                                     | Planned   |                                                                                                                             |
| Named token importer: `@value ... from`                           | Undecided | A content mapper alone can provide the types of tokens. Navigation needs LSP middleware, which is only available in VS Code |

See [Glossary](../AGENTS.md#glossary) for the terms.

## Language features

The following features target the syntax that is supported in the table above.

| Feature                                                  | Status    | Notes                                                    |
| -------------------------------------------------------- | --------- | -------------------------------------------------------- |
| Go to Definition                                         | Supported |                                                          |
| Find All References                                      | Supported |                                                          |
| Rename Symbol                                            | Supported |                                                          |
| Update import statements when moving `*.module.css`      | Supported |                                                          |
| Diagnostics for invalid token names                      | Supported |                                                          |
| Diagnostics for unknown tokens on `styles`               | Supported |                                                          |
| Diagnostics for CSS syntax errors                        | Supported |                                                          |
| Definition Preview by Hover                              | Undecided | Needs LSP middleware, which is only available in VS Code |
| Create CSS Module file for current file                  | Undecided | Needs LSP middleware, which is only available in VS Code |
| Complete `className={...}` instead of `className="..."`  | Undecided | Needs LSP middleware, which is only available in VS Code |
| Prioritize the `styles` import for the current component | Undecided | Needs LSP middleware, which is only available in VS Code |
| Add missing CSS rule                                     | Undecided | Needs LSP middleware, which is only available in VS Code |

## Configuration

content-mapper does not read `cmkOptions`. The options will be given as `options` of the `contentMappers` entry in `tsconfig.json`.

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

## LSP middleware

A content mapper cannot customize language server responses. [LSP middleware](https://github.com/microsoft/TypeScript/pull/64583) can, but it is only available in VS Code, while css-modules-kit aims to support every editor. For this reason, whether to support the features that need it is undecided.
