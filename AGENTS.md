# AGENTS.md

## Project Overview

CSS Modules Kit is a toolkit that makes CSS Modules more convenient. It uses the TypeScript Language Service Plugin and Volar.js to provide rich editor language features for CSS Modules (Go to Definition, Rename, Find All References, etc.).

The provided language features and available settings are described in [README.md](./README.md).

## Architecture

This project is a monorepo and consists of the following packages:

- **packages/core**: Common package that provides core functionality such as parsing CSS Modules, generating type definitions, and validation
- **packages/ts-plugin**: Implementation of the TypeScript Language Service Plugin (Volar.js-based)
  - Provides language features such as Go to Definition, Rename, Find All References
- **packages/codegen**: CLI tool to generate CSS Modules type definition files (`.d.ts`)
- **packages/vscode**: VS Code extension
  - Wrapper to run ts-plugin in VS Code
- **packages/stylelint-plugin**: Stylelint plugin
- **packages/eslint-plugin**: ESLint plugin
- **crates/zed**: Zed editor extension (Rust implementation)
  - Wrapper to run ts-plugin in Zed

Package dependencies:

- ts-plugin, codegen, stylelint-plugin, and eslint-plugin all depend on the core package
- Functionality is implemented via APIs provided by the core package (`parseCSSModule`, `generateDts`, `checkCSSModule`, etc.)

## Development Commands

```bash
vp run build # Build all packages

vp check     # Run format, lint, and type checks
vp check --fix # Auto-fix format and lint issues

vp test # Run all tests except VS Code extension tests
vp test --project unit # Run only unit tests
vp test --project e2e # Run only E2E tests
vp test packages/core/src/parser/css-module-parser.test.ts # Run a specific test file
vp run vscode-test # Run VS Code extension tests
```

### Updating generated files in examples

The examples directory contains generated type definition files produced by codegen as examples. If the generated type definition files change, these files must also be updated. You can update them with the following command:

```bash
vp run update-generated-in-examples
```

## Coding Conventions

### Error Handling

**Defining error classes**:

- Use classes that extend `Error` for errors to be thrown
- Place error classes in `packages/*/src/error.ts`

```ts
// packages/*/src/error.ts
class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
```

**Using @throws**:

- For functions that throw, describe exceptions with JSDoc `@throws`
- Propagate `@throws` to calling functions (when not caught by try)

```ts
/**
 * @throws {AuthError} When the user is not authorized
 */
function myFunction() {
  if (!user.isAuthorized()) {
    throw new AuthError('User is not authorized');
  }
}
```

## Glossary

- **Token**: A generic term for things exported by CSS Modules, such as class names, `@value` definitions, and `@keyframes` names.
- **Token reference**: A usage of a token elsewhere in the CSS. Currently produced for `animation-name: <name>`. The referenced token may be defined in the same file (e.g. `@keyframes`) or imported via `@import` / `@value ... from`.
- **Diagnostic**: An object representing errors or warnings
- **Parse phase**: The phase that parses CSS Modules files and extracts token information
- **Check phase**: The phase that validates CSS Modules files
- **Emit phase**: The phase that generates `.d.ts` files
- **cmkOptions**: Various option settings for CSS Modules Kit
- **Mapping**: An object that maintains the positional relationship between a `.d.ts` file and its corresponding .css file
  - Mapping enables language features such as Go to Definition, Find All References, Rename

## Additional Documentation

- [`docs/ts-plugin-internals.md`](./docs/ts-plugin-internals.md): Deep dive into the TS plugin internals
  - Read this when working on `packages/ts-plugin` or `packages/core/src/dts-generator.ts` — especially when modifying Volar.js mappings, virtual code generation, or language service features (Go to Definition, Find References, Rename, etc.)

## Key Files

- `packages/core/src/type.ts`: Main type definitions used by CSS Modules Kit
- `packages/core/src/parser/css-module-parser.ts`: CSS Modules parsing
  - Responsible for extracting tokens and generating diagnostics detectable during parsing
- `packages/core/src/checker.ts`: CSS Modules validation
  - Responsible for generating diagnostics that cannot be detected in the parse phase
- `packages/core/src/dts-generator.ts`: Generates type definition files (`.d.ts`) and mappings.

## Tech Stack

- TypeScript
- Vite+ (`vp`) — unified toolchain for test, lint, fmt
- pnpm, pnpm workspaces
- Changesets

## Development Flow

- Write PR descriptions and commit messages in English
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
  - `<type>` is one of: feat, fix, docs, refactor, test, chore, deps
  - `[optional scope]`: choose one of core, ts-plugin, codegen, vscode, stylelint-plugin, eslint-plugin, zed
    - For changes spanning multiple packages, use comma-separated scopes like `feat(core, ts-plugin): ...`
- If you make changes that affect users, add a changeset file under `.changeset`
- Assign appropriate labels when creating a PR
  - `Type: Breaking Change`: Breaking changes
  - `Type: Bug`: Bug fixes
  - `Type: Documentation`: Documentation changes
  - `Type: Feature`: New features
  - `Type: Refactoring`: Refactoring
  - `Type: Testing`: Test additions/modifications
  - `Type: Maintenance`: Repository maintenance
  - `Type: CI`: CI/CD changes
  - `Type: Security`: Security-related changes
  - `Type: Dependencies`: Dependency updates
