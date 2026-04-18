---
slice: tf-e2-canvas-srp-seams
date: 2026-04-18
lane: E
task_id: TF-E2-A
mode: Slim
status: Completed
author: AI (Codex)
last_reviewed: 2026-04-18
---

# TF-E2 canvas SRP seams closeout

## Phase 1. Think-First Analysis

### Problem summary

The previous Canvas refactor removed draft persistence IO from
`useCanvasController`, but several wide seams still remained:

- `useCanvasController` still combined authoring runtime assembly, selection
  synchronization, mutation handling, and route-facing composition.
- `useCanvasDraftLifecycle` was smaller, but still carried draft refs, payload
  projection, and downstream lifecycle assembly in one hook.
- `useCanvasDraftBootstrapSync` and `useCanvasDraftPersistence` were still
  effect-heavy seams instead of composition seams.

### Root cause

The earlier pass extracted infrastructure first, but stopped one seam too soon.
That left policy derivation and lifecycle effect choreography concentrated in
two high-traffic hooks.

It also left one DDD drift unresolved:

- the refactor was increasingly Fowler/SRP-correct, but not yet explicit
  enough about application seams vs domain policies vs projection seams vs
  repository boundaries
- `useCanvasAuthoringRuntime` still hid persisted draft baseline access and
  graph projection assembly inside one authoring seam

### Constraints and invariants

- `AGENTS.md`: architecture, docs, planning, and validation evidence must stay
  aligned.
- `docs/guides/ai-work-protocol.md`: Slim refactors still require docs-first
  alignment when architecture ownership changes.
- `docs/architecture/components/web/frontend-fowler-implementation-pattern.md`:
  controllers should compose service/policy seams rather than own them inline.
- `docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md`:
  Canvas must converge toward a thin composition facade plus explicit draft
  application seams.
- `docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-canvas-target-architecture-execution-plan-20260417.md`:
  the TF-E2 DDD map distinguishes application seams, domain policies,
  repositories, projections, and composition roots
- `docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-canvas-target-architecture-execution-plan-20260417.md`:
  `TF-E2-A` should keep extracting bounded seams before wider node/edge closure.

### Options considered

- keep the current controller/lifecycle seams and accept the CodeScene warnings
- split only `useCanvasDraftLifecycle`
- split both the controller policy derivation and the lifecycle effect chain

### Selected option and rationale

Split the controller and lifecycle chain again.

- `useCanvasController` now delegates authoring runtime assembly, selection
  synchronization, and mutation aftermath to dedicated route seams.
- `useCanvasDraftLifecycle` now delegates draft refs and current-draft payload
  projection before composing the bootstrap and persistence seams.
- `useCanvasDraftBootstrapSync` and `useCanvasDraftPersistence` now act as
  composition seams over narrower hooks instead of carrying their own large
  effect stacks.

This improves SRP without changing the external behavior or inventing a new
frontend-local contract.

## Phase 2. Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - `apps/web/src/app/views/canvas/useCanvasController.ts`
  - `apps/web/src/app/views/canvas/useCanvasControllerEnvironment.ts`
  - `apps/web/src/app/views/canvas/useCanvasControllerReadModel.ts`
  - `apps/web/src/app/views/canvas/useCanvasAuthoringRuntime.ts`
  - `apps/web/src/app/views/canvas/useCanvasDraftBaseline.ts`
  - `apps/web/src/app/views/canvas/useCanvasAuthoringProjection.ts`
  - `apps/web/src/app/views/canvas/useCanvasSelectionSync.ts`
  - `apps/web/src/app/views/canvas/useCanvasMutationHandlers.ts`
  - `apps/web/src/app/views/canvas/useCanvasGraphChangeHandlers.ts`
  - `apps/web/src/app/views/canvas/useCanvasNodeChangeHandlers.ts`
  - `apps/web/src/app/views/canvas/useCanvasEdgeChangeHandlers.ts`
  - `apps/web/src/app/views/canvas/useCanvasExplicitNodeAdmission.ts`
  - `apps/web/src/app/views/canvas/useCanvasSourceImportHandlers.ts`
  - `apps/web/src/app/views/canvas/canvasMutationHandlers.types.ts`
  - `apps/web/src/app/views/canvas/canvasGraphChangeRuntime.ts`
  - `apps/web/src/app/views/canvas/canvasBackendPosture.ts`
  - `apps/web/src/app/views/canvas/canvasAuthoringState.ts`
  - `apps/web/src/app/views/canvas/useCanvasDraftLifecycle.ts`
  - `apps/web/src/app/views/canvas/useCanvasDraftBootstrapSync.ts`
  - `apps/web/src/app/views/canvas/useCanvasDraftPersistence.ts`
  - `apps/web/src/app/views/canvas/useCanvasDraftBootstrapping.ts`
  - `apps/web/src/app/views/canvas/useCanvasDraftInitialBootstrap.ts`
  - `apps/web/src/app/views/canvas/useCanvasDraftMissingRemoteSync.ts`
  - `apps/web/src/app/views/canvas/useCanvasDraftCanonicalReconcile.ts`
  - `apps/web/src/app/views/canvas/useCanvasDraftReloadHydration.ts`
  - `apps/web/src/app/views/canvas/useCanvasDraftAutosave.ts`
  - `apps/web/src/app/views/canvas/canvasDraftAutosaveExecution.ts`
  - `apps/web/src/app/views/canvas/useCanvasDraftRecoveryActions.ts`
  - `apps/web/src/app/views/canvas/useCanvasDraftAttemptRefs.ts`
  - `apps/web/src/app/views/canvas/useCanvasCurrentDraftPayload.ts`
  - `apps/web/src/app/views/canvas/canvasCanonicalSnapshot.ts`
  - `apps/web/src/app/views/canvas/canvasDraftIdempotencyKey.ts`
  - `apps/web/src/app/views/canvas/canvasDraftPersistenceRuntime.ts`
  - `apps/web/src/app/views/canvas/canvasDraftLifecycleSnapshot.ts`
  - `apps/web/src/app/views/canvas/canvasDraftLifecycle.types.ts`
  - focused Canvas tests and architecture guards
  - controller architecture doc and Lane E planning surfaces
- Expected outcome:
  - controller becomes a thinner facade over explicit route seams
  - lifecycle hooks become composition seams rather than medium-sized effect
    containers
  - behavior remains stable under the existing controller test matrix
- Risks and mitigations:
  - risk: accidentally change draft persistence timing or stale-save fencing
    mitigation: keep the existing controller behavior tests and rerun the
    negative-path matrix
  - risk: create helper sprawl with unclear ownership
    mitigation: use one seam per responsibility: backend posture, authoring
    state, bootstrap sync, persistence, and snapshot mapping
  - risk: docs lag behind the new seam layout
    mitigation: update architecture and planning surfaces in the same slice
- Out of scope:
  - changing protected workspace draft contracts
  - Inspector property editing
  - edge lifecycle redesign
  - OpenAPI or Swagger work

## Implementation Summary

- introduced `useCanvasAuthoringRuntime.ts` as the authoring assembly seam for:
  - graph-draft query ownership
  - `draftSession` wiring
  - canonical snapshot assembly
  - lifecycle composition
  - authoring-state derivation
- introduced `useCanvasSelectionSync.ts` so the controller no longer owns the
  selected-node and inspector reconciliation effect
- introduced `useCanvasControllerEnvironment.ts` so the controller no longer
  owns route-local service, capability, config, strategy, and store wiring
- introduced `useCanvasControllerReadModel.ts` so the controller no longer
  owns:
  - transformation validation derivation
  - impacted-node projection
  - inspector projection
- corrected DDD drift in the authoring chain by extracting:
  - `useCanvasDraftBaseline.ts` as the persisted draft baseline seam
  - `useCanvasAuthoringProjection.ts` as the graph projection and canonical
    snapshot seam
- reduced `useCanvasAuthoringRuntime.ts` so it reads more clearly as an
  application seam over:
  - baseline access
  - projection
  - lifecycle orchestration
  - pure domain-policy derivation
- introduced `useCanvasMutationHandlers.ts` so the controller no longer owns:
  - and it now acts as a composition seam over:
    `useCanvasGraphChangeHandlers.ts`
    `useCanvasSourceImportHandlers.ts`
- reduced `useCanvasGraphChangeHandlers.ts` into a composition seam over:
  - `useCanvasNodeChangeHandlers.ts`
  - `useCanvasEdgeChangeHandlers.ts`
  - `useCanvasExplicitNodeAdmission.ts`
- moved graph-change detail into narrower seams so the wrapper no longer owns:
  - node-change handling
  - edge-change handling
  - explicit-node admission
- moved source-import aftermath into `useCanvasSourceImportHandlers.ts` so the
  wrapper no longer owns:
  - imported-node focus state
  - source-import aftermath
  - workspace-graph refresh invalidation
- kept `canvasBackendPosture.ts` and `canvasAuthoringState.ts` as pure policy
  seams
- reduced `useCanvasDraftLifecycle.ts` further by extracting:
  - `useCanvasDraftAttemptRefs.ts`
  - `useCanvasCurrentDraftPayload.ts`
  - `canvasDraftIdempotencyKey.ts`
- split bootstrap sync into:
  - `useCanvasDraftReloadHydration.ts`
  - `useCanvasDraftBootstrapping.ts`
  - `useCanvasDraftInitialBootstrap.ts`
  - `useCanvasDraftMissingRemoteSync.ts`
  - `useCanvasDraftCanonicalReconcile.ts`
  - with `useCanvasDraftBootstrapSync.ts` and `useCanvasDraftBootstrapping.ts`
    now acting as composition seams over narrower bootstrap policies
- split persistence into:
  - `useCanvasDraftAutosave.ts`
  - `canvasDraftAutosaveExecution.ts`
  - `useCanvasDraftRecoveryActions.ts`
  - `canvasDraftPersistenceRuntime.ts`
  - with `useCanvasDraftPersistence.ts` now acting as a composition seam and
    `useCanvasDraftAutosave.ts` reduced to autosave scheduling only
- tightened architecture guards so the controller, mutation, bootstrap sync,
  persistence, lifecycle, and controller-read-model seams may not re-absorb
  large inline effects

## Validation

- `pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/canvasBackendPosture.test.ts src/app/views/canvas/canvasAuthoringState.test.ts src/app/views/canvas/useCanvasAuthoringRuntime.architecture.test.ts src/app/views/canvas/useCanvasController.architecture.test.ts src/app/views/canvas/useCanvasMutationHandlers.architecture.test.ts src/app/views/canvas/useCanvasGraphChangeHandlers.architecture.test.ts src/app/views/canvas/useCanvasDraftLifecycle.architecture.test.ts src/app/views/canvas/useCanvasDraftBootstrapSync.architecture.test.ts src/app/views/canvas/useCanvasDraftBootstrapping.architecture.test.ts src/app/views/canvas/useCanvasDraftPersistence.architecture.test.ts src/app/views/canvas/useCanvasDraftAutosave.architecture.test.ts src/app/views/canvas/useCanvasController.core.test.tsx src/app/views/canvas/useCanvasController.negative.test.tsx` - PASS
- `pnpm --filter @dvt/web typecheck` - PASS
- `pnpm docs:workboard:generate` - PASS
- `pnpm docs:status:generate` - PASS
- `pnpm docs:sync` - PASS
- `pnpm exec markdownlint-cli2 "docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md" "docs/planning/closeouts/20260418-tf-e2-canvas-srp-seams-closeout.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc` - PASS
- `pnpm verify:prepush` - PASS

## Residuals

- `TF-E2-A` remains open because the shared graph-draft contract adoption,
  capability/read-only posture, and broader backend-boundary alignment with
  `TF-A2` and `TF-C4` are not closed yet.
- `useCanvasController` is now a thinner facade, but `useCanvasAuthoringRuntime`
  remains the next likely split point if this chain continues.
- `TF-E2-B` and later slices still own full node, edge, and Inspector
  productization on top of the canonical draft boundary.
