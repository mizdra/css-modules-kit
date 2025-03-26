# Glossary

## Token

The internal name of the item being exported from `*.module.css`.

For example, consider the following CSS file:

```css
@value a_1: red;
@import b_1, b_2 as b_2_alias from './b.module.css';
.a_2 {
  color: red;
}
.a_3,
.a_4 {
  color: red;
}
:root {
  --a-5: red;
}
```

In this case, `a_1`, `a_2`, `a_3`, `a_4`, `b_1` and `b_2_alias` are tokens. If `dashedIdents` option is `true`, `--a-5` is also a token.

## Corresponding Component File

It refers to a file with the same name as the CSS Module file but with a `.tsx` or `.jsx` extension. For example, the corresponding component file for `Button.module.css` would be `Button.tsx` or `Button.jsx`.
