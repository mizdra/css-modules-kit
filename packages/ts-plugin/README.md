# `@css-modules-kit/ts-plugin`

A TypeScript Language Service Plugin for CSS Modules.

## Installation

### VS Code

Install the ts-plugin via the Extension. Please install:

- https://marketplace.visualstudio.com/items?itemName=mizdra.css-modules-kit-vscode

### Neovim

First, install ts-plugin globally.

```bash
npm i -g @css-modules-kit/ts-plugin
```

Next, update your LSP client configuration. Below is an example using `nvim-lspconfig`.

```lua
local lspconfig = require('lspconfig')

-- TODO: Welcome to contribute
```

### Emacs

First, install ts-plugin globally.

```bash
npm i -g @css-modules-kit/ts-plugin
```

Next, update your LSP client configuration.

TODO: Welcome to contribute

### Zed

Install the ts-plugin via the Extension. Please follow the steps below:

1. Install ["CSS Modules Kit" extension](https://zed.dev/extensions/css-modules-kit).
2. Add the following to your `~/.config/zed/settings.json` file:
   ```json
   {
     "languages": {
       "CSS": {
         "language_servers": ["vtsls", "..."]
       }
     }
   }
   ```
3. Restart Zed.

### WebStorm

Not yet supported.

### StackBlitz Codeflow

Install the ts-plugin via the Extension. Please install:

- https://open-vsx.org/extension/mizdra/css-modules-kit-vscode

## Configuration

See [Configuration](https://github.com/mizdra/css-modules-kit?tab=readme-ov-file#configuration).
