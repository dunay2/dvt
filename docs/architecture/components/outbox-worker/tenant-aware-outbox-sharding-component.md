---
title: Tenant-Aware Outbox Sharding Component
status: Active
owner: Architecture / Delivery / State Store
last_reviewed: 2026-05-09
---

# Tenant-Aware Outbox Sharding Component

## Owned Concern

Tenant-aware outbox sharding owns the policy that assigns new transactional
outbox rows to persisted `shard_id` values before worker claim selection.

It does not own event publication, retry backoff, dead-letter replay, worker
process startup, or PostgreSQL advisory-lock ownership. Those remain separate
delivery runtime and host concerns.

## Public API

| API                                                       | Owner                | Purpose                                                                                                     |
| --------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| `OutboxShardAssignmentKey`                                | `@dvt/delivery`      | Names the tenant/run identity used by the sharding policy.                                                  |
| `buildOutboxStreamOrderingKey(key)`                       | `@dvt/delivery`      | Builds the length-prefixed `(tenantId, runId)` stream key used by in-memory claim and dead-letter ordering. |
| `resolveOutboxShardId(key, shardCount)`                   | `@dvt/delivery`      | Pure query that returns the persisted shard id for a new outbox row.                                        |
| `IOutboxStorage.enqueueTx(runId, events)`                 | `@dvt/delivery` port | Adapter entrypoint that applies the policy when rows are persisted.                                         |
| `IOutboxStorage.listPendingForClaim(limit, { shardIds })` | `@dvt/delivery` port | Existing claim command boundary that filters by worker-owned shards.                                        |

## Invariants

- `tenantId` is mandatory for shard assignment.
- `shardCount` must be a positive integer.
- New rows are assigned by tenant-affine stable hash, not by run-only hash.
- Same tenant/run stream ordering is preserved by `(tenantId, runId, runSeq)`.
- In-memory ordering keys length-prefix tenant and run identifiers before
  joining them, so delimiter characters inside ids cannot merge streams.
- Dead-letter blocking is scoped to `(tenantId, runId)`.
- Existing rows keep their persisted `shard_id` until delivered, dead-lettered,
  or explicitly migrated.
- Workers claim only their configured shard ids.

## Transitions

```mermaid
stateDiagram-v2
    [*] --> EnqueueRequested
    EnqueueRequested --> ShardAssigned: AssignOutboxShard
    ShardAssigned --> Pending: insert outbox row
    Pending --> Claimed: ClaimOutboxBatch for owned shard
    Claimed --> Delivered: publish succeeds
    Claimed --> Pending: retry scheduled
    Pending --> DeadLettered: attempts exhausted
    DeadLettered --> Pending: tenant-scoped replay
    Delivered --> [*]
```

## Sequence

```mermaid
sequenceDiagram
    participant Engine as Engine write transaction
    participant Port as IOutboxStorage.enqueueTx
    participant Policy as OutboxShardAssignment
    participant Store as Outbox store
    participant Worker as Outbox worker

    Engine->>Port: enqueueTx(runId, events)
    Port->>Policy: resolveOutboxShardId({tenantId, runId}, shardCount)
    Policy-->>Port: shardId
    Port->>Store: persist tenant_id, run_id, shard_id, payload
    Worker->>Store: listPendingForClaim(limit, ownedShardIds)
    Store-->>Worker: eligible rows for owned shards
```

## Consumers

- `packages/@dvt/delivery/src/testing/InMemoryOutboxStorage.ts`
- `packages/@dvt/engine/src/state/InMemoryOutboxState.ts`
- `packages/@dvt/adapter-postgres/src/PostgresOutboxStore.ts`
- `apps/outbox-worker/src/host/runOutboxWorkerHost.ts` through existing
  `IOutboxStorage` wiring
- `apps/outbox-worker/test/sharding/concurrentWorkerOrdering.test.ts`

## Rollout And Migration

The policy changes assignment for new rows. Existing rows keep their stored
`shard_id`.

Recommended rollout:

1. Keep `DVT_OUTBOX_SHARD_COUNT` unchanged.
2. Drain the current outbox backlog as far as practical.
3. Deploy write-side code and workers with the same shard count.
4. Keep owned shard coverage complete across active workers.
5. Monitor per-shard lag and per-tenant lag during the mixed old/new window.
6. Rebalance `ownedShardIds` only at explicit restart boundaries.

Changing `shardCount` remains a separate topology migration.

## Architecture Guard

`OutboxShardAssignment.architecture.test.ts` validates that:

- delivery owns the policy;
- engine delegates rather than re-implements the hash;
- PostgreSQL enqueue SQL includes tenant-aware hash input;
- docs no longer describe run-only shard assignment as current behavior.
