---
title: Canvas execution selection component
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-24
---

# Canvas execution selection component

This local guide documents the `apps/web` Canvas seam that turns authoring and
plan context into canonical `ExecutionSelection` for preview and run.

It exists so the browser emits one governed selection shape and does not invent
frontend-only execution DTOs.

Use this together with:

- [Execution selection component](../../planner/execution-selection-component.md)
- [Start-run client identity boundary](../runs/start-run-client-identity-boundary.md)
- [Graph Architecture Docs](./index.md)

## Owned concern

The component owns exactly one concern:

- derive caller-owned preview/run selection from Canvas state and persisted plan
  state as canonical `ExecutionSelection`

It does **not** own:

- planner executability rules
- protected draft reads
- runtime execution identity
- preview/result transport parsing

## Public API

- `collectPreviewSelection(selectedNodeIds, workspaceNodeIds)`
  Resolve preview intent from current Canvas selection or workspace fallback.
- `collectPlanSelection(plan)`
  Resolve run intent from the persisted plan view.
- `executeCanvasPlanAction(...)`
  Uses `collectPreviewSelection(...)` before calling `plansService.previewPlan`.
- `executeCanvasRunStartAction(...)`
  Uses `collectPlanSelection(...)` before calling `runsService.startRun`.

## Invariants

- `canvasRunSelection.ts` is the only module in this component that builds the
  canonical selection payload.
- `collectPreviewSelection(...)` and `collectPlanSelection(...)` both emit
  canonical `ExecutionSelection` via `parseExecutionSelection(...)`.
- preview and run actions import the named selection seam instead of redoing
  local array shaping inline.
- preview selection falls back from explicit selected nodes to visible
  workspace node ids only inside the same canonical seam.
- run selection preserves persisted plan order while deduplicating node ids.
- protected runtime rejection causes are normalized in the plans and runs
  service adapters, not inside the selection seam.

## Component map

```mermaid
flowchart LR
  Canvas["Canvas state"] --> Selection["canvasRunSelection.ts"]
  Plan["Persisted plan view"] --> Selection
  Selection --> Preview["canvasPlanAction.ts"]
  Selection --> Run["canvasRunStartAction.ts"]
  Preview --> PlansPort["IPlansPort.previewPlan"]
  Run --> RunsPort["IRunsPort.startRun"]
  PlansPort --> Api["apps/api /plans/preview"]
  RunsPort --> ApiStart["apps/api /runs/start"]
```

## Transitions

```mermaid
sequenceDiagram
  participant Canvas as Canvas actions
  participant Selection as canvasRunSelection
  participant Plans as plansService.previewPlan
  participant Runs as runsService.startRun

  Canvas->>Selection: collectPreviewSelection(selectedNodeIds, workspaceNodeIds)
  Selection-->>Canvas: ExecutionSelection
  Canvas->>Plans: previewPlan(..., selection)

  Canvas->>Selection: collectPlanSelection(plan)
  Selection-->>Canvas: ExecutionSelection
  Canvas->>Runs: startRun(planRef, workspaceScope, selection)
```

## End-to-end preview-persist-run sequence

```mermaid
sequenceDiagram
  participant Canvas as Canvas
  participant Selection as canvasRunSelection
  participant Plans as IPlansPort.previewPlan
  participant Preview as apps/api /plans/preview
  participant Resolver as selected-closure resolution
  participant Planner as planner.buildPlan
  participant Runs as IRunsPort.startRun
  participant Start as apps/api /runs/start

  Canvas->>Selection: collectPreviewSelection(selectedNodeIds, workspaceNodeIds)
  Selection-->>Canvas: ExecutionSelection
  Canvas->>Plans: previewPlan(graphSource, selection, persist=true)
  Plans->>Preview: POST /plans/preview
  Preview->>Resolver: resolve selected closure from protected draft
  Resolver->>Planner: build selected-closure plan
  Planner-->>Canvas: persisted plan + PlanRef
  Canvas->>Selection: collectPlanSelection(plan)
  Selection-->>Canvas: ExecutionSelection
  Canvas->>Runs: startRun(planRef, workspaceScope, selection)
  Runs->>Start: POST /runs/start
```

This keeps the browser on one narrow posture:

- preview emits intent plus graph source for the selected closure
- preview persistence creates the authoritative `PlanRef`
- run start reuses that persisted proof and never invents client-owned run
  identity or whole-draft execution scope

## Fail-closed runtime rejection posture

Protected runtime rejection causes stay outside `canvasRunSelection.ts`.

The browser contract is:

1. selection seam emits canonical `ExecutionSelection`
2. service adapters normalize protected runtime rejection envelopes into
   user-facing error messages
3. Canvas actions surface those messages without widening scope or retrying
   against the full draft

```mermaid
sequenceDiagram
  participant Canvas as Canvas action handler
  participant Selection as canvasRunSelection.ts
  participant Plans as plansService / runsService
  participant Api as protected runtime

  Canvas->>Selection: collectPreviewSelection(...) / collectPlanSelection(...)
  Selection-->>Canvas: ExecutionSelection
  Canvas->>Plans: previewPlan(...) or startRun(...)
  Plans->>Api: canonical selection payload
  alt protected runtime rejects selected closure
    Api-->>Plans: plan_rejected(cause)
    Plans-->>Canvas: normalized re-plan guidance
    Canvas-->>Canvas: fail closed, no scope widening
  else selected closure accepted
    Api-->>Plans: persisted preview or started run
    Plans-->>Canvas: success result
  end
```

Browser proof for this posture now lives in:

- `apps/web/cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts`
- `apps/web/src/app/services/plans/plansService.test.ts`
- `apps/web/src/app/services/runs/runsService.test.ts`

## Consumers

- `apps/web/src/app/views/canvas/canvasRunSelection.ts`
- `apps/web/src/app/views/canvas/canvasPlanAction.ts`
- `apps/web/src/app/views/canvas/canvasRunStartAction.ts`
- `apps/web/src/app/ports/runs.ts`
- `apps/web/src/app/services/runs/runsService.api.ts`
- `apps/web/src/app/services/plans/plansService.api.ts`
- `apps/web/src/app/services/api/protectedRuntimeRejection.ts`
- `apps/web/src/app/views/canvas/canvasExecutionSelection.architecture.test.ts`
- `apps/web/src/app/views/canvas/canvasRunStartIdentity.architecture.test.ts`
- `apps/web/cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts`

## Extension rules

- keep canonical selection parsing in `canvasRunSelection.ts`
- do not add a web-local preview/run selection DTO
- do not push planner-local diagnostics into the browser selection seam
- keep protected runtime rejection normalization in service adapters, not in
  `canvasRunSelection.ts`
- keep preview and run consumers importing the named seam instead of shaping
  ad hoc payloads inline
