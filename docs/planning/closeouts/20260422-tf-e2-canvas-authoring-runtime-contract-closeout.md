---
slice: tf-e2-canvas-authoring-runtime-contract
date: 2026-04-22
lane: E
task_id: TF-E2, TF-E2-A, TF-E2-E
mode: Slim
status: Accepted
author: AI (Codex)
last_reviewed: 2026-04-22
---

# TF-E2 Canvas authoring-runtime contract closeout

## Phase 1. Think-First Analysis

### Problem summary

The Canvas branch already split route composition, authoring projection, and
draft-session aggregate boundaries, but the authoring-runtime seam still keeps
one architectural drift:

- `useCanvasAuthoringRuntimeDraftFlow.ts` depends on the parent
  `useCanvasAuthoringRuntime.ts` file for its argument contract
- runtime-local policy modules still do not consistently declare owned concern
- the runtime seam has no local component guide with API, invariants,
  transitions, and consumers

That leaves the next command-side seam semantically weaker than the projection
and route-composition seams around it.

### Root cause

The branch extracted runtime behavior in the correct direction, but it stopped
once the hook became smaller and behaviorally correct.

That left one residual anti-pattern:

- the subcomponent reads its type contract from the parent composition file,
  which inverts the dependency direction and hides the component API
- runtime-local files stayed implementation-first instead of contract-first
- documentation still explains the runtime mostly through broader review pages
  instead of a local component guide

### Constraints and invariants

- `AGENTS.md`
  no hidden debt, no compatibility shim, no skipped verification
- `docs/guides/ai-work-protocol.md`
  this is a `Slim` architectural-maintenance slice with mandatory closeout
- `docs/architecture/components/web/graph/graph-frontend-architecture.md`
  React Flow remains projection-only and Canvas keeps explicit query/command
  seams
- `docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md`
  `useCanvasAuthoringRuntime.ts` is the next architectural pressure point and
  must shrink through explicit seam boundaries instead of regrowing
- `docs/architecture/components/web/graph/graph-canvas-runtime-model.md`
  runtime behavior stays centered on draft-session truth, explicit recovery
  posture, and route-local command ownership
- `docs/planning/reviews/architecture-and-governance/20260422-canvas-component-governance-follow-up-review.md`
  follow-up governance work must keep turning implicit seams into explicit local
  components

### Options considered

- leave the runtime as-is and document the coupling only in review prose
- split runtime behavior further without first extracting a public local
  contract
- introduce a local runtime contract, align subordinate seams to it, and add a
  component guide plus semantic architecture checks

### Selected option and rationale

Introduce a local runtime contract, align subordinate seams to it, and add a
component guide plus semantic architecture checks.

That is the smallest slice that applies the same pattern already used in other
Canvas components:

- explicit public vocabulary
- inward dependency direction
- owned-concern headers
- local component documentation
- semantic fitness functions guarding the boundary

### Rejected alternatives

- further behavior extraction without a component contract would keep the seam
  implicit
- leaving the subcomponent typed by the parent would preserve the current drift
  even if the file count increased

## Phase 2. Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - new `canvasAuthoringRuntime.types.ts` component contract
  - `useCanvasAuthoringRuntime.ts`
  - `useCanvasAuthoringRuntimeDraftFlow.ts`
  - `useCanvasDraftBaseline.ts`
  - `useCanvasDraftLifecycle.ts`
  - `canvasAuthoringState.ts`
  - `canvasBackendPosture.ts`
  - runtime architecture tests
  - graph architecture docs for the runtime seam
- Expected outcome:
  - the authoring-runtime component exposes its local contract from a dedicated
    file instead of from the parent hook
  - runtime-local files consistently declare owned concern
  - docs explain runtime API, invariants, transitions, and consumers locally
  - architecture tests guard the contract direction and runtime component
    layering
- Risks and mitigations:
  - risk: accidental runtime-behavior regression
    mitigation: keep logic stable and limit code changes to contract extraction
    and dead-dependency cleanup
  - risk: parallel docs drift
    mitigation: update the graph pack, index, and closeout in the same slice
- Out of scope:
  - new runtime behavior
  - controller facade redesign
  - mutation-handler or execution-action refactors
  - source-import productization
- Validation plan:
  - targeted `vitest` architecture and runtime tests in `@dvt/web`
  - `pnpm --filter @dvt/web typecheck`
  - targeted `eslint` for touched web files
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - negative architecture assertions that the draft-flow hook no longer imports
    its contract from the parent runtime hook
  - semantic component test covering contract file, draft-flow seam, baseline
    seam, and lifecycle seam
  - existing runtime and lifecycle architecture tests tightened instead of
    adding behaviorally redundant hook tests
- Libraries evaluated:
  - None evaluated - no custom implementation beyond local architectural
    hardening is required for this slice

## Phase 3. Normative Baseline Verification

Verified against the governing sources above:

- the graph pack already treats local component guides as canonical ownership
  surfaces
- runtime ownership remains route-local command orchestration over aggregate
  truth, not a controller or viewport concern
- semantic hardening is expected to happen through explicit local contracts and
  architecture fitness functions

Implementation may therefore:

- extract the runtime component contract into a dedicated local file
- align subordinate seams to that contract
- add the missing runtime component guide and diagrams

Implementation must not:

- change semantic authority away from draft-session truth
- move runtime logic into the controller or route shell
- reintroduce parallel mutation or recovery paths

## Implementation Summary

- added a local runtime contract file:
  `apps/web/src/app/views/canvas/canvasAuthoringRuntime.types.ts`
- removed dead `graphStrategy` coupling from `useCanvasAuthoringRuntime.ts`
  and its controller call site
- inverted the subordinate dependency direction so
  `useCanvasAuthoringRuntimeDraftFlow.ts` now depends on the local runtime
  contract instead of the parent runtime hook
- reused the runtime contract vocabulary in `useCanvasDraftBaseline.ts` and
  `canvasDraftLifecycle.types.ts` to reduce repeated transport and provenance
  shapes
- added owned-concern headers across the touched runtime-local modules:
  - `useCanvasAuthoringRuntime.ts`
  - `useCanvasAuthoringRuntimeDraftFlow.ts`
  - `useCanvasDraftBaseline.ts`
  - `useCanvasDraftLifecycle.ts`
  - `canvasDraftLifecycle.types.ts`
  - `canvasAuthoringState.ts`
  - `canvasBackendPosture.ts`
- added a local component guide:
  `docs/architecture/components/web/graph/canvas-authoring-runtime-component.md`
- updated the graph architecture pack and follow-up review so the runtime seam
  is now routed through a local component guide instead of only broad review
  prose
- added a semantic component fitness function:
  `canvasAuthoringRuntimeComponent.architecture.test.ts`
- tightened the existing runtime architecture tests so they now prove:
  - owned-concern headers are present
  - the local runtime contract is explicit
  - draft-flow no longer imports its type contract from the parent runtime hook

## Phase 6. Validation And Closeout

Focused documentation and generated-surface validation:

- `pnpm docs:sync`
  - passed
- `pnpm docs:status:generate`
  - passed
- `pnpm exec markdownlint-cli2 docs/architecture/components/web/graph/canvas-authoring-runtime-component.md docs/architecture/components/web/graph/canvas-component-map-and-modernization-review.md docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md docs/architecture/components/web/graph/graph-canvas-runtime-model.md docs/architecture/components/web/graph/graph-frontend-architecture.md docs/architecture/components/web/graph/index.md docs/planning/reviews/architecture-and-governance/20260422-canvas-component-governance-follow-up-review.md docs/planning/closeouts/20260422-tf-e2-canvas-authoring-runtime-contract-closeout.md docs/planning/status/generated-code-state.md --config .markdownlint-cli2.jsonc --ignore-path .markdownlintignore`
  - passed

Focused `@dvt/web` validation:

- `pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/canvasAuthoringRuntimeComponent.architecture.test.ts src/app/views/canvas/useCanvasAuthoringRuntime.architecture.test.ts src/app/views/canvas/useCanvasAuthoringRuntimeDraftFlow.architecture.test.ts src/app/views/canvas/useCanvasDraftLifecycle.architecture.test.ts src/app/views/canvas/useCanvasController.architecture.test.ts`
  - passed
- `pnpm --filter @dvt/web typecheck`
  - passed
- `pnpm --filter @dvt/web exec eslint src/app/views/canvas/canvasAuthoringRuntime.types.ts src/app/views/canvas/canvasAuthoringRuntimeComponent.architecture.test.ts src/app/views/canvas/canvasAuthoringState.ts src/app/views/canvas/canvasBackendPosture.ts src/app/views/canvas/canvasDraftLifecycle.types.ts src/app/views/canvas/useCanvasAuthoringRuntime.architecture.test.ts src/app/views/canvas/useCanvasAuthoringRuntime.ts src/app/views/canvas/useCanvasAuthoringRuntimeDraftFlow.architecture.test.ts src/app/views/canvas/useCanvasAuthoringRuntimeDraftFlow.ts src/app/views/canvas/useCanvasController.ts src/app/views/canvas/useCanvasDraftBaseline.ts src/app/views/canvas/useCanvasDraftLifecycle.ts`
  - passed

Repository gate:

- `pnpm verify:prepush`
  - passed

No compatibility shim, placeholder, fake implementation, skipped hook, or
relaxed rule was introduced in this slice.
