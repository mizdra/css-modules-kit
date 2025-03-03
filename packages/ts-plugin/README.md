# `@css-modules-kit/ts-plugin`

A TypeScript Language Service Plugin for CSS Modules

## What is this?

`@css-modules-kit/ts-plugin` is a TypeScript Language Service Plugin that extends tsserver to handle `*.module.css` files. As a result, many language features like code navigation and rename refactoring become available.

## Installation

```bash
npm i -D @css-modules-kit/ts-plugin
```

## How to setup your editor

### Neovim

```lua
local lspconfig = require('lspconfig')

lspconfig.ts_ls.setup {
  init_options = {
    plugins = {
      {
        name = '@css-modules-kit/ts-plugin',
        languages = { 'css' },
      },
    },
  },
  filetypes = { 'typescript', 'javascript', 'javascriptreact', 'typescriptreact', 'css' },
}
```

## Configuration

See [css-modules-kit's README](https://github.com/mizdra/css-modules-kit?tab=readme-ov-file#configuration).
