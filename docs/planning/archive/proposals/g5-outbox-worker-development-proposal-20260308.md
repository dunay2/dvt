---
title: G5 Outbox Worker Development Proposal
status: Proposed
owner: Core Architecture / Engine / State / Platform
last_reviewed: 2026-03-08
planning_type: proposal
---

# G5 Outbox Worker Development Proposal

## Goal

Close G5 by turning the current outbox primitives into an independently
operable worker runtime.

## Current Baseline

What already exists in repo:

- outbox persistence APIs in `PostgresStateStoreAdapter`;
- reusable library worker in `packages/@dvt/engine/src/outbox/OutboxWorker.ts`;
- tests for retry backoff, DLQ, and replay behavior.

What remains open:

- standalone runtime/process;
- explicit subscriber delivery contract;
- claim and recovery semantics for multi-instance operation;
- operational retry and telemetry model;
- shard and scaling strategy;
- production runbook.

## Proposed Implementation Sequence

### Phase 1: Freeze the delivery contracts

Introduce explicit outbox boundaries:

- `IOutboxStore`
- `IOutboxSubscriber`
- `IOutboxSubscriberRegistry`
- `IRetryClassifier`
- `IBackoffPolicy`
- `IOutboxTelemetry`

Acceptance:

- no new worker runtime code is added before these boundaries are explicit.

### Phase 2: Extract reusable core

Refactor the current worker logic so delivery orchestration depends only on
ports.

Acceptance:

- worker orchestration is framework-agnostic;
- engine-local worker becomes facade or wrapper rather than the long-term home.

### Phase 3: Add standalone runtime

Create a dedicated runtime host, for example `apps/outbox-worker`.

Runtime responsibilities:

- config loading;
- scheduler loop;
- bounded concurrency;
- graceful shutdown and drain;
- health and metrics endpoints;
- DI/bootstrap wiring.

Acceptance:

- runtime starts, drains, and stops independently from API;
- runtime can run with empty queue safely.

### Phase 4: Implement explicit Postgres claim semantics

Extend the store side with:

- claim next batch;
- expired claim recovery;
- explicit claim ownership or token validation;
- deterministic retry/dead-letter status transitions.

Acceptance:

- concurrent workers cannot normally process the same record;
- orphan claims can be recovered.

### Phase 5: Add first-class subscriber contract

Start with one real subscriber of clear value, for example:

- workflow snapshot projector;
- UI run update relay;
- event-bus forwarder.

Acceptance:

- one production-shaped subscriber exists behind the contract;
- unsupported topic path is explicit and test-covered.

### Phase 6: Add retry classification and bounded backoff

Move retry decisions out of ad-hoc catch blocks.

Acceptance:

- retryable versus terminal outcomes are explicit;
- backoff is bounded and configurable;
- dead-letter transition is deterministic.

### Phase 7: Add observability and operations

Expose:

- counters, gauges, histograms;
- structured logs;
- traces for claim and delivery lifecycle;
- on-call guidance for lag, stuck claims, and DLQ growth.

Acceptance:

- operator can see lag, failures, and dead letters without code inspection.

## Definition Of Done

G5 should only be considered closed when all of the following are true.

### Runtime

- standalone worker runtime exists;
- independent start/stop/drain behavior is implemented;
- worker configuration is externalized.

### Contracts

- explicit store and subscriber contracts exist;
- delivery outcomes are typed;
- idempotency requirements are documented.

### Persistence And Claiming

- claim protocol exists for multi-worker safety;
- expired claim recovery exists;
- delivery attempt metadata is persisted;
- dead-letter evidence is preserved.

### Retry And DLQ

- retry classifier is documented and implemented;
- bounded backoff exists;
- maximum attempts are configurable;
- replay from DLQ is supported.

### Testing

- unit tests for delivery orchestration;
- contract tests for subscribers;
- integration tests for Postgres claim and mark lifecycle;
- concurrency tests for duplicate-claim prevention;
- shutdown and drain tests;
- replay and DLQ tests.

### Operations

- liveness and readiness signals exist;
- lag and failure metrics exist;
- structured logs include correlation keys;
- operator guidance exists for lag, stuck claims, and DLQ growth.

## Recommended First Production Shape

Initial target shape:

- polling runtime;
- Postgres-backed outbox store;
- one real subscriber;
- bounded parallelism;
- explicit retry classifier;
- exponential backoff with jitter;
- DLQ persistence;
- Prometheus metrics;
- OpenTelemetry traces;
- structured JSON logs.

## Risks To Control

- leaving delivery embedded in API lifecycle;
- creating a second worker implementation with unclear ownership;
- promising stronger ordering than the store can enforce;
- unbounded retries hiding poison messages;
- adding abstractions before there is a real boundary.

## Deliverables From This Proposal

This proposal should result in:

- one accepted ADR for runtime separation;
- one working guide for architectural shape;
- one standalone runtime implementation plan;
- one future runbook once runtime behavior is real.
