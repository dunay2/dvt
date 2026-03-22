---
title: S06 — Migration Version Table Closeout
date: 2026-03-21
author: Architecture
planning_type: closeout
parent_plan: phase2-arch-debt-roadmap-20260315
branch: feat/g5-pr1-archive-export-verifier
---

# S06 — Migration Version Table Closeout

## Summary

S06 adds an applied-version tracking table (`schema_migrations`) and a named-step
migration runner to `PostgresSchemaManager` in `@dvt/adapter-postgres`. Schema
migrations are now resumable and auditable after crashes or partial deploys.

All S06 acceptance conditions are met.

---

## Deliverables Completed

### 1. `schema_migrations` table

Created inline in `PostgresSchemaManager` before any named step runs:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  component   TEXT        NOT NULL,
  version     TEXT        NOT NULL,
  description TEXT        NOT NULL,
  applied_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (component, version)
);

CREATE INDEX IF NOT EXISTS schema_migrations_component_applied_idx
  ON schema_migrations (component, applied_at DESC);
```

### 2. Named migration steps in `PostgresSchemaManager`

**File**: `packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts`

`ensureSchema()` now runs 10 named, idempotent steps in sequence:

| Step name                          | Content                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| `core_001_run_events`              | `run_events` table                                                              |
| `core_002_outbox`                  | `outbox` table                                                                  |
| `core_003_start_run_intents`       | `start_run_intents` table                                                       |
| `core_004_run_snapshots`           | `run_snapshots` table                                                           |
| `core_005_lineage_outbox`          | `lineage_outbox` + `lineage_dead_letter` tables                                 |
| `core_006_run_archive_units`       | `run_archive_units` table (G5-PR1)                                              |
| `core_007_archive_unit_state_idx`  | Index for archive unit state (G5-PR1)                                           |
| `core_008_archive_export_jobs`     | `archive_export_jobs` table (G5-PR1)                                            |
| `core_009_archive_verified_at_idx` | Index for verified_at (G5-PR1)                                                  |
| `core_010_purge_indexes`           | Purge indexes on `outbox`, `outbox_dead_letter`, `lineage_dead_letter` (G5-PR3) |

Each step is tracked with `(component='core', version='<step_name>', description='<human label>')` in
`schema_migrations`. A step only executes if its version row is absent — making every step
fully idempotent.

### 3. `pg_advisory_lock` concurrency guard

`ensureSchema()` acquires `pg_advisory_lock(8726354)` before running steps and
releases it after, preventing concurrent schema migrations from multiple pod
restarts racing each other.

---

## Acceptance Conditions — Verified

| Condition                             | Verified                                                                |
| ------------------------------------- | ----------------------------------------------------------------------- |
| Applied migrations are tracked        | ✅ `schema_migrations(component, version, applied_at)`                  |
| Steps are idempotent — safe to re-run | ✅ INSERT skipped if version row exists                                 |
| Partial deploy is resumable           | ✅ Only missing version rows execute; already-applied steps are skipped |
| Concurrent runners do not race        | ✅ `pg_advisory_lock(8726354)` serializes migration runs                |

---

## Out of Scope

- Rollback/down migrations (not planned; schema changes are additive)
- Version introspection CLI
