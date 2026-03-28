---
title: outbox-worker Constraints & Invariants
status: Draft
owner: Delivery Domain
last_reviewed: 2026-03-28
---

# outbox-worker Constraints & Invariants

## Constraints and Invariants

| Constraint / Invariant                                                | Where Enforced           | Description                                                                                                              |
| --------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Must comply with delivery contracts and event publishing requirements | OutboxAggregate          | All published events must conform to the delivery contracts defined in `@dvt/delivery`.                                  |
| Only interacts with Delivery domain components and engine             | OutboxAggregate boundary | The outbox worker must not reach into planning, infra, or observability domains directly.                                |
| Events must be published at-least-once                                | OutboxAggregate          | The outbox pattern guarantees at-least-once delivery; events must not be silently dropped on transient failures.         |
| Retry attempts must not exceed the configured maximum                 | RetryAggregate           | Once the maximum retry count is reached, the event must be moved to the dead-letter queue rather than retried again.     |
| Only one worker instance may own a given event at a time              | OutboxAggregate          | Concurrent workers must use a row-level lock or ownership claim to prevent duplicate event publication.                  |
| Retry backoff must be non-zero and increasing                         | RetryAggregate           | Retry intervals must increase with each attempt (e.g. exponential backoff) to avoid thundering-herd on external systems. |

## Validation Examples

- Attempting to publish an event that does not conform to the delivery contract schema raises a `ContractViolationError` before delivery is attempted.
- When `RetryAggregate.manageRetryLogic` determines the maximum attempt count has been reached, it emits `EventMovedToDLQ` and stops scheduling further retries.
- Two worker instances claiming the same event simultaneously: only the one that acquires the ownership lock proceeds; the other receives a `DeliveryOwnershipConflict` and skips the event.
- A retry with a zero-ms delay is rejected by RetryAggregate as a policy violation.

## Key Files

- `apps/outbox-worker/` — Outbox worker runtime and policy enforcement
- `packages/@dvt/delivery/src/` — Delivery domain contracts
