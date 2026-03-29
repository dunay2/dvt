---
title: 20260329 - Run Event Retention - Fowler Hard QA Review
status: Review
owner: Architecture / Runtime / QA
last_reviewed: 2026-03-29
planning_type: review
---

# Fowler hard QA - retention and archive slice

Summary: hard Fowler-style critique of the `apps/outbox-worker` retention slice. Review scope covers DDD and SOLID, plus runtime risk and operational readiness.

## Errors detected

- No functional failures were found in the implemented retention path under current tests.
- No startup or shutdown wiring failures were found in the tested runtime scenarios.

Note: this is based on current code and tests. Large-scale performance and true end-to-end restore behavior still require dedicated validation.

## Compliance status

- No ADR or governance violations were detected in this slice.
- Delete and restore are not implemented in this iteration by explicit scope, not by non-compliance.

## Risk and mitigation

- I/O and load spikes:
  mitigation is configurable interval and batch policy; add rate limiting and low-load windows for production.
- Partial export or inconsistent state:
  mitigation is batch markers and checksum flow (`startArchiveBatch -> export -> markArchiveBatchExported`).
- Unsafe production file storage:
  mitigation is fail-fast env validation rejecting retention in production with file-backed archive.
- Data growth without delete:
  mitigation is next iteration deleter and growth alerts.
- Restore not automated:
  mitigation is designing and validating `RunArchiveRestorer`.
- Multi-worker coordination risk:
  mitigation is lease/fencing guarantees for delete/verify phases.
- Observability gap:
  mitigation is explicit archive metrics and alert thresholds.
- Storage security risk:
  mitigation is strict ACL/IAM and encryption for object storage.

## DDD and SOLID assessment

- DDD boundary is mostly correct: archive domain logic sits in `@dvt/state-store` and runtime wiring stays in outbox-worker.
- SRP improved after extracting retention wiring from `createOutboxWorkerRuntime`.
- Remaining concern: operational coupling between scheduler and database workload still needs load proof.

## Design improvements recommended

1. Configurable exporter target (S3/GCS/file) with explicit runtime policy.
2. Strong idempotent export semantics for retries and object key stability.
3. Mandatory archive metrics and alerts before broad production rollout.
4. Throttling/backpressure controls for heavy archive windows.
5. End-to-end restore test suite.
6. Safe deleter phase with lease and guard rails.
7. Partition strategy for `run_events` at scale.
8. Verify and lock `pg` abort-signal behavior in integration tests.
9. Security runbook for archive credentials and permissions.
10. Optional per-tenant retention policy controls.

## Priority actions

1. Add archive observability and production alerts.
2. Add restore end-to-end tests.
3. Implement deleter with lease-based safety.
4. Run load tests on realistic datasets.
5. Validate object storage exporter in staging.
6. Publish an operational runbook for archive/retry/restore flows.
