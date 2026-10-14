---
id: R-20260327-ESLINT9-ENGINE-01
title: ESLint 9 stabilization introduces engine surface churn with no functional risk
status: Open
date: 2026-03-27
owners:
  - engine
  - ci
severity: Low
probability: Low
---

# R-20260327-ESLINT9-ENGINE-01 - ESLint 9 stabilization introduces engine surface churn with no functional risk

## Context

PR `chore-eslint9-stabilization` resolves all lint errors introduced after
pinning ESLint to v9. The changes span:

- `packages/@dvt/engine` — `WorkflowEngine` refactored to delegate to a new
  `WorkflowEngineCoreService`; `StartRunCoordinator` moved from `services/` to
  `application/`; `StartRunAdmissionGuard` added; lifecycle helpers extracted
  to `core/lifecycle/`.
- `apps/api` — `StartRunAdmissionGuard` wired into `buildProtectedRuntimeModule`;
  admission telemetry observability classes added.
- CI workflows — Node.js runtime upgraded from 20.x to 22.x to match the
  declared `engines: { node: ">=22" }` constraint.

All changes are import-order and structural refactors. No event-processing
logic, state-store contracts, or adapter semantics were modified.

## Risk

The engine surface refactor increases the number of export paths from
`@dvt/engine`. If a consumer imports an internal name that was relocated, a
build break at the consumer is possible without a breaking-change notice.

The risk is mitigated by the fact that all public exports are preserved in
`src/index.ts` and the engine's `dist/index.d.ts` continues to re-export
everything through stable alias names.

## Mitigation

- All previous public exports remain accessible via `@dvt/engine` — verified by
  the unchanged `test/contracts/IWorkflowEngine.types.test.ts` contract suite.
- `Workspace CI (engine)` typecheck passes, confirming the public surface is
  consistent.
- No ADR or contract version bump is required; the refactor is internal to the
  engine package boundary.

<a id="risk-r-20260308-api-auth-01"></a>

## Independent risk R-20260308-API-AUTH-01

```risk-record-v1
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
```

<a id="risk-r-20260409-capability-matrix-docs-governance-drift"></a>

## Independent risk R-20260409-CAPABILITY-MATRIX-DOCS-GOVERNANCE-DRIFT

```risk-record-v1
---
id: R-20260409-CAPABILITY-MATRIX-DOCS-GOVERNANCE-DRIFT
title: Capability matrix tests and docs governance can drift after doc relocations
status: Open
date: 2026-04-09
owners:
  - packages/@dvt/engine
  - docs
severity: Medium
probability: Medium
summary: >
  The branch exposed two governance-coupled failure modes: the engine capability matrix contract
  test still referenced a retired documentation path, and docs-doctor frontmatter parsing failed on
  UTF-8 BOM-prefixed planning documents.
context: >
  Documentation moved to the canonical `docs/architecture/components/...` surface while a contract
  test in `packages/@dvt/engine` still depended on the former path. In parallel, a planning archive
  document with a BOM remained valid to humans but invisible to the docs-doctor frontmatter parser.
  Both issues surfaced only in CI and blocked merge readiness even though the governed documents
  were present in the repository.
risk: >
  Future docs reorganizations or editor-generated BOM changes can silently reintroduce CI-only drift
  between governance artifacts and the tests or validation tools that depend on them. That would
  keep merge gates red and erode trust in the repo's canonical documentation map.
mitigations:
  - 'Engine capability matrix tests now probe the canonical components path before falling back to
    legacy locations.'
  - 'docs-doctor strips an initial UTF-8 BOM before parsing frontmatter.'
  - 'The duplicate top-level CI process review copy was removed so review title uniqueness is
    enforced against the active review surface only.'
  - 'docs:doctor, docs:sync:check, test:engine, test:coverage:engine, and verify:prepush were run
    locally before re-pushing the branch.'
review_after: 2026-06-01
---
```

<a id="risk-r-20260429-we-hx-1-boundary-ownership"></a>

## Independent risk R-20260429-WE-HX-1-BOUNDARY-OWNERSHIP

```risk-record-v1
---
id: R-20260429-WE-HX-1-BOUNDARY-OWNERSHIP
title: WorkflowEngine external seam ownership can drift back into broad ports
status: Open
date: 2026-04-29
owners:
  - packages/@dvt/engine
  - docs/architecture/components/engine
severity: Medium
probability: Low
---
context: >
  WE-HX-1 separates the plan artifact reader seam from run-state persistence and documents the
  external ownership map for PlanRef, runExecutionContextRef, engine resolver ports, and artifact
  readers.
risk: >
  Future convenience edits could reintroduce plan artifact reading into IRunStateStore or recreate
  adapter-local duplicate contracts, weakening the ADR-0034 bounded-context map and making the
  engine/artifacts seam ambiguous.
mitigations:
  - >-
    The dedicated IPlanArtifactReader module owns IPlanFetcher, StoredPlanArtifact, and
    IPlanIntegrityValidator.
  - >-
    workflowEngineBoundaryOwnership.architecture.test.ts fails if these responsibilities return to
    IRunStateStore or if an adapter-local duplicate IPlanFetcher file is recreated.
  - >-
    workflow-engine-boundary-ownership-component.md keeps the public API, invariants, transitions,
    consumers, diagrams, and drift guards together.
```
