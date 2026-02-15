# `@css-modules-kit/ts-plugin`

A TypeScript Language Service Plugin for CSS Modules.

## Installation

### VS Code

Install the ts-plugin via the Extension. Please install:

- https://marketplace.visualstudio.com/items?itemName=mizdra.css-modules-kit-vscode

### Neovim

> [!IMPORTANT]
> You need to install `nvim-lspconfig` beforehand ([Installation guide](https://github.com/neovim/nvim-lspconfig/tree/master?tab=readme-ov-file#install)).

> [!IMPORTANT]
> You need to install [`typescript-language-server`](https://github.com/typescript-language-server/typescript-language-server) or [`vtsls`](https://github.com/yioneko/vtsls) beforehand. Please refer to each installation guide.

First, install `@css-modules-kit/ts-plugin`.

```bash
npm i -g @css-modules-kit/ts-plugin
```

Then, add the following configuration to your `init.lua`.

<details>
<summary>Using <code>vtsls</code></summary>

```lua
local npm_root = vim.trim(vim.fn.system('npm root -g'))
local vtsls_default = vim.lsp.config.vtsls

vim.lsp.config('vtsls', {
  filetypes = vim.list_extend(vtsls_default.filetypes, { 'css' }),
  settings = {
    vtsls = {
      tsserver = {
        globalPlugins = {
          {
            name = '@css-modules-kit/ts-plugin',
            location = npm_root,
            languages = { 'css' },
          },
        },
      },
    },
  },
})

vim.lsp.enable('vtsls')
```

</details>

<details>
<summary>Using <code>typescript-language-server</code></summary>

```lua
local npm_root = vim.trim(vim.fn.system('npm root -g'))
local ts_ls_default = vim.lsp.config.ts_ls

vim.lsp.config('ts_ls', {
  filetypes = vim.list_extend(ts_ls_default.filetypes, { 'css' }),
  init_options = {
    plugins = {
      {
        name = '@css-modules-kit/ts-plugin',
        location = npm_root,
        languages = { 'css' },
      },
    },
  },
})

vim.lsp.enable('ts_ls')
```

</details>

### Emacs

> [!IMPORTANT]
> You need to install [`typescript-language-server`](https://github.com/typescript-language-server/typescript-language-server) beforehand. Please refer to each installation guide.

> [!IMPORTANT]
> The following steps are for users who use tree-sitter-based major modes such as `js-ts-mode`, `typescript-ts-mode`, `tsx-ts-mode`, and `css-ts-mode`.

First, install ts-plugin globally.

```bash
npm i -g @css-modules-kit/ts-plugin
```

Then, add the following configuration to your `init.el`.

```lisp
;; Setup Language Server
(use-package eglot
  :ensure nil
  :hook ((js-ts-mode         . eglot-ensure)
         (typescript-ts-mode . eglot-ensure)
         (tsx-ts-mode        . eglot-ensure)
         (css-ts-mode        . eglot-ensure))
  :config
  (require 'subr-x) ;; string-trim
  (setq npm-root
        (string-trim (shell-command-to-string "npm root -g")))
  (add-to-list
    'eglot-server-programs
    `(((js-ts-mode :language-id "javascript")
       (typescript-ts-mode :language-id "typescript")
       (tsx-ts-mode :language-id "typescriptreact")
       (css-ts-mode :language-id "css"))
      . ("typescript-language-server" "--stdio"
          :initializationOptions
          ((plugins
            . [((name      . "@css-modules-kit/ts-plugin")
                (location  . ,npm-root)
                (languages . ["css"]))]))))))
```

> [!CAUTION]
> Eglot does not support multiple language servers.
>
> - https://github.com/joaotavora/eglot/discussions/1429
>
> Therefore, when you use the configuration above, only `typescript-language-server` is used as the language server for `*.css`. `vscode-css-language-server` is not used. Language features provided by `vscode-css-language-server` (such as property completion) are unavailable in `*.css`. There is currently no way to avoid this issue.

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
