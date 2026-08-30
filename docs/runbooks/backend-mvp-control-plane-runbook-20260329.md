---
title: Backend MVP Control-Plane Runbook
status: Review
owner: API / Runtime / Docs
last_reviewed: 2026-08-15
---

# Backend MVP Control-Plane Runbook

## Purpose

Operate and diagnose the current backend MVP control-plane without assuming any
non-implemented runtime behavior.

Operator outcome for this runbook:

- bring the API up in a safe baseline (`bootstrap`)
- keep it healthy during routine operations (`daily operate`)
- isolate failures quickly with explicit checks (`diagnose`)

## MVP Surface

Protected runtime routes (enabled only when OIDC is configured):

- `POST /runs/start`
- `GET /runs`
- `GET /runs/:runId`
- `GET /runs/:runId/events`
- `POST /runs/:runId/signal`
- `POST /runs/:runId/cancel`

Public operational routes:

- `GET /healthz` (always registered)
- `GET /readyz` only when `DVT_READYZ_ENABLED=true`

## Operation-Level Authorization Matrix

Required action grants by endpoint:

| Endpoint                                                       | Action          |
| -------------------------------------------------------------- | --------------- |
| `POST /runs/start`                                             | `run:start`     |
| `GET /runs`                                                    | `run:list`      |
| `GET /runs/:runId`                                             | `run:view`      |
| `GET /runs/:runId/events`                                      | `run:logs:view` |
| `POST /runs/:runId/signal` with `PAUSE`/`RESUME`               | `run:signal`    |
| `POST /runs/:runId/cancel`                                     | `run:cancel`    |
| `POST /runs/:runId/signal` with `CANCEL` (compat mode enabled) | `run:cancel`    |

## Auth Scope Handling (MVP)

For protected runtime calls, enforce all of the following:

- valid bearer token (`Authorization: Bearer <token>`)
- tenant-scoped request context (`tenantId` in query/path where applicable)
- action grant that matches the endpoint matrix above

When denied, treat the response as expected policy behavior first, not as
runtime instability:

- `401`: authentication failure (token/jwks/issuer/audience mismatch)
- `403`: authenticated but missing scope/action grant
- `404` on protected routes: runtime route registration not active (OIDC posture not complete)

## Required Environment Posture

To enable protected runtime routes:

- `OIDC_JWKS_URI`
- `OIDC_ISSUER`
- `OIDC_AUDIENCE`
- `DATABASE_URL` (required when OIDC-protected runtime is enabled)

For SQL-first PostgreSQL plans, both the API and the Temporal worker require the
same `DVT_POSTGRES_CREDENTIAL_BINDINGS` JSON object. Keys use
`postgres:<alias>` and values are PostgreSQL connection URLs; the alias is the
credential reference persisted by the governed warehouse connection. Do not
persist the URL in Canvas or plan payloads.

For file-backed run contexts, configure the same mounted artifact boundary for
the API and Temporal worker. An explicit `file` bundle backend uses
`DVT_DBT_BUNDLE_FILE_ROOT`; the PostgreSQL-only fallback uses
`DVT_WORKSPACE_FILES_ROOT/.dvt/run-context-artifacts`. Production worker startup
fails closed if neither file root is explicit. S3-backed contexts do not use
this file boundary.

Optional route exposure flags:

- `DVT_READYZ_ENABLED=true` to expose `/readyz`
- `DVT_VERSION_ENABLED=true` to expose `/version`
- `DVT_DB_READY_ENABLED=true` to expose `/db/ready`

## Bootstrap Checklist

1. Validate env posture for runtime:
   - OIDC variables and `DATABASE_URL` are set.
2. Start API service.
3. Verify base liveness:
   - `GET /healthz` returns `200`.
4. If readiness is required in deployment:
   - set `DVT_READYZ_ENABLED=true`
   - verify `GET /readyz` returns `200` or `503` with structured readiness body.
5. Verify protected runtime path with valid token and tenant scope:
   - `POST /runs/start`
   - `GET /runs`

### Local dev-stack shortcut

For local shell + API startup, `pnpm dev:app` now bootstraps the canonical local
Docker Postgres proof environment automatically when `DATABASE_URL` is not
already set in the caller environment. It also enables `/db/ready` for the API
process and waits for that probe before reporting the stack ready.

When the coordinated dev stack enables protected runtime locally and
`TEMPORAL_ADDRESS` is not already configured, it also starts a local Temporal
dev service and injects that runtime posture:

- `TEMPORAL_ADDRESS=<local Temporal dev service address>`
- `TEMPORAL_NAMESPACE=<local Temporal dev service namespace>`
- `TEMPORAL_TASK_QUEUE=dvt-temporal`
- `DVT_TEMPORAL_WORKER_READYZ_URL=http://127.0.0.1:9468/readyz`

The wrapper starts the API and then `dvt-temporal-worker` with the same
Temporal/Postgres posture. It waits for the worker `GET /readyz` probe before
starting the web dev server. If `TEMPORAL_ADDRESS` is explicitly set by the
caller, the wrapper preserves that external Temporal posture and fails
bootstrap if the configured Temporal runtime cannot be reached.

When that protected-runtime posture requires the Temporal worker, the wrapper
first builds the worker's runtime workspace dependency closure through the
canonical `scripts/build-workspace-runtime-deps.cjs` helper. A dependency build
failure aborts startup before the API, worker, or web processes are exposed.
After preparation, startup order is API, Temporal worker readiness, and then the
web dev server.

When protected-runtime OIDC posture is otherwise absent, the coordinated dev
stack now also bootstraps a local JWKS-backed auth posture for Canvas and other
protected-runtime consumers:

- local `OIDC_JWKS_URI`, `OIDC_ISSUER`, and `OIDC_AUDIENCE` are injected for the
  API process
- a dev bearer token is injected into the web process through
  `VITE_API_BEARER_TOKEN`
- a dev-only token refresh endpoint is injected into the web process through
  `VITE_API_BEARER_TOKEN_REFRESH_URL`
- that local bearer token defaults to a 24-hour TTL; the frontend must not send
  an expired local JWT when the refresh endpoint is available, and instead
  requests a freshly signed token before protected runtime calls
- `DVT_DEV_PROTECTED_RUNTIME_TOKEN_TTL_SECONDS` can override that TTL when a
  longer or shorter local token lifetime is required
- a default principal grant is seeded for the default workspace scope
  (`tenant/project/dev`) with the protected draft read/write actions required by
  Canvas authoring

This bootstrap exists to satisfy the real protected-runtime contract locally. It
does not change the production auth model and must not be treated as a product
login flow.

Use `pnpm dev:app -- --skip-postgres` only when you intentionally want the old
behavior and are providing database posture yourself. With no database posture,
the local protected runtime is not bootstrapped and the Temporal worker is not
started.

## Bootstrap Failure Shortcuts

- If startup fails with OIDC/runtime wiring errors: re-check the required env
  posture section and restart.
- If startup fails while waiting for `Temporal worker readyz` with an explicit
  `TEMPORAL_ADDRESS`: start or repair that Temporal service, then restart
  `pnpm dev:app`.
- If startup fails while waiting for `Temporal worker readyz` without an
  explicit `TEMPORAL_ADDRESS`: inspect the local Temporal dev-service
  bootstrap and the `dvt-temporal-worker` logs first.
- If protected routes do not register: verify OIDC variables are all present
  and non-empty.
- If `/healthz` is not reachable: treat as process/container issue first
  (service not listening / crash loop).

## Daily Operations

Health check:

```bash
curl -i http://localhost:3000/healthz
```

Readiness check (only if enabled):

```bash
curl -i http://localhost:3000/readyz
```

Protected route check (example):

```bash
curl -i "http://localhost:3000/runs?tenantId=<tenant-id>&projectId=<project-id>&environmentId=<environment-id>" \
  -H "Authorization: Bearer <token>" \
  -H "Accept: application/json"
```

Run command checks:

```bash
curl -i "http://localhost:3000/runs/<runId>/events?tenantId=<tenant-id>&limit=10" \
  -H "Authorization: Bearer <token>" \
  -H "Accept: application/json"
```

Daily minimum cadence:

1. Confirm `/healthz` remains `200`.
2. If enabled, confirm `/readyz` stays stable (no sustained `503`).
3. Sample one protected read route (`GET /runs` or `GET /runs/:runId`) with a
   valid token and tenant scope.
4. If authorization failures increase, verify policy/token posture before
   runtime rollback decisions.

## Diagnosis Guide

Use this order to reduce false signals:

1. Process up? (`/healthz`)
2. Readiness posture correct? (`/readyz` enabled + response)
3. Protected route registration active? (OIDC env complete)
4. Auth/policy correct? (`401` vs `403`)
5. Runtime dependency degraded? (readiness probe failures, reconciler state)

### Symptom: `/readyz` returns 404

Likely cause: `DVT_READYZ_ENABLED` is not `true`.  
Action: enable `DVT_READYZ_ENABLED=true` in deployment env and restart.

### Symptom: protected `/runs*` endpoints return 404 or are not registered

Likely cause: OIDC posture is incomplete.  
Action: set `OIDC_JWKS_URI`, `OIDC_ISSUER`, `OIDC_AUDIENCE`, plus `DATABASE_URL`
and restart.

In the coordinated local stack, the same symptom usually means the dev-stack
auth bootstrap did not run or the API was started outside `pnpm dev:app`.

### Symptom: protected endpoints return 401/403

Likely cause: invalid token or missing tenant scope/permissions.  
Action: validate token issuer/audience and tenant authorization policy.

For local Canvas authoring through `pnpm dev:app`, diagnose in this order:

1. `GET /workspace/graph/draft?...` returns `401`
   - browser did not attach the injected bearer token or the web process was
     started without the coordinated env
2. `GET /workspace/graph/draft?...` returns `403`
   - principal grant seeding did not match the active workspace scope
3. `GET /workspace/graph/draft?...` returns `404`
   - protected runtime routes are still not registered, so OIDC posture is not
     active in the API process

### Symptom: `/readyz` returns 503

Likely cause: readiness probes fail (database/runtime readiness/reconciler
state).  
Action: inspect API logs for readiness probe failures and reconciler health
status transitions.

## Fallback And Boundaries

Fallback posture for MVP operation:

- If protected runtime cannot start because OIDC posture is incomplete, keep
  API liveness available via `/healthz` and fix env posture before exposing
  runtime commands.
- If readiness is required by deployment policy, enforce
  `DVT_READYZ_ENABLED=true`; otherwise treat `/readyz` as intentionally
  unavailable.

Out of scope for this runbook:

- automatic run terminalization guarantees
- scale-tuning and sharding procedures
- retention and partition operations

Use dedicated lane-D runbooks/procedures when those slices are promoted.

## Distributed consistency reference

Use the system consistency model for questions such as:

- which subsystem is authoritative during `startRun` partial failure;
- when `STALE` or `UNKNOWN` freshness is still a valid canonical response;
- which guarantee applies between outbox commit and downstream delivery;
- which incidents are repair windows rather than semantic corruption.

Canonical reference:

- [Distributed consistency model](../architecture/system/distributed-consistency-model.md)

## Validation Baseline

```bash
pnpm --filter dvt-api test
pnpm --filter dvt-api test:integration
pnpm --filter @dvt/engine test
pnpm verify:prepush
```

## Canonical SLA Reference

For runtime latency, freshness, outbox drain, and alert thresholds, use:

- [API Runtime SLA Canonical](./api-runtime-sla-canonical-20260404.md)
- [Read-Your-Writes Freshness SLO](./read-your-writes-freshness-slo-20260330.md)
- [Distributed consistency model](../architecture/system/distributed-consistency-model.md)
