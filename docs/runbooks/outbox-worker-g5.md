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

## Ownership mode

- `DVT_OUTBOX_OWNERSHIP_MODE=active`: this process owns outbox polling and downstream publication
- `DVT_OUTBOX_OWNERSHIP_MODE=passive`: this process exposes `/healthz`, `/readyz`, and `/metrics` but does not start the polling runtime
- `DVT_OUTBOX_OWNERSHIP_MODE` is required: do not rely on implicit defaults for production ownership

Safety rule:

- keep exactly one active owner per environment
- use `passive` when the standalone process must be present but non-owning during rollout or rollback

## Endpoints

- `GET /healthz`: process liveness
- `GET /readyz`: runtime readiness
- `GET /metrics`: Prometheus-style runtime metrics

Operational defaults:

- `DVT_OUTBOX_ADMIN_HOST=0.0.0.0`
- `DVT_OUTBOX_ADMIN_PORT=9464`
- set `DVT_OUTBOX_OWNERSHIP_MODE` explicitly in every environment
- `DATABASE_URL` and event bus configuration are required only in `active` mode

## Runtime states

- `starting`: process bootstrapped but runtime not yet ready to drain
- `passive`: process is alive but intentionally non-owning; no polling runtime is active
- `idle`: worker is healthy and no eligible outbox records were claimed in the last tick
- `draining`: worker is healthy and actively draining claimed records
- `failing`: last runtime tick failed; retries/backoff are active
- `stopped`: worker has been shut down and should not be considered live

Readiness rule:

- `ready=true` only for `idle` and `draining`
- keep readiness `false` in `passive` mode because the process is explicitly non-owning
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

- Deploy the standalone process in `passive` mode first when you need endpoint and metrics visibility before ownership transfer.
- Run exactly one active worker instance per environment during the canary.
- Switch `DVT_OUTBOX_OWNERSHIP_MODE=active` only for the chosen canary owner.
- Keep any previous delivery owner disabled or otherwise non-owning before activating the standalone worker.
- Verify:
  - `/readyz` becomes `200`
  - `dvt_outbox_runtime_state{state="draining"}` or `idle` appears
  - `dvt_outbox_delivered_records_total` increases when test events are enqueued
  - `dvt_outbox_runtime_errors_total` stays flat during the canary window

## Rollback expectations

- Switch the standalone worker back to `DVT_OUTBOX_OWNERSHIP_MODE=passive` or stop it entirely before restoring any previous owner.
- Restore the previous owner of polling only after the standalone process is confirmed non-owning.
- Do not run two active owners for the same production responsibility.
- After rollback, verify outbox lag stabilizes and no duplicate owner remains.

## First checks during incident triage

1. Check `/healthz` and `/readyz`.
2. Check `dvt_outbox_runtime_state` and `dvt_outbox_runtime_errors_total`.
3. Check `dvt_outbox_oldest_claimed_lag_seconds` for backlog growth.
4. Inspect logs for `outbox records claimed`, `outbox record scheduled for retry`, and `outbox record dead-lettered`.

## Known limits in this slice

- Downstream delivery contract is still a minimal HTTP `POST` with `{ "events": [...] }`.
- Ownership mode is now explicit and required in the standalone host, but full environment cutover still depends on deployment wiring outside the repo.
- Multi-worker ordering hardening is still blocked on ADR-0009 enforcement.
