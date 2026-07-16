---
title: Canvas execution selection component
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-07-16
---

# Canvas execution selection component

This local guide projects the Planning DB component that turns authoring and
plan context into canonical `ExecutionSelection` for preview and run while
preserving the difference between absent selection and invalid explicit intent.

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
- classify which DBT resources are valid execution-selection roots
- derive DBT executable scope without dropping or widening non-empty explicit
  selection intent
- distinguish roots requested by the user from executable dependencies included
  by closure

It does **not** own:

- planner executability rules
- graph-node-card rendering
- protected draft reads
- runtime execution identity
- preview/result transport parsing

## Public API

- `collectPreviewSelection(selectedNodeIds, workspaceNodeIds)`
  Resolve preview intent from current Canvas selection or workspace fallback.
- `collectPlanSelection(plan)`
  Resolve run intent from the persisted plan view.
- `resolveDbtExecutionScope(...)`
  Resolve executable DBT roots and dependencies while rejecting any explicit
  selection that contains an unavailable or non-executable resource.
- `isDbtExecutionSelectableNode(...)`
  Report whether a canonical DBT node can be an explicit execution root. The
  graph card consumes this query; it does not reimplement the kind policy.
- `buildCanvasDbtExecutionProjection(...)`
  Build the one DBT projection consumed by both Preview and readiness.
- `executeCanvasPlanAction(...)`
  Uses `collectPreviewSelection(...)` before calling `plansService.previewPlan`.
  For SQL-first transformation canvases, it also requires preview provenance to
  resolve through workspace artifacts. File-backed transforms read the existing
  SQL file; canvas-authored transforms without a path first project a
  deterministic SQL artifact and design-graph artifact through the workspace
  file-content command rail.
- `executeCanvasRunStartAction(...)`
  Uses `collectPlanSelection(...)` before calling `runsService.startRun`.

## Invariants

- `canvasRunSelection.ts` owns generic preview/run selection payloads;
  `dbtExecutionScopePolicy.ts` owns DBT executable-scope intent.
- `IRunsPort.startRun(...)` returns a presentation receipt
  (`RunStartReceipt`) containing `runId` plus acceptance posture, not an
  engine-owned provider run reference.
- `collectPreviewSelection(...)` and `collectPlanSelection(...)` both emit
  canonical `ExecutionSelection` via `parseExecutionSelection(...)`.
- preview and run actions import the named selection seam instead of redoing
  local array shaping inline.
- absent preview selection may default to visible workspace node ids.
- every id in a non-empty explicit DBT selection must be an available executable
  root; source, seed, macro, exposure, metric, unknown, and out-of-workspace ids
  make the complete selection fail closed.
- a rejected explicit selection is never filtered into a smaller successful
  selection and never defaults to the whole workspace.
- successful DBT scope resolution exposes requested root ids separately from
  dependency ids that were included by transitive closure.
- DBT node cards render execution selection only for roots admitted by
  `isDbtExecutionSelectableNode(...)`.
- `canvasDbtExecutionProjection.ts` is shared by Preview and readiness so the
  enabled action and the emitted request cannot disagree.
- SQL-first Plan never calls `previewPlan` with browser-only graph state:
  `GenerateTransformationWorkspaceArtifacts` must provide SQL and graph
  artifact provenance first.
- Non-authoring SQL transforms without a workspace path still fail closed;
  only canvas-authored nodes can receive deterministic local-draft artifact
  paths during Plan.
- run selection preserves persisted plan order while deduplicating node ids.
- protected runtime rejection causes are normalized in the plans and runs
  service adapters, not inside the selection seam.
- the live-runtime browser lane may keep `workspace/files` on a governed
  support seam while that backend surface does not exist, but it must not stub
  `workspace/graph/draft`, `plans/preview`, `runs/start`, or run reads.

## Component map

```mermaid
flowchart LR
  Canvas["Canvas state"] --> Selection["canvasRunSelection.ts"]
  Canvas --> DbtPolicy["dbtExecutionScopePolicy.ts"]
  Card["GraphNodeCard"] -->|queries eligibility| DbtPolicy
  Plan["Persisted plan view"] --> Selection
  Selection --> Preview["canvasPlanAction.ts"]
  DbtPolicy --> Projection["canvasDbtExecutionProjection.ts"]
  Projection --> Preview
  Preview --> Review["Execution Preview selection review"]
  Projection --> Readiness["canvasExecutionState.ts"]
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
  participant DbtScope as dbtExecutionScopePolicy
  participant Plans as plansService.previewPlan
  participant Runs as runsService.startRun

  alt generic Canvas preview
    Canvas->>Selection: collectPreviewSelection(selectedNodeIds, workspaceNodeIds)
    Selection-->>Canvas: ExecutionSelection
  else DBT Canvas preview
    Canvas->>DbtScope: resolve explicit or absent selection
    DbtScope-->>Canvas: roots + derived dependencies or fail-closed cause
  end
  Canvas->>Canvas: resolve SQL and graph artifact provenance
  Canvas->>Plans: previewPlan(..., selection, provenance)

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
  Canvas->>Canvas: project file-backed or local-draft artifacts
  Canvas->>Plans: previewPlan(graphSource, selection, persist=true, provenance)
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
- `apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts`
- `apps/web/src/app/services/plans/plansService.test.ts`
- `apps/web/src/app/services/runs/runsService.test.ts`

## Demanding-user E2E story matrix

These stories are the regression checklist for the product promise. They must
stay tied to executable browser proof instead of remaining a loose QA note.

| Story       | User intent                                                                                                    | Proof surface                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `UX-E2E-01` | Create the first graph/canvas node through the UI and restore it.                                              | `apps/web/cypress/e2e/canvas/canvas-first-authoring-live.cy.ts`                                       |
| `UX-E2E-02` | Build a graph, plan the selected closure, execute it, and see result.                                          | `apps/web/cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts`                                      |
| `UX-E2E-03` | Return from run result to Canvas, plan again, and execute again.                                               | `apps/web/cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts`                                      |
| `UX-E2E-04` | Prove the same selected-closure flow against the protected runtime.                                            | `apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts`                                           |
| `UX-E2E-05` | Configure dbt cards, select origin, view generated code, and run.                                              | `apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts`                                   |
| `UX-E2E-06` | Verify Graph, Code, Lineage, and Artifacts describe the same project.                                          | `apps/web/cypress/e2e/canvas/canvas-graph-code-artifacts-parity.cy.ts`                                |
| `UX-E2E-07` | See explicit re-plan guidance instead of raw transport failures.                                               | `apps/web/cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts` and plan action unit coverage below. |
| `UX-E2E-08` | Select only executable DBT roots and verify Preview distinguishes requested resources from dependency closure. | `apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts`                                         |

Minimum local product gate for this component:

```bash
pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts
```

Live protected-runtime lanes remain separate because they require the local
backend and authorization context:

```bash
pnpm --filter @dvt/web test:e2e:first-authoring:live
pnpm --filter @dvt/web test:e2e:selected-closure:live
```

## Live-runtime browser truth boundary

`TF-E2-E-D` is now closed with one hybrid live-runtime lane:

- protected authoring/runtime routes are live:
  - `GET /workspace/graph/draft`
  - `PUT /workspace/graph/draft`
  - `POST /plans/preview`
  - `POST /runs/start`
  - `GET /runs`
  - `GET /runs/:runId`
  - `GET /runs/:runId/events`
- `workspace/files` remains on one governed test-support seam until the backend
  actually owns that artifact surface

That boundary remains intentional. The browser lane proves the real protected
runtime without inventing a fake backend for the authoritative draft or
execution route, and it does not overclaim live proof for seams the repo does
not yet implement.

```mermaid
sequenceDiagram
  participant User as Operator
  participant Canvas as Canvas
  participant Files as Governed workspace-files seam
  participant Draft as Live /workspace/graph/draft
  participant Preview as Live /plans/preview
  participant Start as Live /runs/start
  participant Runs as Live /runs/*

  User->>Canvas: open selected-closure canvas
  Canvas->>Draft: read authoritative draft
  Draft-->>Canvas: graph-ready draft
  Canvas->>Files: save graph artifact + read SQL artifact
  Files-->>Canvas: deterministic artifact bytes
  User->>Canvas: Plan
  Canvas->>Preview: live selected-closure preview
  Preview-->>Canvas: persisted PlanRef
  User->>Canvas: Start run
  Canvas->>Start: live protected start-run
  Start-->>Canvas: accepted runId receipt
  Canvas->>Runs: read run snapshot/events
  Runs-->>Canvas: pending/running snapshot
```

The governed proof surface for that lane is:

- `apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts`
- `apps/web/cypress/support/liveProtectedRuntime.ts`
- `apps/web/cypress/support/canvasExecutionSelection.ts`
- `apps/web/cypress/support/canvasPreviewArtifacts.ts`
- `scripts/run-selected-closure-live-proof.cjs`

## Consumers

- `apps/web/src/app/views/canvas/canvasRunSelection.ts`
- `apps/web/src/app/views/canvas/canvasPlanAction.ts`
- `apps/web/src/app/views/canvas/useCanvasControllerReadModel.ts`
- `apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts`
- `apps/web/src/app/components/Modals.tsx`
- `apps/web/src/app/views/canvas/canvasRunStartAction.ts`
- `apps/web/src/app/ports/runs.ts`
- `apps/web/src/app/services/runs/runsService.api.ts`
- `apps/web/src/app/services/plans/plansService.api.ts`
- `apps/web/src/app/services/api/protectedRuntimeRejection.ts`
- `apps/web/src/app/views/canvas/canvasExecutionSelection.architecture.test.ts`
- `apps/web/src/app/views/canvas/canvasRunStartIdentity.architecture.test.ts`
- `apps/web/cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts`
- `apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts`
- `apps/web/cypress/support/liveProtectedRuntime.ts`
- `scripts/run-selected-closure-live-proof.cjs`

## Extension rules

- keep canonical selection parsing in `canvasRunSelection.ts`
- keep DBT root eligibility and closure classification in
  `dbtExecutionScopePolicy.ts`; renderers and controllers only consume it
- do not silently filter invalid ids from a non-empty explicit selection
- keep requested roots and derived dependencies distinct in the Preview read
  model even though the canonical server selection contains their complete
  authorized closure
- do not add a web-local preview/run selection DTO
- do not push planner-local diagnostics into the browser selection seam
- keep protected runtime rejection normalization in service adapters, not in
  `canvasRunSelection.ts`
- keep preview and run consumers importing the named seam instead of shaping
  ad hoc payloads inline
