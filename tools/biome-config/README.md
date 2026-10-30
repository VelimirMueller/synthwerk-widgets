# Vendored `@synthwerk/biome-config`

- This folder holds a copy of `synthwerk-blueprint/packages/biome-config/biome.json`.
- Source commit: `6f0afbc` on branch `feat/s-e0-07-08-blueprint` (2026-10-09).
- Reason: `@synthwerk/biome-config` is not on npm yet. A `file:` link to a sibling clone fails in CI,
  because the runner has no sibling clone and `pnpm install --frozen-lockfile` stops.
- Do not edit this copy. Change the blueprint, then copy the file again.

## Remove the copy after the npm publish

1. Run `pnpm add -D -E -w @synthwerk/biome-config`.
2. In the root `biome.json`, replace `"./tools/biome-config/biome.json"` with `"@synthwerk/biome-config"`.
3. Delete this folder.
