#!/usr/bin/env bash
set -ue


# `typescriptServerPlugins` searches for plugins in the `node_modules` directory within the extension.
# Also, `vsce package` detects packages included in the `dependencies` field of package.json from node_modules
# and includes them in the .vsix file. However, vsce only supports npm/yarn and does not support pnpm-specific
# "workspace:^" specifier or isolated node_modules.
#
# Therefore, this script performs the following steps:
#
# 1. Replace @css-modules-kit/ts-plugin in `dependencies` with npm-compatible "*"
# 2. Bundle ts-plugin and place it at node_modules/@css-modules-kit/ts-plugin/index.js
# 3. Place node_modules/@css-modules-kit/ts-plugin/package.json to recognize it as a package

cd "$(dirname "$0")/.."

rm -rf packages/vscode/node_modules
jq '.dependencies["@css-modules-kit/ts-plugin"] = "*"' packages/vscode/package.json > tmp.json && mv tmp.json packages/vscode/package.json
pnpm exec rolldown packages/ts-plugin/dist/index.cjs --file packages/vscode/node_modules/@css-modules-kit/ts-plugin/index.js --platform node --format cjs
jq '{name, version}' packages/ts-plugin/package.json > packages/vscode/node_modules/@css-modules-kit/ts-plugin/package.json
