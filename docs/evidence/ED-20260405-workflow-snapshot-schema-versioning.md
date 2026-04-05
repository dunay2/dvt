---
title: WorkflowSnapshot schema versioning and automatic stale rebuild
status: Accepted
date: 2026-04-05
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - packages/@dvt/adapter-postgres
arc_level: ARC-2
breaking: false
evidence_class: critical
code_refs:
  - packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts
  - packages/@dvt/contracts/src/index.ts
  - packages/@dvt/engine/src/state/runEventWritePolicy.ts
  - packages/@dvt/engine/src/core/SnapshotProjector.ts
  - packages/@dvt/engine/src/services/signal/SignalTransitionGuard.ts
  - packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresSnapshotStalenessQuerySql.ts
  - packages/@dvt/adapter-postgres/test/PostgresRunSnapshotStore.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresSnapshotStalenessQuery.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/engine test
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm type-check
    - pnpm verify:prepush
    - pnpm test
---

## Summary

This slice introduces explicit schema versioning for persisted
`WorkflowSnapshot` read models and adds automatic recovery behavior when a
stored snapshot is on an outdated schema version.

## What changed

- Added `CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION` and `schemaVersion` on
  `WorkflowSnapshot` in contracts.
- Updated in-memory and replay bootstrap paths to initialize snapshots with the
  current schema version.
- Updated Postgres snapshot reads to rebuild from canonical events when an
  existing `run_snapshots.snapshot` has a mismatched `schemaVersion`.
- Extended stale-snapshot SQL detection to mark version mismatch as stale, not
  only run-sequence lag.
- Added adapter-postgres regression tests for rebuild-on-version-mismatch and
  staleness SQL generation that includes schema-version mismatch predicates.

## Expected operational effect

- Old snapshots are no longer served silently when snapshot shape evolves.
- Rebuild pathways remain event-authoritative and deterministic.
- Projector/staleness mechanisms now naturally queue version-mismatched rows
  for refresh.
