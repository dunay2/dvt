# Source-first architecture visibility spike

This directory is generated from Git. It is not a second architecture authority.

## Authority

1. Current source, tests, configuration and composition remain authoritative.
2. `source-first.config.json` selects current contexts and their human-facing architectural kind (`app`, `worker`, `adapter`, `plugin`, `package`).
3. `tools/generate-source-first.mjs` resolves `origin/main` to an exact SHA and derives implementation topology.
4. `source-first.relations.json` contains the small set of runtime relations that cannot be recovered safely from import direction alone.
5. `tools/generate-runtime-relations.mjs` fail-closes every declared runtime relation unless its current source evidence exists and still contains the expected semantic anchors.
6. LikeC4 is a projection/navigation layer. Full tracked-file and runtime-relation evidence remains machine-readable JSON.

## Two different graphs

### Implementation topology

Derived mechanically from production source imports:

- tests and test-support never create runtime dependency edges;
- large source directories split adaptively (`maxFiles` / `maxDepth`);
- every implementation file belongs to exactly one derived source module;
- package/context and module links point to the exact Git baseline.

### Runtime communication

Some correct architectural relations deliberately point opposite to or across compile-time imports. Examples include:

- Web calling the API over HTTP;
- Engine delegating to an injected `IProviderAdapter` while the API binds Temporal;
- Engine persisting through injected state-store roles while API composition binds PostgreSQL;
- workers loading package-owned runtimes or Temporal step plugins.

Those relations are **ARCHITECTURE-DECLARED + SOURCE-EVIDENCED**, never guessed. Each relation publishes:

- source and target IDs;
- relation type and label;
- rationale;
- evidence path(s);
- expected source anchors;
- exact evidence blob SHA and commit-pinned GitHub URL.

If a source anchor disappears, generation fails before LikeC4 validation/build.

## File classes

The topology generator separates:

- `implementation-source`;
- `test`;
- `test-support`;
- `docs`;
- `package-root`;
- `other`.

Tests and test-support files remain present in the exact Git inventory JSON with blob SHA and commit-pinned links.

## Provenance

- `SOURCE-FIRST`: context description is anchored to current source/package metadata.
- `STRUCTURE-DERIVED`: implementation module grouping is mechanically derived from `src/`.
- `SOURCE-DERIVED`: implementation evidence/file identity comes from exact Git blobs.
- `ARCHITECTURE-DECLARED_SOURCE-EVIDENCED`: runtime relationship semantics are declared explicitly and continuously verified against current source anchors.

No TARGET component is generated automatically. Future architecture must be modeled separately and explicitly.

## Views

The preview provides:

- current DVT landscape;
- focused views by architectural group;
- per-context adaptive implementation-module views;
- per-module implementation evidence;
- source-evidenced runtime communication;
- focused start-run runtime handoff;
- focused worker/plugin runtime composition;
- JSON inventories containing all tracked files, including tests/docs/configuration;
- JSON evidence for every declared runtime relation.

The workflow runs `likec4 validate` before build and publishes only a validated static preview.
