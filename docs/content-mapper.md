# Content Mapper Support Status

`@css-modules-kit/content-mapper` provides the language features of css-modules-kit on TypeScript 7, where the TypeScript Language Service Plugin that `@css-modules-kit/ts-plugin` relies on is not available. It is under development and is not published yet.

This document compares it with ts-plugin. Features are added step by step, so this document must be updated together with them.

- **Supported**: Available now.
- **Planned**: Not available yet. A content mapper alone can provide it.
- **Needs middleware**: Not available yet. It requires [LSP middleware](https://github.com/microsoft/TypeScript/pull/64583), or another way of customizing language server responses, because a content mapper cannot express it. Whether and how to support it is not decided.

## CSS Modules syntax

| Syntax                                                            | ts-plugin | content-mapper                                              |
| ----------------------------------------------------------------- | --------- | ----------------------------------------------------------- |
| Local tokens: class names, `@value` definitions, `@keyframes`     | Supported | Supported                                                   |
| Local tokens: container names, `<dashed-ident>`s                  | Supported | Planned                                                     |
| Local token reference: `animation-name`, `composes`, `@container` | Supported | Planned                                                     |
| External token reference: `composes: ... from`                    | Supported | Planned                                                     |
| All token importer: `@import`                                     | Supported | Planned                                                     |
| Named token importer: `@value ... from`                           | Supported | Planned for the type of tokens; navigation needs middleware |

See [Glossary](../AGENTS.md#glossary) for the terms.

## Language features

The following features target the syntax that is supported in the table above.

| Feature                                                  | ts-plugin     | content-mapper   |
| -------------------------------------------------------- | ------------- | ---------------- |
| Go to Definition                                         | Supported     | Supported        |
| Find All References                                      | Supported     | Supported        |
| Rename Symbol                                            | Supported     | Supported        |
| Update import statements when moving `*.module.css`      | Supported     | Supported        |
| Diagnostics for invalid token names                      | Supported     | Supported        |
| Diagnostics for unknown tokens on `styles`               | Supported     | Supported        |
| Diagnostics for CSS syntax errors                        | Not supported | Supported        |
| Definition Preview by Hover                              | Supported     | Needs middleware |
| Create CSS Module file for current file                  | Supported     | Needs middleware |
| Complete `className={...}` instead of `className="..."`  | Supported     | Needs middleware |
| Prioritize the `styles` import for the current component | Supported     | Needs middleware |
| Add missing CSS rule                                     | Supported     | Needs middleware |

ts-plugin leaves CSS syntax errors to the CSS language server of the editor.

## Configuration

| Option                              | ts-plugin | content-mapper                                                    |
| ----------------------------------- | --------- | ----------------------------------------------------------------- |
| `cmkOptions.enabled`                | Supported | Not needed. Registering it in `contentMappers` enables the mapper |
| `cmkOptions.dtsOutDir`              | Supported | Not needed. No `.d.ts` files are generated                        |
| `cmkOptions.arbitraryExtensions`    | Supported | Not needed. No `.d.ts` files are generated                        |
| `cmkOptions.namedExports`           | Supported | Planned                                                           |
| `cmkOptions.prioritizeNamedImports` | Supported | Planned                                                           |
| `cmkOptions.animation`              | Supported | Planned. It currently behaves as `true`                           |
| `cmkOptions.dashedIdents`           | Supported | Planned                                                           |
| `cmkOptions.container`              | Supported | Planned                                                           |

content-mapper does not read `cmkOptions`. The options will be given as `options` of the `contentMappers` entry in `tsconfig.json`.

## Current limitations

These limitations come from the syntax that is not supported yet.

- Tokens imported with `@import` or `@value ... from` are reported as `TS2339` when they are used in TypeScript.
- Renaming a token does not update `composes` and `animation-name`, and no error is reported for them.
- The specifiers of `@import`, `@value ... from`, and `composes: ... from` are not checked, and they are not updated when the specified file is moved.
