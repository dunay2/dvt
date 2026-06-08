---
title: API Workspace Gap Report
status: Draft
owner: Architecture / API
workspace: dvt-api
date: 2026-06-07
last_reviewed: 2026-06-07
planning_type: review
---

# API Workspace Gap Report

## Workspace

- Workspace key: `api`
- Package: `dvt-api`
- Path: `apps/api/**`
- Scope source: `tools/ci/scope-config.mjs` and `tools/ci/policy/workflow-scope.json`

## Evidence used

- `apps/api/package.json`
- `docs/architecture/components/api/api-current-to-target-architecture.md`
- `docs/architecture/components/web/frontend-mechanical-truth-inventory.md`
- `docs/architecture/components/web/frontend-component-inventory.md`
- root `package.json`

## Current state summary

`dvt-api` is a real composition root. It exposes Fastify runtime wiring, build,
typecheck, lint, unit, integration, and architecture test scripts. Its package
dependencies show it composes the runtime stack: Postgres adapter, Temporal
adapter, artifacts, contracts, delivery, engine, observability, OTel,
plan-verifier, planner, and temporal dbt plugin.

The current API architecture document already identifies a mature target posture:
`apps/api` owns transport and composition, not lifecycle semantics; commands and
queries should stay separated; provider and database dependencies should cross
ports; and runtime behavior should be governed by contracts and bounded contexts.

## What is missing

### A-01 — Route-by-route command/query rail report

The architecture document names current routes and use cases, but the workspace
still needs a generated or maintained table mapping every HTTP route to:

- command/query rail name
- route file
- parser/builder
- application service
- authorization action/resource
- contract request/response type
- backend packages touched
- unit/integration/e2e evidence
- negative cases

**Why it matters**

The API is the external boundary for the product. Any route without rail mapping
can become a hidden semantic fork from web, CLI, planner, or engine.

**Required next step**

Produce an `api-route-rail-inventory` governed document and planning DB import
query, similar in spirit to the frontend mechanical truth and component
reflection inventories.

### A-02 — Frontend-facing runtime contract remains unpublished as one artifact

The API architecture document explicitly lists this as a current gap: backend
route surface exists, but the web consumption contract is not yet frozen in one
frontend-facing artifact.

**Why it matters**

`apps/web` consumes session, workspace, plan, run, source, plugin, and health
surfaces. Without one canonical contract bundle, drift can happen between route
handlers, web query code, test fixtures, docs, and `@dvt/contracts`.

**Required next step**

Create a frontend-facing runtime contract bundle covering:

- `/session`
- `/workspace/context`
- `/capabilities`
- `/workspace/graph/draft`
- `/workspace/files`
- `/plans/preview`
- `/plans/import`
- `/runs`
- `/runs/:runId`
- `/runs/:runId/events`
- `/workspace/warehouse/connections`
- `/workspace/sources/import`
- `/workspace/plugins`
- `/healthz`, `/readyz`, `/version`, `/db/ready`

### A-03 — Query purity is incomplete

The API architecture document identifies that `enrichRunStatus()` still lives on
`IWorkflowEngine`, weakening read/write separation.

**Why it matters**

DVT's principles say the UI does not execute, the engine does not decide, and
query operations should read projections/read models rather than command/runtime
objects. Keeping enrichment on the engine risks turning the engine into a mixed
read/write service.

**Required next step**

Move status enrichment behind a query/read-model capability with explicit
fallback/degraded behavior. Keep `IWorkflowEngine` focused on lifecycle command
semantics.

### A-04 — Admin RBAC hardening follow-through remains

The architecture document states admin-scope RBAC is wired but remaining work is
test-shape and composition hardening.

**Why it matters**

Admin routes are high-risk. Fail-closed behavior is correct, but RBAC must be
provable by negative tests, not only by route intent.

**Required next step**

Create a focused admin route RBAC report:

- route inventory
- action/resource matrix
- authorized cases
- denied cases
- tenant mismatch cases
- missing-role cases
- audit evidence

### A-05 — SLA, consistency, and freshness expectations are implicit

The architecture document identifies that freshness and backpressure behavior are
exposed, but thresholds are scattered across config and runbooks.

**Why it matters**

Operators and the frontend need to distinguish healthy, degraded, stale,
backpressured, denied, and failed states. Without a canonical SLA/freshness
contract, the UI can display ambiguous runtime posture.

**Required next step**

Create a runtime health/freshness contract:

- endpoint
- signal owner
- freshness threshold
- degradation behavior
- retry/backoff behavior
- UI state mapping
- observability event/metric

### A-06 — Temporal activity writes need breaker boundary

The current API architecture document states Temporal activity writes depend
directly on state store and can cascade into execution stalls without an explicit
breaker boundary.

**Why it matters**

The API composes the runtime. If state-store failures propagate without a
contracted breaker/fallback posture, orchestration can stall or repeatedly fail
in ways the product cannot explain.

**Required next step**

Define and validate a state-store write breaker boundary for Temporal activity
write paths.

### A-07 — Step-specific config remains too implicit

The architecture document flags `stepTypeConfig` as opaque at admission time,
allowing some failures to surface too late in adapter execution.

**Why it matters**

A plan should fail early when an unsupported or invalid step config is submitted.
Late adapter failure gives worse UX and weaker safety.

**Required next step**

Move step-specific config validation into admission/preflight through
`@dvt/plan-verifier` and `@dvt/contracts` schemas. Expose diagnostics to web.

### A-08 — dbt-first assumptions still leak upstream

The architecture document states planner input, artifact shape, and Temporal
execution are not yet fully generalized for non-dbt workflows.

**Why it matters**

DVT's direction is broader than dbt-compatible execution. The API should not
implicitly force dbt-shaped artifacts or workflow assumptions into source,
operation, destination, or generic graph flows.

**Required next step**

Create a non-dbt workflow compatibility report for API routes and contracts.

## Fowler/DDD diagnosis

### Smells

- **God composition root risk**: API composition is valid, but without route rail
  inventory it can become a place where semantics accumulate.
- **Feature envy across boundaries**: API can accidentally own planner, engine,
  state-store, or adapter semantics through route mappers.
- **Implicit contract**: web-facing route payloads can exist in code without one
  canonical frontend-facing artifact.
- **Mixed command/query surface**: engine-backed enrichment inside query path
  weakens CQRS.

### Boundary posture

`dvt-api` should own transport, authentication handoff, authorization calls,
route parsing, response translation, and runtime composition. It should not own
planner decisions, engine lifecycle semantics, state-store invariants, provider
execution semantics, or frontend capability interpretation.

## Recommended remediation order

1. **A-01:** Route-by-route command/query rail inventory.
2. **A-02:** Frontend-facing runtime contract artifact.
3. **A-07:** Step-specific config validation at admission/preflight.
4. **A-03:** Move run-status enrichment out of `IWorkflowEngine` query path.
5. **A-04:** Admin RBAC negative test hardening.
6. **A-05:** Runtime health/freshness/SLA contract.
7. **A-06:** Temporal write breaker boundary.
8. **A-08:** Non-dbt compatibility report.

## Candidate validation commands

```bash
pnpm --filter dvt-api typecheck
pnpm --filter dvt-api lint
pnpm --filter dvt-api test
pnpm --filter dvt-api test:integration
pnpm --filter dvt-api test:arch
pnpm validate:contracts
pnpm verify:prepush
```

## Closeout

This report does not change API code. It identifies route governance, contract
publication, CQRS purity, RBAC, SLA, breaker, admission validation, and non-dbt
compatibility gaps for the API workspace.
