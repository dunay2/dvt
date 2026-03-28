---
title: dvt-outbox-worker
status: Draft
owner: Delivery Domain
last_reviewed: 2026-03-15
---

# dvt-outbox-worker

## Component Map

```mermaid
flowchart LR
  delivery[@dvt/delivery]
  outbox[dvt-outbox-worker]
  engine[@dvt/engine]
  delivery --> outbox
  engine --> delivery
```

## Location

- apps/outbox-worker

## Domain

- [Delivery Domain](../domain-delivery.md)

## Main Responsibilities

- Outbox worker, event publishing
- Root: OutboxAggregate (central outbox model)
- Aggregates: RetryAggregate
- Ensures event publication, retry management

## Explanation

dvt-outbox-worker is responsible for publishing events and managing delivery ownership:

- **Root:** [OutboxAggregate](outbox-worker.md#outboxaggregate) — represents the central outbox model, owning event publication and retry logic.
- **Aggregates:** [RetryAggregate](outbox-worker.md#retryaggregate).
- **Responsibilities:**
  - Publish events to external systems.
  - Manage retry attempts for failed events.
  - Report delivery status to delivery.

**Interactions:**

- **[Delivery](delivery.md):** Receives published events and manages ownership.
- **[Engine](engine.md):** Receives delivery status for workflow execution.

Outbox worker coordinates these interactions to ensure reliable event publication and retry management.

## OutboxAggregate

Represents the central outbox model, owning event publication and retry logic. Responsible for:

- Managing event publication
- Tracking retry attempts
- Reporting delivery status

## RetryAggregate

Represents retry management for outbox worker. Responsible for:

- Storing retry attempts
- Managing retry logic
- Reporting retry status

## Restrictions

- Must comply with delivery contracts and event publishing requirements
- Only interacts with Delivery domain components and engine

## Related Documentation

- [Component Map](../component-map.md)
- [Delivery Domain](../domain-delivery.md)

## Detailed Documentation

- [DDD Structure](outbox-worker-ddd.md)
- [Functionalities](outbox-worker-functional.md)
- [Constraints & Invariants](outbox-worker-constraints.md)
- [Sequence Diagrams](outbox-worker-sequence.md)
