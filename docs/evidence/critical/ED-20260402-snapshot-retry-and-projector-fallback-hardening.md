---
title: Snapshot retry error persistence and projector fallback polling hardening
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

This slice hardens snapshot retry semantics in the PostgreSQL adapter and
reduces unnecessary fallback polling in the projector worker runtime.

## What changed

- `failSnapshotWork` now records normalized `last_error` text in
  `snapshot_work_queue`, keeping retry failures observable.
- Snapshot work completion query now avoids queue reset when a stale queue row
  has already been logically superseded by snapshot state.
- `ProjectorWorkerRuntime` now validates `batchSize` and
  `fallbackPollEveryTicks` at construction.
- Queue mode fallback polling is throttled by tick cadence instead of running
  on every tick.
- Delivery and adapter tests cover the new error payload behavior, retry delay
  validation, and fallback polling cadence.

## Validation

- `pnpm --filter @dvt/adapter-postgres test` passed.
- `pnpm --filter @dvt/delivery test` passed.
- `pnpm verify:prepush` passed.
