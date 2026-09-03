---
title: Temporal Worker DBT Runtime Runbook
status: Active
owner: Runtime / SRE / Delivery
last_reviewed: 2026-04-14
---

# Temporal Worker DBT Runtime Runbook

Operational baseline for `apps/temporal-worker`.

## Purpose

Use this standalone worker as the canonical Temporal execution host for the
`temporal` provider path, including the DBT plugin-backed runtime when that
mode is enabled.

This worker owns:

- `TemporalWorkerHost` startup and shutdown
- `PostgresStateStoreAdapter` lifecycle for runtime state writes
- artifact-backed `RunExecutionContext` resolution
- DBT CLI host wiring when `DVT_TEMPORAL_DBT_ENABLED=true`
- `/healthz`, `/readyz`, and `/metrics`

Worker profile boundary:

- the Temporal core activity registry is plugin-free by default
- DBT step kinds are registered only through the worker DBT profile when
  `DVT_TEMPORAL_DBT_ENABLED=true`
- DBT runtime dependencies (`runExecutionContextReader` and `dbtPluginRunner`)
  are not part of the generic `ActivityDeps` contract
- `DVT_TEMPORAL_DBT_ENABLED=false` omits the DBT registry entirely instead of
  registering DBT activities that fail later at execution time

DBT bundle rule:

- `pluginContexts.dbt.projectBundleRef` must be an immutable bundle ref with
  `kind=dbt-project-bundle`, a required `sha256`, and a required `tenantId`
- the bundle locator itself must be tenant-scoped and canonical:
  `s3://<bucket>/tenants/<tenantId>/<sha256>` or
  `file://.../tenants/<tenantId>/<sha256>`
- the worker binds DBT bundle reads to the configured artifact-store bucket or
  file root; the payload cannot redirect reads to another store
- the worker verifies bundle bytes against that `sha256` before materializing
  the project directory
- the worker rejects bundles whose `tenantId` does not match the run tenant

DBT admission rule:

- DBT-bearing runs must arrive with a `runExecutionContextRef`
- the resolved `RunExecutionContext` must contain `pluginContexts.dbt`
- admission rejects the run before queueing when that DBT bundle context is
  missing, tenant-mismatched, or not bound to the configured artifact store

This worker does not own:

- HTTP ingress or protected runtime route mounting
- engine lifecycle semantics
- preview/profile admission contracts
- DBT marketplace packaging or sandbox policy beyond the current local-process
  boundary

## Startup model

The standalone process starts in this order:

1. load and validate environment
2. start the operational server
3. build runtime dependencies
4. validate DBT CLI availability when DBT mode is enabled
5. run Postgres state-store migrations when `DVT_TEMPORAL_WORKER_RUN_MIGRATIONS=true`
6. connect to Temporal
7. start `TemporalWorkerHost`
8. become ready

If `DVT_TEMPORAL_DBT_ENABLED=true`, startup also validates DBT CLI
availability before the worker enters the ready state.

## Required environment

### Always required

- `DATABASE_URL`
- `DVT_PG_SCHEMA` default `dvt`
- `DVT_PG_STATEMENT_TIMEOUT_MS` default `0`
- `DVT_PG_QUERY_TIMEOUT_MS` default `0`
- `DVT_RUNSTATE_CIRCUIT_BREAKER_FAILURE_THRESHOLD` default `3`; consecutive
  failures before the run-state command circuit opens
- `DVT_RUNSTATE_CIRCUIT_BREAKER_OPEN_DURATION_MS` default `10000`; milliseconds
  the circuit stays open before transitioning to half-open
- `DVT_RUNSTATE_CIRCUIT_BREAKER_OPERATION_TIMEOUT_MS` default `2000`;
  milliseconds before a guarded state-store operation is considered timed out
- `DVT_TEMPORAL_WORKER_RUN_MIGRATIONS` default `false`
- `TEMPORAL_ADDRESS`
- `TEMPORAL_NAMESPACE`
- `TEMPORAL_TASK_QUEUE`
- `TEMPORAL_IDENTITY` optional
- `TEMPORAL_CONNECT_TIMEOUT_MS` optional
- `TEMPORAL_REQUEST_TIMEOUT_MS` optional
- `TEMPORAL_MAX_START_PAYLOAD_BYTES` optional
- `TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES` optional
- `TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS` optional; unset uses the governed
  default rollover threshold, while explicit `0` disables rollover only for
  local diagnostics or incident rollback
- `DVT_TEMPORAL_ADMIN_HOST` default `0.0.0.0`
- `DVT_TEMPORAL_ADMIN_PORT` default `9468`
- `DVT_TEMPORAL_DBT_ENABLED` default `false`

### Required when DBT mode is enabled

- `DVT_DBT_BIN` default `dbt`
- `DVT_DBT_WORKDIR_ROOT` default OS temp path under `dvt/temporal-worker`
- `DVT_DBT_BUNDLE_STORE_BACKEND` required: `s3` or `file`
- `DVT_DBT_BUNDLE_S3_BUCKET` required when backend is `s3`
- `DVT_DBT_BUNDLE_FILE_ROOT` required when backend is `file`

DBT mode rule:

- when `DVT_TEMPORAL_DBT_ENABLED=false`, the worker may be healthy and ready
  without a DBT runner
- when `DVT_TEMPORAL_DBT_ENABLED=true`, startup must validate the configured
  DBT binary and the worker must stay non-ready on configuration/runtime
  failure

## Endpoints

- `GET /healthz`: process liveness and coarse runtime state.
  Response body: `ok`, `state`, `service`, `dbtEnabled`, `runStateCircuitState`.
  Returns `200` when `ok=true`, `503` when `ok=false`.
- `GET /readyz`: readiness plus last runtime error details.
  Response body: `ok`, `ready`, `state`, `service`, `dbtEnabled`, `runStateCircuitState`,
  `lastErrorMessage`, `lastErrorAt`.
  Returns `200` when `ready=true`, `503` when `ready=false`.
- `GET /metrics`: Prometheus-style worker metrics in `text/plain` format with
  `Content-Type: text/plain; version=0.0.4; charset=utf-8`.

## Runtime states

- `starting`: process bootstrapped but runtime not yet ready
- `running`: worker is connected and ready to poll Temporal
- `stopping`: shutdown requested
- `failing`: runtime error observed
- `stopped`: worker shutdown completed

Readiness rule:

- `ready=true` only when state is `running`
- `ready=false` while bootstrapping, failing, stopping, or stopped
- DBT-enabled startup failures must keep `/readyz` at `503`

## Metrics

### Worker lifecycle

- `dvt_temporal_worker_up`
- `dvt_temporal_worker_ready`
- `dvt_temporal_worker_dbt_enabled`
- `dvt_temporal_worker_state{state=*}`
- `dvt_temporal_worker_start_total`
- `dvt_temporal_worker_stop_total`
- `dvt_temporal_worker_error_total`
- `dvt_temporal_worker_started_timestamp_seconds`
- `dvt_temporal_worker_last_error_timestamp_seconds`

### Run-state command circuit breaker

Tracked when the worker binds the [`AR-C4`](../../planning/closeouts/20260415-ar-c4-run-state-circuit-breaker-closeout.md)
run-state command circuit breaker:

- `dvt_temporal_worker_run_state_circuit_state{state=*}` — `closed`, `open`, or `half_open`
- `dvt_temporal_worker_run_state_circuit_trip_total` — circuit open transitions
- `dvt_temporal_worker_run_state_circuit_rejection_total` — fast-fail rejections while open
- `dvt_temporal_worker_run_state_circuit_failure_total` — guarded state-store failures
- `dvt_temporal_worker_run_state_circuit_timeout_total` — guarded state-store timeouts
- `dvt_temporal_worker_run_state_circuit_half_open_probe_total` — half-open probe attempts

## Rollout posture

Recommended rollout order:

1. deploy the worker with `DVT_TEMPORAL_DBT_ENABLED=false`
2. verify `/healthz`, `/readyz`, and `/metrics`
3. verify the worker connects to the intended Temporal task queue
4. enable `DVT_TEMPORAL_DBT_ENABLED=true` only after the DBT binary and workdir
   posture are available in that environment
5. verify DBT-enabled startup stays ready and does not enter `failing`

Workflow input-shape changes must follow
`temporal-planref-drained-cutover-20260427.md` unless a versioned workflow path
has been implemented. Do not poll the same task queue with old full-plan
workflow code and the current PlanRef-plus-cursor workflow code at the same
time.

Canary checks when DBT mode is enabled:

1. `/healthz` returns `200`
2. `/readyz` returns `200`
3. `dvt_temporal_worker_dbt_enabled 1`
4. `dvt_temporal_worker_state{state="running"} 1`
5. `dvt_temporal_worker_error_total` stays flat during the observation window

## Local Docker canary

Use the local canary before claiming DBT-enabled worker readiness. It starts the
canonical Docker Postgres proof environment, a Temporal local test service, the
standalone worker host, the operational HTTP server, a file-backed DBT project
bundle, and one DBT-enabled workflow.

PowerShell:

```powershell
pnpm postgres:local:reset
$env:DVT_PG_INTEGRATION = '1'
$env:DVT_PG_URL = 'postgresql://dvt:dvt@localhost:5432/dvt'
$env:DATABASE_URL = 'postgresql://dvt:dvt@localhost:5432/dvt'
pnpm --filter dvt-temporal-worker test -- test/host/runTemporalWorkerHost.test.ts
pnpm postgres:local:down
```

The canary asserts:

- `/healthz` returns `200`
- `/readyz` returns `200` with `state=running` and `dbtEnabled=true`
- `dvt_temporal_worker_up`, `dvt_temporal_worker_ready`, and
  `dvt_temporal_worker_dbt_enabled` are `1`
- `dvt_temporal_worker_error_total` remains flat
- DBT step invocations reach `s-1`, `s-2`, and `s-3`
- Postgres run events reach `RunCompleted`

## First checks during incident triage

1. Check `/healthz`
2. Check `/readyz`
3. Check `dvt_temporal_worker_state{state=*}`
4. Check `dvt_temporal_worker_error_total`
5. Check logs for DBT CLI validation failures, artifact-read failures, or
   Temporal connection errors

## Failure modes to expect

### `/readyz` returns `503` and `dbtEnabled=false`

Most likely causes:

- Postgres bootstrap failure
- schema not pre-applied while `DVT_TEMPORAL_WORKER_RUN_MIGRATIONS=false`
- Temporal connection/start failure
- worker shutdown already requested

### `/readyz` returns `503` and `dbtEnabled=true`

Most likely causes:

- DBT binary missing or not executable
- invalid `DVT_DBT_WORKDIR_ROOT`
- artifact-backed `RunExecutionContext` or bundle read failure
- DBT bundle integrity mismatch (`projectBundleRef.sha256` does not match bytes)
- worker runtime entered `failing`

### Run-state command circuit breaker is `open`

The circuit breaker guards state-store writes from Temporal activities (see
[`AR-C4`](../../planning/closeouts/20260415-ar-c4-run-state-circuit-breaker-closeout.md)):

- `dvt_temporal_worker_run_state_circuit_state{state="open"} 1` indicates the
  state store has been unreachable or timing out.
- `dvt_temporal_worker_run_state_circuit_rejection_total` shows how many
  operations were fast-failed without attempting the store.
- `dvt_temporal_worker_run_state_circuit_trip_total` shows how many times
  the circuit has opened.
- Check Postgres connectivity, connection pool pressure, and query timeouts.
- The circuit auto-transitions to `half_open` after the configured
  `DVT_RUNSTATE_CIRCUIT_BREAKER_OPEN_DURATION_MS` window.

### `/metrics` shows `dvt_temporal_worker_dbt_enabled 0`

Most likely cause:

- DBT mode is intentionally disabled in that environment

### Worker exits immediately on startup

Most likely causes:

- invalid environment
- DBT CLI validation failed while DBT mode is enabled
- Temporal or Postgres bootstrap failed before the host entered `running`

## Shutdown rule

- `SIGINT` and `SIGTERM` must stop the runtime cleanly
- shutdown stops the Temporal worker host, then closes the Temporal connection,
  then closes Postgres resources, then stops the operational server
- shutdown failures must be treated as operational defects, not ignored

## Rollout acceptance evidence (TF-C3-E)

TF-C3-E repository acceptance is closed by
[`ed-20260514-temporal-worker-dbt-canary.md`](../evidence/ed-20260514-temporal-worker-dbt-canary.md).
That evidence runs the canonical local Docker canary with DBT mode enabled,
Docker-backed Postgres, a Temporal test service, plan-store artifacts,
run metadata, readiness endpoints, metrics, a file-backed DBT project bundle,
and one DBT-enabled workflow.

The following validation steps remain the production rollout checklist for any
deployed environment. They are operational release gates, not missing in-repo
TF-C3-E closure:

1. **Deploy worker to staging** - start the worker with `DVT_TEMPORAL_DBT_ENABLED=true`
   and valid Postgres + Temporal connection strings.
2. **Verify `/healthz` returns `200` with `state: "running"`** - confirms the
   operational server started and the monitor reports a running worker. A `200`
   without `state: "running"` is liveness evidence only.
3. **Verify `/readyz` returns `200` with `dbtEnabled: true`** - confirms the DBT
   plugin profile was built and the runtime completed startup without error.
4. **Verify `/metrics` target registers `dvt_temporal_worker_up 1`** - confirms
   Prometheus scrape target is live and the worker lifecycle metric is exposed.
5. **Run one DBT-enabled plan end-to-end** - submit a plan with a DBT step via
   the Temporal workflow, confirm the activity completes and the DBT CLI process
   exits cleanly.
6. **Confirm `dvt_temporal_worker_error_total` remains flat** - observe the
   counter during the test window; any increment indicates an unhandled error in
   the worker runtime.

Until these steps pass in a target environment, that environment is not
production-accepted. The repository-level TF-C3-E canary and runbook acceptance
are closed.

## Current limits

- DBT execution currently uses a local CLI process behind the worker host
- richer DBT result-evidence materialization is not part of this slice
- rollout wiring outside the repo is still required before calling this path
  production-accepted
