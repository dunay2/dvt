---
title: Run Events Partitioning User Stories
status: Implementation Guide
owner: Architecture / State Store / Adapter Postgres
last_reviewed: 2026-05-13
planning_type: architecture
---

# Run Events Partitioning User Stories

## Story 1: Fresh Runtime Migration

As an operator provisioning a new DVT Postgres schema, I want `migrate()` to
create `run_events` as a partitioned event log so that hot event writes do not
start on a legacy heap table.

Acceptance:

- `run_events` is a hash-partitioned parent by `run_id`.
- Partitions `run_events_h00` through `run_events_h15` exist.
- Ordering and idempotency constraints exist on the parent.
- Tenant RLS is active after all migrations finish.

## Story 2: Existing Deployment Upgrade

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

## Story 3: Duplicate Event Delivery

As the engine append path, I want duplicate idempotency keys to behave exactly as
before partitioning so retries do not create duplicate event facts.

Acceptance:

- `UNIQUE (run_id, idempotency_key)` remains valid on the partitioned parent.
- Existing `ON CONFLICT (run_id, idempotency_key) DO NOTHING` append behavior
  remains compatible.
- No caller has to include a partition identifier.

## Story 4: Rollback

As an operator rolling back schema migrations, I want `core_021` to restore
`run_events` to heap shape while preserving rows and canonical constraints.

Acceptance:

- Rollback renames the partitioned parent to `run_events_partitioned_rollback`.
- Rollback creates heap `run_events` with the same columns.
- Rollback copies all canonical columns back.
- Rollback drops the partitioned rollback table cascade.
- Rollback restores primary key, idempotency uniqueness, tenant index, and RLS.

## Story 5: Future Retention Planning

As an architect planning ADR-0037 retention, I want this slice to document that
hash partitioning does not implement archive unit deletion so future range or
tenant-bucket work is not treated as already complete.

Acceptance:

- Documentation names time-range partitioning as rejected for this slice.
- Documentation explains the idempotency constraint that blocks naive
  `persisted_at` range partitioning.
- The residual opportunity remains visible for a later lifecycle task.
