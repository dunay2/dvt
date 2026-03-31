---
title: RC-C1 boundary legacy hardening for HTTP and rebuildSnapshot
status: Accepted
date: 2026-03-31
owners:
  - apps/api
  - packages/@dvt/adapter-postgres
  - packages/@dvt/contracts
arc_level: ARC-2
breaking: false
code_refs:
  - apps/api/src/entrypoints/http/httpErrorMapper.ts
  - apps/api/src/entrypoints/http/adminRoutes.ts
  - apps/api/src/entrypoints/http/startRunRouteParser.ts
  - packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts
  - packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts
evidence:
  tests:
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api test
    - pnpm --filter dvt-api test:integration
    - pnpm --filter dvt-api test:arch
    - pnpm --filter @dvt/adapter-postgres typecheck
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm verify:prepush
---

## Summary

This evidence note records the reopened `RC-C1` hardening pass that removed the
remaining active HTTP-boundary legacy and lifted `rebuildSnapshot` not-found
handling to a typed maintenance-boundary contract.

## What changed

- `apps/api` now uses `httpErrorMapper.ts` as the active HTTP error boundary;
  the legacy `authErrorMapper.ts` module was deleted.
- `adminRoutes.ts` no longer infers `404` from exception message text.
- Start-run parser helpers now emit semantic `RouteParseIssue` values directly
  instead of round-tripping through local `INVALID_*` parser result shapes.
- `IRunStateStoreMaintenance.rebuildSnapshot` now documents a typed
  `RUN_NOT_FOUND` contract and the Postgres snapshot-store implementation
  enforces it with `RunNotFoundError`.

## Negative coverage added

- Legacy `Error('RUN_NOT_FOUND: ...')` no longer maps to HTTP `404` in
  `adminRoutes.test.ts`.
- `RunNotFoundError` maps to canonical `not_found/run_not_found` in
  `httpErrorMapper.test.ts`.
- Start-run parser helper regressions now lock semantic issues for conflicting
  plan inputs and invalid plan refs.
- Snapshot rebuild tests now assert typed not-found behavior for missing and
  cross-tenant cases.

## Residual scope note

Unrelated stringly errors still exist in
`packages/@dvt/adapter-postgres/src/PostgresRunMetadataRepository.ts`. They are
not on the corrected `rebuildSnapshot` maintenance boundary and were left out of
this slice to avoid mixing distinct invariants under `RC-C1`.
