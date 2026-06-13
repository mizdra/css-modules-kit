---
'@css-modules-kit/ts-plugin': patch
---

fix(ts-plugin): omit the `default` member from namespace member completion

When `namedExports` is enabled and `prioritizeNamedImports` is disabled, completing members of a namespace import (`import * as styles from './a.module.css'; styles.`) no longer suggests a `default` member that the CSS module does not export.
