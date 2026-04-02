---
title: ED-20260320 - API runtime query integration
status: accepted
date: 2026-03-20
owners: Engineering
arc_level: ARC-1
breaking: false
evidence_class: critical
code_refs:
  - apps/api/package.json
  - apps/api/vitest.integration.config.ts
  - apps/api/test/integration/protectedRuntime.integration.test.ts
  - docs/architecture/system-delivery-status.md
  - docs/planning/status/canonical-doc-code-matrix.md
  - docs/guides/testing-and-ci-capabilities.md
  - docs/risk-register/quality/R-20260308-api-auth-runtime-integration-coverage.md
evidence:
  tests: []
  notes:
    - apps/api now exposes a dedicated integration command for the protected runtime surface
    - the integration lane boots real JWKS-backed OIDC verification plus PostgreSQL authorization data
    - active status, risk, and planning docs no longer claim the query side is missing
---

# ED-20260320 - API runtime query integration

## Purpose

`apps/api` already shipped the protected runtime command and query routes, but
the repository still had two active publication errors:

- status and planning docs still claimed the API query side did not exist
- the API auth/runtime risk was still open because no full OIDC plus
  PostgreSQL integration lane existed for the protected HTTP surface

This evidence document records the slice that closed both forms of drift.

## Changes

### `apps/api/test/integration/protectedRuntime.integration.test.ts`

Added a live integration lane that:

- starts the real Fastify app via `buildApp()`
- serves a local JWKS endpoint and signs real JWTs with `jose`
- configures OIDC verification through the shipped authenticator
- boots a real PostgreSQL schema and seeds `${schema}.principal_grants`
- exercises `POST /runs/start`, `GET /runs`, `GET /runs/:runId`,
  `GET /runs/:runId/events`, and `POST /runs/:runId/signal`
- proves `TOKEN_ASSERTION_CONFLICT` on mismatched tenant assertions

### `apps/api/package.json` and `apps/api/vitest.integration.config.ts`

Added a dedicated `pnpm --filter dvt-api test:integration` command and a
Vitest config that scopes the run to `test/integration/**/*.test.ts`.

The first CLI-filter-based approach was replaced because Vitest treated the
positional filter unreliably in this Windows environment.

### Active documentation surfaces

Updated the active status, matrix, testing-capabilities, risk, and proposal
documents so they now reflect the shipped API route surface and the new
integration lane.

## Validation Run

Executed on 2026-03-20 in `c:\dvt`:

```text
docker compose -f infra/docker/postgres/docker-compose.yml up -d
  passed

docker inspect --format='{{.State.Health.Status}}' dvt-postgres
  passed with escalated execution
  result: healthy

pnpm --filter dvt-api typecheck
  passed

pnpm --filter dvt-api test
  passed

$env:DATABASE_URL='postgresql://dvt:dvt@localhost:5432/dvt'; pnpm --filter dvt-api test:integration
  first sandboxed attempt failed with spawn EPERM from vitest/esbuild
  rerun with escalated execution passed (2 files, 7 tests)
```

## Traceability

- Governing workflow: `AGENTS.md`, `docs/guides/ai-work-protocol.md`
- Execution/runtime boundary: `ADR-0003`
- Read-model separation: `ADR-0015`
- Tenant isolation: `ADR-0031`
- Slice closeout:
  `docs/planning/closeouts/20260320-api-runtime-query-integration-closeout.md`
