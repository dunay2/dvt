---
title: Outbox Worker Runbook
status: Active
owner: sre
last_reviewed: 2026-03-08
---

# Outbox Worker Runbook

Operational baseline for `apps/outbox-worker` during `G5`.

## Purpose

Use this worker as the single active owner of outbox polling and downstream event publication for controlled environments.

## Endpoints

- `GET /healthz`: process liveness
- `GET /readyz`: runtime readiness
- `GET /metrics`: Prometheus-style runtime metrics

Default bind:

- `DVT_OUTBOX_ADMIN_HOST=127.0.0.1`
- `DVT_OUTBOX_ADMIN_PORT=9464`

## Runtime states

- `starting`: process bootstrapped but runtime not yet ready to drain
- `idle`: worker is healthy and no eligible outbox records were claimed in the last tick
- `draining`: worker is healthy and actively draining claimed records
- `failing`: last runtime tick failed; retries/backoff are active
- `stopped`: worker has been shut down and should not be considered live

Readiness rule:

- `ready=true` only for `idle` and `draining`
- keep readiness `false` while any retry backlog is still pending, even if a later poll claims nothing because the failed record is waiting on backoff

Migration rule:

- keep `DVT_OUTBOX_WORKER_RUN_MIGRATIONS=false` for runtime-only DB roles
- set `DVT_OUTBOX_WORKER_RUN_MIGRATIONS=true` only for local/bootstrap environments where the worker may execute schema DDL

## Key metrics

- `dvt_outbox_runtime_state{state=*}`
- `dvt_outbox_runtime_ready`
- `dvt_outbox_claimed_records_total`
- `dvt_outbox_delivered_records_total`
- `dvt_outbox_retried_records_total`
- `dvt_outbox_dead_lettered_records_total`
- `dvt_outbox_runtime_errors_total`
- `dvt_outbox_oldest_claimed_lag_seconds`

## Canary expectations

- Run exactly one active worker instance per environment during the canary.
- Keep the old embedded delivery path disabled or otherwise non-owning.
- Verify:
  - `/readyz` becomes `200`
  - `dvt_outbox_runtime_state{state="draining"}` or `idle` appears
  - `dvt_outbox_delivered_records_total` increases when test events are enqueued
  - `dvt_outbox_runtime_errors_total` stays flat during the canary window

## Rollback expectations

- Stop the standalone worker first.
- Restore the previous owner of polling only after the standalone process is confirmed stopped.
- Do not run two active owners for the same production responsibility.
- After rollback, verify outbox lag stabilizes and no duplicate owner remains.

## First checks during incident triage

1. Check `/healthz` and `/readyz`.
2. Check `dvt_outbox_runtime_state` and `dvt_outbox_runtime_errors_total`.
3. Check `dvt_outbox_oldest_claimed_lag_seconds` for backlog growth.
4. Inspect logs for `outbox records claimed`, `outbox record scheduled for retry`, and `outbox record dead-lettered`.

## Known limits in this slice

- Downstream delivery contract is still a minimal HTTP `POST` with `{ "events": [...] }`.
- Canary/rollback are documented here, but environment cutover wiring still belongs to the later `G5` slice.
- Multi-worker ordering hardening is still blocked on ADR-0009 enforcement.
