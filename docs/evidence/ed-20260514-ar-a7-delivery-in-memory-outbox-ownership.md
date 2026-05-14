---
title: AR-A7 delivery-owned in-memory outbox storage
status: Accepted
date: 2026-05-14
owners:
  - packages/@dvt/delivery
  - packages/@dvt/engine
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/delivery/src/testing/InMemoryOutboxStorageCore.ts
  - packages/@dvt/delivery/src/testing/InMemoryOutboxStorage.ts
  - packages/@dvt/delivery/src/testing.ts
  - packages/@dvt/delivery/test/OutboxInMemoryStorageOwnership.architecture.test.ts
  - packages/@dvt/engine/src/state/InMemoryOutboxState.ts
evidence:
  tests:
    - pnpm exec vitest run packages/@dvt/delivery/test/OutboxInMemoryStorageOwnership.architecture.test.ts
    - pnpm exec vitest run packages/@dvt/delivery/test/OutboxInMemoryStorageOwnership.architecture.test.ts packages/@dvt/delivery/test/OutboxWorker.retry.test.ts packages/@dvt/delivery/test/OutboxWorker.deadLetter.test.ts packages/@dvt/engine/test/state/InMemoryTxStore.outbox.test.ts
    - pnpm docs:feature-mechanization -- --feature AR-A7-DELIVERY-DOMAIN-RUNTIME-SPLIT
---

## Summary

AR-A7 removes duplicated in-memory outbox state-machine semantics from Engine.
Delivery now owns `InMemoryOutboxStorageCore`; Delivery testing storage and
Engine in-memory state are facades over that core.

## What Changed

- Added a Delivery-owned `InMemoryOutboxStorageCore`.
- Converted `InMemoryOutboxStorage` into a Delivery testing facade.
- Converted `InMemoryOutboxState` into an Engine adapter facade.
- Added a semantic architecture guard that prevents Engine from reintroducing
  retry, dead-letter, replay, and claim-ordering internals.
- Added component docs, user stories, and Fowler planning material.

## Validation Recorded So Far

- Red test observed:
  `pnpm exec vitest run packages/@dvt/delivery/test/OutboxInMemoryStorageOwnership.architecture.test.ts`
  failed because `InMemoryOutboxStorageCore` did not exist.
- Green targeted test:
  `pnpm exec vitest run packages/@dvt/delivery/test/OutboxInMemoryStorageOwnership.architecture.test.ts packages/@dvt/delivery/test/OutboxWorker.retry.test.ts packages/@dvt/delivery/test/OutboxWorker.deadLetter.test.ts packages/@dvt/engine/test/state/InMemoryTxStore.outbox.test.ts`
  passed after building `@dvt/delivery`.
- Feature mechanization:
  `pnpm docs:feature-mechanization -- --feature AR-A7-DELIVERY-DOMAIN-RUNTIME-SPLIT`
  passed.
