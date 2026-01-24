#!/bin/bash
set -euo pipefail

# Wait for published npm packages to be available on the registry
# Usage: ./wait-for-npm-packages.sh '<publishedPackages JSON>'
# Example: ./wait-for-npm-packages.sh '[{"name":"@css-modules-kit/core","version":"0.8.1"}]'

published_packages="$1"

# Parse published packages and wait for each to be available on npm registry
echo "$published_packages" | jq -r '.[] | "\(.name)@\(.version)"' | while read -r package; do
  echo "Waiting for $package to be available on npm registry..."
  max_attempts=10
  attempt=1

  while [ $attempt -le $max_attempts ]; do
    if npm view "$package" version &> /dev/null; then
      echo "✓ $package is now available on npm registry"
      echo ""
      break
    fi

    if [ $attempt -eq $max_attempts ]; then
      echo "✗ Timeout waiting for $package to be available"
      exit 1
    fi

    echo "  Attempt $attempt/$max_attempts: not yet available, waiting 10 seconds..."
    sleep 10
    attempt=$((attempt + 1))
  done
done

echo "All packages are now available on npm registry"
