---
title: ADR-0037 - Run Event Lifecycle Archival, Verification, and Restore Model
status: Accepted
owner: Architecture / State / Operations
last_reviewed: 2026-03-19
---

# ADR-0037 - Run Event Lifecycle Archival, Verification, and Restore Model

## Status

Accepted.

## Context

DVT already treats `run_events` as the authoritative append-only write log under
[ADR-0004](ADR-0004-event-sourcing-strategy.md).

That creates a long-term operational requirement:

- history must remain authoritative
- PostgreSQL hot storage must remain finite
- archival must not leak storage-management concerns into engine semantics
- restore must remain possible for audit, forensics, and exceptional recovery

The Gap 5 proposal work also established that the repo does **not** want
Kafka-style compaction semantics for workflow-domain history.

## Decision

### 1. DVT archives domain history and does not compact it away

`run_events` remain authoritative event history.

DVT MUST:

- preserve full historical event sequences in cold storage
- keep replayability and forensic reconstruction possible
- avoid replacing terminal runs with a single compacted record

DVT MUST NOT:

- treat snapshots as the write-side authority
- normalize destructive compaction as the ordinary lifecycle path for
  `run_events`

### 2. The lifecycle model uses three tiers with a narrow `warm` role

The lifecycle model is:

- `hot`: authoritative active event history in PostgreSQL
- `warm`: pinned terminal snapshots plus archive catalog metadata
- `cold`: authoritative long-term copy of exported event history in object
  storage

`warm` MUST NOT become a second historical event store.

### 3. Lifecycle ownership lives outside engine core

Archive, verification, restore, and delete-after-grace are state-lifecycle
responsibilities, not engine responsibilities.

Therefore:

- engine core remains owner of run semantics and event production
- lifecycle orchestration belongs in the state boundary behind explicit ports

This keeps the architecture aligned with
[ADR-0031](ADR-0031-adapter-tenant-isolation.md) and
[ADR-0034](ADR-0034-bounded-context-boundaries-and-communication-rules.md).

### 4. Archive units are scoped by `tenant_bucket + persisted_at_day`

The physical lifecycle unit is:

`archive_unit = (tenant_bucket, persisted_at_day)`

`tenant_bucket` is derived deterministically:

`tenant_bucket = crc32(tenant_id) % archive_bucket_count`

Rules:

- `archive_bucket_count` is environment-configurable
- delete eligibility for one archive unit is computed from the most restrictive
  tenant retention inside that unit
- catalog state MUST retain the tenant set contained in the archive unit

### 5. Export and verification are explicit state transitions

Archive units move through these states:

- `LIVE`
- `ELIGIBLE`
- `EXPORTED`
- `VERIFY_FAILED`
- `VERIFIED`
- `DELETE_ELIGIBLE`
- `DROPPED_FROM_HOT`

Rules:

- export preserves `run_seq` ordering
- export writes a manifest containing tenant set, row count, sequence bounds,
  checksum, and archive object identity
- verification is asynchronous
- units in `VERIFY_FAILED` MUST NOT be auto-deleted

### 6. Deletion from hot storage is deferred

Deletion from hot storage MUST follow this sequence:

1. export
2. verify
3. mark delete-eligible
4. wait grace window
5. drop hot archive unit

The default grace model exists to protect against silent export defects and
operator error.

### 7. Restore is explicit, exceptional, and audited

Restore is an administrative operation, not a normal hot-path query behavior.

Rules:

- restore is admin-only
- restore requests MUST be audited with requester identity and reason
- default target is a temporary schema or equivalent isolated target
- hot rehydrate is exceptional and requires explicit operator intent
- restore MUST NOT silently overwrite already-live hot data

### 8. Observability and leadership are mandatory

The lifecycle coordinator MUST be:

- idempotent
- leader-controlled or fence-controlled
- stateful through persisted catalog rows
- observable through metrics and logs from the first usable slice

## Consequences

### Positive

- Preserves DVT event-sourcing discipline while bounding hot PostgreSQL growth.
- Keeps restore and audit paths available after hot data ages out.
- Keeps engine semantics decoupled from object-storage and partition operations.
- Aligns DVT with proven patterns seen in Temporal, Confluent tiered storage,
  Marten hot/cold archiving, and EventStoreDB's caution around destructive
  history cleanup.

### Negative

- Requires a dedicated lifecycle catalog, exporter, verifier, and restore path.
- Tenant-bucket partitioning introduces retention skew when mixed tenants share
  one archive unit.
- Verification and delete-after-grace add operational ceremony by design.

## Implementation Notes

The intended implementation rollout remains split across Gap 5 execution PRs:

- minimal archival
- deferred deletion and restore
- delivery-buffer retention
- redaction follow-up

This ADR governs the first two directly and constrains the fourth.

## Related

- [ADR-0004-event-sourcing-strategy.md](ADR-0004-event-sourcing-strategy.md)
- [ADR-0008_Signal_Idempotency.md](ADR-0008_Signal_Idempotency.md)
- [ADR-0031-adapter-tenant-isolation.md](ADR-0031-adapter-tenant-isolation.md)
- [ADR-0034-bounded-context-boundaries-and-communication-rules.md](ADR-0034-bounded-context-boundaries-and-communication-rules.md)
- [gap-5-event-lifecycle-and-archival-design-20260319.md](../planning/archive/proposals/gap-5-event-lifecycle-and-archival-design-20260319.md)
