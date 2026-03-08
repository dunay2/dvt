---
title: G5 Outbox Worker V3 Full Review
status: Draft for review
owner: architecture
last_reviewed: 2026-03-08
---

# G5 Outbox Worker V3 Full Review

## 1. Why a V3 exists

The V2 pack fixed two important problems, but it still had structural drift:

- SRP was preached more strongly than it was actually applied,
- CQRS language was stricter than the runtime reality,
- CDC evolution was still described too loosely,
- idempotency and ordering needed a sharper contract,
- security concerns were under-documented,
- the documentation types were still not separated enough.

This V3 addresses that by splitting the material into document types and making
several limitations explicit rather than decorative.

## 2. Document map

### ADR

- `ADR-G5-001-independent-outbox-worker-v3.md`

### Specifications

- `SPEC-OUTBOX-DELIVERY-CONTRACTS.v3.md`
- `SPEC-OUTBOX-ORDERING-IDEMPOTENCY.v1.md`

### Architecture

- `ARCH-OUTBOX-RUNTIME.v3.md`
- `ARCH-OUTBOX-CDC-EVOLUTION.v2.md`

### Class design

- `CLASS-DESIGN-OUTBOX-WORKER.v1.md`

### Quality / operations

- `QUALITY-OUTBOX-WORKER.v1.md`

### Security

- `SECURITY-OUTBOX-WORKER.v1.md`

### Risks / open questions

- `RISKS-AND-OPEN-QUESTIONS.v1.md`

## 3. Main corrections versus V2

### 3.1 SRP correction

The old delivery shape was still too broad. V3 splits record processing into:

- `SubscriberResolver`,
- `SubscriberInvoker`,
- `DeliveryOutcomeDecider`,
- `DeliveryOutcomeWriter`,
- `DeliveryTelemetry`,
- coordinated by `DeliveryCoordinator`.

That is still orchestration, but with narrower reasons to change.

### 3.2 CQRS wording correction

The outbox store contract is no longer presented as a pure CQRS exemplar.
Claiming is a queue-control primitive that mixes retrieval and ownership change.
That is acceptable and now explicitly acknowledged.

### 3.3 Concurrency correction

The design now recommends `p-limit` rather than a home-grown concurrency helper.
This reduces custom correctness surface in a critical runtime path.

### 3.4 CDC correction

The design now states clearly that CDC is a **different runtime family**, not a
transparent swap of the polling worker core. The continuity boundary is the
**outbox write shape**, not `IOutboxStore`.

### 3.5 Idempotency correction

The worker provides at-least-once delivery only. Subscriber-side idempotency is
therefore a normative contract requirement, not a footnote.

### 3.6 Ordering correction

No implicit ordering guarantee is claimed. If ordering matters, it must be
implemented with lanes, partition-aware claiming, or subscriber-side gating.

### 3.7 Security correction

Worker identity, secret handling, least privilege, and credential separation are
now captured in a dedicated security document.

## 4. Architectural position after V3

The architecture is now deliberately split into two delivery families:

1. **Polling worker**
   - transactional claim/lease semantics,
   - direct control over retries and dead-letter,
   - appropriate for DVT-controlled internal consumers or tightly managed
     subscribers.

2. **CDC relay**
   - database change capture from the outbox table,
   - better fit for external publication/fan-out,
   - operationally different, therefore documented separately.

This is stricter and more honest than pretending both are adapters behind the
same core.

## 5. Implementation consequences

A corresponding codebase should likely be structured around:

```text
packages/@dvt/outbox-worker/
  src/
    runtime/
      OutboxWorkerRuntime.ts
      RuntimeBackoffPolicy.ts
      WakeupListener.ts
    engine/
      OutboxWorkerEngine.ts
      BatchProcessor.ts
    delivery/
      DeliveryCoordinator.ts
      SubscriberResolver.ts
      SubscriberInvoker.ts
      DeliveryOutcomeDecider.ts
      DeliveryOutcomeWriter.ts
      DeliveryTelemetry.ts
    contracts/
      IOutboxStore.ts
      IOutboxSubscriber.ts
      DeliveryResult.ts
      DeliveryPolicy.ts
    host/
      startWorkerHost.ts
      WorkerConfig.ts
      MetricsServer.ts
      HealthServer.ts
```

## 6. What this pack deliberately does not do

- it does not promise exactly-once,
- it does not promise global ordering,
- it does not pretend Debezium reuses the polling core unchanged,
- it does not bury security and operations under architecture prose.

## 7. Recommended next implementation slice

1. implement the split runtime/engine/delivery classes,
2. replace custom concurrency helper with `p-limit`,
3. codify subscriber throw normalization in tests,
4. add integration tests for duplicate delivery around crash windows,
5. define whether ordering lanes are required for any current subscriber.

## 8. References

- PostgreSQL `SELECT ... FOR UPDATE ... SKIP LOCKED`
  https://www.postgresql.org/docs/current/sql-select.html
- PostgreSQL `LISTEN`
  https://www.postgresql.org/docs/current/sql-listen.html
- PostgreSQL `NOTIFY`
  https://www.postgresql.org/docs/current/sql-notify.html
- Debezium Outbox Event Router
  https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html
- `p-limit`
  https://github.com/sindresorhus/p-limit
