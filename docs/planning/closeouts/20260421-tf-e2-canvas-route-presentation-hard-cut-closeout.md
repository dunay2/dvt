---
slice: tf-e2-canvas-route-presentation-hard-cut
date: 2026-04-21
lane: E
task_id: TF-E2, TF-E2-F
mode: Full
status: Accepted
author: AI (Codex)
last_reviewed: 2026-04-21
---

# TF-E2 Canvas route presentation hard cut closeout

## Phase 1. Think-First Analysis

### Problem summary

Canvas now has a stronger draft aggregate, graph lifecycle component, and
handler-contract component, but route-visible presentation is still split
across multiple local interpretations.

The concrete drift is:

- `canvasRouteViewState.ts` already aggregates route posture, but still exports
  the compatibility shortcut `showRecoveryBanner`
- `CanvasRecoveryBanner.tsx` reads `draftRecoveryReason` directly from the
  controller
- `CanvasCenterSurface.tsx` reinterprets route posture through local branching
- `canvasToolbarViewModel.ts` treats `draftToolbarState.showReloadAction` as a
  recovery signal even though it is an affordance flag, not route authority

That means the route still has more than one visible truth for `recovery`,
`loading`, `blocked`, `error`, `empty`, and `ready`.

### Root cause

Earlier slices prioritized the right bounded contexts in the right order:

- route bootstrap contract
- draft aggregate hardening
- graph lifecycle hard cut
- handler contract semantics

Those slices established the semantic building blocks, but they stopped short
of finishing the presentation-model hard cut.

The repository now has the correct component pieces, yet Canvas still carries a
compatibility posture where:

- route presentation exists as a model
- visible route adapters still read controller-local or affordance-local state
  directly

### Constraints and invariants

- `AGENTS.md`
  no hidden debt, no compatibility shim, no undeclared rule relaxation
- `docs/guides/ai-work-protocol.md`
  think-first and pre-implementation brief must be written before code; visible
  behavior changes require doc-driven and test-backed execution
- `docs/planning/state/planning-control-tower.md`
  new active slice must be reflected in lane state and generated planning views
- `docs/architecture/components/web/graph/graph-route-bootstrap-architecture.md`
  Canvas is a `published` route; `mount != settled`; shell posture must consume
  the typed route contract instead of widget-local heuristics
- `docs/architecture/components/web/graph/canvas-component-map-and-modernization-review.md`
  next iteration focus explicitly includes route-state consistency across
  toolbar, center surface, and recovery banner
- `docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md`
  route presentation belongs to presentation/query seams, not raw controller or
  adapter-local branching

### Options considered

- keep current route model and patch only the toolbar recovery heuristic
- add a new parallel route-presentation facade beside `canvasRouteViewState.ts`
- hard-cut the route-visible stack so banner, center surface, toolbar, and
  bootstrap publication all consume one canonical route presentation component

### Selected option and rationale

Hard-cut the route-visible stack so banner, center surface, toolbar, and
bootstrap publication all consume one canonical route presentation component.

This is the smallest slice that removes the real drift:

- one source of truth for visible route posture
- no raw controller recovery branching in adapters
- no affordance-as-authority in toolbar workflow posture
- cleaner Fowler presentation-model boundary for the Canvas route

### Rejected alternatives

- toolbar-only fix:
  reduces one symptom but leaves the route with parallel semantic paths
- new facade beside `canvasRouteViewState.ts`:
  introduces one more layer and preserves compatibility instead of removing it

## Phase 2. Pre-Implementation Brief

- Mode: `Full`
- Scope:
  - `docs/planning/state/agent-lane-e.yaml`
  - `docs/planning/closeouts/20260421-tf-e2-canvas-route-presentation-hard-cut-closeout.md`
  - `docs/architecture/components/web/graph/canvas-route-presentation-component.md`
  - `docs/architecture/components/web/graph/canvas-component-map-and-modernization-review.md`
  - `docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md`
  - `apps/web/src/app/views/Canvas.tsx`
  - `apps/web/src/app/views/canvas/canvasDraftPresentationModel.ts`
  - `apps/web/src/app/views/canvas/canvasRouteViewState.ts`
  - `apps/web/src/app/views/canvas/CanvasCenterSurface.tsx`
  - `apps/web/src/app/views/canvas/CanvasRecoveryBanner.tsx`
  - `apps/web/src/app/views/canvas/canvasToolbarViewModel.ts`
  - `apps/web/src/app/views/canvas/CanvasToolbarDraftStatus.tsx`
  - route-presentation tests and relevant architecture tests
- Expected outcome:
  - Canvas route-visible posture is canonicalized under one component
  - no compatibility shortcut remains for recovery/banner visibility
  - no controller-direct recovery branching remains in banner rendering
  - toolbar workflow posture does not infer recovery from
    `showReloadAction`
  - docs and planning reflect the new component and active slice
- Risks and mitigations:
  - risk: visible UX regression in recovery or blocked states
    mitigation: red-first semantic tests for each route posture before runtime
    edits
  - risk: bootstrap publication drifts from rendered route posture
    mitigation: keep bootstrap projection derived from the same canonical
    presentation model and add alignment tests
  - risk: slice expands into wider controller refactor
    mitigation: keep `useCanvasController.ts` thin and restrict changes to
    presentation seams plus their consumers
- Out of scope:
  - `useCanvasAuthoringRuntime.ts` decomposition
  - Inspector write semantics
  - node/edge reconnect closure
  - broader proof-matrix closure under `TF-E2-E`
- Validation plan:
  - red-first Vitest tests for route-presentation semantics
  - focused render tests for banner, center surface, and toolbar
  - targeted web typecheck and eslint for touched files
  - targeted Cypress only if the hard cut changes end-to-end visible route
    posture
  - `pnpm docs:workboard:generate`
  - `pnpm docs:sync`
  - `pnpm verify:prepush`
- Test coverage plan:
  - negative path: toolbar must not show recovery from affordance-only state
  - negative path: banner must not render when route posture is not recovery
  - negative path: center surface must not show graph or backend loading/error
    branches for `ready`
  - alignment path: one route posture must drive bootstrap, center surface,
    banner, and toolbar consistently
- Libraries evaluated:
  - none evaluated; this is a local semantic hard cut over existing governed
    components

## Phase 3. Implementation Summary

- removed `showRecoveryBanner` from `canvasRouteViewState.ts`
- moved `CanvasRecoveryBanner.tsx` onto canonical `presentationState` instead
  of controller-local recovery fields
- moved `CanvasCenterSurface.tsx` onto canonical `presentationState` and
  bootstrap detail instead of controller-local/workbench-local strings
- changed `canvasToolbarViewModel.ts` so recovery workflow posture is derived
  from `routeState === 'recovery'`, not from `draftToolbarState.showReloadAction`
- threaded explicit `routeState` through `Canvas.tsx`, `CanvasShell.tsx`, and
  `CanvasToolbar.tsx`
- added architecture and route-semantic tests that fail if compatibility
  booleans or raw controller branching return

## Phase 4. Validation Outcome

- targeted Vitest route/toolbar/architecture pack: passed
- targeted Vitest recovery pack: passed
- targeted Vitest `CanvasShell` pack: passed
- `pnpm --filter @dvt/web typecheck`: passed
- targeted eslint over touched web files: passed
- Cypress assessment:
  the existing spec `apps/web/cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts`
  validates preview/run persistence only. It does not exercise blocked,
  recovery, or route-presentation posture, so it was intentionally not used as
  evidence for this slice.

## Phase 5. Outcome And Drift

The route-presentation hard cut is complete for the active Canvas shell path.

Closed drift:

- compatibility boolean for recovery-banner visibility
- banner-specific raw controller recovery branching
- center-surface dependence on raw controller and workbench error props
- toolbar recovery inference from reload affordance flags

Remaining drift outside this slice:

- `useCanvasAuthoringRuntime.ts` remains broad
- selection and inspector semantics still need their own component closure
