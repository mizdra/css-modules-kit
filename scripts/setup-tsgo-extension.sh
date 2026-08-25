#!/usr/bin/env bash
set -ue

# Prepares everything the "tsgo (7-content-mapper)" launch configuration needs:
# the pinned tsgo binary, the VS Code extension (TypeScript Native Preview) built
# from the pinned microsoft/TypeScript commit, and the mapper package symlink for
# the example.

cd "$(dirname "$0")/.."
DEST=.tmp/typescript

./scripts/setup-tsgo.sh

# In development mode, the extension resolves the binary at built/local/tsc
# (see packages/vscode-typescript/src/util.ts).
GOEXE=$(go env GOEXE)
mkdir -p "$DEST/built/local"
cp "$DEST/built/tsgo$GOEXE" "$DEST/built/local/tsc$GOEXE"

# npm ci is slow, so it only runs on the first setup. Re-run it manually if the
# pinned commit changes package-lock.json.
if [ ! -d "$DEST/node_modules" ]; then
  (cd "$DEST" && npm ci)
fi
(cd "$DEST" && npm run extension:build)

# tsgo resolves the mapper package from the tsconfig directory with node module resolution.
mkdir -p examples/7-content-mapper/node_modules/@css-modules-kit
ln -sfn ../../../../packages/content-mapper examples/7-content-mapper/node_modules/@css-modules-kit/content-mapper
