---
title: Tenant-aware outbox shard assignment
status: Accepted
date: 2026-05-09
owners:
  - packages/@dvt/delivery
  - packages/@dvt/engine
  - packages/@dvt/adapter-postgres
  - apps/outbox-worker
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/delivery/src/outboxShardAssignment.ts
  - packages/@dvt/delivery/src/testing/InMemoryOutboxStorage.ts
  - packages/@dvt/delivery/test/OutboxShardAssignment.architecture.test.ts
  - packages/@dvt/engine/src/state/outboxSharding.ts
  - packages/@dvt/engine/src/state/InMemoryOutboxState.ts
  - packages/@dvt/adapter-postgres/src/PostgresOutboxStore.ts
  - apps/outbox-worker/test/sharding/concurrentWorkerOrdering.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/delivery test
    - pnpm --filter @dvt/engine test -- test/state/InMemoryTxStore.outbox.test.ts
    - pnpm --filter @dvt/adapter-postgres test -- PostgresStateStoreAdapter.sharding.test.ts
    - pnpm --filter dvt-outbox-worker test -- test/sharding/concurrentWorkerOrdering.test.ts
    - pnpm --filter @dvt/delivery typecheck
    - pnpm --filter @dvt/engine typecheck
    - pnpm --filter @dvt/adapter-postgres typecheck
    - pnpm --filter dvt-outbox-worker typecheck
    - pnpm docs:feature-mechanization:implementation
    - pnpm verify:prepush
---

## Summary

AR-D7 changes new outbox row shard assignment from run-only hashing to a
Delivery-owned tenant-affine policy. A high-volume tenant now remains bounded to
one shard for a given shard-count topology instead of spreading across all
shared worker shards through many run identifiers.

Existing rows keep their persisted `shard_id`. The rollout keeps shard-count
changes as a separate topology migration.

## What Changed

- Added `OutboxShardAssignmentKey`, `resolveOutboxShardId`, and
  `buildOutboxStreamOrderingKey` in `@dvt/delivery`.
- Updated delivery and engine in-memory outbox storage to use the shared policy
  and to scope head-of-line/dead-letter blocking by `(tenantId, runId)`.
- Updated PostgreSQL enqueue SQL to compute `shard_id` from length-prefixed
  `tenant_id` instead of `run_id`.
- Updated outbox-worker sharding tests, ADR-0033, the G5 outbox runbook, and
  the component guide/user stories.

## Follow-Up: Engine Facade Encapsulation

The post-merge review tightened the Engine compatibility boundary. Engine's
`outboxSharding.ts` now exposes named facade functions with an owned-concern
docblock instead of a raw `@dvt/delivery` re-export. The facade delegates to the
Delivery-owned policy and keeps Engine's in-memory state vocabulary local.

`OutboxShardAssignment.architecture.test.ts` now guards that boundary by
requiring explicit facade functions, Delivery delegation, no raw barrel export,
and no local hash implementation.

## Architectural Intent

The shard assignment policy is now a Delivery value object rather than a
duplicated primitive helper. Engine test state delegates to delivery, and the
PostgreSQL adapter implements the same tenant-affine expression at enqueue.

The selected policy is tenant-affine, not tenant-plus-run. This is intentional:
the goal is to prevent one noisy tenant from occupying every shared worker
shard by generating many runs.

## Validation Run For This Slice

- `pnpm --filter @dvt/delivery test` passed: 9 files, 53 tests.
- `pnpm --filter @dvt/engine test -- test/state/InMemoryTxStore.outbox.test.ts`
  passed: 1 file, 9 tests.
- `pnpm --filter @dvt/adapter-postgres test -- PostgresStateStoreAdapter.sharding.test.ts`
  passed: 1 file, 17 tests.
- `pnpm --filter dvt-outbox-worker test -- test/sharding/concurrentWorkerOrdering.test.ts`
  passed: 1 file, 6 tests.
- Typecheck passed for `@dvt/delivery`, `@dvt/engine`,
  `@dvt/adapter-postgres`, and `dvt-outbox-worker`.
- `pnpm docs:feature-mechanization:implementation` passed.
