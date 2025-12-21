#!/usr/bin/env bash
set -ue

cd "$(dirname "$0")/.."

# Update `version` field in package.json files
npx changeset version

# Sync zed extension version with the `version` field in crates/zed/package.json
v=$(jq -r .version crates/zed/package.json)
if [[ "$(uname)" == "Darwin" ]]; then
  sed -i '' -E "s/^version = \".*\"/version = \"$v\"/" crates/zed/extension.toml
  sed -i '' -E "s/^version = \".*\"/version = \"$v\"/" crates/zed/Cargo.toml
else
  sed -i -E "s/^version = \".*\"/version = \"$v\"/" crates/zed/extension.toml
  sed -i -E "s/^version = \".*\"/version = \"$v\"/" crates/zed/Cargo.toml
fi

# Update package-lock.json
npm i
