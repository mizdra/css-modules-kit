# Contributing

This is a guide for contributors.

## Design

Please read the slides about css-modules-kit (in Japanese).

- https://speakerdeck.com/mizdra/css-modules-kit

## Repo Setup

```console
npm install
npm run test
```

## npm-scripts

- `npm run build`: Build for production
- `npm run lint`: Run static-checking
- `npm run test`: Run tests

## How to debug

You can run code in debug mode from the "Run and Debug" panel in VS Code. To start debugging, select one of the following configurations.

- `codegen (...)`: Debug for `codegen` package
- `eslint-plugin (...)`: Debug for `eslint-plugin` package
- `stylelint (...)`: Debug for `stylelint` package
- `vscode (...)`: Debug for `vscode` and `ts-plugin` package
- `vscode-test`: Debug for `npm run test:vscode`

Good to know:

- You can set breakpoints in `*.ts` files.
- In VS Code, you can view the tsserver log with `F1 > TypeScript: Open TS Server log`.
  - Runtime errors from `ts-plugin` are output there.
- In VS Code, you can view the Extension Host log with `F1 > Output: Show Output Channels... > Extension Host`.
  - If the extension fails to load, the log will be output there.

### Zed Extension

Debugging Zed Extension is a bit tricky.

1. Run `npm run build`
1. Start `CMK_LOAD_LOCAL_TS_PLUGIN=0 zed examples/1-basic`

Good to know:

- If `CMK_LOAD_LOCAL_TS_PLUGIN` is set to `1`, the `ts-plugin` built with `npm run build` will be loaded.
  - When it is not `1`, the `ts-plugin` downloaded from npmjs.com is loaded.
- In Zed, you can view the tsserver log with `F1 > dev: Open language server logs > vtsls (1-basic)`.
- When you start zed with the `--foreground` option, you can view the stdout of the Extension.
  - e.g. `CMK_LOAD_LOCAL_TS_PLUGIN=0 zed --foreground examples/1-basic`

## Pull Request Guidelines

1. Write your code
1. Add tests if necessary
1. Update documentation if necessary
1. Pass `npm run lint` and `npm run test`
1. Run `npx @changesets/cli add` to create a changeset if the change affects users
   - The summary should be in the following format:
     - For bug fixes: `fix: ...`
     - For new features: `feat: ...`
     - For dependency updates: `deps: ...`
     - For everything else: `chore: ...`
1. Create a pull request

Good to know:

- There are no rules for commit messages. Write whatever you like!

## How to release

css-modules-kit is released using [changesets](https://github.com/changesets/changesets) on CI. Please read the following workflow file.

- https://github.com/mizdra/css-modules-kit/blob/main/.github/workflows/release.yml

Merging a pull request titled "Version Packages" will trigger a release.

- https://github.com/mizdra/css-modules-kit/pulls?q=is%3Apr+Version+Packages+in%3Atitle
