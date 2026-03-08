---
title: ADR-G5 - Independent Outbox Worker Runtime
status: Proposed
owner: Core Architecture / Engine / State / Platform
last_reviewed: 2026-03-08
---

# ADR-G5 - Independent Outbox Worker Runtime

## Status

Proposed.

## Context

DVT+ already has the outbox foundations required for asynchronous delivery:

- transactional outbox persistence in `PostgresStateStoreAdapter`;
- a reusable library worker in `packages/@dvt/engine/src/outbox/OutboxWorker.ts`;
- adapter and engine tests covering persistence, retry backoff, DLQ, and replay.

What does not exist yet is the production runtime topology for G5:

- a standalone worker process;
- explicit subscriber delivery contracts;
- typed retry and dead-letter decisions;
- operational ownership of lag, claim recovery, and multi-instance execution.

Keeping delivery inside the API process would couple HTTP runtime concerns with
asynchronous delivery and weaken operational isolation.

## Decision

DVT+ will run outbox delivery as an independent worker runtime/process outside
the API process.

The worker runtime will:

1. poll or claim pending outbox records from the authoritative store;
2. deliver persisted records through explicit subscriber adapters;
3. classify delivery outcomes as delivered, retryable, or terminal;
4. persist delivery results through the outbox storage boundary;
5. expose health, lag, retry, and dead-letter metrics;
6. support multi-instance execution through explicit claim semantics;
7. remain separate from planning, engine policy, and UI behavior.

## Non-goals

This decision does not:

- move business planning into the worker;
- make the worker a new source of truth;
- turn the outbox into a general event platform;
- promise global ordering;
- remove the need for idempotent consumers;
- define the full production runbook by itself.

## Guardrails

The following constraints must remain true:

1. The worker only processes persisted outbox records.
2. Delivery goes through explicit subscriber contracts, not ad-hoc callbacks.
3. Retry policy is typed and bounded.
4. Terminal failures become dead letters with preserved evidence.
5. Claim semantics are explicit enough for multi-instance safety.
6. Metrics and operator visibility are first-class.
7. API and worker remain separately deployable.

## Consequences

Positive:

- cleaner ownership boundaries;
- better operational isolation;
- explicit delivery semantics;
- better path to subscriber-specific adapters and telemetry.

Negative:

- one more runtime to operate;
- more config and deployment surface;
- more integration and concurrency testing.

Neutral but important:

- eventual consistency remains visible;
- ordering guarantees must be documented per stream or ordering key;
- idempotent subscribers remain mandatory.

## Follow-up Documents

This ADR should be used together with:

- [`docs/architecture/working/g5-outbox-worker-guide.md`](../../architecture/working/g5-outbox-worker-guide.md)
- [`docs/planning/proposals/g5-outbox-worker-development-proposal-20260308.md`](../../planning/proposals/g5-outbox-worker-development-proposal-20260308.md)
- [`docs/planning/gaps/GAP_EXECUTION_PLANS.md`](../../planning/gaps/GAP_EXECUTION_PLANS.md)
