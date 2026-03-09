---
title: G5 Outbox Worker — Focused Final Tuning
status: Draft
owner: docs
last_reviewed: 2026-03-08
planning_type: focused-addendum
---

# G5 Outbox Worker — Focused Final Tuning

This document applies only the five non-blocking improvements requested in the latest review.
It does not reopen the broader design.

## 1. Crash-window hook safety

### Decision

`ICrashWindowTestHook` remains a test-only seam.
It must not become an operational feature.

### Normative rules

- Production runtime wiring **MUST** use `NoopCrashWindowTestHook`.
- The default host builder **MUST NOT** accept a custom crash-window hook from environment configuration.
- Any non-noop hook **MUST** be linked only from test composition roots or explicitly named non-production harnesses.
- If a non-noop hook is ever allowed outside tests, it **MUST** require an explicit dangerous feature flag such as `DVT_ENABLE_CRASH_TEST_HOOK=true`, and the process **MUST** log a startup error-level warning and refuse to start unless `NODE_ENV` is not `production`.
- Worker core classes **MUST NOT** inspect environment variables directly to decide hook behavior.

### Implementation shape

```ts
export interface ICrashWindowTestHook {
  afterSubscriberSideEffectBeforeAck(recordId: string): Promise<void>;
}

export class NoopCrashWindowTestHook implements ICrashWindowTestHook {
  async afterSubscriberSideEffectBeforeAck(): Promise<void> {
    return;
  }
}
```

```ts
export interface WorkerHostDependencies {
  runtime: IOutboxWorkerRuntime;
  crashWindowTestHook: ICrashWindowTestHook;
}

export function createProductionHost(
  deps: Omit<WorkerHostDependencies, 'crashWindowTestHook'>
): WorkerHostDependencies {
  return {
    ...deps,
    crashWindowTestHook: new NoopCrashWindowTestHook(),
  };
}
```

### Rationale

The crash-window seam exists only to validate at-least-once behavior around the ack gap.
Treating it as a configurable production feature would create an unnecessary sabotage surface.

## 2. Known risk: hot-lane saturation

### Statement

Ordered mode with lane leases can suffer from hot-lane saturation.
If one lane accumulates many outbox records, a single worker may hold that lane lease for a long interval while other workers stay underutilized.

### Current position

This is an accepted limitation of the ordered-mode MVP.
There is no automatic lane splitting or rebalance in the current design.

### Consequences

- throughput may degrade for workloads dominated by a small number of ordering keys,
- lane-level lag may grow even when fleet-wide CPU is available,
- fairness across lanes is not guaranteed beyond lease expiration.

### Required observability

The runtime **MUST** emit at least:

- `outbox_lane_lease_acquired_total{lane}`
- `outbox_lane_lease_expired_total{lane}`
- `outbox_lane_backlog{lane}` gauge
- `outbox_lane_oldest_record_age_seconds{lane}` gauge

### Deferred improvements

These are deferred, not accepted for the current implementation:

- adaptive lease shortening for hot lanes,
- lane split / virtual sub-lanes,
- cooperative handoff when backlog exceeds a threshold,
- dynamic rebalance by moving an ordering key family to a new lane.

## 3. Coexistence example: multiple side effects on the same channel

### Terminology change

The tuple term is renamed from `sideEffectClass` to `sideEffectKind`.

### Revised coexistence key

A production ownership boundary is defined by:

- `environment`
- `topic`
- `deliveryChannel`
- `sideEffectKind`

### Rule

For a given `(environment, topic, deliveryChannel, sideEffectKind)` tuple, exactly one production-active owner is allowed.

This does **not** mean that a topic can have only one owner overall.
A topic may have multiple owners when each owner is responsible for a different `sideEffectKind`.

### Example

Allowed:

- `prod`, `workflow.run.events`, `internal_projection`, `snapshot_projection` → owned by polling worker A
- `prod`, `workflow.run.events`, `internal_projection`, `cache_refresh` → owned by polling worker B
- `prod`, `workflow.run.events`, `external_publication`, `kafka_publish` → owned by CDC relay

Not allowed:

- two production-active owners both claiming `prod`, `workflow.run.events`, `internal_projection`, `snapshot_projection`

### Guidance

When two side effects have materially different retry policy, ordering needs, or failure blast radius, they should remain separate `sideEffectKind` values even if they share a topic and channel.

## 4. Backoff terminology and boundary clarification

`DeliveryOutcomeDecider` remains responsible only for translating a normalized subscriber outcome into a delivery command.
It must not calculate timestamps.

### Normative rules

- `DeliveryOutcomeDecider` **MUST** output a command such as `ACK_DELIVERED`, `ACK_IGNORED`, `SCHEDULE_RETRY`, or `MOVE_TO_DLQ`.
- `DeliveryOutcomeDecider` **MUST NOT** compute `nextAttemptAt`.
- `IBackoffCalculator` **MUST** compute the concrete retry instant when the command is `SCHEDULE_RETRY`.

### Example

```ts
export interface IBackoffCalculator {
  computeNextAttempt(input: { attemptNumber: number; firstAttemptAt: Date; now: Date }): Date;
}
```

## 5. Metric for exhausted retry budget

### New metric

Add a dedicated counter:

- `outbox_records_exhausted_retries_total{topic, subscriber, side_effect_kind}`

### Semantics

Increment this metric exactly when:

- the normalized outcome is retryable in principle,
- but the record has reached the maximum allowed attempts,
- and the worker therefore routes the record to DLQ or terminal failure handling instead of scheduling another retry.

### Why this metric exists

`outbox_records_dead_lettered_total` is necessary but insufficient.
It tells us that a record ended in DLQ, but it does not isolate the subset caused by retry-budget exhaustion.

This metric is useful for:

- alerting on chronic transient failures that never recover,
- distinguishing schema poison or terminal errors from retry exhaustion,
- measuring whether backoff policy is too optimistic or too short-lived.

### Suggested alert

Trigger an alert when:

- `increase(outbox_records_exhausted_retries_total[15m]) > 0`
- and the same `(topic, subscriber, side_effect_kind)` tuple exceeds a configured threshold for two consecutive windows.

## 6. Naming unification

Use these canonical terms consistently:

- **outbox record**: the persisted unit stored in the outbox table,
- **subscriber outcome**: the normalized result returned by the subscriber boundary,
- **delivery command**: the internal command emitted by `DeliveryOutcomeDecider`,
- **sideEffectKind**: the logical type of side effect owned by a runtime.

Avoid:

- `outbox message`
- `outbox row`
- `sideEffectClass`

## 7. What is intentionally left unchanged

This focused addendum does not change:

- the accepted polling claim model,
- the accepted CDC coexistence model,
- ordered vs unordered mode defaults,
- migration sequencing,
- subscriber idempotency contract,
- the runtime / engine / host split.
