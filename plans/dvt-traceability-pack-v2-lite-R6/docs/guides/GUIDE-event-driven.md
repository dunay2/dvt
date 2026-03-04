---
title: Guide — Event-Driven Architecture (Outbox, Idempotency, DLQ, Sagas)
status: Guide
tags: [eda, kafka, outbox, idempotency, eip]
---

# Event-Driven Architecture (Outbox, Idempotency, DLQ, Sagas)

Use this guide when changes affect:

- event log, outbox, Kafka/RabbitMQ topics
- ordering, idempotency, replay semantics
- consumers/projections/read models

## 1) Outbox pattern (baseline)

- Persist authoritative state change + outbox entry atomically
- Emit asynchronously
- Consumers must be idempotent

Reference:

- Transactional Outbox: https://microservices.io/patterns/data/transactional-outbox.html

## 2) Idempotency and dedup

- Every emitted event should carry an idempotency key
- Consumers dedup by (key, source) or (runId, seq) depending on domain rules
- Replays must be safe (no side effects without idempotency)

## 3) Ordering

- Define what is ordered (per run, per aggregate, per partition)
- Never assume global ordering unless enforced by design

## 4) DLQ / poison messages

- Define DLQ strategy: when to dead-letter, retry policy, alerting
- Poison message patterns: isolate and inspect; avoid blocking the whole stream

EIP catalog:

- https://www.enterpriseintegrationpatterns.com/

## 5) Sagas / compensation (only if needed)

If you have multi-step processes that require rollback/compensation, document the compensation strategy.

Reference:

- Saga pattern: https://microservices.io/patterns/data/saga.html

## 6) Verification

- Golden vectors for event payloads (producer and consumer)
- Replay tests for idempotency invariants
- Integration tests for outbox → broker → projector

ED must include:

- event types affected
- idempotency and ordering notes (short)
