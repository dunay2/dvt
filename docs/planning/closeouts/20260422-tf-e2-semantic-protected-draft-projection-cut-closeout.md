---
slice: tf-e2-semantic-protected-draft-projection-cut
date: 2026-04-22
lane: E
task_id: TF-E2-A, TF-E2-B, TF-E2-C
mode: Full
status: In progress
author: AI (Codex)
last_reviewed: 2026-04-22
---

# TF-E2 semantic protected-draft projection cut closeout

## Phase 1. Think-First Analysis

### Problem summary

The Canvas route already reads and writes through the protected
`IWorkspaceGraphDraftAuthoringPort`, but the visible graph model still derived
node and edge semantics from `workspaceService.getGraphSnapshot()`.

That left the active authoring route with split truth:

- protected draft owned persisted authoring baseline
- legacy snapshot still owned visible graph semantics

### Root cause

The earlier hard cut stopped at the transport seam:

- protected draft results were projected only into a lossy
  `WorkspaceGraphDraftRecord`
- `CanvasDraftReadModel` did not carry semantic graph truth
- save and conflict cache updates preserved only the projected DTO
- the former graph-model hook still mixed semantic authority composition and
  viewport projection, which kept the route-facing boundary blurrier than the
  target architecture allowed

### Constraints and invariants

- `AGENTS.md`: no compatibility downgrade, no hidden debt, docs and planning
  must move with code.
- `docs/guides/ai-work-protocol.md`: this slice is `Full` because it changes
  active route behavior, planning state, tests, and architecture docs.
- `docs/planning/reviews/architecture-and-governance/20260422-canvas-runtime-truth-hardcut-review.md`:
  protected draft truth must beat legacy snapshot semantics on the active
  Canvas route.
- `docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-canvas-target-architecture-execution-plan-20260417.md`:
  slice 2 is the semantic protected-draft projection cut; slice 3 remains the
  full deletion of active-authoring snapshot fallback.
- `docs/architecture/components/web/graph/graph-frontend-architecture.md`:
  projection is not authority and React Flow must remain a projection over
  governed route truth.
- `docs/architecture/components/web/graph/canvas-component-map-and-modernization-review.md`:
  the Canvas route must own explicit component seams instead of hiding graph
  semantics inside controller convenience paths.

### Options considered

- keep the protected draft read side lossy and only harden copy or blocked
  states
- project protected draft semantics into a canonical graph, preserve that
  semantic graph in route cache updates, split semantic projection from
  viewport projection, and compose those seams explicitly in the route

### Selected option and rationale

Implement the semantic projection cut now and leave full legacy-path deletion to
slice 3.

That keeps the slice bounded and reviewable while removing the most dangerous
form of dual authority: snapshot semantics overriding protected draft semantics
on the active route.

## Phase 2. Pre-Implementation Brief

- Mode: `Full`
- Scope:
  - `apps/web/src/app/services/workspace/workspaceGraphDraftProjection.ts`
  - `apps/web/src/app/services/workspace/workspaceGraphDraftProjection.test.ts`
  - `apps/web/src/app/views/canvas/canvasDraftReadModel.ts`
  - `apps/web/src/app/views/canvas/canvasDraftQueryCache.ts`
  - `apps/web/src/app/views/canvas/canvasDraftRepository.ts`
  - `apps/web/src/app/views/canvas/canvasDraftRepository.readWrite.test.ts`
  - `apps/web/src/app/views/canvas/canvasDraftRepository.conflict.test.ts`
  - `apps/web/src/app/views/canvas/canvasDraftPersistenceRuntime.ts`
  - `apps/web/src/app/views/canvas/canvasDraftAutosaveExecution.ts`
  - `apps/web/src/app/views/canvas/canvasAuthoringGraphProjection.ts`
  - `apps/web/src/app/views/canvas/canvasAuthoringGraphProjection.test.ts`
  - `apps/web/src/app/views/canvas/useCanvasAuthoringProjection.ts`
  - `apps/web/src/app/views/canvas/useCanvasAuthoringProjection.architecture.test.ts`
  - `apps/web/src/app/views/canvas/useCanvasAuthoringRuntimeDraftFlow.ts`
  - `apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts`
  - `apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx`
  - `apps/web/src/app/plugins/nodeTypeCatalog.dbt.ts`
  - `apps/web/src/app/plugins/dvt/dvtContributions.ts`
  - `apps/web/src/app/plugins/dvt/dvtContributions.connectionRules.test.ts`
  - graph architecture docs and Lane E status
- Expected outcome:
  - protected draft reads produce a canonical semantic graph in addition to the
    projected DTO
  - save and conflict cache updates preserve semantic graph truth
  - `canvasAuthoringGraphProjection.ts` owns semantic authority composition for
    active Canvas authoring
  - `useCanvasViewportGraphModel.ts` owns React Flow projection only
  - `dvt:source` is explicitly registered in the DVT authoring catalog
- Risks and mitigations:
  - risk: save success updates lose semantic graph truth and the viewport drops
    newly authored nodes
    mitigation: preserve semantic graph on save and conflict through the route
    cache update path
  - risk: docs or planning still describe the old split as current
    mitigation: update architecture docs, lane state, and this closeout in the
    same slice
  - risk: overclaim full legacy deletion
    mitigation: keep residual slice-3 deletion explicit
- Out of scope:
  - removal of snapshot-backed bootstrap and recovery support
  - live-runtime Cypress proof lane
  - Inspector property editing

## Phase 3. Normative Baseline Verification

Verified against the governing baseline:

- the hard-cut review authorizes protected draft truth as active authoring
  authority and rejects snapshot-backed semantic fallback
- the execution plan explicitly isolates this slice as the semantic projection
  cut before full legacy deletion
- the graph architecture pack keeps projection separate from authority and
  requires explicit route seams instead of controller-local ambiguity

## Phase 4. Traceability And Artifact Recording

- Governing review and proposal:
  - `docs/planning/reviews/architecture-and-governance/20260422-canvas-runtime-truth-hardcut-review.md`
  - `docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-canvas-target-architecture-execution-plan-20260417.md`
- Primary code artifacts:
  - `apps/web/src/app/services/workspace/workspaceGraphDraftProjection.ts`
  - `apps/web/src/app/views/canvas/canvasDraftReadModel.ts`
  - `apps/web/src/app/views/canvas/canvasDraftRepository.ts`
  - `apps/web/src/app/views/canvas/canvasAuthoringGraphProjection.ts`
  - `apps/web/src/app/views/canvas/useCanvasAuthoringProjection.ts`
  - `apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts`
- Proof anchors:
  - `apps/web/src/app/services/workspace/workspaceGraphDraftProjection.test.ts`
  - `apps/web/src/app/views/canvas/canvasDraftRepository.readWrite.test.ts`
  - `apps/web/src/app/views/canvas/canvasDraftRepository.conflict.test.ts`
  - `apps/web/src/app/views/canvas/canvasAuthoringGraphProjection.test.ts`
  - `apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx`

## Phase 5. Documentation Update

The graph architecture pack and Lane E status were updated so the repository now
states the current branch truth:

- protected draft reads now carry route-facing semantic graph truth
- semantic composition and viewport projection now live behind separate seams
  instead of one mixed graph-model hook
- the DVT authoring catalog explicitly includes `dvt:source`

## Implementation Summary

- protected draft semantic projection:
  - added semantic canonical-graph projection to
    `workspaceGraphDraftProjection.ts`
  - projected `source`, `sql_transform`, and `sink` nodes into DVT canonical
    nodes with stable lineage edges
- route read-model and cache preservation:
  - `CanvasDraftReadModel` now carries `semanticGraph`
  - save and conflict resolution now preserve a full route-facing draft state
    instead of only a lossy projected record
- graph model authority cut:
  - `canvasAuthoringGraphProjection.ts` now owns protected semantic authority
    composition while allowing scoped supplementation for local working-set
    nodes and edges that are not yet persisted remotely
  - `useCanvasViewportGraphModel.ts` now owns React Flow projection only
  - `useCanvasAuthoringProjection.ts` composes those two seams explicitly for
    the route-facing graph model
  - legacy snapshot semantics no longer override active protected draft truth
- DVT catalog drift fix:
  - registered `dvt:source` in the node catalog
  - allowed `dvt:source -> dvt:sql_transform` in DVT intra-plugin rules

## Validation

- Focused semantic-cut Vitest suite:
  - `pnpm --filter @dvt/web test -- src/app/services/workspace/workspaceGraphDraftProjection.test.ts src/app/views/canvas/canvasAuthoringGraphProjection.test.ts src/app/views/canvas/useCanvasViewportGraphModel.test.tsx src/app/views/canvas/canvasDraftRepository.readWrite.test.ts src/app/views/canvas/canvasDraftRepository.conflict.test.ts src/app/plugins/dvt/dvtContributions.connectionRules.test.ts`
- Remaining validation executed after implementation:
  - recorded below once the full slice baseline completes

## Residuals

- slice 3 still remains open:
  - delete active-authoring dependence on snapshot-backed hydration and align
    local startup so Canvas either talks to protected runtime truth or reports
    a governed blocked state
- route bootstrap and blocked-state proof already advanced separately, but the
  browser live-runtime proof lane still belongs to `TF-E2-E`
- Inspector-backed property editing still belongs to `TF-E2-D`
