#!/usr/bin/env bash
set -ue

# Prepares everything the "tsgo (7-content-mapper)" launch configuration needs:
# the VS Code extension (TypeScript Native Preview) built from the pinned
# microsoft/TypeScript commit, the tsgo binary for the extension, and the mapper
# package symlink for the example. The marketplace build of the extension
# predates content mapper support, so the extension must be built from source.
# The tsgo binary is not built from source: it is copied from the `typescript`
# npm nightly (a devDependency of packages/content-mapper under the
# `typescript-nightly` alias).

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

# In development mode, the extension resolves the binary at built/local/tsc
# (see packages/vscode-typescript/src/util.ts). Missing it fails the extension
# activation, so copy the binary from the npm nightly there. The npm binary is a
# noembed build that requires the lib.*.d.ts files next to the executable, so
# copy the platform package's whole lib directory.
node - <<'EOF'
const { createRequire } = require('node:module');
const { chmodSync, cpSync } = require('node:fs');
const { dirname, join, resolve } = require('node:path');
const contentMapperPkgPath = resolve('packages/content-mapper/package.json');
const typescriptPkgPath = createRequire(contentMapperPkgPath).resolve('typescript-nightly/package.json');
const platformPkgName = `@typescript/typescript-${process.platform}-${process.arch}`;
const platformPkgPath = createRequire(typescriptPkgPath).resolve(`${platformPkgName}/package.json`);
const exeName = process.platform === 'win32' ? 'tsc.exe' : 'tsc';
cpSync(join(dirname(platformPkgPath), 'lib'), '.tmp/typescript/built/local', { recursive: true });
chmodSync(join('.tmp/typescript/built/local', exeName), 0o755);
EOF

# npm ci is slow, so it only runs on the first setup. Re-run it manually if the
# pinned commit changes package-lock.json.
if [ ! -d "$DEST/node_modules" ]; then
  (cd "$DEST" && npm ci)
fi
(cd "$DEST" && npm run extension:build)

# tsgo resolves the mapper package from the tsconfig directory with node module resolution.
mkdir -p examples/7-content-mapper/node_modules/@css-modules-kit
ln -sfn ../../../../packages/content-mapper examples/7-content-mapper/node_modules/@css-modules-kit/content-mapper
