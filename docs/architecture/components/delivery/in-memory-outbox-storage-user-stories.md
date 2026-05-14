---
title: In-Memory Outbox Storage User Stories
status: Active
owner: Architecture / Delivery / Engine
last_reviewed: 2026-05-14
---

# In-Memory Outbox Storage User Stories

## Stories

| ID           | Story                                                                                                                                                              | Acceptance Criteria                                                                                                            | Evidence                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| AR-A7-US-001 | As a delivery maintainer, I need one in-memory outbox state machine so retry, dead-letter, replay, shard, and claim-ordering changes do not fork between packages. | `InMemoryOutboxStorageCore` owns the state machine and `InMemoryOutboxStorage` is a facade.                                    | `OutboxInMemoryStorageOwnership.architecture.test.ts`                                             |
| AR-A7-US-002 | As an engine maintainer, I need engine tests to keep their engine-local adapter name without owning delivery behavior.                                             | `InMemoryOutboxState` delegates to `InMemoryOutboxStorageCore` and does not carry pending/dead-letter arrays or retry helpers. | `OutboxInMemoryStorageOwnership.architecture.test.ts`, `InMemoryTxStore.outbox.test.ts`           |
| AR-A7-US-003 | As an operator, I need local and test outbox behavior to preserve tenant/run isolation and replay safety.                                                          | Claim ordering, retry backoff, dead-letter listing, and replay keep current behavior after extraction.                         | `OutboxWorker.retry.test.ts`, `OutboxWorker.deadLetter.test.ts`, `InMemoryTxStore.outbox.test.ts` |
| AR-A7-US-004 | As an architect, I need runtime orchestration to depend on a port rather than concrete test storage.                                                               | `OutboxWorkerRuntime` and `OutboxWorker` reference `IOutboxStorage` and do not import the in-memory implementation.            | `OutboxInMemoryStorageOwnership.architecture.test.ts`                                             |
