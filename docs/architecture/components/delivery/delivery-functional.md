---
title: Delivery Functionalities
status: Draft
owner: Delivery Domain
last_reviewed: 2026-03-15
topics:
  - Functionalities
  - Main Methods
  - Key Files & References
---

# Delivery Functionalities

## Functionalities

- Orchestration of event delivery and publication.
- Ownership tracking and confirmation.
- Retry management for failed events.
- Contract compliance.

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
