#!/usr/bin/env bash
# Vendors @synthwerk/sdk, @synthwerk/tokens and @synthwerk/ui-vue from one synthwerk-sdk commit.
#
# The packages are not on npm. This script builds them from a pinned commit, packs each
# with `pnpm pack` (only the files the package publishes) and unpacks it into
# vendor/<name>/. package.json consumes them as "file:vendor/<name>".
# vendor/synthwerk-sdk.lock.json records the commit, the versions and a SHA-256 per file.
# tests/vendor.test.ts fails when a copy differs from the lock: nobody edits vendor/ by hand.
#
# Usage: bash scripts/vendor/sync.sh <full-commit-sha>
# The commit must be reachable from a branch or tag: GitHub serves a shallow fetch by SHA
# only for those (use a merged main commit).
# Then:  pnpm install, check the diff, commit vendor/ and pnpm-lock.yaml together.
# When the packages are on npm, replace the file: dependencies with versions and
# delete vendor/, this script and tests/vendor.test.ts.
set -euo pipefail

REPO_URL="https://github.com/VelimirMueller/synthwerk-sdk.git"
PACKAGES=(sdk tokens ui-vue)

commit="${1:-}"
if [[ ! "$commit" =~ ^[0-9a-f]{40}$ ]]; then
  echo "usage: $0 <full 40-character synthwerk-sdk commit sha>" >&2
  exit 2
fi

root="$(git rev-parse --show-toplevel)"
lock="$root/vendor/synthwerk-sdk.lock.json"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

echo "→ clone synthwerk-sdk at $commit"
git init -q "$work/sdk"
git -C "$work/sdk" remote add origin "$REPO_URL"
git -C "$work/sdk" fetch -q --depth 1 origin "$commit"
git -C "$work/sdk" checkout -q FETCH_HEAD
(cd "$work/sdk" && pnpm install --frozen-lockfile --silent)

for name in "${PACKAGES[@]}"; do
  echo "→ build and pack packages/$name"
  (cd "$work/sdk" && pnpm --filter "./packages/$name" run build >/dev/null)
  mkdir -p "$work/pack/$name"
  (cd "$work/sdk/packages/$name" && pnpm pack --pack-destination "$work/pack/$name" >/dev/null)
  tarball="$(find "$work/pack/$name" -name '*.tgz' -print -quit)"
  dest="$root/vendor/synthwerk-$name"
  rm -rf "$dest"
  mkdir -p "$dest"
  tar -xzf "$tarball" -C "$dest" --strip-components=1
done

node --input-type=module - "$root/vendor" "$lock" "$REPO_URL" "$commit" "${PACKAGES[@]}" <<'NODE'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const [vendor, lock, repository, commit, ...names] = process.argv.slice(2)
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]
  )
const packages = names.map((short) => {
  const dest = join(vendor, `synthwerk-${short}`)
  const files = Object.fromEntries(
    walk(dest)
      .map((file) => [relative(dest, file).split('\\').join('/'), file])
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([n, file]) => [n, createHash('sha256').update(readFileSync(file)).digest('hex')])
  )
  const { name, version } = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8'))
  console.log(`→ ${name}@${version}: ${Object.keys(files).length} files`)
  return { name, version, directory: `packages/${short}`, vendor: `vendor/synthwerk-${short}`, files }
})
writeFileSync(lock, `${JSON.stringify({ source: { repository, commit }, packages }, null, 2)}\n`)
NODE
echo "→ lock written: vendor/synthwerk-sdk.lock.json"
