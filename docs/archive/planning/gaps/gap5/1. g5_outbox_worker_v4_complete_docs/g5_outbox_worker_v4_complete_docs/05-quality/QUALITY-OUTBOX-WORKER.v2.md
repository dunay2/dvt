---
title: QUALITY-OUTBOX-WORKER v2
status: Draft
owner: architecture
last_reviewed: 2026-03-08
---

# QUALITY-OUTBOX-WORKER v2

## 1. Quality goals

The worker must be:

- deterministic in outcome mapping,
- safe under concurrent claiming,
- robust under crash windows,
- observable in lag/failure state,
- explicit about at-least-once semantics.

## 2. Test matrix

### 2.1 Contract tests

- subscriber throw is normalized to `SUBSCRIBER_UNEXPECTED_THROW`,
- retryable result with remaining budget schedules retry,
- retryable result without budget dead-letters,
- terminal result dead-letters,
- ignored result ends the lifecycle,
- missing subscriber dead-letters.

### 2.2 Store integration tests

- two workers do not claim the same unordered row simultaneously,
- expired claims are reclaimable,
- lane leases prevent concurrent processing of the same lane,
- lane claim expiry recovers after crash,
- topic allowlist restricts claim scope.

### 2.3 Runtime integration tests

- `run()` keeps looping after recoverable batch failures,
- shutdown via `AbortSignal` is graceful,
- wake-up source loss does not stop progress,
- idle backoff applies when no work exists.

### 2.4 Crash-window tests

- subscriber side effect succeeds but process crashes before `markDelivered`,
- message is redelivered after lease expiry,
- idempotent subscriber prevents duplicate external side effect.

### 2.5 Migration tests

- old inline worker and new standalone worker do not overlap on the same topic
  allowlist,
- canary topic moves without duplicate ownership,
- disabled topics are never claimed.

## 3. Metrics

At minimum expose:

- `outbox_pending_total{topic}`
- `outbox_retry_scheduled_total{topic}`
- `outbox_dead_letter_total{topic,reason_code}`
- `outbox_delivery_attempt_total{topic,subscriber}`
- `outbox_delivery_failure_total{topic,reason_code}`
- `outbox_worker_tick_duration_ms`
- `outbox_worker_idle_wakeup_total{mode}`
- `outbox_lane_lease_claim_total{topic}`
- `outbox_oldest_pending_age_seconds{topic}`

## 4. Logs

Every record attempt should log at debug or trace level:

- `messageId`
- `topic`
- `tenantId`
- `attemptCount`
- `laneKey`
- `subscriberKey`
- `outcome`
- `reasonCode`

Do not log payload bodies by default.

## 5. Tracing

Recommended spans:

- `outbox.tick`
- `outbox.claim.unordered`
- `outbox.claim.lanes`
- `outbox.claim.lane_batch`
- `outbox.deliver.record`
- `outbox.store.writeback`

## 6. Release gates

The package should not be considered ready until:

1. unordered claim integration tests pass,
2. lane ordering tests pass,
3. duplicate delivery crash-window test passes,
4. metrics and health endpoints exist,
5. migration canary test passes.
