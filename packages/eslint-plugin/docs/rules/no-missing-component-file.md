# css-modules-kit/no-missing-component-file

Enforce the existence of corresponding component files for CSS module files

## Rule Details

This rule checks for the existence of component files that correspond to CSS module files. It reports an error when a CSS module file does not have the [corresponding component file](https://github.com/mizdra/css-modules-kit/blob/main/docs/glossary.md#corresponding-component-file).

### ✓ Correct Examples

```
project/
├── Button.module.css
└── Button.tsx (or Button.jsx)
```

### ✗ Incorrect Examples

```
project/
└── Button.module.css (Error: The corresponding component file is not found.)
```
