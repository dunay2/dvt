---
title: Define the Outbox Consumer
status: Draft
owner: docs
last_reviewed: 2026-03-05
planning_type: proposal
---

# Define the Outbox Consumer

## General Plan

Problem: The outbox table currently accumulates events without a clearly specified consumer. This causes events not to be delivered to projectors, leaving projections outdated and breaking eventual consistency. It is necessary to define the contract, behavior, and operation of the consumer to ensure reliable event delivery.

### 1. Objective and Scope

Objective: Specify and implement an outbox consumer that guarantees event delivery to subscribers (projectors, external systems) with at least "at-least-once" guarantee, error handling, retries, and dead letter queue, ensuring projections stay updated.

Scope:
- Define consumer architecture (polling-based, workers, concurrency).
- Establish delivery, retry, and backoff policies.
- Define handling of failed events (dead letter).
- Specify metrics and alerts to monitor consumer health.
- Define integration with existing projectors.
- Prepare for future improvements (Kafka, Debezium).

### 2. Requirements

#### Functional
- Guaranteed delivery: Each event must be delivered at least once to all registered subscribers.
- Delivery order: For the same runId, events must be delivered in order (by runSeq). This is critical for projection correctness.
- Idempotency: Subscribers must handle duplicate deliveries (consumer does not guarantee exactly-once, but can help with idempotency at the source).
- Dynamic subscriber registration: Must allow registering projectors implementing IProjector.
- Error handling: If a subscriber fails temporarily, retry with backoff. If it fails permanently, event goes to dead letter.
- Dead letter consultable: Events in dead letter must be listable, inspectable, and manually resendable.

#### Non-functional
- Performance: Must support expected event rate in production (estimate: 1000 concurrent runs * 2000 events/run = 2M peak events, distributed over time). Consumption must at least match production rate to avoid lag.
- Availability: Consumer must be resilient to failures (retries, circuit breaker) and horizontally scalable (multiple workers).
- Monitoring: Prometheus metrics, structured logs, alerts for lag or errors.
- Security: DB connections with limited credentials, avoid exposing sensitive info.

### 3. Consumer Design

#### 3.1 Components
- OutboxWorker: Process (or set of processes) that periodically queries the outbox table for pending events (next_attempt_at <= now() and attempts < max_attempts). Implements polling with backoff.
- EventDispatcher: Takes a batch of events and delivers them to registered subscribers. Each subscriber receives the event in order by runId.
- Subscribers (Projectors): Components implementing IProjector.handle(event) and register in EventDispatcher.
- DeadLetterHandler: Handles events exceeding max retries, moves them to outbox_dead_letter table (or equivalent), and emits an alert.
- Concurrency coordinator: Ensures multiple workers do not process the same event simultaneously (using FOR UPDATE SKIP LOCKED or a lease).

#### 3.2 Processing Flow (per polling iteration)

sequenceDiagram
participant W as OutboxWorker
participant DB as PostgreSQL (outbox)
participant D as EventDispatcher
participant P as Projectors
participant DL as DeadLetterHandler

    loop Each interval (e.g. 1s)
        W->>DB: SELECT * FROM outbox WHERE next_attempt_at <= now() AND attempts < max_attempts ORDER BY run_id, run_seq LIMIT batch_size FOR UPDATE SKIP LOCKED
        DB-->>W: batch of events
        alt batch empty
            W->>W: wait for next interval
        else
            W->>D: dispatch(events)
            D->>P: for each event, call all registered projectors (in order)
            P-->>D: result (ok or error)
            alt all projectors OK
                D->>W: confirm success
                W->>DB: DELETE FROM outbox WHERE id IN (...)
            else some projector fails
                D->>W: report failure
                W->>DB: UPDATE outbox SET attempts = attempts + 1, last_error = ..., next_attempt_at = calculate_backoff(attempts) WHERE id = ...
                alt attempts >= max_attempts
                    W->>DL: move to dead letter
                    DL->>DB: INSERT INTO outbox_dead_letter ...; DELETE FROM outbox ...
                end
            end
        end
    end

#### 3.3 Order Guarantee by runId
The SQL query must order by (run_id, run_seq) to ensure events for the same run are processed in order.

If an event fails, subsequent events for the same run are not processed until the failed one is resolved (because it remains in the table and the order prevents it). This is correct for consistency.

To avoid blocking, the event can be marked as failed and continue with other runs, but never skip an event within the same run.

### 4. Delivery and Retry Policies
- Max attempts: 5 (configurable).
- Exponential backoff: next_attempt_at = now() + (initial_delay * 2^attempts). Example: 1s, 2s, 4s, 8s, 16s.
- Projector timeout: 30 seconds per projector.handle() call. If exceeded, considered failure.
- Circuit breaker per projector: If a projector fails repeatedly (e.g. 3 times in 1 minute), isolate temporarily (do not deliver events) and alert.

### 5. Failure Handling and Dead Letter
- Dead letter table: outbox_dead_letter with same structure as outbox plus fields: dead_lettered_at, dead_letter_reason.

Actions on dead letter:
- Query with filters (runId, error, date range).
- Manual retry (reinsert in outbox with attempts=0).
- Discard (admin only).
- Alert: If dead letter accumulates more than X events in Y minutes, P2 alert.

### 6. Metrics and Monitoring
Expose metrics via Prometheus:

Metric | Type | Description
--- | --- | ---
outbox_pending_events | Gauge | Number of pending events in outbox (filtered by next_attempt_at <= now)
outbox_processing_duration_seconds | Histogram | Time to process a batch of events
outbox_events_delivered_total | Counter | Successfully delivered events (tagged by projector)
outbox_events_failed_total | Counter | Failed events (tagged by projector and error type)
outbox_dead_letter_total | Counter | Events sent to dead letter
outbox_worker_lag_seconds | Gauge | Difference between timestamp of oldest pending event and now()
outbox_consumer_health | Gauge | 1 if worker is active, 0 if not

Alerts:
- OutboxLagHigh: Lag > 5 minutes for 2 minutes.
- OutboxDeadLetterAccumulating: Dead letter count > 10 in 5 minutes.
- OutboxWorkerDown: Health metric absent for 1 minute.
- OutboxHighErrorRate: Failure rate > 5% in 5 minutes.

Structured logs (JSON) with fields: event_id, run_id, projector, attempt, error, duration.

### 7. Integration with Current and Future Projectors
- Registration: Projectors register in EventDispatcher during worker startup. Can be static (config) or dynamic (discovery).

Projector interface:

```typescript
interface IProjector {
  handle(event: OutboxEvent): Promise<void>;
  // Optional: idempotencyKey to avoid duplicates if projector is not idempotent
}
```

Outbox event: Must contain all necessary info: event_type, payload, run_id, run_seq, created_at.

Future (Kafka/Debezium): The current worker can coexist with a future CDC-based pipeline. In that case, the worker could be disabled or act as fallback. The outbox table remains the source of truth.

### 8. Implementation Phases

- Phase 1: Basic worker (immediate)
  - Implement OutboxWorker with simple polling, single thread, no concurrency.
  - Use FOR UPDATE SKIP LOCKED to avoid conflicts if scaling to multiple workers (but initially one).
  - Exponential backoff and dead letter.
  - Basic metrics.
  - Unit and integration tests.

- Phase 2: Concurrency and scalability
  - Allow multiple workers (multiple pods) using SKIP LOCKED to distribute load.
  - Add circuit breaker per projector.
  - Improve metrics with projector tags.
  - Load tests.

- Phase 3: Event pipeline with Kafka (optional)
  - Introduce Debezium to capture outbox changes and publish to Kafka.
  - Projectors subscribe to Kafka topics.
  - Current worker can be disabled or kept as backup.

Requires coordination with platform team.

### 9. Testing and Validation
- Unit: Mock DB and projectors to test retry logic, dead letter, order.
- Integration: With real PostgreSQL, verify events are delivered in order and failures handled correctly.
- Load: Simulate high event rate and verify lag does not grow, retries work.
- Chaos: Kill worker while processing, verify no events lost (thanks to SKIP LOCKED and transactions).

### 10. Documentation and Runbooks
- Design document: This plan, including diagrams and decisions.

Runbook:
- How to monitor lag and dead letter.
- Procedure to retry events in dead letter.
- Manual worker scaling.
- What to do if a projector fails constantly (isolate, investigate).

ADR updates: Create ADR for consumer architecture (or update ADR-0009).

### Deliverables Summary

Deliverable | Description | Responsible | Timeline
--- | --- | --- | ---
Technical specification | Detailed design document (this plan) | Architect | 1 day
Phase 1 implementation | Basic worker code, metrics, tests | Dev | 3-5 days
Integration tests | Validation with test environment | QA | 2 days
Documentation and runbooks | Operations guides | Dev/Architect | 1 day
Initial deployment | Production rollout with monitoring | Ops | 1 day

Note: This plan assumes the outbox table already exists and has necessary fields (run_id, run_seq, event_type, payload, attempts, next_attempt_at, last_error). If not, they must be added in a prior migration.
