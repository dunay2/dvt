---
title: Gap 5 PR1 — Archive Export and Verifier Closeout
date: 2026-03-21
last_reviewed: 2026-03-21
author: Architecture
planning_type: closeout
parent_plan: gap-5-pr1-minimal-usable-archival-20260319
branch: feat/g5-pr1-archive-export-verifier
---

# Gap 5 PR1 — Archive Export and Verifier Closeout

## Summary

This closeout records the completion of the exporter, verifier, Postgres adapter, and test coverage deliverables for G5-PR1. The foundational contracts, artifacts, migrations, and terminal snapshot pinning were delivered previously (see `20260319-gap-5-pr1-archive-artifact-contracts-closeout.md` and `20260320-gap-5-pr1-terminal-snapshot-pinning-closeout.md`).

All G5-PR1 acceptance conditions are now met.

---

## Deliverables Completed

### 1. `ObjectStorageRunArchiveExporter` — `@dvt/state-store`

**File**: `packages/@dvt/state-store/src/lifecycle/ObjectStorageRunArchiveExporter.ts`

Implements `IRunArchiveExporter`. Writes three objects per archive unit:

- `{prefix}/{archiveUnitKey}/events.jsonl` — NDJSON canonical events sorted by `(tenantId, runId, runSeq, eventType)`
- `{prefix}/{archiveUnitKey}/manifest.json` — JCS-canonicalized manifest (see `buildArchiveUnitManifest`)
- `{prefix}/{archiveUnitKey}/checksum.sha256` — SHA-256 of the canonical manifest JSON

The `verifyArchiveUnit` method:

1. Asserts all three objects exist.
2. Verifies the checksum file matches `sha256(manifest)`.
3. Re-builds the manifest from events and asserts deterministic equality with the stored manifest.
4. Validates `archiveUnitKey`, `tenantBucket`, `objectKey`, `rowCount`, and `checksumSha256` against caller expectations.

Error codes thrown: `ARCHIVE_VERIFICATION_OBJECTS_MISSING`, `ARCHIVE_MANIFEST_CHECKSUM_MISMATCH`, `ARCHIVE_MANIFEST_UNIT_KEY_MISMATCH`, `ARCHIVE_MANIFEST_TENANT_BUCKET_MISMATCH`, `ARCHIVE_MANIFEST_OBJECT_KEY_MISMATCH`, `ARCHIVE_MANIFEST_ROW_COUNT_MISMATCH`, `ARCHIVE_MANIFEST_EVENT_CHECKSUM_MISMATCH`, `ARCHIVE_REBUILT_ROW_COUNT_MISMATCH`, `ARCHIVE_REBUILT_EVENT_CHECKSUM_MISMATCH`, `ARCHIVE_REBUILT_MANIFEST_MISMATCH`.

`destinationKind` is inferred from the object store's constructor name (`S3` → `'s3'`, otherwise `'file'`).

### 2. Object Store Adapters — `@dvt/state-store`

**Files**:

- `packages/@dvt/state-store/src/lifecycle/adapters/FileSystemArchiveObjectStore.ts` — dev/test only (blocked in `NODE_ENV=production`). Uses `node:fs/promises`.
- `packages/@dvt/state-store/src/lifecycle/adapters/S3ArchiveObjectStore.ts` — production adapter via `@aws-sdk/client-s3` (`PutObjectCommand`, `GetObjectCommand`, `HeadObjectCommand`).

### 3. `RunArchiveCoordinator` — `@dvt/state-store`

**File**: `packages/@dvt/state-store/src/lifecycle/RunArchiveCoordinator.ts`

Orchestrates the export loop:

```
listEligibleArchiveUnits → for each unit:
  startArchiveBatch
  loadArchiveUnitEvents
  exportArchiveUnit
  [if pinTerminalSnapshots] listTerminalSnapshotsForArchiveUnit → buildArchivedSnapshotsForUnit → pinTerminalSnapshot
  markArchiveBatchExported
  emit: units_eligible_total, units_exported_total, export_duration_ms
  on error: markArchiveBatchFailed, emit: export_failures_total
```

Fail-soft per unit — one unit's export failure does not abort the remaining batch.

### 4. `RunArchiveVerifier` — `@dvt/state-store`

**File**: `packages/@dvt/state-store/src/lifecycle/RunArchiveVerifier.ts`

Orchestrates the verification loop:

```
listArchiveUnitsPendingVerification(limit) → for each unit:
  exporter.verifyArchiveUnit
  markArchiveBatchVerified → emit: units_verified_total
  on error: markArchiveBatchVerifyFailed, emit: verify_failures_total
```

### 5. `archiveRuntime.ts` contracts and helpers — `@dvt/state-store`

**File**: `packages/@dvt/state-store/src/lifecycle/archiveRuntime.ts`

Defines:

- `IRunArchiveStore` (extends `TerminalSnapshotPinStore`)
- `IRunArchiveExporter`
- `IArchiveObjectStore`
- `RunEventRetentionPolicy`
- All batch/unit record types
- `ArchiveLifecycleMetrics`, `ArchiveLifecycleLogger`, `ArchiveLifecycleTelemetry`
- `createNoopArchiveLifecycleTelemetry()`
- `toArchiveFailureMessage(error)`
- `buildArchivedSnapshotsForUnit(params)` — groups events by run, calls `buildPinnedTerminalSnapshot` and `buildArchivedTerminalSnapshot` per candidate

### 6. `PostgresRunArchiveStore` — `@dvt/adapter-postgres`

**File**: `packages/@dvt/adapter-postgres/src/PostgresRunArchiveStore.ts`

Full Postgres implementation of `IRunArchiveStore`. Key behaviors:

- `listEligibleArchiveUnits`: groups `run_events` by `(tenant_bucket, persisted_at_day)`, filters to units where all runs are terminal, upserts `run_event_archive_units` state to `ELIGIBLE`, skips units already in `EXPORTED / VERIFY_FAILED / VERIFIED / DELETE_ELIGIBLE / DROPPED_FROM_HOT`.
- `loadArchiveUnitEvents`: queries `run_events` filtered by day and tenant ids.
- `listTerminalSnapshotsForArchiveUnit`: joins `run_events` ↔ `run_snapshots` for terminal statuses.
- `markArchiveBatchExported`: updates unit state to `EXPORTED` + batch to `EXPORTED`.
- `markArchiveBatchFailed`: resets unit state to `ELIGIBLE` + batch to `FAILED` (allows retry).
- `markArchiveBatchVerified`: sets `VERIFIED` + `verified_at` on unit and batch.
- `markArchiveBatchVerifyFailed`: sets `VERIFY_FAILED` on unit and batch.
- `listArchiveUnitsPendingVerification`: `DISTINCT ON` query ordered by latest batch, joins units with batches in `EXPORTED / VERIFY_FAILED` state.
- Delegates `pinTerminalSnapshot` / `getPinnedTerminalSnapshot` to an injected `TerminalSnapshotPinStore`.

**Exported from**: `packages/@dvt/adapter-postgres/src/index.ts`.

### 7. `@dvt/state-store` package.json — Added `@aws-sdk/client-s3` dependency

Version `^3.868.0`, matching `@dvt/artifacts`.

### 8. `@dvt/state-store` index.ts — Extended public API

All new types and implementations are exported from the package root.

---

## Test Coverage

**Package**: `@dvt/state-store` — 54 tests across 6 test files (all green).

| Test file                                 | Tests | Coverage focus                                                   |
| ----------------------------------------- | ----- | ---------------------------------------------------------------- |
| `archiveArtifacts.test.ts`                | 11    | Manifest, pinned/archived snapshot builders (pre-existing)       |
| `archiveLifecycle.test.ts`                | 7     | Key derivation, bucket assignment (pre-existing)                 |
| `archiveRuntime.test.ts`                  | 8     | `buildArchivedSnapshotsForUnit`, `toArchiveFailureMessage`       |
| `ObjectStorageRunArchiveExporter.test.ts` | 13    | Export happy path, determinism, verify happy path, 5 error paths |
| `RunArchiveCoordinator.test.ts`           | 13    | Export loop, pinning, fail-soft, metrics, error propagation      |
| `command-port.test.ts`                    | 2     | Pre-existing                                                     |

---

## Metrics Delivered

All 6 required metrics are emitted:

| Metric                              | Emitted by              |
| ----------------------------------- | ----------------------- |
| `dvt.archive.units_eligible_total`  | `RunArchiveCoordinator` |
| `dvt.archive.units_exported_total`  | `RunArchiveCoordinator` |
| `dvt.archive.export_duration_ms`    | `RunArchiveCoordinator` |
| `dvt.archive.export_failures_total` | `RunArchiveCoordinator` |
| `dvt.archive.units_verified_total`  | `RunArchiveVerifier`    |
| `dvt.archive.verify_failures_total` | `RunArchiveVerifier`    |

---

## Acceptance Conditions — Verified

| Condition                                                                | Verified                                                                            |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Archive unit can be exported and cataloged                               | ✅ `RunArchiveCoordinator` + `PostgresRunArchiveStore`                              |
| Manifest includes tenant set, row count, min/max `run_seq`, and checksum | ✅ `buildArchiveUnitManifest` + `ObjectStorageRunArchiveExporter`                   |
| Verifier marks good export units `VERIFIED`                              | ✅ `RunArchiveVerifier` + `markArchiveBatchVerified`                                |
| Old terminal runs readable through pinned snapshots                      | ✅ `buildArchivedSnapshotsForUnit` + `pinTerminalSnapshot`                          |
| No hot archive unit is dropped in this PR                                | ✅ No `DELETE` statements; unit state stops at `VERIFIED`                           |
| Archive export preserves ordered `run_seq`                               | ✅ `sortArchiveEvents` in exporter (tenant → runId → runSeq → eventType)            |
| Verification SLA target is defined and observable                        | ✅ `dvt.archive.verify_failures_total` + `dvt.archive.units_verified_total` metrics |

---

## Out of Scope (Deferred to PR2/PR3)

- Physical deletion of hot archive units (`DELETE_ELIGIBLE`, `DROPPED_FROM_HOT` states)
- Restore tooling
- Outbox and dead-letter retention policies
- Redaction implementation
