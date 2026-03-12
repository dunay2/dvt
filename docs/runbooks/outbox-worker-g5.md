---
title: Outbox Worker Runbook
status: Active
owner: sre
last_reviewed: 2026-03-12
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
- `active` now acquires shard-scoped PostgreSQL advisory locks on a dedicated ownership session before delivery starts
- same-shard dual-active startup should be refused by that fence
- if the dedicated ownership session is lost after startup, the host must withdraw ownership and stop the runtime before admitting more work

## Endpoints

- `GET /healthz`: process liveness plus effective owner visibility
- `GET /readyz`: runtime readiness plus effective owner visibility
- `GET /metrics`: Prometheus-style runtime metrics

Operational defaults:

- `DVT_OUTBOX_ADMIN_HOST=0.0.0.0`
- `DVT_OUTBOX_ADMIN_PORT=9464`
- `DVT_OUTBOX_SHARD_COUNT=1`
- `DVT_OUTBOX_OWNED_SHARD_IDS=0`
- set `DVT_OUTBOX_OWNERSHIP_MODE` explicitly in every environment
- `DATABASE_URL` and event bus configuration are required only in `active` mode

Shard topology rule:

- keep one deployment-stable `DVT_OUTBOX_SHARD_COUNT` across write-side and worker-side environments
- when `DVT_OUTBOX_SHARD_COUNT>1`, every active worker must set explicit `DVT_OUTBOX_OWNED_SHARD_IDS`
- shard ownership is enforced at the claim query, not by scanning the full pending outbox and filtering in memory
- active startup acquires advisory locks for the configured shard list on one dedicated PostgreSQL session; if any required lock is unavailable, the host stays passive

## Runtime states

- `starting`: process bootstrapped but runtime not yet ready to drain, including active bootstrap or migration work before the polling loop begins
- `passive`: process is alive but intentionally non-owning; no polling runtime is active
- `idle`: worker is healthy and no eligible outbox records were claimed in the last tick
- `draining`: worker is healthy and actively draining claimed records
- `failing`: last runtime tick failed; retries/backoff are active
- `stopped`: worker has been shut down and should not be considered live

Readiness rule:

- `ready=true` only for `idle` and `draining`
- keep readiness `false` in `passive` mode because the process is explicitly non-owning
- keep readiness `false` while any retry backlog is still pending for the owned shard set, even if a later poll claims nothing because the failed record is waiting on backoff
- if active ownership is unavailable at startup, the host must stay `passive`, keep `owner=false`, and must not start delivery
- size readiness freshness to cover the configured in-flight batch budget, not only poll/backoff sleep, so healthy long-running HTTP drains do not flap `503`

Migration rule:

- keep `DVT_OUTBOX_WORKER_RUN_MIGRATIONS=false` for runtime-only DB roles
- set `DVT_OUTBOX_WORKER_RUN_MIGRATIONS=true` only for local/bootstrap environments where the worker may execute schema DDL

Shutdown rule:

- `SIGINT` / `SIGTERM` must stop the host cleanly in both `passive` and `active` ownership modes
- if shutdown lands while the active runtime is still bootstrapping or running migrations, startup is aborted and pending adapter work is interrupted before the polling loop starts
- if runtime creation resolves after shutdown was already requested, the host must stop that runtime instead of starting it

Fixed correctness policy in this slice:

- `DVT_OUTBOX_HTTP_TARGET_URL` must be a valid `http` or `https` URL when `DVT_OUTBOX_EVENT_BUS_MODE=http`
- `MAX_OUTBOX_ATTEMPTS` stays fixed at `10`
- stale claims expire after `5 minutes`
- retry scheduling stays on exponential backoff with base `1s` and cap `60s`

## Key metrics

- `dvt_outbox_runtime_state{state=*}`
- `dvt_outbox_runtime_owner`
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
- Ensure no other outbox publisher path is active for the same environment during the canary window.
- Verify:
  - `/readyz` becomes `200`
  - `dvt_outbox_runtime_state{state="draining"}` or `idle` appears
  - `dvt_outbox_delivered_records_total` increases when test events are enqueued
  - `dvt_outbox_runtime_errors_total` stays flat during the canary window

Minimal canary evidence to capture:

1. environment name and observation window
2. the exact `DVT_OUTBOX_OWNERSHIP_MODE` value used by the canary worker
3. proof that no second active outbox publisher path was running
4. one successful test-event delivery during the same window
5. rollback result if the rollout is reverted

Automation helper:

- `scripts/outbox-worker-canary-evidence.ps1` captures `/readyz`, baseline/final `/metrics`, executes one trigger, and writes `docs/evidence/ED-<date>-g5-canary-<env>.md`
- prefer `-TriggerCommand` when the environment already has a real trigger path for the event you want to observe
- use `-PsqlDsn` only as an operational fallback when no environment-native trigger path is available; that mode inserts one `RunQueued` outbox row directly with the same shard formula used by the PostgreSQL adapter
- the script records deployment and probe state automatically, but a human still needs to supply the proof that no second active outbox publisher path was running if that fact is known outside Kubernetes deployment state

Example:

```powershell
.\scripts\outbox-worker-canary-evidence.ps1 `
  -EnvironmentName dev-canary `
  -WorkerAdminUrl http://127.0.0.1:9464 `
  -Namespace dvt `
  -Deployment outbox-worker `
  -ShardCount 1 `
  -TriggerCommand "Write-Output 'replace with the real environment trigger command'" `
  -OwnerProofNote "Confirmed no second active outbox publisher path during the observation window."
```

## Rollback expectations

- Switch the standalone worker back to `DVT_OUTBOX_OWNERSHIP_MODE=passive` or stop it entirely before re-enabling any other publisher path for the same environment.
- Re-enable another publisher path only after the standalone process is confirmed non-owning.
- Do not run two active owners for the same production responsibility.
- After rollback, verify outbox lag stabilizes and no duplicate owner remains.

## First checks during incident triage

1. Check `/healthz` and `/readyz`.
2. Check `dvt_outbox_runtime_state` and `dvt_outbox_runtime_errors_total`.
3. Check `dvt_outbox_oldest_claimed_lag_seconds` for backlog growth.
4. Inspect logs for `outbox records claimed`, `outbox record scheduled for retry`, and `outbox record dead-lettered`.

## Known limits in this slice

- Downstream delivery contract is still a minimal HTTP `POST` with `{ "events": [...] }`.
- Downstream consumers are required to be idempotent at that boundary, using the existing envelope `eventId` and/or `idempotencyKey` to absorb redelivery.
- Ownership mode is now explicit and required in the standalone host, but full environment cutover still depends on deployment wiring outside the repo.
- Startup advisory-lock fencing now exists on dedicated sessions, and lock-loss now forces host shutdown; concurrent-worker proof and rollout wiring remain pending outside this slice.
