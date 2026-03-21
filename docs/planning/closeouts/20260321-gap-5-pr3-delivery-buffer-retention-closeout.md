---
title: Gap 5 PR3 — Delivery Buffer Retention Closeout
date: 2026-03-21
author: Architecture
planning_type: closeout
parent_plan: gap-5-pr3-delivery-buffer-retention-20260319
branch: feat/g5-pr3-delivery-buffer-retention
---

# Gap 5 PR3 — Delivery Buffer Retention Closeout

## Summary

This closeout records the completion of all G5-PR3 deliverables: explicit purge jobs for the three non-authoritative delivery buffers, configurable retention windows, batch-capped coordinator, and full observability via six metrics.

All G5-PR3 acceptance conditions are met. G5-PR4 (redaction ADR follow-up) is now unblocked.

---

## Deliverables Completed

### 1. DB Migration 009 — `@dvt/adapter-postgres`

**File**: `packages/@dvt/adapter-postgres/migrations/009_delivery_buffer_purge_indexes.sql`

Adds partial indexes to support efficient range-based purge DELETE scans:

- `outbox_delivered_at_idx` — `outbox(delivered_at) WHERE delivered_at IS NOT NULL`
- `outbox_dead_letter_dead_lettered_at_idx` — `outbox_dead_letter(dead_lettered_at)`
- `lineage_dead_letter_dead_lettered_at_idx` — `lineage_dead_letter(dead_lettered_at)`

---

### 2. `deliveryBufferRuntime.ts` contracts — `@dvt/state-store`

**File**: `packages/@dvt/state-store/src/lifecycle/deliveryBufferRuntime.ts`

New contracts:

- `DeliveryBufferRetentionPolicy` — `deliveredOutboxRetentionDays`, `outboxDeadLetterRetentionDays`, `lineageDeadLetterRetentionDays`, `maxRowsPerRun`
- `DEFAULT_DELIVERY_BUFFER_RETENTION` — `{ 7, 30, 30, 5000 }`
- `BufferPurgeResult` — `purgedDeliveredOutbox`, `purgedOutboxDeadLetter`, `purgedLineageDeadLetter`
- `IDeliveryBufferPurgeStore` — `purgeDeliveredOutbox`, `purgeOutboxDeadLetter`, `purgeLineageDeadLetter`, `countDeliveredOutbox`, `countOutboxDeadLetter`, `countLineageDeadLetter`
- `DeliveryBufferPurgeTelemetry` — metrics (`addCounter`, `recordHistogram`) + logger
- `subtractDaysFromIso(nowIso, days)` — exported date helper

Note: `lineage_outbox` rows are hard-deleted on delivery (`markDelivered` does DELETE). There are no "delivered but retained" lineage outbox rows — no purge is required for that table.

---

### 3. `DeliveryBufferPurger` coordinator — `@dvt/state-store`

**File**: `packages/@dvt/state-store/src/lifecycle/DeliveryBufferPurger.ts`

Single-method coordinator:

**`purge(policy)`** — fail-soft per buffer:

1. Validates policy (all retention days >= 1, maxRowsPerRun >= 1)
2. Counts delivered outbox rows → emits `dvt.outbox.retained_rows` histogram
3. Purges delivered outbox (cutoff = now − deliveredOutboxRetentionDays) → emits `dvt.outbox.purged_rows_total`
4. On error: emits `dvt.outbox.purge_failures_total`, logs error, continues
5. Counts combined DL rows → emits `dvt.dead_letter.retained_rows` histogram
6. Purges outbox dead-letter → emits `dvt.dead_letter.purged_rows_total`
7. Purges lineage dead-letter → emits `dvt.dead_letter.purged_rows_total`
8. On any DL error: emits `dvt.dead_letter.purge_failures_total`, logs error, continues

Count failures are swallowed (best-effort) and never abort the purge pass.
No lease required — DELETE is idempotent and safe to run concurrently.

---

### 4. `PostgresDeliveryBufferPurgeStore` — `@dvt/adapter-postgres`

**File**: `packages/@dvt/adapter-postgres/src/PostgresDeliveryBufferPurgeStore.ts`

Implements `IDeliveryBufferPurgeStore`:

- **`purgeDeliveredOutbox`** — CTE: `SELECT id ... WHERE delivered_at IS NOT NULL AND delivered_at < $1 LIMIT $2` → `DELETE WHERE id IN (to_delete)`
- **`purgeOutboxDeadLetter`** — CTE: `SELECT id ... WHERE dead_lettered_at < $1 LIMIT $2` → `DELETE WHERE id IN (to_delete)`
- **`purgeLineageDeadLetter`** — same pattern for `lineage_dead_letter`
- **`countDeliveredOutbox`** — `SELECT COUNT(*) WHERE delivered_at IS NOT NULL`
- **`countOutboxDeadLetter`** — `SELECT COUNT(*) FROM outbox_dead_letter`
- **`countLineageDeadLetter`** — `SELECT COUNT(*) FROM lineage_dead_letter`

All counts cast to `::text` to avoid JS BigInt precision issues.

Exported from `@dvt/adapter-postgres` index.

---

### 5. Public API updates

- `packages/@dvt/state-store/src/index.ts` — exports all new types, constants, helper, and `DeliveryBufferPurger`
- `packages/@dvt/adapter-postgres/src/index.ts` — exports `PostgresDeliveryBufferPurgeStore`

---

## Test Coverage

**Package**: `@dvt/state-store` — 92 tests across 9 test files (all green, +17 from PR3).

| Test file                      | Tests | Coverage focus                                                                                                                                                                                                             |
| ------------------------------ | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DeliveryBufferPurger.test.ts` | 17    | `subtractDaysFromIso`, empty buffers, cutoff calculation, row counts, metrics (purged_rows_total, retained_rows, failures), fail-soft (each buffer independent), count errors swallowed, policy validation (4 error codes) |

---

## Metrics Delivered

| Metric                                 | Emitted by                                                                 |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `dvt.outbox.retained_rows`             | `DeliveryBufferPurger.purge` (before purge, histogram)                     |
| `dvt.outbox.purged_rows_total`         | `DeliveryBufferPurger.purge` (when > 0 rows deleted)                       |
| `dvt.outbox.purge_failures_total`      | `DeliveryBufferPurger.purge` (on store error)                              |
| `dvt.dead_letter.retained_rows`        | `DeliveryBufferPurger.purge` (combined outbox+lineage DL count, histogram) |
| `dvt.dead_letter.purged_rows_total`    | `DeliveryBufferPurger.purge` (both DL tables, cumulative)                  |
| `dvt.dead_letter.purge_failures_total` | `DeliveryBufferPurger.purge` (per DL table error)                          |

---

## Acceptance Conditions — Verified

| Condition                                               | Verified                                                                                                 |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Delivered outbox rows purged by policy                  | ✅ `purgeDeliveredOutbox(cutoff, limit)` — `delivered_at IS NOT NULL AND delivered_at < cutoff`          |
| Dead-letter rows purged by policy                       | ✅ `purgeOutboxDeadLetter` + `purgeLineageDeadLetter` — age-based with configurable retention            |
| Lineage buffers follow the same explicit lifecycle rule | ✅ `purgeLineageDeadLetter`; `lineage_outbox` already uses hard-delete on delivery (no retained rows)    |
| Purge jobs are batch-based and repeatable               | ✅ `maxRowsPerRun` cap on every call; CTE-based DELETE is idempotent                                     |
| Metrics expose retained rows and purge failures         | ✅ `dvt.outbox.retained_rows`, `dvt.dead_letter.retained_rows` (histograms); failure counters per buffer |
| Purge never touches authoritative `run_events`          | ✅ `PostgresDeliveryBufferPurgeStore` only touches `outbox`, `outbox_dead_letter`, `lineage_dead_letter` |

---

## Out of Scope (Deferred to PR4)

- Redaction implementation → PR4
- Investigation hold semantics for dead-letter rows (no hold mechanism exists in current schema)
