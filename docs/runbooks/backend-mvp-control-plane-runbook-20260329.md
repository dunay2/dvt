---
title: Backend MVP Control-Plane Runbook
status: Review
owner: API / Runtime / Docs
last_reviewed: 2026-03-29
---

# Backend MVP Control-Plane Runbook

## Purpose

Operate and diagnose the current backend MVP control-plane without assuming any
non-implemented runtime behavior.

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

## Required Environment Posture

To enable protected runtime routes:

- `OIDC_JWKS_URI`
- `OIDC_ISSUER`
- `OIDC_AUDIENCE`
- `DATABASE_URL` (required when OIDC-protected runtime is enabled)

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
curl -i http://localhost:3000/runs \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: <tenant-id>"
```

Run command checks:

```bash
curl -i http://localhost:3000/runs/<runId>/events \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: <tenant-id>"
```

## Diagnosis Guide

### Symptom: `/readyz` returns 404

Likely cause: `DVT_READYZ_ENABLED` is not `true`.  
Action: enable `DVT_READYZ_ENABLED=true` in deployment env and restart.

### Symptom: protected `/runs*` endpoints return 404 or are not registered

Likely cause: OIDC posture is incomplete.  
Action: set `OIDC_JWKS_URI`, `OIDC_ISSUER`, `OIDC_AUDIENCE`, plus `DATABASE_URL`
and restart.

### Symptom: protected endpoints return 401/403

Likely cause: invalid token or missing tenant scope/permissions.  
Action: validate token issuer/audience and tenant authorization policy.

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

## Validation Baseline

```bash
pnpm --filter dvt-api test
pnpm --filter dvt-api test:integration
pnpm --filter @dvt/engine test
pnpm verify:prepush
```
