---
title: Outbox worker user manual
status: Active
owner: Operations / Product / Docs
last_reviewed: 2026-04-04
---

# Outbox worker user manual

This manual explains how operators and service owners should operate and interpret the standalone outbox worker.

## Audience

- on-call operators
- platform owners
- product stakeholders validating delivery health

## What the worker does

- Drains pending outbox events from PostgreSQL.
- Publishes event batches to the configured downstream bus.
- Exposes `healthz`, `readyz`, and `metrics` endpoints for operational status.

## Operating modes

| Mode      | Meaning                             | Expected readiness                       |
| --------- | ----------------------------------- | ---------------------------------------- |
| `active`  | owns shard draining and publication | `ready=true` only when healthy and fresh |
| `passive` | process up, no active draining      | always `ready=false`                     |

## Daily checks

1. Confirm mode and ownership (`/readyz` should report expected `owner` flag).
2. Check runtime state (`idle` or `draining` for healthy active owner).
3. Verify lag and error metrics are stable.
4. Confirm no second active owner for the same shard set.

## Key signals to watch

- `dvt_outbox_runtime_ready`
- `dvt_outbox_runtime_owner`
- `dvt_outbox_runtime_state{state=*}`
- `dvt_outbox_oldest_claimed_lag_seconds`
- `dvt_outbox_runtime_errors_total`
- `dvt_delivery_event_delivery_latency_ms_bucket`

## Incident triage quick path

1. If `ready=false`, read `/readyz` state first.
2. If state is `failing`, inspect worker logs for retry/dead-letter messages.
3. If lag grows, validate downstream endpoint health and ownership mode.
4. If ownership lost, do not force dual-active; restore single-owner posture.

## Safe rollout pattern

1. Start in `passive` mode and verify endpoints.
2. Switch exactly one instance to `active`.
3. Observe delivery counters and lag for one canary window.
4. Keep rollback path ready by returning to `passive`.

## User-level guarantees and limits

- Guaranteed: at-least-once delivery with ordering constraints per outbox model.
- Not guaranteed: exactly-once downstream side effects.
- Requirement: downstream consumer dedupe by `eventId` and/or `idempotencyKey`.

## References

- [Outbox Worker Runbook](../runbooks/outbox-worker-g5.md)
- [Outbox worker technical manual](outbox-worker-technical-manual-20260404.md)
- [R-20260311-G5-4-QA-01](../risk-register/quality/R-20260311-g5-4-operability-and-fencing-residuals.md)
