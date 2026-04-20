---
title: Closeout - TF-A1-C12 plan-route facade regression hardening
status: Review
owner: API / Docs
last_reviewed: 2026-04-19
planning_type: closeout
slice: TF-A1-C12-plan-route-facade-regression-hardening
---

# Closeout: TF-A1-C12 plan-route facade regression hardening

## Think-First Analysis

### Problem summary

`TF-A1-C12` already introduced the shared plan-route remote-facade recipe, but
the shared owners still have weaker direct regression protection than the
route-specific seams:

1. `executePlanRouteFacade` is exercised only transitively through preview,
   import, and compile route tests.
2. `planRouteRequestResolver` still uses a start-run-flavored constant name for
   the shared plan-route authorization action even though the seam now belongs
   to preview/import/compile rather than `startRun*`.

The boundary shape is materially better than before, but the shared facade is
still easier to drift than the route-local wrappers that consume it.

### Root cause

The earlier standardization slice focused on extracting the shared execution
recipe out of the route modules. That closed the architectural duplication, but
it left the shared executor and shared authorization seam without narrow owner-
local tests and without fully converged shared vocabulary.

### Governing constraints

- `AGENTS.md`: inventory-first execution, no hidden debt, and validation-backed
  closure.
- `docs/guides/ai-work-protocol.md`: Slim-mode architectural maintenance still
  needs think-first analysis, pre-implementation brief, and closeout evidence.
- `docs/architecture/reference-architecture.md`: HTTP routes remain thin
  adapters over explicit request-resolution, application, and presentation
  seams.
- `ADR-0005`: parsing and validation boundaries remain deterministic and
  directly regression-tested.
- `ADR-0012`: plan-scope ownership and related authorization flow stay explicit.
- `ADR-0034`: bounded-context ownership requires shared seams to use neutral
  owner language instead of leaking historical source-module naming.
- `docs/planning/reviews/architecture-and-governance/20260419-plan-route-boundary-remediation-review.md`:
  the standardization slice is valid, but shared facade drift should be closed
  with direct owner-local guards.

### Options considered

1. Leave the current shared facade as-is and rely on route-specific tests only.
2. Add direct tests for the shared facade and shared authorization resolver, and
   rename the shared authorization constant so the seam vocabulary matches its
   owner.
3. Further abstract preview/import/compile behind another generic binder or
   factory layer.

### Selected option and rationale

Option 2. It hardens the real shared owners without rebuilding a new
convenience abstraction. The repository already has the correct boundary shape;
it needs regression protection and cleaner shared naming, not another layer.

### Rejected alternatives

- Option 1 was rejected because transitive tests do not protect the shared seam
  well enough when the route wrappers are now intentionally thin.
- Option 3 was rejected because it would reintroduce convenience-driven
  abstraction growth after the shared recipe was already extracted.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `apps/api/src/entrypoints/http/planRouteRequestResolver.ts`
  - `apps/api/test/entrypoints/http/executePlanRouteFacade.test.ts`
  - `apps/api/test/entrypoints/http/planRouteRequestResolver.test.ts`
  - `docs/planning/state/agent-lane-a.yaml`
  - this closeout
- Expected outcome:
  - the shared plan-route facade has direct regression tests for rejected,
    accepted, and internal-error branches
  - the shared plan-route authorization resolver has direct regression tests for
    parse rejection, authorization failure, and approved authorization context
  - shared plan-route authorization naming stops implying `startRun*` ownership
    inside the neutral plan-route seam
- Risks and mitigations:
  - Risk: shared tests duplicate route-level assertions mechanically.
    Mitigation: keep the new tests focused on shared-owner behavior only, not on
    route-specific parser or presenter payloads.
  - Risk: naming cleanup could accidentally change auth semantics.
    Mitigation: lock the requested action and scope in the new shared-resolver
    test.
- Out of scope:
  - changing the `run:start` authorization policy itself
  - route payload or status-code changes
  - import ownership semantics
  - compile-boundary vocabulary convergence outside the shared plan-route seam
- Validation plan:
  - `pnpm exec eslint --max-warnings 0 apps/api/src/entrypoints/http/planRouteRequestResolver.ts apps/api/test/entrypoints/http/executePlanRouteFacade.test.ts apps/api/test/entrypoints/http/planRouteRequestResolver.test.ts`
  - `pnpm --filter dvt-api test -- test/entrypoints/http/executePlanRouteFacade.test.ts test/entrypoints/http/planRouteRequestResolver.test.ts test/entrypoints/http/previewPlanRoute.auth.test.ts test/entrypoints/http/importPlanRoute.test.ts test/entrypoints/http/compilePlanRoute.test.ts`
  - `pnpm --filter dvt-api typecheck`
  - `pnpm --filter dvt-api test:arch`
  - `pnpm docs:workboard:generate`
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - facade-level early rejection send
  - facade-level accepted payload send with default and explicit status
  - facade-level internal-error mapping and logging
  - shared authorization resolver parse rejection without auth calls
  - shared authorization resolver approval with canonical plan-route action and
    requested scope propagation
  - shared authorization resolver authorization failure without resolved request
- Libraries evaluated:
  - None evaluated; this is owner-local route-boundary hardening.

## Implementation Summary

- Renamed the shared authorization constant in
  `apps/api/src/entrypoints/http/planRouteRequestResolver.ts` from a
  start-run-flavored name to `PLAN_ROUTE_ACTION` so the neutral plan-route seam
  no longer implies `startRun*` ownership in its internal vocabulary while
  preserving the same `run:start` authorization policy.
- Added `apps/api/test/entrypoints/http/executePlanRouteFacade.test.ts` with
  focused coverage for the shared remote-facade executor's early rejection,
  accepted default-status, accepted custom-status, mapped rejection, and
  internal-error branches.
- Added `apps/api/test/entrypoints/http/planRouteRequestResolver.test.ts` with
  direct coverage for parse rejection, successful auth resolution with the
  canonical shared plan-route action, and authorization failure mapping.
- Preserved the existing preview, import, and compile route tests so the shared
  seam now has both owner-local unit coverage and route-level behavioral
  coverage.

## Validation Run

- `pnpm exec eslint --max-warnings 0 apps/api/src/entrypoints/http/planRouteRequestResolver.ts apps/api/test/entrypoints/http/executePlanRouteFacade.test.ts apps/api/test/entrypoints/http/planRouteRequestResolver.test.ts`
  - Passed.
- `pnpm --filter dvt-api test -- test/entrypoints/http/executePlanRouteFacade.test.ts test/entrypoints/http/planRouteRequestResolver.test.ts test/entrypoints/http/previewPlanRoute.auth.test.ts test/entrypoints/http/importPlanRoute.test.ts test/entrypoints/http/compilePlanRoute.test.ts`
  - Passed.
- `pnpm --filter dvt-api typecheck`
  - Passed.
- `pnpm --filter dvt-api test:arch`
  - Passed.
- `pnpm docs:workboard:generate`
  - Passed.
- `pnpm docs:sync`
  - Passed.
- `pnpm docs:status:generate`
  - Passed.
- `pnpm verify:prepush`
  - Passed.

## No-Debt / No-Stub Evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No stub, placeholder, or fake success path was introduced.
