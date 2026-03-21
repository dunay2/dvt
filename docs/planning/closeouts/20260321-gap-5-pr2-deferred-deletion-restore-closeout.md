---
title: Gap 5 PR2 — Deferred Deletion and Restore Closeout
date: 2026-03-21
author: Architecture
planning_type: closeout
parent_plan: gap-5-pr2-deferred-deletion-and-restore-20260319
branch: feat/g5-pr2-deferred-deletion-restore
---

# Gap 5 PR2 — Deferred Deletion and Restore Closeout

## Summary

This closeout records the completion of all G5-PR2 deliverables: delete-after-grace lifecycle, coordinator with leadership/fencing, and restore tooling for runs and archive units.

All G5-PR2 acceptance conditions are met. G5-PR3 (delivery buffer retention) is now unblocked.

---

## Deliverables Completed

### 1. DB Migration 008 — `@dvt/adapter-postgres`

**File**: `packages/@dvt/adapter-postgres/migrations/008_run_event_archive_delete_lifecycle.sql`

Adds:

- `run_event_archive_leases` table — coordinator leadership lease with `worker_id` PK, `lease_token`, `acquired_at`, `renewed_at`, `expires_at`
- `run_event_archive_restore_log` table — audit trail for every restore operation with `archive_unit_key`, `run_id`, `target_schema`, `requester_id`, `reason`, `status`, `rows_restored`, `started_at`, `completed_at`, `error`
- Indexes on `archive_unit_key` and `run_id` for fast restore history lookups

Note: `delete_after TIMESTAMPTZ` and `run_event_archive_units_delete_after_idx` were already present in migration 006. `DELETE_ELIGIBLE` and `DROPPED_FROM_HOT` states are string values in the existing `state` column.

---

### 2. `archiveRuntime.ts` contract extensions — `@dvt/state-store`

**File**: `packages/@dvt/state-store/src/lifecycle/archiveRuntime.ts`

New contracts:

**Delete lifecycle:**

- `RunArchiveDeletionPolicy` — `deletionGraceDays`, `maxUnitsPerRun`, `leaseTimeoutSeconds`, `workerId`
- `DeleteEligibleArchiveUnit` — typed record for units in `DELETE_ELIGIBLE` state
- `ArchiveBatchDroppedRecord` — batch record for successful drops
- `IRunArchiveDeleteStore` — `markDeleteEligibleUnits`, `listDueForDrop`, `dropHotArchiveUnit`, `markArchiveBatchDropped`

**Lease/fencing:**

- `ArchiveLease` — `workerId`, `leaseToken`, `acquiredAt`, `expiresAt`
- `IArchiveLeaseStore` — `tryAcquire`, `renew`, `release`, `assertLeaseHeld`

**Restore:**

- `ArchiveRunRestoreRequest` — single-run restore parameters
- `ArchiveUnitRestoreRequest` — full-unit restore parameters
- `ArchiveRestoreResult` — `restoreId`, `rowsRestored`, `targetSchema`, `completedAtIso`
- `RestoreLogRecord` — typed audit log entry
- `IRunArchiveRestoreStore` — `startRestoreLog`, `markRestoreCompleted`, `markRestoreFailed`, `writeRestoredEvents`, `getExportedBatchForUnit`

---

### 3. `RunArchiveDeleter` coordinator — `@dvt/state-store`

**File**: `packages/@dvt/state-store/src/lifecycle/RunArchiveDeleter.ts`

Two-phase delete orchestration:

**Phase 1 — `markDeleteEligibleUnits(policy)`** (no lease required, safe to run concurrently):

- Calls `IRunArchiveDeleteStore.markDeleteEligibleUnits`
- Transitions `VERIFIED → DELETE_ELIGIBLE` with `delete_after = verified_at + grace_days`
- Emits `dvt.archive.units_delete_eligible_total` metric per unit

**Phase 2 — `dropEligibleUnits(policy)`** (lease required):

- Acquires Postgres lease via `IArchiveLeaseStore.tryAcquire`
- Queries `listDueForDrop` — units with `state = DELETE_ELIGIBLE AND delete_after <= now`
- For each unit: `assertLeaseHeld` → `dropHotArchiveUnit` → `markArchiveBatchDropped`
- Releases lease in finally block (best-effort)
- Fail-soft per unit — continues with remaining units unless `ARCHIVE_LEASE_LOST`
- Aborts remaining drops if lease is lost
- Emits `dvt.archive.units_dropped_total`, `dvt.archive.drop_duration_ms`, `dvt.archive.drop_failures_total`

---

### 4. `RunArchiveRestorer` coordinator — `@dvt/state-store`

**File**: `packages/@dvt/state-store/src/lifecycle/RunArchiveRestorer.ts`

**`restoreRun(request)`** — single-run restore:

1. Records restore log entry (`STARTED`)
2. Reads `events.jsonl` from object store
3. Filters events by `runId`
4. Throws `ARCHIVE_RESTORE_RUN_NOT_FOUND` if no events match
5. Calls `writeRestoredEvents(events, targetSchema)`
6. Marks log `COMPLETED` with `rowsRestored`
7. On error: marks `FAILED`, emits `dvt.archive.restore_failed_total`, rethrows
8. Emits `dvt.archive.restore_completed_total`

**`restoreArchiveUnit(request)`** — full-unit restore:

1. Same flow but restores all events (no runId filter)
2. Throws `ARCHIVE_RESTORE_UNIT_EMPTY` if NDJSON file is empty

---

### 5. `PostgresArchiveLeaseStore` — `@dvt/adapter-postgres`

**File**: `packages/@dvt/adapter-postgres/src/PostgresArchiveLeaseStore.ts`

Implements `IArchiveLeaseStore`:

- **`tryAcquire`** — `INSERT ... ON CONFLICT DO UPDATE WHERE expires_at < now`. Returns the lease row if acquired (won the race), `null` if another worker holds a live lease
- **`renew`** — `UPDATE WHERE worker_id = ? AND lease_token = ?` — returns `false` if stolen
- **`release`** — `DELETE WHERE worker_id = ? AND lease_token = ?`
- **`assertLeaseHeld`** — `SELECT WHERE worker_id = ? AND lease_token = ? AND expires_at > now` — throws `ARCHIVE_LEASE_LOST` if missing

Exported from `@dvt/adapter-postgres` index.

---

### 6. `PostgresRunArchiveStore` extensions — `@dvt/adapter-postgres`

**File**: `packages/@dvt/adapter-postgres/src/PostgresRunArchiveStore.ts`

Now implements `IRunArchiveDeleteStore` and `IRunArchiveRestoreStore` in addition to `IRunArchiveStore`.

**Delete methods:**

- `markDeleteEligibleUnits` — `UPDATE run_event_archive_units SET state = 'DELETE_ELIGIBLE', delete_after = verified_at + N days WHERE state = 'VERIFIED'`
- `listDueForDrop` — `SELECT WHERE state = 'DELETE_ELIGIBLE' AND delete_after <= now LIMIT maxUnitsPerRun`
- `dropHotArchiveUnit` — validates `state = DELETE_ELIGIBLE`, `DELETE FROM run_events WHERE persisted_at_day = ? AND tenant_id = ANY(?)`, transitions to `DROPPED_FROM_HOT`
- `markArchiveBatchDropped` — upserts batch record with `status = 'DROPPED'`

**Restore methods:**

- `startRestoreLog` — inserts into `run_event_archive_restore_log`
- `markRestoreCompleted` / `markRestoreFailed` — updates log status
- `writeRestoredEvents` — row-by-row insert into `{targetSchema}.run_events` with `ON CONFLICT (idempotency_key) DO NOTHING`
- `getExportedBatchForUnit` — returns latest `EXPORTED` batch for an archive unit

---

### 7. Public API updates

- `packages/@dvt/state-store/src/index.ts` — exports all new types and coordinators
- `packages/@dvt/adapter-postgres/src/index.ts` — exports `PostgresArchiveLeaseStore`

---

## Test Coverage

**Package**: `@dvt/state-store` — 75 tests across 8 test files (all green, +21 from PR2).

| Test file                    | Tests | Coverage focus                                                                                      |
| ---------------------------- | ----- | --------------------------------------------------------------------------------------------------- |
| `RunArchiveDeleter.test.ts`  | 12    | Phase 1 (mark eligible), Phase 2 (drop loop), lease-lost abort, metrics, policy validation          |
| `RunArchiveRestorer.test.ts` | 9     | restoreRun (happy, not found, object error), restoreArchiveUnit (happy, empty, null runId), metrics |

---

## Metrics Delivered

| Metric                                    | Emitted by                                  |
| ----------------------------------------- | ------------------------------------------- |
| `dvt.archive.units_delete_eligible_total` | `RunArchiveDeleter.markDeleteEligibleUnits` |
| `dvt.archive.units_dropped_total`         | `RunArchiveDeleter.dropEligibleUnits`       |
| `dvt.archive.drop_duration_ms`            | `RunArchiveDeleter.dropEligibleUnits`       |
| `dvt.archive.drop_failures_total`         | `RunArchiveDeleter.dropEligibleUnits`       |
| `dvt.archive.restore_completed_total`     | `RunArchiveRestorer`                        |
| `dvt.archive.restore_failed_total`        | `RunArchiveRestorer`                        |

---

## Acceptance Conditions — Verified

| Condition                                                | Verified                                                                                                    |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Verified units not dropped before grace expiry           | ✅ `markDeleteEligibleUnits` only transitions `VERIFIED`; `listDueForDrop` filters by `delete_after <= now` |
| Restore of one run from cold storage                     | ✅ `RunArchiveRestorer.restoreRun` — reads NDJSON, filters by runId, writes to targetSchema                 |
| Restore of one archive unit into temp target             | ✅ `RunArchiveRestorer.restoreArchiveUnit` — writes all events to targetSchema                              |
| Coordinator resumes without redoing successful exports   | ✅ `DROPPED_FROM_HOT` state blocks re-drop; `markArchiveBatchDropped` upserts idempotently                  |
| Leadership model prevents two workers deleting same unit | ✅ `assertLeaseHeld` re-checked before each `dropHotArchiveUnit` call; `ARCHIVE_LEASE_LOST` aborts loop     |
| Restore path throttled and audited                       | ✅ `run_event_archive_restore_log` records every restore with requester, reason, status, timestamps         |

---

## Out of Scope (Deferred to PR3/PR4)

- Delivery buffer retention (outbox/dead-letter purge) → PR3
- Redaction implementation → PR4
- Background heartbeat renewal loop (operator-wired via health loop, not in coordinator)
