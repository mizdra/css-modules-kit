#!/usr/bin/env bash
set -ue

cd "$(dirname "$0")/.."

# Build codegen package first
npm -w packages/codegen run build

# Run cmk for each example project defined in .vscode/launch.json's "codegen: xxx"
for dir in 1-basic 2-named-exports 3-import-alias; do
  echo "Updating generated files in examples/$dir..."
  (cd "examples/$dir" && npx cmk)
done

echo "Done!"
