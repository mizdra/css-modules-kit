#!/usr/bin/env bash
set -ue

cd "$(dirname "$0")/.."

# A version cannot be staged twice, so skip the packages whose git tag created below exists.
filters=()
for package_json in packages/*/package.json; do
  if [[ "$(jq -r .private "$package_json")" == "true" ]]; then
    continue
  fi
  name=$(jq -r .name "$package_json")
  v=$(jq -r .version "$package_json")
  if ! git ls-remote --exit-code --tags origin "refs/tags/$name@$v" > /dev/null; then
    filters+=("--filter=$name")
  fi
done

if [[ ${#filters[@]} -eq 0 ]]; then
  echo "Skip staging because every package has already been staged or published"
  exit 0
fi

# `npm stage publish` does not replace the `workspace:*` specifier, so pnpm is used here.
pnpm stage publish --recursive --no-git-checks "${filters[@]}"

vp exec changeset tag
