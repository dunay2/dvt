---
title: G5 Outbox Worker Guide
status: Working Guide
canonical: false
owner: Core Architecture / Engine / State / Platform
last_reviewed: 2026-03-08
source_origin: extracted from historical G5 outbox worker planning draft
---

# G5 Outbox Worker Guide

This document captures the architectural guidance worth keeping for G5 without
leaving the material buried inside old planning scratch space.

It is a working guide, not the canonical status source. For current delivery
state, use [`GAP_EXECUTION_PLANS.md`](./GAP_EXECUTION_PLANS.md).

## Purpose

G5 is not about inventing the outbox pattern from zero.

G5 is about promoting existing outbox persistence and worker primitives into an
independent runtime subsystem that can be operated, scaled, and reasoned about
separately from the API process.

## Architectural Role

The outbox worker:

- does not plan;
- does not own engine policy;
- does not own run state;
- does not replace persisted truth;
- does deliver previously persisted facts to downstream subscribers.

The state store remains the source of truth.

## Core Design Principles

### Hexagonal boundary

Core logic should depend on ports, not on Postgres, timers, HTTP, or a
particular event bus.

### Explicit delivery semantics

The worker should not operate on opaque success/failure booleans. Delivery
results must distinguish:

- delivered;
- retryable failure;
- terminal failure.

### Bounded operational behavior

Retries, dead-lettering, claim recovery, and concurrency limits must be
explicit and testable.

### Runtime separation

The worker runtime must be deployable and operable independently from the API
process.

## Ubiquitous Language

Use these terms consistently:

- `Outbox Record`: persisted delivery intent written atomically with state;
- `Claim`: temporary ownership of a pending record by one worker instance;
- `Delivery Attempt`: one execution against a claimed record;
- `Retryable Failure`: should be retried later;
- `Terminal Failure`: should move to dead letter;
- `Dead Letter`: terminally failed record awaiting operator replay or analysis;
- `Lag`: age or count of pending undelivered records;
- `Subscriber`: adapter responsible for one delivery contract;
- `Ordering Key`: scope within which ordering matters, for example `runId`.

## Recommended Boundary Model

### Domain and application core

Should own:

- outbox message types;
- delivery result types;
- retry classification;
- backoff policy;
- record delivery orchestration.

### Driven adapters

Should own:

- Postgres claiming and mark operations;
- event-bus or projector delivery adapters;
- telemetry exporters.

### Driving runtime

Should own:

- polling loop;
- lifecycle start and stop;
- graceful shutdown;
- health and metrics endpoints;
- dependency wiring.

## Recommended Core Contracts

The guide recommends introducing these boundaries explicitly:

- `IOutboxStore`
- `IOutboxSubscriber`
- `IOutboxSubscriberRegistry`
- `IRetryClassifier`
- `IBackoffPolicy`
- `IOutboxTelemetry`

Minimum behavior expected from the store side:

- claim next batch;
- mark delivered;
- mark retry scheduled or mark failed;
- replay dead letters;
- recover expired claims.

## Runtime Shape

The runtime host should stay thin.

It should:

1. claim a bounded batch;
2. process records with bounded parallelism;
3. stop accepting new work on shutdown;
4. wait for in-flight work up to a bounded drain timeout;
5. emit liveness, readiness, and lag signals.

The runtime should not become a god service that mixes claim SQL, retry rules,
subscriber logic, metrics, and shutdown policy in one class.

## Claiming And Multi-instance Safety

The worker model should define:

- worker instance identity;
- claim token or equivalent claim ownership;
- claim TTL;
- expired-claim recovery;
- future shard model, even if initial shard count is `1`.

The active `G5.5` planning direction now chooses deterministic `runId`
sharding, explicit deployment-owned shard lists, and dedicated PostgreSQL
advisory-lock fencing as the narrowest scale-out model compatible with the
current runtime.

See:

- [`G5 / US-G5.5 Sharding And Fencing Plan`](./G5-US-G5.5-SHARDING-AND-FENCING-PLAN.md)
- [`ADR-0033 - Outbox Worker Sharding And Fencing Model`](../../adr/ADR-0033-outbox-worker-sharding-and-fencing-model.md)

The design should document ordering only per stream or ordering key. It should
not promise global order.

## Retry And Dead-letter Guidance

Recommended policy shape:

- bounded attempts;
- exponential backoff with jitter;
- explicit transition to dead letter for terminal or exhausted failures;
- replay as an auditable operator action, not an implicit background effect.

Dead-letter evidence should preserve at least:

- topic;
- idempotency key;
- ordering key when present;
- payload or payload reference;
- attempt count;
- last error kind and message;
- last worker identity;
- failure timestamps.

## Observability Shape

The worker should expose:

- pending count;
- claimed count;
- delivered count;
- retryable failures;
- terminal failures;
- dead-letter count;
- oldest pending age;
- delivery latency;
- claim batch size;
- end-to-end lag.

Structured logs should include:

- worker instance id;
- record id;
- topic;
- tenant id;
- run id when present;
- claim token;
- attempt count;
- idempotency key;
- decision.

## Migration Note For The Existing Worker

The reusable worker now lives in
`packages/@dvt/delivery/src/application/OutboxWorker.ts`; do not reintroduce
an engine-local architectural duplicate.

Accepted outcome today:

- keep `@dvt/delivery` as the canonical owner of the reusable core;
- if a compatibility shim is ever needed, keep it as a temporary deprecated facade over that core.

Not acceptable:

- two diverging worker implementations with unclear ownership.

## Working References

- [`docs/adr/_drafts/ADR-G5-independent-outbox-worker-runtime.md`](../../adr/_drafts/ADR-G5-independent-outbox-worker-runtime.md)
- [`docs/adr/ADR-0033-outbox-worker-sharding-and-fencing-model.md`](../../adr/ADR-0033-outbox-worker-sharding-and-fencing-model.md)
- [`docs/planning/gaps/G5-US-G5.5-SHARDING-AND-FENCING-PLAN.md`](../../planning/gaps/G5-US-G5.5-SHARDING-AND-FENCING-PLAN.md)
- [`docs/planning/proposals/g5-outbox-worker-development-proposal-20260308.md`](../../planning/proposals/g5-outbox-worker-development-proposal-20260308.md)
- [`docs/planning/gaps/GAP_EXECUTION_PLANS.md`](../../planning/gaps/GAP_EXECUTION_PLANS.md)
