---
slice: tf-e2-route-bootstrap-contract-generalization
date: 2026-04-17
lane: E
task_id: TF-E2
mode: Slim
status: Completed
author: AI (Codex)
last_reviewed: 2026-04-17
---

# TF-E2 route bootstrap contract generalization closeout

## Phase 1. Think-First Analysis

### Problem summary

The first pass of the route-bootstrap handoff removed the direct `/canvas`
branch from `Root.tsx`, but the shell contract is still not generalized across
the active route set:

- Canvas publishes a route bootstrap contract
- other lazy top-level routes still fall back to implicit shell completion
- the shell therefore still has a split startup policy depending on which route
  is active first
- the architecture pack does not yet diagram the static-vs-published route
  bootstrap pattern needed by the generalized design

### Root cause

The initial refactor generalized the consumer in `Root.tsx`, but not the route
contract itself.

The system still lacks two mature-system pieces:

1. one explicit route-metadata policy that says whether a route publishes its
   own bootstrap posture or can settle statically on mount
2. one explicit mount-time boundary for static routes so lazy route modules do
   not inherit an accidental `complete` startup state before they have mounted

The fallback `complete` posture is acceptable only for routes that genuinely do
not participate in startup gating. It is not correct as the default behavior
for the first active workbench route.

### Constraints and invariants

- `AGENTS.md`:
  docs/diagrams first for architecture clarification, inventory-first startup,
  and governed closeout evidence
- `docs/guides/ai-work-protocol.md`:
  think-first analysis before implementation, explicit pre-implementation
  brief, and planning/closeout updates in the same task
- `docs/planning/state/planning-control-tower.md`:
  closeout plus Lane E registry must be updated for planning-affecting work
- `docs/architecture/components/web/graph/graph-frontend-architecture.md`:
  shell bootstrap must consume an active-route startup contract, not pathname
  shortcuts
- `docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md`:
  Canvas owns route operability; the shell consumes a generic startup seam
- `docs/architecture/components/web/graph/canvas-component-map-and-modernization-review.md`:
  route metadata plus a presentation seam are the canonical startup handoff
- `docs/planning/reviews/20260417-dvt-plus-deep-architectural-review.md`:
  mature-system alignment requires removing the residual route-special casing
- `ADR-0003`:
  lifecycle authority must live in explicit seams, not incidental UI heuristics
- `ADR-0004`:
  authoritative state and its read models remain separated

### Options considered

#### Option A. Keep the current generic store and manually register every route with `complete`

Rejected.

That would make the configuration explicit, but it would still let lazy routes
dismiss Raven before their active module has mounted. It solves naming, not
startup truth.

#### Option B. Reintroduce route-specific logic in `Root.tsx`

Rejected.

That is exactly the regression path the architecture pack is trying to remove.
It lowers the bar instead of closing the seam.

#### Option C. Generalize the route contract with route-id keys and explicit static-vs-published startup policy

Selected.

This aligns with mature workbench systems:

- the router owns route identity
- route metadata declares startup policy
- static routes settle through a generic mount boundary
- published routes, such as Canvas, keep ownership of richer operability state

### Selected option and rationale

Option C.

The right abstraction is not “Canvas publishes startup.” The right abstraction
is “the active route declares how startup is settled.”

That gives one shell contract, one route identity source, and one extension
point for future workbench routes without turning `Root.tsx` back into a switch
statement.

### Rejected alternatives

- making the fallback posture `pending` globally and hoping every route
  publishes
- keeping manual string IDs as the bootstrap authority
- treating lazy route module load as operational readiness without an explicit
  route policy

## Phase 2. Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - `docs/architecture/components/web/graph/graph-frontend-architecture.md`
  - `docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md`
  - `docs/architecture/components/web/graph/canvas-component-map-and-modernization-review.md`
  - this closeout
  - `apps/web/src/app/bootstrap/routeBootstrapPresentation.ts`
  - `apps/web/src/app/routes.ts`
  - `apps/web/src/app/Root.tsx`
  - `apps/web/src/app/views/Canvas.tsx`
  - `apps/web/src/app/views/canvas/canvasDraftPresentationState.ts`
  - the related tests for bootstrap, routes, Root, and Canvas
- Expected outcome:
  - the architecture pack includes the missing component and sequence diagrams
    for the generalized route-bootstrap design
  - route bootstrap keys derive from router route IDs rather than manual
    global strings
  - route metadata declares `static` vs `published` startup policy
  - lazy non-Canvas workbench routes settle Raven through an explicit static
    mount boundary instead of an implicit `complete` fallback
  - Canvas stays the richer published route and continues to own blocked/recovery
    posture
- Risks and mitigations:
  - risk: create a second parallel startup abstraction
    mitigation: keep one bootstrap registry and add policy to the existing
    route contract instead of a new store
  - risk: break route tests that mount `RootShell` with a non-data router
    mitigation: keep tests on data routers and align them with production
    routing shape
  - risk: broaden startup gating beyond intended routes
    mitigation: make route metadata explicit and cover the active top-level
    routes in tests
- Out of scope:
  - redesigning the Raven bootstrap state machine
  - changing Canvas authoring semantics beyond the bootstrap bridge
  - reworking non-frontend bounded contexts
- Validation plan:
  - focused `vitest` for bootstrap, routes, Root, and Canvas
  - `pnpm --filter @dvt/web typecheck`
  - focused `eslint` on touched runtime files
  - `pnpm docs:status:generate`
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - route-bootstrap registry tests for static and published registration rules
  - route metadata tests for the active route set
  - Root tests proving the shell consumes route IDs plus route handles
  - route tests proving non-Canvas lazy routes no longer depend on implicit
    `complete`
- Libraries evaluated:
  - none adopted; the mature-system pattern is implemented with React Router
    route IDs/handles and a local typed registry

## Architecture Rationale

### Fowler reading

- `Root.tsx` remains the application shell and startup orchestrator
- route objects plus route handles are the published startup contract boundary
- `StaticRouteBootstrapBoundary.tsx` is the mount-time adapter for routes whose
  readiness is equivalent to successful surface mount
- `CanvasDraftPresentationState` remains the richer route read model for Canvas
  and translates into the generic contract rather than bypassing it

The key correction is that startup policy is now owned by route metadata and
route identity, not by route-specific conditionals inside the shell.

### DDD reading

This is a shell-context to route-context handoff:

- the shell context owns splash visibility and first-route reveal
- each route context owns its own readiness semantics
- the handoff now happens through one explicit contract keyed by canonical
  router identity

That avoids the previous leakage where Canvas had a startup contract but the
rest of the route set still relied on implicit shell heuristics.

### Hexagonal reading

`Root.tsx` now depends on a route bootstrap port:

- inbound data: active router match with typed startup metadata
- published route posture: pending, blocked, error, or complete
- adapter choice: static mount boundary versus route-owned publisher

The shell does not infer readiness from lazy-module timing, pathname branches,
or route-local implementation details.

### SOLID reading

- SRP: `Root.tsx` orchestrates startup; routes declare how startup settles
- OCP: new routes can join startup gating by metadata instead of shell edits
- DIP: shell logic now depends on the route-bootstrap abstraction, not on
  Canvas-specific code paths or manual IDs

### Comparison with mature systems

Mature workbench shells usually converge on three rules:

- the router owns route identity
- each route declares whether readiness is static-on-mount or explicitly
  published
- the shell consumes only that route contract when deciding first reveal

This slice now follows that shape directly.

## Implementation Summary

- added the missing generalized architecture diagrams and rationale to the
  Canvas architecture pack
- refactored `routeBootstrapPresentation.ts` so registrations are keyed by
  React Router route IDs and route handles declare `static` versus
  `published` startup policy
- added `StaticRouteBootstrapBoundary.tsx` so lazy non-Canvas routes settle
  startup explicitly on mount instead of inheriting an accidental fallback
- updated `routes.ts` so plugin and shell routes publish explicit startup
  policy through route metadata, with Canvas remaining the richer published
  route
- updated `Root.tsx` and `Canvas.tsx` to resolve the active route contract by
  match ID plus handle rather than by manual global IDs
- expanded tests to prove:
  - published and static route contracts behave correctly in the registry
  - Canvas still publishes the generic contract
  - route metadata covers non-Canvas routes
  - `Root.tsx` completes startup for non-Canvas static routes without relying
    on implicit `complete`

## Validation

- `pnpm --filter @dvt/web exec vitest run src/app/bootstrap/routeBootstrapPresentation.test.ts src/app/views/canvas/canvasDraftPresentationState.test.ts src/app/views/Canvas.test.tsx src/app/Root.test.tsx src/app/routes.test.tsx` - PASS
- `pnpm --filter @dvt/web typecheck` - PASS
- `pnpm exec eslint apps/web/src/app/bootstrap/routeBootstrapPresentation.ts apps/web/src/app/bootstrap/routeBootstrapPresentation.test.ts apps/web/src/app/bootstrap/StaticRouteBootstrapBoundary.tsx apps/web/src/app/Root.tsx apps/web/src/app/Root.test.tsx apps/web/src/app/routes.ts apps/web/src/app/routes.test.tsx apps/web/src/app/plugins/contracts/PluginManifest.ts apps/web/src/app/plugins/dbt/dbtContributions.ts apps/web/src/app/views/Canvas.tsx apps/web/src/app/views/Canvas.test.tsx apps/web/src/app/views/canvas/canvasDraftPresentationState.ts apps/web/src/app/views/canvas/canvasDraftPresentationState.test.ts --max-warnings 0` - PASS
- `pnpm docs:status:generate` - PASS
- `pnpm docs:sync` - PASS
- `pnpm docs:workboard:generate` - PASS
- `pnpm exec markdownlint-cli2 "docs/architecture/components/web/graph/graph-frontend-architecture.md" "docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md" "docs/architecture/components/web/graph/canvas-component-map-and-modernization-review.md" "docs/planning/closeouts/20260417-tf-e2-route-bootstrap-contract-generalization-closeout.md"` - PASS
- `pnpm verify:prepush` - PASS

## Residuals

- The startup contract is now generalized across the active top-level route
  set, but `TF-E2` still remains in progress for the broader Canvas
  productization scope: node lifecycle, edge lifecycle, Inspector-backed
  editing, operability telemetry, and the wider proof matrix remain outside
  this slice.
