# Design Decisions

This document records design decisions that are not obvious from the code, along with their rationale.

## `cmkOptions.container` does not support `local(...)` / `global(...)`

css-modules-kit does not interpret `local(...)` / `global(...)` in `container-name`, the `container` shorthand, or the `@container` prelude (e.g. `container-name: local(foo)`). Function nodes in these positions are ignored: they produce neither a token nor a token reference.

Rationale:

- The `cmkOptions.container` option follows the [`container` option of lightningcss's CSS Modules support](https://lightningcss.dev/css-modules.html#container-queries). lightningcss parses container names as plain `<custom-ident>`s and provides no `local(...)` / `global(...)` escape hatch.
- css-loader does not scope container names at all. Therefore, no CSS Modules implementation gives `local(...)` in these positions any semantics.
- Per [css-conditional-5](https://drafts.csswg.org/css-conditional-5/#container-name), the grammar of `container-name` is `none | <custom-ident>+`. Function forms are invalid CSS.
- Extracting tokens from `local(...)` would emit names into the `.d.ts` that no bundler actually scopes.

This is in contrast to constructs such as `animation-name`, the `animation` shorthand, and `@keyframes`, where css-modules-kit interprets escape hatches like `local(...)` / `global(...)` and `:local(...)` / `:global(...)` because css-loader implements that syntax for `<keyframes-name>`s.

If lightningcss or css-loader adds an escape hatch for container names in the future, css-modules-kit should follow it.
