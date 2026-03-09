---
title: ADR-G5-001 Independent Outbox Worker v4
status: Proposed
owner: architecture
last_reviewed: 2026-03-08
---

# ADR-G5-001 — Independent Outbox Worker

## Status

Proposed.

This ADR replaces the looser V2/V3 decision texts for forward implementation.

## Context

The current state already contains reusable outbox behavior inside engine code,
but G5 remains partial because the delivery lifecycle is still tied to an
application/engine process rather than to an independently deployable runtime.

That creates several architectural problems:

- delivery lifecycle is coupled to API/engine uptime,
- operational ownership is unclear,
- retry/backoff/dead-letter behavior is under-specified,
- observability is weaker than it should be for a runtime boundary,
- migration to external publication patterns is harder when the worker is
  hidden inside another process.

Within DVT+, this problem must be solved without violating the product split:
the worker delivers persisted facts; it does not plan, it does not own product
state, and it does not invent execution policy outside its contract.

## Decision

### 1. Delivery families

DVT+ will support **two delivery families**, documented separately:

1. **Polling worker family**
   - claims rows from the outbox table transactionally,
   - updates delivery state itself,
   - supports retries, dead-letter, ordering lanes, and direct internal
     subscribers.

2. **CDC relay family**
   - reads changes from the outbox table through change data capture,
   - is suitable for external fan-out and integration publication,
   - does not reuse the polling worker core unchanged.

This ADR decides the **polling worker family** for G5.x.  
CDC is not rejected, but it is not covered by the polling runtime contract.

### 2. Runtime form

The polling worker will run as an **independent process/package** with three
clear layers:

- **engine**: one-batch processing logic,
- **runtime**: loop, backoff, wake-up integration, shutdown handling,
- **host**: process bootstrap, config, telemetry, health endpoints.

### 3. Error model

Expected delivery outcomes must be modeled with a typed result:

- `DELIVERED`
- `IGNORED`
- `RETRYABLE_FAILURE`
- `TERMINAL_FAILURE`

Subscribers must not use exceptions as a functional outcome channel.

Any thrown exception is treated as an unexpected defect and normalized at the
worker boundary.

### 4. Ordering

The worker does **not** guarantee global ordering.

When ordering is required, it is provided by **ordering lanes**:

- rows are assigned a `lane_key`,
- only one worker owns a lane lease at a time,
- records within a lane are processed in sequence order,
- different lanes may run in parallel.

### 5. Idempotency

Delivery is **at-least-once**.  
Subscribers must therefore be idempotent by the provided `idempotencyKey`.

The worker does not perform cross-record deduplication by idempotency key.

### 6. Topic ownership and coexistence

For a given `topic` in a given environment, **exactly one delivery family is
active**:

- either polling,
- or CDC.

Polling and CDC may coexist only in **shadow mode**, where one side is passive
for validation and does not produce the production side effect.

### 7. Existing worker migration

The existing in-engine worker will be migrated by **Option A:
deprecate + rewrite around extracted contracts**.

That means:

- the old worker becomes a compatibility wrapper only for a short transition,
- the new package owns the long-term runtime,
- cutover is controlled by topic allowlists and deployment flags,
- no dual-active delivery for the same topic is allowed.

## Consequences

### Positive

- deployment and operations become explicit,
- retries and dead-letter policy become enforceable,
- internal subscriber delivery stays simple and transactional,
- ordering requirements can be implemented without pretending global order,
- migration to CDC is cleaner because the boundary is now honest.

### Negative

- the polling worker core is explicitly coupled to claim/lease semantics,
- CDC is not a drop-in implementation of the same store contract,
- ordering lanes add schema and operational complexity where required,
- at-least-once requires subscriber discipline and testing.

### Rejected alternatives

#### A. Keep the worker inside the API/engine process

Rejected because lifecycle, observability, and scaling remain coupled to the
wrong process boundary.

#### B. Pretend polling and CDC are adapters behind the same core

Rejected because claim-driven processing and stream-consumer processing are
different runtime families with different failure and ownership models.

#### C. Promise exactly-once through the worker itself

Rejected because that would either be false or would require a much more complex
distributed protocol outside the current product need.

## Normative follow-up documents

- `SPEC-OUTBOX-DELIVERY-CONTRACTS.v4.md`
- `SPEC-OUTBOX-RUNTIME-CONTRACTS.v1.md`
- `SPEC-OUTBOX-ORDERING-LANES.v1.md`
- `SPEC-OUTBOX-IDEMPOTENCY.v1.md`
- `ARCH-OUTBOX-RUNTIME.v4.md`
- `MIGRATION-PLAN-EXISTING-OUTBOX-WORKER.v1.md`
