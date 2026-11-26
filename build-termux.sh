#!/usr/bin/env bash
set -Eeuo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$project_dir"

if [[ ! -f package.json ]]; then
  echo "Error: package.json was not found in $project_dir" >&2
  exit 1
fi
command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "Error: npm is required." >&2; exit 1; }

install_deps() {
  if [[ -f package-lock.json ]]; then
    npm ci --no-audit --no-fund
  else
    npm install --no-audit --no-fund
  fi
}

# Android shared storage does not support the symlinks npm creates in node_modules/.bin.
# Under Termux, build from private storage and copy dist back to the project.
if [[ "${PREFIX:-}" == /data/data/com.termux/files/usr* ]]; then
  for cmd in rsync sha256sum; do
    command -v "$cmd" >/dev/null 2>&1 || {
      echo "Error: $cmd is required in Termux. Run: pkg install rsync coreutils" >&2
      exit 1
    }
  done
  project_id="$(printf '%s' "$project_dir" | sha256sum | cut -c1-12)"
  build_dir="$PREFIX/var/tmp/kodeweave-build-$project_id"
  npm_cache_dir="$PREFIX/var/cache/kodeweave-npm"
  mkdir -p "$build_dir" "$npm_cache_dir"
  rsync -a --delete --exclude='.git/' --exclude='node_modules/' "$project_dir/" "$build_dir/"
  cd "$build_dir"
  export npm_config_cache="$npm_cache_dir"
  install_deps
  npm run build
  mkdir -p "$project_dir/dist"
  rsync -a --delete "$build_dir/dist/" "$project_dir/dist/"
else
  install_deps
  npm run build
fi

echo "Build complete: $project_dir/dist"
