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

- `css-modules-kit/no-unused-class-names`
- `css-modules-kit/no-missing-component-file`
