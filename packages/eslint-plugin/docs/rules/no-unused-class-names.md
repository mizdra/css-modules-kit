# css-modules-kit/no-unused-class-names

Disallow unused class names in CSS module files

## Rule Details

This rule checks for unused CSS class names in CSS module files. It warns when class names are defined in a CSS module file but not used in the [corresponding component file](https://github.com/mizdra/css-modules-kit/blob/main/docs/glossary.md#corresponding-component-file).

### ✓ Correct Examples

```css
/* a.module.css */
.used {
  color: red;
}
```

```tsx
// a.tsx
import styles from './a.module.css';
styles.used;
```

### ✗ Incorrect Examples

```css
/* a.module.css */
.unused {
  color: red;
} /* Error: "unused" is defined but never used in "a.tsx" */
```

```tsx
// a.tsx
import styles from './a.module.css';
```

## When Not To Use It

If you want to keep unused class names in your CSS module files for future use, you might want to disable this rule.

## Known Limitations

- Whether a class name is used or not is determined by a partial match with the text in the file.
  - For example, if a component file contains the characters `styles.foo`, then `foo` is considered to be used.
- `:global(.className)` selectors are ignored and not reported as unused.
- If no corresponding component file is found, all class names are assumed to be used (treated as a shared CSS module file).
