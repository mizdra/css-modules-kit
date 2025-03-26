# `@css-modules-kit/stylelint-plugin`

A stylelint plugin for CSS Modules

## Installation

```bash
npm i -D @css-modules-kit/stylelint-plugin
```

## Usage

```js
// stylelint.config.js
/** @type {import('stylelint').Config} */
export default {
  extends: ['@css-modules-kit/stylelint-plugin/config'],
};
```

## Rules

The same rules as eslint-plugin are provided. See [the eslint-plugin documentation](https://github.com/mizdra/css-modules-kit/blob/main/packages/eslint-plugin/README.md#rules) for a list of rules.
