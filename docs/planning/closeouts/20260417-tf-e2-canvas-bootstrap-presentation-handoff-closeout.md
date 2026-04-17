---
slice: tf-e2-canvas-bootstrap-presentation-handoff
date: 2026-04-17
lane: E
task_id: TF-E2
mode: Slim
status: Completed
author: AI (Codex)
last_reviewed: 2026-04-17
---

# TF-E2 Canvas bootstrap presentation handoff closeout

## Phase 1. Think-First Analysis

### Problem summary

The Canvas draft-hardening chain now documents one route-level presentation
seam, but the startup shell still has an unclosed ownership gap:

- `Canvas.tsx` derives route recovery posture from the Canvas slice
- `Root.tsx` still resolves the handoff through a Canvas-specific bootstrap
  seam
- the Raven startup surface can therefore dismiss before the route is truly
  operable under the same recovery rules

The missing canonical rule is the generic handoff between the startup shell and
the active route presentation model.

### Root cause

The route-level presentation seam was defined, but the shell-side contract was
still Canvas-specific instead of being generalized as an active-route startup
contract.

In practice, the system still has two operability narrators:

1. the Canvas route, which understands `stale_conflict`, `missing_remote`, and
   `projection_gap`
2. the Raven bootstrap shell, which still needed Canvas-specific knowledge to
   find the startup contract for the active route

That is a design mismatch, not a copy problem.

### Constraints and invariants

- `AGENTS.md`:
  canonical governance first, doc-driven alignment when behavior or
  architecture posture changes, and explicit closeout evidence
- `docs/guides/ai-work-protocol.md`:
  think-first analysis, explicit pre-implementation brief, and planning-surface
  updates for planning-affecting work
- `docs/planning/state/planning-control-tower.md`:
  update the relevant closeout plus the lane registry when Lane E planning
  posture changes
- `docs/planning/closeouts/20260414-unified-raven-startup-bootstrap-closeout.md`:
  Raven owns startup orchestration and first-route reveal policy
- `docs/architecture/components/web/graph/canvas-component-map-and-modernization-review.md`:
  Canvas route posture must come from one presentation seam, not multiple local
  interpretations
- `docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md`:
  `CanvasDraftPresentationState` is the route-level read model for recovery and
  operability, and the shell should consume a generic active-route startup
  contract
- `ADR-0003`:
  lifecycle and authoritative behavior stay owned by explicit runtime seams,
  not by incidental UI heuristics
- `ADR-0004`:
  authoritative state, projections, and dependent read models remain separated

### Options considered

#### Option A. Leave the gap implicit in code and mention it only in QA notes

Rejected.

That keeps the architecture pack incomplete and forces later work to rediscover
the ownership mismatch from review comments.

#### Option B. Let `Root.tsx` inspect Canvas internals directly

Rejected.

That would couple the shell to route-local query, JSX, or React Flow
heuristics and violate the intended controller/presentation split.

#### Option C. Canonicalize one shell-to-route handoff seam

Selected.

The shell remains the startup orchestrator, but it may only dismiss Raven by
consuming one active-route startup contract derived from the route read model.

### Selected option and rationale

Option C.

This is the Fowler-aligned and mature-system-aligned split:

- the shell owns startup orchestration
- the Canvas slice owns route operability semantics
- the handoff happens through an explicit startup contract, not by pathname or
  leaf state

### Rejected alternatives

- route-local completion of Raven startup from `Canvas.tsx`
- duplicate bootstrap policies in both `Root.tsx` and the Canvas route
- shell-side inference from canonical node count, query readiness alone, or
  draft booleans copied ad hoc

## Phase 2. Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - `docs/architecture/components/web/graph/canvas-component-map-and-modernization-review.md`
  - `docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md`
  - `docs/architecture/components/web/graph/graph-frontend-architecture.md`
  - `docs/planning/state/agent-lane-e.yaml`
  - this closeout
- Expected outcome:
  - one canonical rule explains the Raven-to-Canvas handoff
  - the architecture pack uses explicit Fowler, DDD, hexagonal, and SOLID
    language for this seam
  - Lane E records the remaining `Root.tsx` closure as part of `TF-E2`
- Risks and mitigations:
  - risk: document a second parallel architecture story
    mitigation: extend the existing Canvas architecture pages instead of adding
    a standalone note
  - risk: imply runtime closure that does not exist yet
    mitigation: record the handoff as canonical target and open follow-up, not
    as completed implementation
- Out of scope:
  - changing `Root.tsx`
  - changing `Canvas.tsx`
  - adding new route/bootstrap runtime tests
- Validation plan:
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - docs and planning generation checks only for this slice; runtime test work
    belongs to the later implementation slice
- Libraries evaluated:
  - none; this is an architecture and planning clarification slice

## Phase 2B. Runtime Implementation Continuation Brief

- Mode: `Slim`
- Scope:
  - `apps/web/src/app/Root.tsx`
  - `apps/web/src/app/Root.test.tsx`
  - `apps/web/src/app/views/Canvas.tsx`
  - `apps/web/src/app/views/Canvas.test.tsx`
  - `apps/web/src/app/views/canvas/canvasDraftPresentationState.ts`
  - `apps/web/src/app/views/canvas/canvasDraftPresentationState.test.ts`
  - this closeout and the `TF-E2` Lane E registry entry
- Expected outcome:
  - `CanvasDraftPresentationState` becomes the single route-operability seam
    for Canvas runtime posture
  - `Canvas.tsx` publishes route posture instead of mutating Raven bootstrap
    directly
  - `Root.tsx` consumes the published posture and stops coupling startup to
    route ownership alone
  - regression tests prove pending, blocked, error, recovery, empty, and ready
    handoff behavior
- Risks and mitigations:
  - risk: stale published posture surviving route transitions
    mitigation: clear the published Canvas posture on route unmount and on
    fresh Canvas-entry transitions
  - risk: duplicate route-state derivation between Canvas render and Root
    mitigation: centralize derivation in `canvasDraftPresentationState.ts`
  - risk: current local worktree changes under Canvas tests
    mitigation: patch only the bootstrap-handoff seam and leave unrelated
    authoring/runtime edits intact
- Out of scope:
  - inspector property editing
  - further draft aggregate/session redesign
  - non-Canvas route bootstrap redesign
- Validation plan:
  - focused `vitest` for Canvas/Root/presentation-state files
  - `pnpm --filter @dvt/web typecheck`
  - focused `eslint` on touched files
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - pure presentation-state tests for route precedence and bootstrap
    completable rules
  - Canvas route tests for publication of route posture without direct Raven
    mutations
  - Root tests for Canvas bootstrap consumption and removal of pathname-only
    route completion
- Libraries evaluated:
  - none; implement the seam with local typed modules and existing React APIs

## Phase 2C. Canonical Route-Bootstrap Contract Brief

- Mode: `Slim`
- Scope:
  - `apps/web/src/app/bootstrap/routeBootstrapPresentation.ts`
  - `apps/web/src/app/Root.tsx`
  - `apps/web/src/app/routes.ts`
  - `apps/web/src/app/plugins/contracts/PluginManifest.ts`
  - `apps/web/src/app/plugins/dbt/dbtContributions.ts`
  - the Canvas route publication/test surfaces from Phase 2B
  - this closeout, the Canvas architecture pack, and the `TF-E2` Lane E
    registry entry
- Expected outcome:
  - `Root.tsx` consumes a generic active-route bootstrap contract resolved from
    route metadata via `useMatches()`
  - Canvas publishes that contract through a shared route-bootstrap registry
    instead of a `Root` import of the Canvas-specific store
  - future routes can opt into startup gating without adding pathname branches
    in `Root.tsx`
- Risks and mitigations:
  - risk: add a second startup truth next to `CanvasDraftPresentationState`
    mitigation: keep CanvasDraftPresentationState as the Canvas read model and
    translate it into the generic shell contract
  - risk: route metadata drift from publisher wiring
    mitigation: type the route handle contract and cover it in route/root tests
- Out of scope:
  - changing non-Canvas route behavior beyond the generic contract wiring
  - redesigning the Raven bootstrap state machine
- Validation plan:
  - focused `vitest` for Root, routes, Canvas, and route-bootstrap modules
  - `pnpm --filter @dvt/web typecheck`
  - focused `eslint` on touched runtime files
  - `pnpm docs:workboard:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - route-bootstrap store fallback, publish, and reset behavior
  - Root active-route contract resolution through route metadata
  - Canvas route publication of the generic contract
- Libraries evaluated:
  - none; use typed route metadata and a local external-store registry

## Architecture Rationale

### Fowler reading

- `Root.tsx` is the application shell
- `useCanvasController.ts` is the application service for the route
- `canvasDraftSession.ts` is the aggregate-like domain model
- `canvasDraftScope.ts` is the projection model
- `CanvasDraftPresentationState` is the Canvas read model
- `routeBootstrapPresentation.ts` is the generic shell contract consumed by the
  startup shell

The missing closure was not in the aggregate. It was in the shell consuming the
wrong signal.

### DDD reading

This is a bounded-context handoff:

- the graph-authoring context owns draft, scope, and recovery semantics
- the startup shell context owns splash visibility and route reveal policy
- the shell should consume an operability read model from the route context

The shell should not re-derive route truth from internal route mechanics.

### Hexagonal reading

The shell should depend on a route-facing presenter output, not on internal
adapters such as React Query state, React Flow state, or route-local JSX
branches.

That keeps startup orchestration outside the Canvas internals and preserves a
clean inbound seam for any route that needs startup gating.

### SOLID reading

- SRP:
  `Root.tsx` owns startup orchestration; Canvas owns route operability
- OCP:
  new recovery states should extend one presentation model, not force shell
  policy rewrites in multiple places
- DIP:
  the shell should depend on a route operability abstraction, not on copied
  booleans or view heuristics

### Comparison with mature systems

Mature workbench systems usually converge on the same shape:

- the shell owns splash/bootstrap lifecycle
- the active workbench module publishes explicit readiness and degraded posture
- the shell reveal depends on the active route contract, not on pathname or
  incidental leaf-widget state

That is the posture this documentation now canonicalizes for Canvas.

## Implementation Summary

- expanded `canvasDraftPresentationState.ts` from a toolbar-only helper into
  the route-level presentation seam that now derives:
  - recovery precedence
  - toolbar posture
  - route state
  - Raven bootstrap status/detail
  - bootstrap-completable readiness
- added `routeBootstrapPresentation.ts` as the generic active-route startup
  contract registry and fallback model
- changed `Canvas.tsx` so the route publishes presentation posture and no
  longer mutates the Raven bootstrap screen directly
- changed route metadata and `Root.tsx` so startup is resolved through
  `useMatches()` plus the generic route-bootstrap contract instead of through a
  Canvas-specific path branch
- added regression tests proving:
  - Canvas publishes pending, blocked, error, recovery, empty, and ready route
    posture correctly
  - `Root.tsx` keeps Raven pending until Canvas publishes operability
  - `Root.tsx` keeps Raven blocked when Canvas publishes recovery posture
  - `Root.tsx` completes startup only after Canvas publishes a completable
    route posture
- updated Lane E so `TF-E2` no longer claims the Raven startup handoff as the
  remaining architectural closure for this slice

## Validation

- `pnpm --filter @dvt/web exec vitest run src/app/bootstrap/routeBootstrapPresentation.test.ts src/app/views/canvas/canvasDraftPresentationState.test.ts src/app/views/Canvas.test.tsx src/app/Root.test.tsx src/app/routes.test.tsx` - PASS
- `pnpm --filter @dvt/web typecheck` - PASS
- `pnpm docs:sync` - PASS
- `pnpm docs:workboard:generate` - PASS
- `pnpm exec markdownlint-cli2 "docs/planning/closeouts/20260417-tf-e2-canvas-bootstrap-presentation-handoff-closeout.md"` - PASS
- `pnpm verify:prepush` - PASS

## Residuals

- The Raven startup handoff is now implemented through a generic route
  bootstrap contract, with Canvas as the first publisher.
- `TF-E2` remains in progress for the wider productization scope:
  node lifecycle, edge lifecycle, Inspector-backed property editing, and the
  broader proof matrix still remain outside this slice.
