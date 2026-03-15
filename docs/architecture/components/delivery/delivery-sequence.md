---
title: Delivery Sequence
status: Draft
owner: Delivery Domain
last_reviewed: 2026-03-15
topics:
  - Sequence Diagram
  - Global Flow Position
  - Key Files & References
---

# Delivery Sequence

## Sequence Diagram

```mermaid
sequenceDiagram
  participant Engine
  participant Delivery
  participant Outbox
  Engine->>Delivery: publish RunStarted event
  Delivery->>Outbox: publish event
  Outbox-->>Delivery: confirm delivery
  Delivery-->>Engine: delivery confirmation
```

## Global Flow Position

Delivery receives events from Engine, manages publication and ownership, coordinates retries via Outbox, and confirms delivery to Engine.

## Key Files & References

- [DeliveryAggregate.ts](../../../../packages/@dvt/delivery/src/core/DeliveryAggregate.ts)
- [OutboxAggregate.ts](../../../../packages/@dvt/delivery/src/core/OutboxAggregate.ts)

## Component File List

List of all files in the delivery component folder:

- DeliveryAggregate.ts
- OutboxAggregate.ts
- ...
