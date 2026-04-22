---
slice: tf-e2-canvas-component-governance-follow-up
date: 2026-04-22
lane: E
task_id: TF-E2, TF-E2-A, TF-E2-E
mode: Slim
status: Accepted
author: AI (Codex)
last_reviewed: 2026-04-22
---

# TF-E2 Canvas component governance follow-up closeout

## Phase 1. Think-First Analysis

### Problem summary

The Canvas branch already improved the hard-cut route architecture, but two
seams still lacked first-class local governance:

- the authoring-projection seam from protected draft truth to viewport state
- the route-composition seam from route posture to shell presentation

That forced broader reviews to carry detailed ownership explanations that should
have lived next to the component itself.

### Root cause

The branch prioritized semantic authority and lifecycle correctness first.

That was the correct order, but it left a follow-up governance gap:

- local component guides did not exist for the projection and route-composition
  seams
- some touched modules still lacked owned-concern headers
- architecture tests proved thinness more often than semantic ownership

### Constraints and invariants

- `AGENTS.md`
  no hidden debt, no compatibility downgrade, no skipped validation
- `docs/guides/ai-work-protocol.md`
  this is a `Slim` maintenance slice with doc, test, and local code hardening
- `docs/architecture/components/web/graph/graph-frontend-architecture.md`
  projection stays downstream of protected truth and React Flow remains a
  projection
- `docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md`
  route composition and read-side seams must stay explicit and responsibility
  aligned
- `docs/planning/reviews/architecture-and-governance/20260422-canvas-component-governance-follow-up-review.md`
  this slice is the bounded response to the identified component-governance
  drift

### Options considered

- leave the seams documented only through broad reviews
- add docs only and skip code/test reinforcement
- add local component guides, owned-concern headers, and semantic fitness
  functions together

### Selected option and rationale

Add local component guides, owned-concern headers, and semantic fitness
functions together.

That is the smallest slice that fixes both code drift and documentation drift
without reopening runtime behavior.

## Phase 2. Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - `apps/web/src/app/services/workspace/workspaceGraphDraftProjection.ts`
  - `apps/web/src/app/views/Canvas.tsx`
  - `apps/web/src/app/views/canvas/CanvasCenterSurface.tsx`
  - `apps/web/src/app/views/canvas/CanvasShell.tsx`
  - `apps/web/src/app/views/canvas/CanvasStateViews.tsx`
  - `apps/web/src/app/views/canvas/CanvasViewport.tsx`
  - `apps/web/src/app/views/canvas/canvasCanonicalSnapshot.ts`
  - `apps/web/src/app/views/canvas/canvasDraftReadModel.ts`
  - `apps/web/src/app/views/canvas/canvasShell.types.ts`
  - `apps/web/src/app/views/canvas/useCanvasController.ts`
  - new and updated architecture tests for projection and route composition
  - graph architecture pack docs and review surfaces
- Expected outcome:
  - route composition and authoring projection become explicit local components
  - touched modules declare owned concern at the top of the file
  - architecture tests verify semantic ownership of the new component seams
  - graph-pack navigation routes readers to the new component docs
- Risks and mitigations:
  - risk: documentary churn without stronger code guardrails
    mitigation: pair docs with owned-concern headers and semantic architecture
    tests
  - risk: accidental runtime behavior change
    mitigation: keep edits bounded to docs, module headers, and architecture
    tests; run focused route and projection tests
- Out of scope:
  - new runtime features
  - `useCanvasAuthoringRuntime.ts` decomposition
  - inspector editing
  - backend source-import implementation
- Validation plan:
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - focused `vitest`, `eslint`, and `typecheck` for `@dvt/web`
  - focused markdown lint for touched docs
  - `pnpm verify:prepush`

## Phase 3. Normative Baseline Verification

Verified against the governing sources above:

- the graph pack already authorizes local component docs as the canonical place
  for public API, invariants, and consumers
- the hard-cut review keeps protected draft truth as the only accepted remote
  authoring authority
- the frontend Fowler pattern requires explicit route composition and explicit
  projection seams instead of mixed route-local helpers

Implementation may therefore:

- formalize the two local components
- strengthen module ownership visibility
- add semantic fitness functions

Implementation must not:

- reintroduce mock or snapshot authority
- move persistence or controller orchestration into route composition
- move protected-boundary knowledge into viewport code

## Implementation Summary

- added a canonical mailbox review:
  `20260422-canvas-component-governance-follow-up-review.md`
- added two local component guides:
  - `canvas-authoring-projection-component.md`
  - `canvas-route-composition-component.md`
- updated graph-pack navigation and current architecture pages so the new local
  docs are canonical entry points
- added owned-concern headers to touched route and projection modules that were
  still missing them
- added semantic architecture tests for:
  - the authoring-projection component
  - the shell composition component
- tightened the existing `CanvasCenterSurface` architecture test so the
  component header is now part of the contract, not just helper extraction

## Phase 6. Validation And Closeout

Focused documentation validation:

- `pnpm docs:sync`
  - passed
- `pnpm docs:status:generate`
  - passed
- `pnpm exec markdownlint-cli2 docs/planning/reviews/architecture-and-governance/20260422-canvas-component-governance-follow-up-review.md docs/architecture/components/web/graph/canvas-authoring-projection-component.md docs/architecture/components/web/graph/canvas-route-composition-component.md docs/architecture/components/web/graph/index.md docs/architecture/components/web/graph/graph-frontend-architecture.md docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md docs/architecture/components/web/graph/canvas-component-map-and-modernization-review.md docs/planning/reviews/review-status-board.md docs/planning/closeouts/20260422-tf-e2-canvas-component-governance-follow-up-closeout.md --config .markdownlint-cli2.jsonc --ignore-path .markdownlintignore`
  - passed

Focused `@dvt/web` validation:

- `pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/Canvas.architecture.test.tsx src/app/views/Canvas.routeStates.test.tsx src/app/views/Canvas.readOnlyStates.test.tsx src/app/views/canvas/CanvasShell.architecture.test.tsx src/app/views/canvas/CanvasCenterSurface.architecture.test.ts src/app/views/canvas/canvasAuthoringProjection.architecture.test.ts src/app/views/canvas/useCanvasAuthoringProjection.architecture.test.ts src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts src/app/views/canvas/canvasAuthoringGraphProjection.test.ts src/app/services/workspace/workspaceGraphDraftProjection.test.ts src/app/views/canvas/useCanvasViewportGraphModel.test.tsx`
  - passed
- `pnpm --filter @dvt/web typecheck`
  - passed
- `pnpm --filter @dvt/web exec eslint src/app/services/workspace/workspaceGraphDraftProjection.ts src/app/views/Canvas.tsx src/app/views/canvas/CanvasCenterSurface.tsx src/app/views/canvas/CanvasCenterSurface.architecture.test.ts src/app/views/canvas/CanvasRecoveryBanner.tsx src/app/views/canvas/CanvasShell.tsx src/app/views/canvas/CanvasShell.architecture.test.tsx src/app/views/canvas/CanvasStateViews.tsx src/app/views/canvas/CanvasViewport.tsx src/app/views/canvas/canvasAuthoringGraphProjection.ts src/app/views/canvas/canvasAuthoringProjection.architecture.test.ts src/app/views/canvas/canvasCanonicalSnapshot.ts src/app/views/canvas/canvasDraftReadModel.ts src/app/views/canvas/canvasShell.types.ts src/app/views/canvas/useCanvasAuthoringProjection.ts src/app/views/canvas/useCanvasController.ts src/app/views/canvas/useCanvasViewportGraphModel.ts`
  - passed

Repository gate:

- `pnpm verify:prepush`
  - passed

No compatibility shim, placeholder, fake implementation, or relaxed rule was
introduced in this slice.
