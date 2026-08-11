#!/usr/bin/env bash
set -ue

# Prepares everything the "tsgo (7-content-mapper)" launch configuration needs:
# the pinned tsgo binary, the PR-branch VS Code extension (TypeScript Native Preview),
# and the mapper package symlink for the example.

cd "$(dirname "$0")/.."
DEST=.tmp/typescript-go

./scripts/setup-tsgo.sh

# In development mode, the extension resolves the tsgo binary at built/local/tsgo.
GOEXE=$(go env GOEXE)
mkdir -p "$DEST/built/local"
cp "$DEST/built/tsgo$GOEXE" "$DEST/built/local/tsgo$GOEXE"

# npm ci is slow, so it only runs on the first setup. Re-run it manually if the
# pinned commit changes package-lock.json.
if [ ! -d "$DEST/node_modules" ]; then
  (cd "$DEST" && npm ci)
fi
(cd "$DEST" && npm run extension:build)

# tsgo resolves the mapper package from the tsconfig directory with node module resolution.
mkdir -p examples/7-content-mapper/node_modules/@css-modules-kit
ln -sfn ../../../../packages/content-mapper examples/7-content-mapper/node_modules/@css-modules-kit/content-mapper
