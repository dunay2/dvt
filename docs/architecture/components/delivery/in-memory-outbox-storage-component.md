---
title: In-Memory Outbox Storage Component
status: Active
owner: Architecture / Delivery / Engine
last_reviewed: 2026-05-14
---

# In-Memory Outbox Storage Component

## Owned Concern

The in-memory outbox storage component owns Delivery's local/test implementation
of `IOutboxStorage` claim, retry, dead-letter, replay, shard, and tenant/run
ordering semantics.

It does not own durable PostgreSQL persistence, event publication, worker
process lifecycle, engine run-state transitions, or API admission.

## Public API

| API                                  | Owner                   | Purpose                                                                                 |
| ------------------------------------ | ----------------------- | --------------------------------------------------------------------------------------- |
| `InMemoryOutboxStorageCore`          | `@dvt/delivery/testing` | Reusable in-memory implementation of the Delivery-owned `IOutboxStorage` state machine. |
| `InMemoryOutboxStorage`              | `@dvt/delivery/testing` | Delivery testing/local facade that preserves the existing public testing API.           |
| `InMemoryOutboxState`                | `@dvt/engine`           | Engine state-store adapter facade that delegates to the Delivery-owned core.            |
| `IOutboxStorage.enqueueTx`           | Delivery port           | Adds persisted event envelopes to the outbox state machine.                             |
| `IOutboxStorage.listPendingForClaim` | Delivery port           | Returns claim-eligible records for the caller's owned shards.                           |
| `IOutboxStorage.markFailed`          | Delivery port           | Applies retry backoff or moves a record to dead letters.                                |
| `IOutboxStorage.replayDeadLetters`   | Delivery port           | Restores matching tenant-scoped dead letters to pending delivery.                       |

## Invariants

- Delivery owns the in-memory outbox state machine.
- Engine may keep an engine-local class name, but it must not implement retry,
  dead-letter, replay, claim ordering, shard assignment, or stream blocking
  semantics locally.
- Claim eligibility honors worker-owned shard ids when provided.
- A zero claim limit returns no records.
- Same `(tenantId, runId)` records are claimed by increasing `runSeq`.
- Retry backoff blocks only the stream head until `nextAttemptAt`.
- Dead-lettered stream heads block later records for the same `(tenantId,
runId)` until replay.
- Dead-letter listing and replay are tenant-scoped.
- Replay restores the original payload, clears failure state, resets attempts,
  and preserves the assigned shard id.
- Application runtime code depends on `IOutboxStorage`, not on the in-memory
  implementation.

## Transitions

```mermaid
stateDiagram-v2
    [*] --> Pending: enqueueTx
    Pending --> Claimed: listPendingForClaim
    Claimed --> Delivered: markDelivered
    Claimed --> Pending: markFailed schedules retry
    Claimed --> DeadLettered: attempts reach MAX_OUTBOX_ATTEMPTS
    DeadLettered --> Pending: replayDeadLetters tenant/run/id match
    Delivered --> [*]
```

## Component Relationships

```mermaid
flowchart LR
    Port["IOutboxStorage port"]
    Core["InMemoryOutboxStorageCore\nDelivery-owned state machine"]
    DeliveryFacade["InMemoryOutboxStorage\nDelivery testing facade"]
    EngineFacade["InMemoryOutboxState\nEngine adapter facade"]
    Worker["OutboxWorker / OutboxWorkerRuntime"]
    EngineTx["InMemoryTxStore"]
    Sharding["OutboxShardAssignment"]

    DeliveryFacade --> Core
    EngineFacade --> Core
    Core --> Sharding
    Core --> Port
    Worker --> Port
    EngineTx --> EngineFacade
```

## Consumers

- `packages/@dvt/delivery/test/**`
- `apps/outbox-worker/test/**`
- `packages/@dvt/engine/src/state/InMemoryTxStore.ts`
- `packages/@dvt/engine/test/state/InMemoryTxStore.outbox.test.ts`

## Architecture Guard

`packages/@dvt/delivery/test/OutboxInMemoryStorageOwnership.architecture.test.ts`
validates that:

- `InMemoryOutboxStorageCore` exists in Delivery;
- delivery and engine facades reference the core instead of local arrays and
  retry/dead-letter helpers;
- delivery worker runtime code depends on `IOutboxStorage`, not the in-memory
  test implementation.

<a id="section-in-memory-outbox-storage-user-stories"></a>

## In-Memory Outbox Storage User Stories

### Stories

| ID           | Story                                                                                                                                                              | Acceptance Criteria                                                                                                            | Evidence                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| AR-A7-US-001 | As a delivery maintainer, I need one in-memory outbox state machine so retry, dead-letter, replay, shard, and claim-ordering changes do not fork between packages. | `InMemoryOutboxStorageCore` owns the state machine and `InMemoryOutboxStorage` is a facade.                                    | `OutboxInMemoryStorageOwnership.architecture.test.ts`                                             |
| AR-A7-US-002 | As an engine maintainer, I need engine tests to keep their engine-local adapter name without owning delivery behavior.                                             | `InMemoryOutboxState` delegates to `InMemoryOutboxStorageCore` and does not carry pending/dead-letter arrays or retry helpers. | `OutboxInMemoryStorageOwnership.architecture.test.ts`, `InMemoryTxStore.outbox.test.ts`           |
| AR-A7-US-003 | As an operator, I need local and test outbox behavior to preserve tenant/run isolation and replay safety.                                                          | Claim ordering, retry backoff, dead-letter listing, and replay keep current behavior after extraction.                         | `OutboxWorker.retry.test.ts`, `OutboxWorker.deadLetter.test.ts`, `InMemoryTxStore.outbox.test.ts` |
| AR-A7-US-004 | As an architect, I need runtime orchestration to depend on a port rather than concrete test storage.                                                               | `OutboxWorkerRuntime` and `OutboxWorker` reference `IOutboxStorage` and do not import the in-memory implementation.            | `OutboxInMemoryStorageOwnership.architecture.test.ts`                                             |

> Acceptance scope status: Active. Owner: Architecture / Delivery / Engine.
