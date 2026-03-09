---
title: Operations — G5 Outbox Worker
status: Draft
owner: ops
last_reviewed: 2026-03-08
---

# Operations — G5 Outbox Worker

## 1. Purpose

This runbook covers the focused operational topics for the G5 worker:

- how to monitor it,
- which alerts matter,
- what to do when delivery fails,
- how to replay dead-letter records safely.

---

## 2. Health model

### Liveness

The process is alive and the event loop is still progressing.

Suggested signal:

- last successful loop completion timestamp within threshold.

### Readiness

The worker is ready to process:

- store connectivity OK,
- subscriber registry initialized,
- telemetry sink initialized,
- ordered lane table reachable when ordered mode is enabled.

---

## 3. Core metrics

### Throughput

- `outbox_records_claimed_total`
- `outbox_records_delivered_total`
- `outbox_records_ignored_total`
- `outbox_records_retried_total`
- `outbox_records_dead_lettered_total`

### Lag

- `outbox_oldest_pending_record_age_seconds`
- `outbox_pending_records_count`

### Failures

- `outbox_subscriber_unexpected_throw_total`
- `outbox_store_write_failure_total`
- `outbox_retry_schedule_total`

### Ordered lane metrics

- `outbox_lane_leases_owned`
- `outbox_lane_lease_expired_total`
- `outbox_hot_lane_oldest_pending_age_seconds{lane_key=...}`

---

## 4. Suggested alerts

### Critical

- oldest pending record age above agreed SLO for sustained period,
- dead-letter growth spike,
- store write failures sustained,
- worker ready = false on all replicas.

### Warning

- retry rate above normal baseline,
- single lane remains hot for too long,
- lease expiry churn unusually high.

---

## 5. Replay from dead-letter queue

### Preconditions

- identify root cause,
- confirm subscriber fix or downstream fix exists,
- choose replay scope by topic, time range, or reason code,
- confirm side effects remain idempotent.

### Procedure

1. stop automatic replay job if one exists,
2. select dead-lettered outbox records for scope,
3. move records to `pending` or enqueue replay copies according to local policy,
4. reset lease fields,
5. set `available_at` to controlled replay time,
6. monitor replay rate and dead-letter recurrence.

### Never do this blindly

Do not replay a DLQ burst without validating subscriber idempotency and downstream capacity.

---

## 6. Incident examples

### Case A — records stuck pending

Check:

- database connectivity,
- poll loop timestamps,
- readiness state,
- `LISTEN/NOTIFY` is irrelevant if polling still works.

Action:

- confirm claim query health,
- inspect expired leases,
- inspect row lock contention,
- scale workers only if the store can support it.

### Case B — repeated retries with no progress

Check:

- reason codes,
- subscriber dependency outage,
- backoff policy too aggressive.

Action:

- pause replay pressure if needed,
- fix subscriber target,
- widen backoff temporarily if policy allows.

### Case C — hot lane starvation

Check:

- lane ownership metrics,
- queue depth for that lane,
- whether one lane dominates all work.

Action:

- accept serial behavior if business ordering requires it,
- investigate whether ordering granularity is too coarse,
- consider splitting the ordering key upstream if domain allows.

---

## 7. Observability stack guidance

Recommended baseline:

- traces via OpenTelemetry,
- metrics via Prometheus-compatible client,
- structured logs with redaction,
- dashboards showing pending age, retry rate, DLQ growth, and lane saturation.
