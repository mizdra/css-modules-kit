# `@css-modules-kit/eslint-plugin`

A eslint plugin for CSS Modules

## Installation

```bash
npm i -D @css-modules-kit/eslint-plugin
```

## Usage

```js
// eslint.config.js
import { defineConfig } from 'eslint/config';
import css from '@eslint/css';
import cssModulesKit from '@css-modules-kit/eslint-plugin';

export default defineConfig([
  {
    files: ['**/*.css'],
    language: 'css/css',
    languageOptions: {
      tolerant: true, // Required if you use `@value` rule or `composes` property
    },
    extends: [css.configs.recommended, cssModulesKit.configs.recommended],
  },
]);
```

For vscode-eslint users, you need to add the following configuration to your `settings.json`:

```jsonc
// .vscode/settings.json
{
  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact", "css"],
}
```

## Rules

- [`css-modules-kit/no-unused-class-names`](https://github.com/mizdra/css-modules-kit/blob/main/packages/eslint-plugin/docs/rules/no-unused-class-names.md)
- [`css-modules-kit/no-missing-component-file`](https://github.com/mizdra/css-modules-kit/blob/main/packages/eslint-plugin/docs/rules/no-missing-component-file.md)
