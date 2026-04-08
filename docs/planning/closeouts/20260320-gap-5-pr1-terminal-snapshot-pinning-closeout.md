---
slice: 20260320-gap-5-pr1-terminal-snapshot-pinning
date: 2026-03-20
last_reviewed: 2026-03-20
gap: gap-5-pr1
author: AI (GPT-5)
---

# Closeout: Gap 5 PR1 Terminal Snapshot Pinning

## Think-First Analysis

### Problem summary

Gap 5 PR1 now has archive-unit schema plus deterministic manifest and terminal
snapshot artifact helpers, but the repository still lacks the real warm-tier
write/read surface that pins terminal snapshots into PostgreSQL with archive
metadata.

### Root cause

The previous slice intentionally stopped at pure artifact construction. That was
correct for checksum and manifest semantics, but it left the `run_snapshots`
table unable to record that a terminal snapshot has been pinned for archival
use, which means PR1 still has no concrete persistence path for warm snapshots.

### Constraints and invariants

- `AGENTS.md`: governance inventory first, think-first before edits, real
  validation, no hidden debt, no stubs.
- `docs/guides/ai-work-protocol.md`: Full mode because this slice adds a new
  state boundary plus schema and adapter behavior.
- `ADR-0004`: snapshots remain derived state from the ordered event stream;
  pinning must not create a second source of truth.
- `ADR-0031`: all pinning reads and writes must stay tenant-explicit.
- `ADR-0034`: warm-tier persistence belongs in the state boundary, not engine
  core.
- `ADR-0037`: warm storage is pinned terminal snapshots plus archive catalog
  metadata; terminal snapshots must carry `lastRunSeq` and
  `eventChecksumSha256`.
- `docs/planning/dvt-top-5-gaps-corrected-20260319.md`: the archival process
  explicitly says terminal snapshots are pinned by writing to `run_snapshots`
  if not present.
- `docs/planning/proposals/gap-5-event-lifecycle-and-archival-design-20260319.md`:
  whether warm snapshots later move to a dedicated schema is still an open
  question, so PR1 should not pre-commit to that larger redesign.

### Options considered

- Delay terminal snapshot persistence until the exporter/object-storage slice is
  implemented.
  - Rejected because PR1 explicitly requires terminal snapshot pinning, and the
    read path for old terminal runs stays blocked without a persisted warm-tier
    record.
- Introduce a brand-new warm snapshot table now.
  - Rejected because the current planning sources do not require that yet, and
    the gap tracker already states PR1 pins into `run_snapshots`. Creating a new
    table here would expand scope and pre-decide the later schema question.
- Extend `run_snapshots` with archive metadata columns and add a dedicated
  pinning boundary in `@dvt/state-store`, implemented in `@dvt/adapter-postgres`.
  - Selected because it is the smallest real slice that satisfies PR1
    direction, preserves derived-snapshot semantics, and enables archived-run
    warm reads without inventing a parallel store.

### Selected option and rationale

Add archive-pinning metadata to `run_snapshots` and expose a small state-owned
pinning boundary that can persist and read pinned terminal snapshots
tenant-safely. This keeps the warm tier narrow, uses the existing snapshot
table intentionally, and lets later exporter/coordinator work plug into a real
write path instead of a placeholder.

### Rejected alternatives

- Shipping only more pure helpers. Rejected because the blocker is now
  persistence, not artifact construction.
- Splitting warm snapshots into a new table before PR1 proves the flow.
  Rejected because it increases migration and read-path complexity without a
  governing requirement to do so yet.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - define the terminal snapshot pinning boundary in `@dvt/state-store`
  - persist archive-pinning metadata in PostgreSQL `run_snapshots`
  - expose adapter read/write methods for pinned terminal snapshots
  - add migration coverage and store behavior tests
- Touched files or paths:
  - `packages/@dvt/state-store/src/lifecycle/*`
  - `packages/@dvt/state-store/src/index.ts`
  - `packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts`
  - `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`
  - `packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts`
  - `packages/@dvt/adapter-postgres/migrations/*`
  - `packages/@dvt/adapter-postgres/test/*`
  - `packages/@dvt/adapter-postgres/package.json`
  - `packages/@dvt/adapter-postgres/tsconfig.json`
  - `tsconfig.json`
  - `pnpm-lock.yaml`
  - `docs/planning/proposals/gap-5-pr1-minimal-usable-archival-20260319.md`
  - `docs/planning/closeouts/20260320-gap-5-pr1-terminal-snapshot-pinning-closeout.md`
- Expected outcome:
  - a real persisted warm-tier record for pinned terminal snapshots
  - archive metadata stored alongside `run_snapshots` without changing the
    snapshot's derived-authority role
- Risks and mitigations:
  - Risk: blur the line between hot snapshots and warm pinned snapshots.
  - Mitigation: store only archive metadata columns; keep `snapshot` and
    `last_run_seq` as the derived state, not a new canonical record type.
  - Risk: allow cross-tenant pinning writes.
  - Mitigation: verify tenant ownership through `run_metadata` before any pin or
    metadata read.
  - Risk: silently pin non-terminal runs.
  - Mitigation: require the state-store boundary to accept only already-built
    `PinnedTerminalSnapshot` records and add negative tests in the adapter layer.
- Out-of-scope items:
  - object-storage upload/export
  - async verification worker
  - archive catalog resolver by run id beyond what this metadata directly
    enables
  - hot-data deletion
- Validation plan:
  - `pnpm --filter @dvt/state-store build`
  - `pnpm --filter @dvt/state-store test`
  - `pnpm --filter @dvt/adapter-postgres build`
  - `pnpm --filter @dvt/adapter-postgres test`
  - `pnpm verify:prepush`
- Test coverage plan:
  - happy-path pinning into `run_snapshots`
  - retrieval of pinned metadata for a tenant-scoped run
  - rejection when run ownership does not match tenant
  - migration assertions for the new columns and indexes
- Libraries evaluated:
  - None added; reuse existing `@dvt/state-store` artifact helpers and current
    PostgreSQL adapter infrastructure

## Traceability

- Baseline ADRs verified in Phase 3:
  - `ADR-0004`
  - `ADR-0031`
  - `ADR-0034`
  - `ADR-0037`
- Canonical planning docs:
  - `docs/planning/proposals/gap-5-pr1-minimal-usable-archival-20260319.md`
  - `docs/planning/proposals/gap-5-event-lifecycle-and-archival-design-20260319.md`
  - `docs/planning/dvt-top-5-gaps-corrected-20260319.md`
- Generated artifact set:
  - `packages/@dvt/state-store/src/lifecycle/archiveArtifacts.ts`
  - `packages/@dvt/state-store/src/index.ts`
  - `packages/@dvt/adapter-postgres/migrations/007_run_snapshots_archive_pinning.sql`
  - `packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts`
  - `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`
  - `packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts`
  - `packages/@dvt/adapter-postgres/test/PostgresRunSnapshotStore.test.ts`
  - `packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts`
  - `packages/@dvt/state-store/test/archiveArtifacts.test.ts`

## Changes made

- `packages/@dvt/state-store/src/lifecycle/archiveArtifacts.ts`
  Added the canonical archived terminal snapshot record, validation builder, and
  pinning store boundary so warm-tier snapshot metadata stays state-owned.
- `packages/@dvt/state-store/src/index.ts`
  Exported the new archived snapshot types and builder from the public package
  surface.
- `packages/@dvt/state-store/test/archiveArtifacts.test.ts`
  Added happy-path and negative-path coverage for archived terminal snapshot
  records.
- `packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts`
  Implemented tenant-safe pin and read methods for archived terminal snapshots
  on top of `run_snapshots`.
- `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`
  Exposed the new pin/read surface through the adapter public API.
- `packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts`
  Extended `run_snapshots` DDL and compatibility patches with archive pinning
  metadata plus an archive-unit index.
- `packages/@dvt/adapter-postgres/migrations/007_run_snapshots_archive_pinning.sql`
  Added the numbered migration for warm snapshot archive metadata.
- `packages/@dvt/adapter-postgres/test/PostgresRunSnapshotStore.test.ts`
  Added store-level coverage for pinning upserts, tenant mismatch rejection, and
  pinned snapshot reads.
- `packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts`
  Added migration assertions for the new columns and index.
- `packages/@dvt/adapter-postgres/package.json`
  Added the explicit workspace dependency on `@dvt/state-store`.
- `packages/@dvt/adapter-postgres/tsconfig.json`
  Added path mapping for `@dvt/state-store` so build resolution matches the
  workspace dependency edge.
- `tsconfig.json`
  Added the root workspace path mapping for `@dvt/state-store` so the shared
  ESLint/TypeScript resolver used in CI can resolve the new package import.
- `pnpm-lock.yaml`
  Recorded the new workspace dependency edge after `pnpm install`.
- `docs/planning/proposals/gap-5-pr1-minimal-usable-archival-20260319.md`
  Updated the PR1 checklist to reflect the slices already shipped in `main`.

## Governing sources used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/roadmap/gap-5-executive-delivery-roadmap-20260319.md`
- `docs/planning/proposals/gap-5-pr1-minimal-usable-archival-20260319.md`
- `docs/planning/proposals/gap-5-event-lifecycle-and-archival-design-20260319.md`
- `docs/planning/dvt-top-5-gaps-corrected-20260319.md`
- `docs/guides/testing-and-ci-capabilities.md`
- `docs/adr/ADR-0004-event-sourcing-strategy.md`
- `docs/adr/ADR-0031-adapter-tenant-isolation.md`
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`
- `docs/adr/ADR-0037-run-event-lifecycle-archival-verification-and-restore-model.md`

## Docs synced

- [x] `pnpm docs:sync` ran after the proposal checklist and closeout updates and
      reported the generated planning/docs indexes already up to date

## Test evidence

- `pnpm --filter @dvt/state-store build` - Passed
- `pnpm --filter @dvt/state-store test` - Passed
- `pnpm install` - Passed
- `pnpm --filter @dvt/adapter-postgres build` - Passed
- `pnpm --filter @dvt/adapter-postgres test` - Passed
- `pnpm exec eslint packages/@dvt/state-store/src/index.ts packages/@dvt/state-store/src/lifecycle/archiveArtifacts.ts packages/@dvt/state-store/test/archiveArtifacts.test.ts packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts packages/@dvt/adapter-postgres/src/index.ts packages/@dvt/adapter-postgres/src/types.ts packages/@dvt/adapter-postgres/test/PostgresRunSnapshotStore.test.ts packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts`
  - Passed
- `pnpm exec prettier --check packages/@dvt/adapter-postgres/package.json packages/@dvt/adapter-postgres/tsconfig.json packages/@dvt/state-store/src/index.ts packages/@dvt/state-store/src/lifecycle/archiveArtifacts.ts packages/@dvt/state-store/test/archiveArtifacts.test.ts packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts packages/@dvt/adapter-postgres/src/index.ts packages/@dvt/adapter-postgres/src/types.ts packages/@dvt/adapter-postgres/test/PostgresRunSnapshotStore.test.ts packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts docs/planning/proposals/gap-5-pr1-minimal-usable-archival-20260319.md docs/planning/closeouts/20260320-gap-5-pr1-terminal-snapshot-pinning-closeout.md pnpm-lock.yaml`
  - Passed
- `pnpm exec prettier --check tsconfig.json`
  - Passed
- `pnpm exec markdownlint-cli2 docs/planning/proposals/gap-5-pr1-minimal-usable-archival-20260319.md docs/planning/closeouts/20260320-gap-5-pr1-terminal-snapshot-pinning-closeout.md --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc`
  - Passed
- `pnpm docs:sync` - Passed
- `pnpm verify:prepush` - Passed; the repo changed-file substep reported `No changed files detected`, so explicit `eslint`, `prettier --check`, and `markdownlint-cli2` were run against the touched files above

## Debt introduced

None.

## No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No hidden debt entry was created.
- The slice implements a real persistence/read path instead of a placeholder
  archive pinning API.

## No-stub evidence

- No fake warm snapshot table or placeholder coordinator was added.
- The shipped code pins real terminal snapshots into `run_snapshots` with real
  archive metadata and tenant checks.
