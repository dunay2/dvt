---
title: Delivery DDD Structure
status: Draft
owner: Delivery Domain
last_reviewed: 2026-03-15
topics:
  - DDD Diagram
  - Aggregates & Entities
  - Main Methods
  - Key Files & References
---

# Delivery DDD Structure

## DDD Diagram

```mermaid
classDiagram
  class DeliveryAggregate
  class OutboxAggregate
  DeliveryAggregate --> OutboxAggregate : owns
```

## Aggregates & Entities

- DeliveryAggregate: Central delivery model, manages event publication and ownership.
- OutboxAggregate: Handles event publishing and retry logic.

## Main Methods

- publishEvent(event): Publishes event to external systems.
- manageRetry(event): Handles retry logic for failed events.
- trackOwnership(event): Tracks delivery ownership and status.

## Key Files & References

- [DeliveryAggregate.ts](../../../../packages/@dvt/delivery/src/core/DeliveryAggregate.ts)
- [OutboxAggregate.ts](../../../../packages/@dvt/delivery/src/core/OutboxAggregate.ts)

## Component File List

List of all files in the delivery component folder:

- DeliveryAggregate.ts
- OutboxAggregate.ts
- ...
