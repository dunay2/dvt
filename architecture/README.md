# Source-first architecture visibility spike

This directory is generated from Git. It is not a second architecture authority.

## Authority

1. Current source, tests, configuration and composition remain authoritative.
2. `source-first.config.json` selects current contexts and their human-facing architectural kind (`app`, `worker`, `adapter`, `plugin`, `package`).
3. `tools/generate-source-first.mjs` resolves `origin/main` to an exact SHA and derives architecture from implementation source only.
4. LikeC4 is a projection and navigation layer. Full tracked-file evidence remains machine-readable JSON.

## File classes

The generator separates:

- `implementation-source`: source that may contribute architecture/dependency edges;
- `test`: explicit test directories plus `*.test.*` / `*.spec.*` files;
- `test-support`: testing/fixtures/support sources;
- `docs`, `package-root`, and `other`.

Tests and test-support files never create runtime dependency arrows. They remain present in the exact Git inventory JSON with blob SHA and commit-pinned links.

## Provenance

- `SOURCE-FIRST`: context description is anchored to current source/package metadata.
- `STRUCTURE-DERIVED`: implementation module grouping is mechanically derived from `src/`.
- `SOURCE-DERIVED`: implementation evidence and file identity come from exact Git blobs.

No TARGET component is generated automatically. Future architecture must be modeled separately and explicitly.

## Views

The preview provides:

- one current DVT landscape;
- focused views by architectural group;
- per-context implementation-module views;
- per-module implementation evidence;
- JSON inventories containing all tracked files, including tests/docs/configuration.

The workflow runs `likec4 validate` before build and publishes only a validated static preview.
