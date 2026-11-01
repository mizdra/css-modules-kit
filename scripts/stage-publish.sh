#!/usr/bin/env bash
set -ue

cd "$(dirname "$0")/.."

# A version cannot be staged twice, so skip it if the git tag created below exists.
# Checking one package is enough because all public packages share a version.
v=$(jq -r .version packages/core/package.json)
if git ls-remote --exit-code --tags origin "refs/tags/@css-modules-kit/core@$v" > /dev/null; then
  echo "Skip staging because version $v has already been staged or published"
  exit 0
fi

# `npm stage publish` does not replace the `workspace:*` specifier, so pnpm is used here.
pnpm stage publish --recursive --no-git-checks

vp exec changeset tag
