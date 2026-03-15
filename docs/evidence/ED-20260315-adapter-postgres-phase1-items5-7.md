---
title: ED-20260315 - PostgresStateStoreAdapter Phase 1 Items 5-7 (Metadata/Event/Snapshot Store extraction)
status: accepted
date: 2026-03-15
owners: Engineering
arc_level: ARC-1
breaking: false
gap: G2
code_refs:
  - packages/@dvt/adapter-postgres/src/PostgresRunMetadataRepository.ts
  - packages/@dvt/adapter-postgres/src/PostgresRunEventStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts
  - packages/@dvt/adapter-postgres/src/index.ts
evidence:
  - PostgresRunMetadataRepository extracted (322 lines) - owns run_metadata table operations
  - PostgresRunEventStore extracted (274 lines) - owns run_events table operations
  - PostgresRunSnapshotStore extracted (198 lines) - owns run_snapshots table operations
  - PostgresStateStoreAdapter reduced from ~955 to 405 lines - facade plus transactional coordinator
  - Typecheck clean (`pnpm --filter @dvt/adapter-postgres typecheck`)
---

# ED-20260315 - PostgresStateStoreAdapter Phase 1 Items 5-7

## Purpose

Completes Phase 1 of the `PostgresStateStoreAdapter_Refactor_Review.md`
mandatory extractions. Items 5, 6, and 7 extract the run metadata, event, and
snapshot concerns into dedicated single-responsibility classes, reducing the
adapter from a god-object (~955 lines) to a thin transactional coordinator.

Phase 1 status after this ED:

| Item | Description | Status |
| ---- | ----------- | ------ |
| 1 | Extract `RunEventProjector` -> `@dvt/run-domain` | Done (prior session) |
| 2 | Extract `PostgresSchemaManager` | Done (prior session) |
| 3 | Extract `PostgresOutboxStore` | Done (prior session) |
| 4 | Extract `PostgresDeadLetterStore` | Done (part of OutboxStore) |
| 5 | Extract `PostgresRunMetadataRepository` | Done (this ED) |
| 6 | Extract `PostgresRunEventStore` | Done (this ED) |
| 7 | Extract `PostgresRunSnapshotStore` | Done (this ED) |

## Extracted Classes

### `PostgresRunMetadataRepository`

Owns all `run_metadata` table operations.

Extracted methods:
- `insertWithClient(client, meta)` - inserts a new `run_metadata` row within a
  caller-owned transaction
- `resolveTenantWithClient(client, runId)` - resolves `tenant_id` from `run_id`
  for `resolveAndSetTenantContext`
- `getByRunId(tenantId, runId)` - tenant-scoped metadata fetch
- `listRuns(options)` - tenant-scoped run listing with optional status filter
- `saveProviderRef(tenantId, runId, runRef)` - updates provider workflow/run IDs
- `saveRunMetadata(meta)` - deprecated upsert path kept during the transition

### `PostgresRunEventStore`

Owns all `run_events` table operations.

Extracted methods:
- `appendWithClient(client, runId, envelopes)` - acquires advisory lock, gets
  max `run_seq`, inserts and deduplicates events, and returns append metadata
- `listEvents(tenantId, runId, options?)` - tenant-scoped ordered event list
- `appendEventsTx(runId, envelopes)` - deprecated compatibility path that wraps
  `appendWithClient`

### `PostgresRunSnapshotStore`

Owns all `run_snapshots` table operations.

Extracted methods:
- `getSnapshot(tenantId, runId)` - tenant-scoped snapshot fetch
- `rebuildSnapshot(tenantId, runId)` - full event replay with advisory lock
- `updateWithClient(client, runId, appended, baseRunSeq, lastAppendedRunSeq)` -
  incremental snapshot projection within a caller-owned transaction
- `persistWithClient(client, runId, snap, lastSeq)` - snapshot upsert within a
  caller-owned transaction

### `PostgresStateStoreAdapter`

Reduced to a facade plus transactional coordinator:

- owns connection pool lifecycle, `withTransaction`/`withClient`, abort
  tracking, `migrate()`, and `close()`
- owns `bootstrapRunTx` and `appendAndEnqueueTx` as multi-store transactional
  orchestration
- keeps `appendEventsTxWithClient` as the coordinator over the event and
  snapshot stores
- delegates the remaining public methods to the appropriate extracted store

## Design Pattern

All extracted stores use callback injection for `withTransaction` and
`withClient`. That preserves the adapter's connection lifecycle and abort logic
without duplicating pool ownership.

## Validation Run

Executed on 2026-03-15:

```text
pnpm --filter @dvt/adapter-postgres typecheck
  PASS
pnpm --filter @dvt/adapter-postgres test
  PASS (11 passed, 23 skipped integration/smoke tests)
```

Integration tests under `DVT_PG_INTEGRATION=1` were not re-run in this slice.
The validated scope here is the extraction and package-local behavior.

## Traceability

- Refactor plan:
  `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter_Refactor_Review.md`
- System status reference:
  `docs/architecture/system-delivery-status.md`
- Governing ADRs:
  `docs/adr/ADR-0004-event-sourcing-strategy.md`,
  `docs/adr/ADR-0013-run-state-store-bootstrapRunTx.md`,
  `docs/adr/ADR-0031-adapter-tenant-isolation.md`
