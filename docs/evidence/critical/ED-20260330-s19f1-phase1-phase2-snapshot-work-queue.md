---
title: S19-F1 phase 1 and 2 delivery with snapshot work queue
status: Accepted
date: 2026-03-30
owners:
  - packages/@dvt/adapter-postgres
  - packages/@dvt/delivery
arc_level: ARC-2
breaking: false
evidence_class: critical
code_refs:
  - packages/@dvt/adapter-postgres/src/PostgresSnapshotStalenessQuerySql.ts
  - packages/@dvt/adapter-postgres/src/PostgresRunEventStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresRunEventStoreSql.ts
  - packages/@dvt/adapter-postgres/src/PostgresRunEventStorage.ts
  - packages/@dvt/adapter-postgres/src/PostgresSnapshotWorkQueue.ts
  - packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts
  - packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts
  - packages/@dvt/delivery/src/application/ProjectorWorkerRuntime.ts
evidence:
  tests:
    - pnpm exec vitest run packages/@dvt/delivery/test/ProjectorWorkerRuntime.test.ts packages/@dvt/adapter-postgres/test/PostgresRunEventStore.test.ts packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.sharding.test.ts
    - pnpm verify:prepush
---

## Summary

`S19-F1` is delivered across both planned phases:

- Phase 1: staleness query uses `run_event_heads` and no longer relies on correlated max-seq scanning in `listStaleSnapshotRuns`.
- Phase 2: projector discovery can consume push-style work from `snapshot_work_queue` via `claimSnapshotWork(batchSize)`.

## Scope

- Added `snapshot_work_queue` migration and stale backfill (`core_016_snapshot_work_queue`).
- Added queue upsert on event append path (`PostgresRunEventStore`/`PostgresRunEventStorage`).
- Added queue claim API (`PostgresSnapshotWorkQueue`, adapter runtime facade method).
- Updated projector runtime to prefer queue claim when available, with staleness guard before rebuild.

## Validation

- Updated unit/integration suites for runtime behavior, SQL wiring, and migrations are green.
- Repository pre-push verification command executed in closeout.
