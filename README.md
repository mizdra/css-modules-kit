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

## Packages

- [`@css-modules-kit/codegen`](packages/codegen/README.md) (recommended)
  - A tool for generating `*.d.ts` files for `*.module.css`
- [`@css-modules-kit/ts-plugin`](packages/ts-plugin/README.md) (recommended)
  - A TypeScript Language Service Plugin for CSS Modules
- [`@css-modules-kit/stylelint-plugin`](packages/stylelint-plugin/README.md)
  - A stylelint plugin for CSS Modules

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

## Unsupported Features

- Sass/Less
- `:local .foo {...}` / `:global .foo {...}` (without any arguments)
