---
title: outbox-worker Functionalities
status: Draft
owner: Delivery Domain
last_reviewed: 2026-03-28
---

# outbox-worker Functionalities

## Functionalities

| #   | Functionality                   | Description                                                                                                             |
| --- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | Event Publication               | Reads pending events from the outbox store and publishes them to external systems in delivery order.                    |
| 2   | Retry Management                | Tracks failed event deliveries and schedules retry attempts according to the configured backoff and max-attempt policy. |
| 3   | Delivery Status Reporting       | Reports the current delivery status (pending, delivered, failed, retrying) of each outbox event to the Delivery Domain. |
| 4   | Delivery Ownership Coordination | Receives ownership signals from `@dvt/delivery` to ensure only one worker instance publishes a given event.             |
| 5   | Engine Status Feed              | Delivers final delivery status back to `@dvt/engine` so workflow execution can proceed upon confirmed event delivery.   |

## Main Methods

- `OutboxAggregate.publishEvent(event)`: Attempts to deliver a pending event to the configured external target.
- `OutboxAggregate.trackDeliveryStatus(eventId)`: Records the outcome of a delivery attempt for the given event.
- `OutboxAggregate.reportDeliveryStatus()`: Returns a summary of all in-flight and recently completed deliveries.
- `RetryAggregate.storeRetryAttempt(eventId, attempt)`: Persists a retry attempt record with timestamp and attempt number.
- `RetryAggregate.manageRetryLogic(eventId)`: Evaluates whether a further retry should be scheduled or the event moved to DLQ.
- `RetryAggregate.reportRetryStatus(eventId)`: Returns the current retry state (attempt count, next scheduled time) for an event.

## Key Files

- `apps/outbox-worker/` — Outbox worker runtime application
- `packages/@dvt/delivery/src/` — Delivery domain contracts and shared adapters
