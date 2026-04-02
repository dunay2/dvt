---
id: R-20260308-API-AUTH-01
title: API auth runtime can regress without a full OIDC plus Postgres integration lane
status: Mitigated
date: 2026-03-08
owners:
  - api
  - security
  - ci
severity: High
probability: Medium
---

# R-20260308-API-AUTH-01 - API auth runtime can regress without a full OIDC plus Postgres integration lane

## Context

`apps/api` wires protected runtime command and query routes through:

- OIDC token verification
- server-side authorization resolution from `${schema}.principal_grants`
- protected route registration during app startup
- query and signal routes for `GET /runs`, `GET /runs/:runId`,
  `GET /runs/:runId/events`, and `POST /runs/:runId/signal`

Before 2026-03-20, coverage stopped at unit and route levels plus schema
bootstrap tests. The branch did not yet have a full integration lane that
exercised the protected HTTP surface with real PostgreSQL schema bootstrap and
realistic auth headers.

## Risk

Without a full integration lane, the API auth path could regress in ways that
unit tests do not catch, including:

- startup failures when auth tables or schemas drift from runtime assumptions
- valid requests rejected because of header parsing or boundary mapping drift
- route wiring regressions between Fastify startup, OIDC config, and
  authorization orchestration

That would surface as boot-time outages or false `401` / `403` responses on the
protected runtime endpoint.

## Mitigation

- Keep `PostgresPrincipalAccessRepository.migrate()` covered with an explicit
  schema-bootstrap test.
- Keep route-level tests for bearer token extraction and bad-request mapping.
- Added `apps/api/test/integration/protectedRuntime.integration.test.ts`,
  which boots the protected runtime against a real PostgreSQL schema and a
  local JWKS-backed verifier, then exercises authenticated command and query
  requests.
- Added the dedicated command `pnpm --filter dvt-api test:integration` via
  `apps/api/vitest.integration.config.ts`.
- Executed the integration lane against local Docker PostgreSQL on 2026-03-20.
- Keep ARC-2 documentation gates active so auth/runtime changes require
  evidence plus risk updates.

## Evidence

- `apps/api/src/app.ts`
- `apps/api/src/entrypoints/http/startRunRoute.ts`
- `apps/api/src/entrypoints/http/listRunsRoute.ts`
- `apps/api/src/entrypoints/http/getRunRoute.ts`
- `apps/api/src/entrypoints/http/getRunEventsRoute.ts`
- `apps/api/src/entrypoints/http/signalRunRoute.ts`
- `apps/api/src/infrastructure/auth/oidcAuthenticator.ts`
- `apps/api/src/infrastructure/auth/postgresPrincipalAccessRepository.ts`
- `apps/api/vitest.integration.config.ts`
- `apps/api/test/app.test.ts`
- `apps/api/test/entrypoints/http/startRunRoute.test.ts`
- `apps/api/test/entrypoints/http/listRunsRoute.test.ts`
- `apps/api/test/entrypoints/http/getRunRoute.test.ts`
- `apps/api/test/entrypoints/http/getRunEventsRoute.test.ts`
- `apps/api/test/entrypoints/http/signalRunRoute.test.ts`
- `apps/api/test/infrastructure/auth/postgresPrincipalAccessRepository.test.ts`
- `apps/api/test/integration/protectedRuntime.integration.test.ts`
- `docs/evidence/critical/ED-20260320-api-runtime-query-integration.md`

## Closure

Mitigated on 2026-03-20 after `pnpm --filter dvt-api test:integration` passed
against local Docker PostgreSQL with JWKS-backed OIDC verification. The
specific absence-of-lane risk is no longer true.
