#!/usr/bin/env bash
set -ue

# Builds the tsgo binary used by the content-mapper e2e tests.
# The content mapper protocol is implemented in an unmerged PR (microsoft/typescript-go#4712),
# so this script pins a commit of its head branch (andrewbranch/typescript-go `content-mappers`).

COMMIT=c18f834e07d992a24cdfbb7cb8bd58812ff3d95e
REPO=https://github.com/andrewbranch/typescript-go.git

cd "$(dirname "$0")/.."
DEST=.tmp/typescript-go

if [ ! -d "$DEST/.git" ]; then
  mkdir -p "$DEST"
  git -C "$DEST" init -q
  git -C "$DEST" remote add origin "$REPO"
fi
if ! git -C "$DEST" cat-file -e "$COMMIT^{commit}" 2>/dev/null; then
  git -C "$DEST" fetch --depth 1 origin "$COMMIT"
fi
git -C "$DEST" checkout -q "$COMMIT"

(cd "$DEST" && go build -o built/tsgo ./cmd/tsgo)
echo "tsgo built at $DEST/built/tsgo"
