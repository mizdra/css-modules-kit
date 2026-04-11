---
'@css-modules-kit/core': major
'@css-modules-kit/ts-plugin': major
'@css-modules-kit/codegen': major
---

feat(core, ts-plugin, codegen)!: require `cmkOptions.enabled: true` to activate

ts-plugin and codegen are now only enabled when `cmkOptions.enabled` is explicitly set to `true` in tsconfig.json.
Previously they worked even without the option. See #289 for background.
