---
slice: rc-c1-http-error-envelope-normalization
date: 2026-03-31
author: AI (GPT-5)
last_reviewed: 2026-03-31
---

# Closeout: RC-C1 HTTP Error Envelope Normalization

## Think-First Analysis

- Problem summary:
  `apps/api` exposes multiple caller-visible error shapes, and runtime-command
  parsers currently collapse semantic validation outcomes into customizable
  wire-code strings.
- Root cause:
  the HTTP boundary mixes semantic parsing, transport status selection, and
  serialization in the same parser-layer objects, which makes error meaning
  drift whenever caller-visible codes change.
- Constraints and invariants (ADRs: ADR-0003, ADR-0004, ADR-0005, ADR-0006, ADR-0034):
  - tenant scope must remain explicit and authoritative at the API boundary
  - transport serialization belongs at the edge, not in semantic parsing
  - public boundary changes require canonical documentation and repository
    validation
  - bounded-context communication must stay explicit and narrow
- Options considered:
  - patch only `cancel/signal`
  - generic parser helper patch while preserving legacy wire shape
  - publish a canonical HTTP error envelope and migrate all `apps/api` routes
- Selected option and rationale:
  publish the canonical HTTP error envelope and migrate all `apps/api` routes.
  This removes the regression source and leaves a simpler, explicit boundary.
- Rejected alternatives:
  - route-local fixes: too narrow, preserve design drift
  - permanent legacy aliasing: keeps duplicated public semantics alive without
    a governing need

## Pre-Implementation Brief

- Mode: Full
- Scope:
  `docs/planning/state/agent-lane-c.yaml`, `docs/planning/proposals/`,
  `docs/planning/closeouts/`, `docs/contracts/shared/`, and the HTTP entrypoint
  slice under `apps/api/src/entrypoints/http/`, the maintenance contract note in
  `packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts`, the owning adapter
  implementation in `packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts`,
  plus affected tests and evidence/risk docs.
- Touched files or paths:
  planning surfaces, shared contract docs, `apps/api` HTTP parser/mapper/route
  modules, and route/integration tests.
- Expected outcome:
  one canonical caller-visible HTTP error envelope, semantic parse issues at
  parser boundaries, unified transport serialization for `apps/api`, and typed
  not-found handling at the `rebuildSnapshot` maintenance boundary.
- Risks and mitigations:
  - risk: route behavior drift across command/query families
    mitigation: route-level and mapper-level regression coverage
  - risk: hidden consumer dependency on legacy `{ error, code }`
    mitigation: repository-wide search before finalizing and explicit closeout
    note if discovered
  - risk: reopened scope accidentally expands into unrelated adapter internals
    mitigation: limit typed not-found lifting to the maintenance boundary and
    document remaining metadata-repository legacy as out of scope
- Out-of-scope items:
  success payload redesign, unrelated metadata-repository string errors outside
  the `rebuildSnapshot`/HTTP boundary, frontend compatibility layer by default
- Validation plan:
  run docs generation/sync, `dvt-api` typecheck, unit tests, integration tests,
  arch test, and `verify:prepush`
- Test coverage plan:
  add explicit negative coverage for missing vs invalid tenant scope, route
  parser issues, start-run validation failures, auth/authz failures, runtime
  domain errors, and admin route failures under the new envelope
- Libraries evaluated:
  None evaluated; repository-local refactor preferred

## Traceability (Full mode only)

- Baseline ADRs (verified in Phase 3):
  ADR-0003, ADR-0004, ADR-0005, ADR-0006, ADR-0034
- Canonical contract:
  `docs/contracts/shared/HttpErrorEnvelope.v1.md`
- Generated artifacts:
  proposal, closeout, lane/workboard regeneration, and updated `apps/api`
  boundary code plus tests

## Implementation Log

- Re-scoped `RC-C1` in `docs/planning/state/agent-lane-c.yaml` and regenerated
  workboard views.
- Published [HttpErrorEnvelope.v1](../../contracts/shared/HttpErrorEnvelope.v1.md)
  and extended `scripts/sync-docs.cjs` so `docs/contracts/shared/index.md`
  auto-links repository-local shared contract docs.
- Added `httpErrorContract.ts`, `routeParseIssue.ts`, and `httpErrorMapper.ts`
  in `apps/api/src/entrypoints/http/`.
- Replaced parser-local `{ status, body }` error shaping with semantic
  `RouteParseIssue` returns in:
  - `runCommandFieldParsers.ts`
  - `cancelRunRouteParser.ts`
  - `signalRunRouteParser.ts`
  - `startRunRouteParser.ts`
  - `getRunRouteParser.ts`
  - `getRunEventsRouteParser.ts`
  - `listRunsRouteParser.ts`
- Migrated route handlers and executor to the shared mapper/send path in:
  - `startRunRoute.ts`
  - `getRunRoute.ts`
  - `getRunEventsRoute.ts`
  - `listRunsRoute.ts`
  - `runCommandRouteExecutor.ts`
  - `adminRoutes.ts`
  - `authorizeExecutionScope.ts`
- Preserved success payloads and moved error metadata into
  `error.details`/`retry-after` where appropriate.
- Deleted `apps/api/src/entrypoints/http/authErrorMapper.ts` and moved active
  tests/docs to `httpErrorMapper`.
- Removed the remaining start-run parser-local legacy by having helper modules
  (`startRunRouteBodyValidation.ts`, `startRunRouteScopeParser.ts`,
  `startRunRoutePlanRefParser.ts`, `startRunRoutePlannerEnvelopeMapper.ts`) emit
  semantic `RouteParseResult` values directly instead of round-tripping through
  `INVALID_*`/legacy parser result shapes.
- Hardened the maintenance boundary by documenting typed not-found semantics in
  `packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts` and enforcing them
  in `packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts` with
  `RunNotFoundError`.
- Moved `adminRoutes.ts` to the shared runtime mapper and removed the legacy
  `RUN_NOT_FOUND` message-text parsing path.
- Updated unit, route, app, and integration-facing tests to assert the new
  `error.type/reason/target/details` contract, including the missing-vs-invalid
  tenant regression coverage.
- Added negative regressions that lock the reopened boundary hardening:
  - `adminRoutes.test.ts` now proves a legacy `Error('RUN_NOT_FOUND: ...')`
    no longer yields `404`
  - `httpErrorMapper.test.ts` maps `RunNotFoundError` to canonical `404`
  - `startRunRouteParserHelpers.test.ts` locks direct semantic parse-issue
    returns for conflicting plan inputs and invalid plan refs
  - `PostgresRunSnapshotStore.test.ts` asserts typed not-found behavior for
    missing or cross-tenant rebuild paths
- Added evidence/risk artifacts for the reopened boundary hardening slice.

## Validation

- `pnpm --filter dvt-api typecheck`
  - Passed
- `pnpm --filter dvt-api test`
  - Passed
- `pnpm --filter dvt-api test:integration`
  - Passed
  - `protectedRuntime.integration.test.ts` skipped cleanly because live PG env
    posture was absent; `plannerEngineContract.test.ts` passed
- `pnpm --filter dvt-api test:arch`
  - Passed
- `pnpm --filter @dvt/adapter-postgres typecheck`
  - Passed
- `pnpm --filter @dvt/adapter-postgres test`
  - Passed
- `pnpm docs:workboard:generate`
  - Passed
- `pnpm docs:status:generate`
  - Passed
- `pnpm docs:sync`
  - Passed
- `node tools/ci/arc-check.mjs`
  - Passed
  - Reported `ARC-0` for the current local diff-base; evidence/risk artifacts
    were still added because the reopened slice touched adapter/contracts
    ownership surfaces and should remain PR-ready
- `pnpm verify:prepush`
  - Passed

## Debt Introduced

- No new debt entry created.
- No rules, hooks, or checks were disabled.
- No compatibility shim for the legacy `{ error, code }` payload was retained by
  default.
- No stubs, placeholders, or fake success paths were introduced.
- Existing unrelated stringly errors in
  `packages/@dvt/adapter-postgres/src/PostgresRunMetadataRepository.ts` remain
  outside this slice; they were not introduced by this work and are documented
  as residual, out-of-scope adapter legacy rather than hidden debt.
