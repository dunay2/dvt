---
title: Gap 5 PR1 Minimal Usable Archival
status: Review
owner: Architecture
last_reviewed: 2026-03-19
planning_type: proposal
---

# Gap 5 PR1 Minimal Usable Archival

## Goal

Deliver the first production-usable archival slice for Gap 5.

This PR must already:

- export real hot archive units
- register them in a catalog
- pin terminal snapshots
- verify exported manifests
- avoid deleting hot data yet

## Machine Coordination Header

```yaml
parent_plan: gap-5-event-lifecycle-and-archival-design-20260319
pr_split_id: G5-PR1
scope_type: executable_slice
depends_on: []
blocks:
  - G5-PR2
  - G5-PR3
```

## In Scope

- `tenant_bucket + persisted_at_day` archive-unit model
- lifecycle catalog tables
- archive batch tables
- object storage exporter
- manifest and rolling-hash generation
- asynchronous verification
- terminal snapshot pinning
- metrics and structured logs

## Out Of Scope

- physical deletion of hot archive units
- restore tooling
- outbox and dead-letter cleanup
- redaction implementation

## Deliverables

1. Archive unit schema and lifecycle catalog.
2. Exporter that writes object plus manifest.
3. Verifier that marks archive units `VERIFIED`.
4. Terminal snapshot pinning for archived runs.
5. Observability baseline for export and verification.

## Technical Minimum Spec

### Archive unit rule

- `archive_unit = (tenant_bucket, persisted_at_day)`
- `tenant_bucket = crc32(tenant_id) % archive_bucket_count`
- archive unit state machine at minimum:
  - `LIVE`
  - `ELIGIBLE`
  - `EXPORTED`
  - `VERIFY_FAILED`
  - `VERIFIED`

### Minimum catalog tables

Suggested minimum:

- `run_event_archive_units`
  - `archive_unit_key`
  - `tenant_bucket`
  - `persisted_at_day`
  - `state`
  - `tenant_count`
  - `row_count`
  - `min_run_seq`
  - `max_run_seq`
  - `object_key`
  - `checksum_sha256`
  - `exported_at`
  - `verified_at`
- `run_event_archive_batches`
  - `batch_id`
  - `archive_unit_key`
  - `started_at`
  - `completed_at`
  - `status`
  - `error`

### Manifest minimum shape

```json
{
  "archiveUnitKey": "tb07_2026_03_19",
  "tenantBucket": "tb07",
  "tenantIds": ["tenant-a", "tenant-b"],
  "rowCount": 12345,
  "minRunSeq": 1,
  "maxRunSeq": 987,
  "checksumSha256": "abc123",
  "exportedAt": "2026-03-19T12:00:00.000Z"
}
```

### Terminal snapshot rule

- generated from the hot ordered event stream before unit becomes `VERIFIED`
- must include `lastRunSeq` and `eventChecksumSha256`
- only terminal runs are snapshotted in this PR

### Metrics minimum set

- `dvt.archive.units_eligible_total`
- `dvt.archive.units_exported_total`
- `dvt.archive.units_verified_total`
- `dvt.archive.export_duration_ms`
- `dvt.archive.export_failures_total`
- `dvt.archive.verify_failures_total`

## Acceptance Conditions

- archive unit can be exported and cataloged
- manifest includes tenant set, row count, min/max `run_seq`, and checksum
- verifier marks good export units `VERIFIED`
- old terminal runs remain readable through pinned snapshots
- no hot archive unit is dropped in this PR
- archive export preserves ordered `run_seq`
- verification SLA target is defined and observable

## Checklist

| Item                                  | Status | Notes                                                                                       |
| ------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| Archive unit schema defined           | done   | delivered in `main`                                                                         |
| Catalog tables defined                | done   | delivered in `main`                                                                         |
| Exporter implemented                  | done   | `ObjectStorageRunArchiveExporter` + `FileSystemArchiveObjectStore` / `S3ArchiveObjectStore` |
| Manifest generated                    | done   | delivered in `main`                                                                         |
| Async verifier implemented            | done   | `RunArchiveVerifier` + verify path in exporter                                              |
| Terminal snapshot pinning implemented | done   | delivered in `main`, wired through `RunArchiveCoordinator`                                  |
| Metrics emitted                       | done   | all 6 metrics wired in coordinator and verifier                                             |
| `PostgresRunArchiveStore` implemented | done   | full Postgres adapter, exported from `@dvt/adapter-postgres`                                |
| Tests written                         | done   | 54 unit tests across 6 test files in `@dvt/state-store`                                     |
| Docs and evidence updated             | done   | closeout `20260321-gap-5-pr1-export-verifier-closeout.md`                                   |

## PR Resolution Table

| PR ID    | Planned status | Actual PR | Resolution | Notes                                                          |
| -------- | -------------- | --------- | ---------- | -------------------------------------------------------------- |
| `G5-PR1` | proposed       | pending   | closed     | minimal usable archival — all deliverables complete 2026-03-21 |
