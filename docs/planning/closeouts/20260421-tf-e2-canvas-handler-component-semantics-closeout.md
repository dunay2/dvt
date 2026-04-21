---
slice: tf-e2-canvas-handler-component-semantics
date: 2026-04-21
lane: E
task_id: TF-E2-B, TF-E2-C
mode: Slim
status: Accepted
author: AI (Codex)
last_reviewed: 2026-04-21
---

# TF-E2 Canvas handler component semantics closeout

## Phase 1. Think-First Analysis

### Problem summary

The Canvas route now has a real graph lifecycle component and stronger handler
contracts, but the handler-contract slice still stops one step short of
semantic componentization.

The concrete gap is:

- contract and builder files exist, but are not yet presented as a local
  component API
- multiple handler modules still do not declare their owned concern directly
- architecture tests still emphasize seam thinness more than semantic
  ownership

### Root cause

The earlier branch work correctly prioritized semantic mutation ownership and
the removal of legacy compatibility paths.

That left a partially completed architecture posture:

- graph mutation semantics are now named and componentized
- adapter composition is now grouped by contracts
- the contracts/builders subsystem is still treated as implementation detail
  rather than as a first-class local component

### Constraints and invariants

- `AGENTS.md`
  no hidden debt, no legacy compatibility path, no unchecked completion claims
- `docs/guides/ai-work-protocol.md`
  think-first and pre-implementation brief must exist before code changes; TDD
  for implementation
- `docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md`
  adapter seams must stay thin, explicit, and subordinate to semantic
  components
- `docs/architecture/components/web/graph/canvas-graph-lifecycle-component.md`
  graph mutation semantics must remain outside the handler-contract slice
- `docs/planning/reviews/architecture-and-governance/20260421-canvas-handler-seams-fowler-review.md`
  identifies the namespaced handler-contract component as the next bounded
  slice

### Options considered

- keep loose `build*` functions and only add documentation
- move all contract mapping back inline into the facades
- promote the builder files into namespaced local component APIs and add one
  semantic architecture fitness test

### Selected option and rationale

Promote the builder files into namespaced local component APIs and add the
semantic architecture fitness test.

This closes the actual drift:

- better semantic encapsulation
- less helper-function sprawl
- clearer documentation
- stronger guardrails against regression

### Rejected alternatives

- docs only:
  improves discoverability, but leaves runtime API drift intact
- inlining builders:
  regresses the recent handler-contract hardening and recreates facade bloat

## Phase 2. Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - `apps/web/src/app/views/canvas/*HandlerContract*.ts`
  - `apps/web/src/app/views/canvas/useCanvas*Handlers*.ts`
  - `apps/web/src/app/views/canvas/*.architecture.test.ts`
  - `docs/architecture/components/web/graph/*.md`
  - `docs/planning/reviews/architecture-and-governance/20260421-canvas-handler-seams-fowler-review.md`
  - this closeout
- Expected outcome:
  - handler-contract builders expose namespaced component APIs
  - local owned-concern docblocks are present across the touched handler slice
  - one architecture test validates semantic ownership, not only facade
    thinness
  - graph architecture docs describe the handler-contract subsystem as a local
    component with API, invariants, transitions, and consumers
- Risks and mitigations:
  - risk: cosmetic churn without semantic value
    mitigation: tie the runtime refactor directly to a namespaced API and one
    semantic architecture test
  - risk: touching too many handlers at once
    mitigation: restrict edits to the handler-contract slice and the handlers
    that directly compose it
- Out of scope:
  - reconnect semantics
  - inspector feature work
  - broader `useCanvasAuthoringRuntime.ts` decomposition
- Validation plan:
  - failing architecture tests first
  - targeted handler architecture tests
  - targeted web typecheck
  - focused lint over touched files
  - `pnpm docs:status:generate`
  - `pnpm docs:sync`
  - `pnpm verify:prepush`

## Phase 3. Normative Baseline Verification

Verified against the governing sources cited above:

- the controller architecture still requires explicit local seams and thin
  facades
- graph lifecycle remains the semantic mutation owner
- the follow-up review explicitly recommends a namespaced handler-contract
  component as the smallest valid next slice

Implementation may therefore:

- strengthen handler-seam encapsulation
- add semantic architecture guardrails
- expand local architecture docs

Implementation must not:

- move graph semantics back into handlers
- reintroduce `Pick<>`-shaped coupling through compatibility wrappers
- claim product-lifecycle closure beyond the scope of this slice

## Implementation summary

- `canvasGraphHandlerContractBuilders.ts` now exposes the namespaced component
  API `canvasGraphHandlerContractBuilders` with
  `edgeAuthoring`, `selection`, `layout`, and `nodeAuthoring` entrypoints.
- `canvasMutationHandlerContractBuilders.ts` now exposes the namespaced
  component API `canvasMutationHandlerContractBuilders` with `graphChange` and
  `sourceImport` entrypoints.
- `useCanvasGraphHandlers.ts` and `useCanvasMutationHandlers.ts` now consume the
  namespaced builder APIs instead of loose `build*` functions.
- a new semantic fitness function,
  `canvasHandlerContracts.architecture.test.ts`, now proves that the handler
  contract component stays namespaced and does not absorb hook, toast, or graph
  lifecycle ownership.
- the touched handler modules now declare a short top-of-file `Owned concern`
  docblock so local ownership is visible without reading internals first.
- the graph architecture pack now includes
  `canvas-handler-contracts-component.md`, and the controller/component-map docs
  now reference that component explicitly.
- planning surfaces now carry the new review and follow-up evidence:
  `review-status-board.md`, `agent-lane-e.yaml`, and the generated workboard
  views.

## Phase 6. Validation And Closeout

TDD red/green evidence:

- RED:
  `pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/useCanvasGraphHandlers.architecture.test.ts src/app/views/canvas/useCanvasMutationHandlers.architecture.test.ts src/app/views/canvas/canvasHandlerContracts.architecture.test.ts`
  - failed as expected because the current runtime still exposed loose
    `build*` functions instead of the required namespaced builder APIs
- GREEN:
  reran the same command after the refactor
  - passed

Focused slice validation:

- `pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/canvasHandlerContracts.architecture.test.ts src/app/views/canvas/useCanvasGraphHandlers.architecture.test.ts src/app/views/canvas/useCanvasMutationHandlers.architecture.test.ts src/app/views/canvas/useCanvasNodeAuthoringHandlers.architecture.test.ts src/app/views/canvas/useCanvasGraphChangeHandlers.architecture.test.ts src/app/views/canvas/useCanvasNodeChangeHandlers.architecture.test.ts src/app/views/canvas/useCanvasEdgeChangeHandlers.architecture.test.ts src/app/views/canvas/useCanvasEdgeAuthoringHandlers.architecture.test.ts src/app/views/canvas/useCanvasLayoutHandlers.architecture.test.ts src/app/views/canvas/useCanvasSelectionHandlers.architecture.test.ts src/app/views/canvas/useCanvasSourceImportHandlers.architecture.test.ts src/app/views/canvas/useCanvasGraphHandlers.edgeAuthoring.test.tsx src/app/views/canvas/useCanvasGraphHandlers.layout.test.tsx src/app/views/canvas/useCanvasGraphHandlers.nodeDrop.test.tsx src/app/views/canvas/useCanvasGraphHandlers.nodeRemoval.test.tsx src/app/views/canvas/useCanvasGraphHandlers.selection.test.tsx src/app/views/canvas/useCanvasNodeChangeHandlers.test.tsx src/app/views/canvas/useCanvasEdgeChangeHandlers.test.tsx`
  - passed
- `pnpm --filter @dvt/web typecheck`
  - passed
- `pnpm --filter @dvt/web exec eslint src/app/views/canvas/canvasGraphHandlerContractBuilders.ts src/app/views/canvas/canvasMutationHandlerContractBuilders.ts src/app/views/canvas/useCanvasGraphHandlers.ts src/app/views/canvas/useCanvasMutationHandlers.ts src/app/views/canvas/useCanvasEdgeAuthoringHandlers.ts src/app/views/canvas/useCanvasSelectionHandlers.ts src/app/views/canvas/useCanvasNodeAuthoringHandlers.ts src/app/views/canvas/useCanvasGraphChangeHandlers.ts src/app/views/canvas/useCanvasNodeChangeHandlers.ts src/app/views/canvas/useCanvasEdgeChangeHandlers.ts src/app/views/canvas/useCanvasNodeDropHandlers.ts src/app/views/canvas/useCanvasNodeRemovalHandlers.ts src/app/views/canvas/useCanvasSourceImportHandlers.ts src/app/views/canvas/useCanvasLayoutHandlers.ts src/app/views/canvas/useCanvasGraphHandlers.architecture.test.ts src/app/views/canvas/useCanvasMutationHandlers.architecture.test.ts src/app/views/canvas/canvasHandlerContracts.architecture.test.ts`
  - passed
- `pnpm docs:workboard:generate`
  - passed
- `pnpm docs:sync`
  - passed
- `pnpm docs:status:generate`
  - passed
- `pnpm verify:prepush`
  - passed

No compatibility shim, placeholder, or legacy builder surface was added.
