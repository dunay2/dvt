---
title: Postgres Run Events Partitioning Component
status: Implementation Guide
owner: Architecture / State Store / Adapter Postgres
last_reviewed: 2026-05-13
planning_type: architecture
---

# Postgres Run Events Partitioning Component

## Identity

- Component ID: `DVT-ADAPTER-POSTGRES-RUN-EVENTS-PARTITIONING-001`
- Package: `@dvt/adapter-postgres`
- Owner: Adapter Postgres state-store schema manager
- Primary code: `packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts`

## Purpose

Keep the authoritative hot `run_events` log scalable without changing the
engine event-sourcing contract, tenant isolation contract, or idempotent append
semantics.

## Public API

No new public package API is added. The component is exercised through the
existing adapter entry points:

- `PostgresStateStoreAdapter.migrate()`
- `PostgresSchemaManager.planRollback(targetVersion)`
- `PostgresSchemaManager.rollbackTo(targetVersion)`
- Existing append/read paths that write or read `run_events`

## Invariants

- `run_events` remains append-only authoritative event history.
- The partition key is `run_id`.
- The parent table is created with `PARTITION BY HASH (run_id)`.
- The partition count is 16.
- The tenant-isolation catalog declares both the parent `run_events` table and
  all physical hash partitions.
- Canonical constraints remain:
  - `PRIMARY KEY (run_id, run_seq)`
  - `UNIQUE (run_id, idempotency_key)`
- The canonical column list is unchanged during heap-to-partition conversion.
- Tenant RLS is re-applied to the canonical `run_events` table after conversion.
- Tenant RLS is also re-applied to `run_events_h00` through `run_events_h15`
  so direct partition access remains fail-closed for proof roles.
- Temporary migration tables may have RLS disabled only while they are the
  temporary copy source or rollback source.
- The adapter does not introduce time-range deletion, compaction, or archive
  drop behavior in this slice.

## State Model

```mermaid
stateDiagram-v2
  [*] --> Missing
  Missing --> Partitioned: fresh migrate creates parent and 16 partitions
  HeapLegacy --> Partitioning: core_021 detects heap table
  Partitioning --> Partitioned: copy rows, add constraints, reapply RLS
  Partitioned --> Partitioned: idempotent migrate ensures children, index, RLS
  Partitioned --> HeapLegacy: rollback core_021
```

## Migration Transitions

Fresh schema:

```mermaid
flowchart LR
  Schema["schema exists"]
  Parent["run_events partitioned parent"]
  Children["run_events_h00...run_events_h15"]
  Contracts["PK and idempotency unique"]
  RLS["tenant RLS"]

  Schema --> Parent --> Children --> Contracts --> RLS
```

Legacy heap conversion:

```mermaid
flowchart TD
  Detect["Detect run_events not in pg_partitioned_table"]
  Rename["Rename run_events to run_events_unpartitioned_legacy"]
  DisableTempRls["Disable RLS on temporary legacy table only"]
  CreateParent["Create run_events PARTITION BY HASH (run_id)"]
  CreateChildren["Create 16 hash partitions"]
  Copy["Copy canonical columns"]
  DropLegacy["Drop temporary legacy table"]
  RestoreContracts["Add PK, unique idempotency, tenant index"]
  RestoreRls["Reapply forced tenant RLS"]

  Detect --> Rename --> DisableTempRls --> CreateParent --> CreateChildren --> Copy --> DropLegacy --> RestoreContracts --> RestoreRls
```

Rollback:

```mermaid
flowchart TD
  Detect["Detect partitioned run_events"]
  Rename["Rename to run_events_partitioned_rollback"]
  Heap["Create heap run_events with same columns"]
  CopyBack["Copy canonical columns back"]
  DropPartitioned["Drop partitioned rollback parent cascade"]
  Restore["Add constraints, index, and RLS"]

  Detect --> Rename --> Heap --> CopyBack --> DropPartitioned --> Restore
```

## Consumers

- `PostgresRunEventStore` appends and lists ordered events.
- `PostgresRunSnapshotStore` replays event tails and rebuilds snapshots.
- `PostgresSnapshotStalenessQuery` reads run event heads and event state.
- Archive and retention work governed by ADR-0037 remains a future lifecycle
  consumer, not part of this hot partitioning slice.

## Requirements Linked

- Governing task: `run_events partitioning`
- `REQ-RUN-EVENTS-001`: preserve per-run event ordering.
- `REQ-RUN-EVENTS-002`: preserve duplicate idempotency rejection by
  `(run_id, idempotency_key)`.
- `REQ-RUN-EVENTS-003`: keep tenant isolation enforced after schema conversion.
- `REQ-RUN-EVENTS-004`: make rollback preserve rows and canonical constraints.

## ADRs Linked

- `ADR-0004`: Event sourcing strategy.
- `ADR-0008`: Signal idempotency.
- `ADR-0013`: Run state store bootstrap and explicit migration.
- `ADR-0031`: Adapter tenant isolation.
- `ADR-0037`: Run event lifecycle archival, verification, and restore model.

## Tests

- `packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts`
  - fresh schema creates hash-partitioned `run_events`
  - legacy heap converts to partitioned parent without changing columns
  - migration step count and version include `core_021_run_events_hash_partitioning`
- `packages/@dvt/adapter-postgres/test/PostgresSchemaManager.rollback.test.ts`
  - rollback includes `core_021_run_events_hash_partitioning`
  - rollback preserves constraints and re-applies tenant isolation
- `packages/@dvt/adapter-postgres/test/PostgresTenantIsolationPolicy.test.ts`
  - run event hash partitions remain listed in the tenant isolation catalog
- `packages/@dvt/adapter-postgres/test/PostgresTenantRlsEnforcement.integration.test.ts`
  - every tenant-owned physical table, including partitions, has forced RLS

## Runtime Evidence

- `pg_partitioned_table` contains `run_events` after migration.
- Child partitions `run_events_h00` through `run_events_h15` exist.
- Constraint metadata includes `run_events_pkey` and
  `run_events_run_id_idempotency_key_key`.
- RLS metadata remains enabled and forced for canonical `run_events` and each
  physical hash partition.

## Lifecycle Policy

Hash partitioning is hot-storage scale work. It does not replace ADR-0037
archive units, verification, restore, delete-after-grace, or future retention
partition work.

<a id="section-run-events-partitioning-user-stories"></a>

## Run Events Partitioning User Stories

### Story 1: Fresh Runtime Migration

As an operator provisioning a new DVT Postgres schema, I want `migrate()` to
create `run_events` as a partitioned event log so that hot event writes do not
start on a legacy heap table.

Acceptance:

- `run_events` is a hash-partitioned parent by `run_id`.
- Partitions `run_events_h00` through `run_events_h15` exist.
- Ordering and idempotency constraints exist on the parent.
- Tenant RLS is active after all migrations finish.

### Story 2: Existing Deployment Upgrade

As an operator upgrading an existing schema, I want the migration to convert the
legacy heap `run_events` table into the partitioned parent without changing
event rows or columns.

Acceptance:

- The old table is renamed to `run_events_unpartitioned_legacy`.
- The canonical `run_events` name is restored as a partitioned parent.
- All canonical columns are copied.
- Temporary RLS relaxation applies only to the legacy temporary table.
- The legacy temporary table is dropped after copy.
- Canonical constraints, tenant index, and tenant RLS are restored.

### Story 3: Duplicate Event Delivery

As the engine append path, I want duplicate idempotency keys to behave exactly as
before partitioning so retries do not create duplicate event facts.

Acceptance:

- `UNIQUE (run_id, idempotency_key)` remains valid on the partitioned parent.
- Existing `ON CONFLICT (run_id, idempotency_key) DO NOTHING` append behavior
  remains compatible.
- No caller has to include a partition identifier.

### Story 4: Rollback

As an operator rolling back schema migrations, I want `core_021` to restore
`run_events` to heap shape while preserving rows and canonical constraints.

Acceptance:

- Rollback renames the partitioned parent to `run_events_partitioned_rollback`.
- Rollback creates heap `run_events` with the same columns.
- Rollback copies all canonical columns back.
- Rollback drops the partitioned rollback table cascade.
- Rollback restores primary key, idempotency uniqueness, tenant index, and RLS.

### Story 5: Future Retention Planning

As an architect planning ADR-0037 retention, I want this slice to document that
hash partitioning does not implement archive unit deletion so future range or
tenant-bucket work is not treated as already complete.

Acceptance:

- Documentation names time-range partitioning as rejected for this slice.
- Documentation explains the idempotency constraint that blocks naive
  `persisted_at` range partitioning.
- The residual opportunity remains visible for a later lifecycle task.

> Acceptance scope status: Implementation Guide. Owner: Architecture / State Store / Adapter Postgres.
