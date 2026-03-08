---
id: R-20260308-API-AUTH-01
title: API auth runtime can regress without a full OIDC plus Postgres integration lane
status: Open
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

`apps/api` now wires authenticated `POST /runs/start` execution through:

- OIDC token verification
- server-side authorization resolution from `${schema}.principal_grants`
- protected route registration during app startup

The branch added coverage for bearer-scheme parsing and for schema creation
before `principal_grants`, but those checks remain unit-level and startup-hook
level. There is still no full integration lane that exercises the protected HTTP
route with a real database schema bootstrap and realistic auth headers.

## Risk

The API auth path can regress in ways that unit tests do not catch, including:

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
- Add an integration lane for `apps/api` that boots the protected route against
  a real Postgres schema and exercises authenticated `POST /runs/start`.
- Keep ARC-2 documentation gates active so auth/runtime changes require
  evidence plus risk updates.

## Evidence

- `apps/api/src/app.ts`
- `apps/api/src/entrypoints/http/startRunRoute.ts`
- `apps/api/src/infrastructure/auth/postgresPrincipalAccessRepository.ts`
- `apps/api/test/app.test.ts`
- `apps/api/test/entrypoints/http/startRunRoute.test.ts`
- `apps/api/test/infrastructure/auth/postgresPrincipalAccessRepository.test.ts`
