#!/usr/bin/env bash
set -ue

cd "$(dirname "$0")/.."

# Build codegen package first
vp run --filter @css-modules-kit/codegen build

# Run cmk for example directories that have codegen tasks defined in .vscode/launch.json
for dir in examples/1-basic examples/2-named-exports examples/3-import-alias; do
  echo "Running cmk in $dir"
  vp exec cmk --project "$dir"
done
