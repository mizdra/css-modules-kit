#!/usr/bin/env bash
set -ue

# Builds the tsgo binary from source for the VS Code extension dev flow
# (scripts/setup-tsgo-extension.sh), which needs the source checkout to build the
# vscode-typescript extension. The content-mapper e2e tests instead use the native
# tsc binary from the `typescript` npm nightly (see scripts/vitest-e2e-test-setup.ts).
# The content mapper protocol is implemented in microsoft/TypeScript (the TypeScript 7
# monorepo, which absorbed microsoft/typescript-go). This script pins a commit of its
# main branch. The Go implementation lives in the tsc/ subdirectory, and its main
# package is ./cmd/tsc; the built binary is named tsgo here to avoid confusion with
# the TypeScript 6 tsc.

COMMIT=8ac035a394c79e693a3a7d74cb170448503ee894
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

# GOEXE is '.exe' on Windows and empty elsewhere. The extensionless name does not work on
# Windows because process spawning resolves executables by appending '.exe'.
GOEXE=$(go env GOEXE)
(cd "$DEST/tsc" && go build -o "../built/tsgo$GOEXE" ./cmd/tsc)
echo "tsgo built at $DEST/built/tsgo$GOEXE"
