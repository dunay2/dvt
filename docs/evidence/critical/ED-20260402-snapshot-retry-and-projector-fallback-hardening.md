---
title: Documentary traceability for snapshot ownership and fallback polling posture
status: Accepted
date: 2026-04-02
owners:
  - packages/@dvt/adapter-postgres
  - packages/@dvt/delivery
arc_level: ARC-2
breaking: false
evidence_class: critical
code_refs:
  - packages/@dvt/adapter-postgres/src/PostgresSnapshotWorkQueue.ts
  - packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts
  - packages/@dvt/adapter-postgres/src/PostgresStateStoreRuntime.ts
  - packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.sharding.test.ts
  - packages/@dvt/delivery/src/application/ProjectorWorkerRuntime.ts
  - packages/@dvt/delivery/test/ProjectorWorkerRuntime.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm --filter @dvt/delivery test
    - pnpm verify:prepush
---

## Summary

This PR is documentary. It records ARC-2 traceability and risk posture for
snapshot-work ownership and projector fallback polling behavior that is already
present in the effective `main` code path for this review cycle.

## What changed

- Added/updated governance evidence describing claim-ownership guard semantics
  and fallback polling cadence expectations.
- Added/updated risk register entry to track operator-observability and review
  posture for this area.
- No net functional behavior change is introduced by this PR's effective diff
  against `main`.

## Validation

- `pnpm --filter @dvt/adapter-postgres test` passed.
- `pnpm --filter @dvt/delivery test` passed.
- `pnpm verify:prepush` passed.
