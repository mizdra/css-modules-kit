#!/usr/bin/env bash
set -ue

# Prepares everything the "tsgo (7-content-mapper)" launch configuration needs:
# the VS Code extension (TypeScript Native Preview) and the tsgo binary built from
# the pinned microsoft/TypeScript commit, and the mapper package symlink for the
# example. The marketplace build of the extension predates content mapper support,
# so the extension must be built from source.
#
# The pinned commit is the head of https://github.com/microsoft/TypeScript/pull/64173,
# which adds the content mapper inspector (the commands that show the virtual text
# and the span mappings of a mapped file). The inspector sends custom LSP requests
# that no `typescript` npm nightly handles yet, so the tsgo binary is also built
# from source. The build requires Go. The go command downloads the Go version that
# go.work requires automatically. Once the pull request is released in an npm
# nightly, the binary can be copied from the `typescript-nightly` devDependency of
# packages/content-mapper instead.

COMMIT=afb2513b5a0f3eff82322d771fe57f612508b0d5
REPO=https://github.com/microsoft/TypeScript.git

cd "$(dirname "$0")/.."
DEST=.tmp/typescript

if [ ! -d "$DEST/.git" ]; then
  mkdir -p "$DEST"
  git -C "$DEST" init -q
  git -C "$DEST" remote add origin "$REPO"
fi
if ! git -C "$DEST" cat-file -e "$COMMIT^{commit}" 2>/dev/null; then
  git -C "$DEST" fetch --depth 1 origin "$COMMIT"
fi
git -C "$DEST" checkout -q "$COMMIT"

# npm ci is slow, so it only runs when the pinned commit changes package-lock.json.
LOCK_HASH=$(git -C "$DEST" rev-parse HEAD:package-lock.json)
LOCK_HASH_FILE="$DEST/node_modules/.package-lock-hash"
if [ "$(cat "$LOCK_HASH_FILE" 2>/dev/null)" != "$LOCK_HASH" ]; then
  (cd "$DEST" && npm ci)
  echo "$LOCK_HASH" > "$LOCK_HASH_FILE"
fi

# In development mode, the extension resolves the binary at built/local/tsc
# (see packages/vscode-typescript/src/util.ts). `hereby build` builds it there
# together with the lib.*.d.ts files that the binary requires next to it.
(cd "$DEST" && npx hereby build)
(cd "$DEST" && npm run extension:build)

# tsgo resolves the mapper package from the tsconfig directory with node module resolution.
mkdir -p examples/7-content-mapper/node_modules/@css-modules-kit
ln -sfn ../../../../packages/content-mapper examples/7-content-mapper/node_modules/@css-modules-kit/content-mapper
