---
title: outbox-worker Sequence
status: Draft
owner: Delivery Domain
last_reviewed: 2026-03-28
---

# outbox-worker Sequence

## Main Flow: Event Publication with Retry

```mermaid
sequenceDiagram
  participant Delivery as @dvt/delivery
  participant OutboxAggregate
  participant RetryAggregate
  participant ExternalSystem
  participant Engine as @dvt/engine

  Delivery->>OutboxAggregate: publishEvent(pendingEvent)
  OutboxAggregate->>ExternalSystem: deliver(event)
  alt Delivery succeeds
    ExternalSystem-->>OutboxAggregate: ack
    OutboxAggregate->>OutboxAggregate: trackDeliveryStatus(eventId, delivered)
    OutboxAggregate->>Engine: reportDeliveryStatus()
  else Delivery fails
    ExternalSystem-->>OutboxAggregate: error
    OutboxAggregate->>RetryAggregate: storeRetryAttempt(eventId, attempt)
    RetryAggregate->>RetryAggregate: manageRetryLogic(eventId)
    RetryAggregate-->>OutboxAggregate: scheduleRetry / moveToDLQ
  end
```

## Global Flow Position

`dvt-outbox-worker` sits at the tail of the Delivery Domain pipeline. `@dvt/engine` emits domain events that are written to the outbox store, then `@dvt/delivery` hands ownership to the outbox worker for external publication. The worker is the only component responsible for dispatching events to external systems. On successful delivery it signals back to the engine; on repeated failure it escalates events to the dead-letter queue. The worker does not originate plans or drive workflow logic — it is purely a reliable delivery mechanism.

## Key Files

- `apps/outbox-worker/` — Outbox worker runtime application
- `packages/@dvt/delivery/src/` — Delivery domain contracts and ownership management
