---
title: Frontend-facing backend contract MVP-E1 2026-04-04
status: Active
owner: Frontend / API / Architecture
last_reviewed: 2026-04-04
---

# Frontend-facing backend contract MVP-E1 2026-04-04

## Purpose

Freeze the backend surface that `apps/web` can promise today, including health
semantics consumed by `F-03`.

## Governing sources

- `apps/api/src/entrypoints/http/runtimeRoutes.constants.ts`
- `apps/api/src/app.ts`
- `apps/api/src/routes/healthContract.ts`
- `apps/api/src/routes/health.ts`
- `docs/planning/proposals/nice-to-have/frontend-and-ux/mvp-e1-f03-frontend-backend-contract-and-health-plan-20260404.md`

## Protected runtime routes (OIDC required)

The routes below are only registered when OIDC is configured
(`OIDC_JWKS_URI`, `OIDC_ISSUER`, `OIDC_AUDIENCE`).

| Method | Path                  | Auth posture                              | Frontend expectation                                                |
| ------ | --------------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| `POST` | `/runs/start`         | authenticated + tenant and project scoped | Start a run when request payload is valid and caller is authorized. |
| `GET`  | `/runs`               | authenticated + tenant and project scoped | List runs for scoped tenant/project/environment filters.            |
| `GET`  | `/runs/:runId`        | authenticated + tenant scoped             | Read one run snapshot if caller is authorized for that tenant.      |
| `GET`  | `/runs/:runId/events` | authenticated + tenant scoped             | Read run event stream for an authorized run.                        |
| `POST` | `/runs/:runId/signal` | authenticated + tenant scoped             | Send an allowed signal to an authorized run.                        |
| `POST` | `/runs/:runId/cancel` | authenticated + tenant scoped             | Cancel an authorized run.                                           |

## Public/optional health and info endpoints

| Method | Path        | Auth posture             | Notes                                                    |
| ------ | ----------- | ------------------------ | -------------------------------------------------------- | ---------- |
| `GET`  | `/healthz`  | public                   | Always mounted. Returns `ok: true` with `status: healthy | degraded`. |
| `GET`  | `/readyz`   | public (feature-flagged) | Mounted only when `DVT_READYZ_ENABLED=true`.             |
| `GET`  | `/version`  | public (feature-flagged) | Mounted only when `DVT_VERSION_ENABLED=true`.            |
| `GET`  | `/db/ready` | public (feature-flagged) | Mounted only when DB readiness checks are enabled.       |
| `GET`  | `/`         | public                   | Service liveness metadata.                               |

## Canonical success and error envelope baseline

- Success:
  - Runtime routes return route-specific payloads with HTTP `2xx`.
  - `/healthz` always returns HTTP `200` with semantic status in body.
- Error:
  - Unauthorized/forbidden runtime access must be surfaced by frontend as
    auth-scoped failures, not as route absence.
  - Network and endpoint failures in shell health must map to `offline`.
  - Semantic degradations from health payload must map to `degraded`.

### Canonical examples

Protected runtime success (`2xx`, example `GET /runs/:runId`):

```json
{
  "runId": "run_01JABCDEF123456789",
  "status": "running",
  "tenantId": "tenant_demo",
  "projectId": "project_demo",
  "startedAt": "2026-04-04T10:12:45.000Z"
}
```

Protected runtime auth failures (`401` and `403`):

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Missing or invalid bearer token."
}
```

```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Caller is not authorized for tenant/project scope."
}
```

Health degraded mapping (`200` with semantic degradation):

```json
{
  "ok": true,
  "status": "degraded",
  "components": {
    "intentReconciler": {
      "status": "degraded",
      "reasonCode": "runtime_unavailable"
    }
  }
}
```

Health offline mapping (transport failure reaching `/healthz`):

```json
{
  "kind": "network",
  "statusCode": null,
  "message": "Unable to reach /healthz."
}
```

## Explicit non-promises

- No guarantee that protected runtime routes exist when OIDC is not configured.
- No promise of websocket/live-stream transport from this contract slice.
- No promise of new route families beyond listed runtime and health endpoints.
- No promise that `/readyz`, `/version`, `/db/ready` are enabled in all
  deployments.

## F-03 health semantics consumed by shell

- `ok`: platform snapshot reachable and not degraded.
- `degraded`: snapshot reachable, but `/healthz` or optional probe semantics
  indicate degraded readiness.
- `offline`: required health snapshot cannot be loaded.

Retry/backoff policy in shell:

- Base interval `15s` when state is `ok`.
- Exponential backoff when state is `offline`, capped at `60s`.
- Manual retry is always available from the shell banner.
