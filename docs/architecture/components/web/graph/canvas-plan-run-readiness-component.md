---
title: Canvas Plan/Run Readiness Component
status: Review
owner: Frontend / Runtime Safety / Architecture
last_reviewed: 2026-09-03
planning_type: component
task_ids:
  - F-27
---

# Canvas Plan/Run Readiness Component

## Purpose

Canvas plan/run readiness owns the presentation read model for
`ObservePlanRunReadiness`. It decides whether the current Canvas route can show
plan/run controls as ready or blocked and why. It does not create plans, start
runs, own runtime identity, or replace planner/runtime contracts.

## Public API

| API                                         | Kind                   | Owned concern                                                                                                  |
| ------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| `observePlanRunReadiness(args)`             | query adapter          | Publishes the `PlanRunReadinessReadModel` from Canvas execution inputs.                                        |
| `PlanRunReadinessReadModel`                 | read model             | Carries `rail`, `status`, `blockers`, and `summary` for presentation consumers.                                |
| `PlanRunReadinessBlocker`                   | value vocabulary       | Names `plan_integrity`, `backpressure`, `capability_mismatch`, `adapter_degraded`, and `authorization_denied`. |
| `PlanRunReadinessPanel`                     | presentation component | Renders the read model status, blockers, and summary without owning blocker semantics.                         |
| `buildPlanStatusSummary(args)`              | compatibility adapter  | Returns the existing Canvas summary copy from the source-owned read model.                                     |
| `hasPersistedPreviewProof(plan)`            | policy helper          | Accepts only persisted preview proof aligned to the active plan reference.                                     |
| `hasPersistedPreviewIdentityMismatch(plan)` | policy helper          | Detects plan-record drift before run start.                                                                    |
| `resolvePlanRefForStartRun(plan)`           | value extractor        | Reads the plan reference used by `IRunsPort.startRun`.                                                         |

## Invariants

- `ObservePlanRunReadiness` is a query rail; it does not mutate route state.
- The toolbar renders readiness; it does not own blocker semantics.
- Run start is ready only when authorization admits runs, a current plan exists,
  planRef exists, persisted preview proof exists, the persisted proof matches
  the active plan, the visible graph is executable, and no runtime blocker is
  present.
- `plan_integrity` covers missing plan, stale plan, missing planRef,
  preview-identity mismatch, missing persisted preview proof, and a visible
  graph that can no longer execute.
- DVT transformation Canvas is authorable but `not_executable`. Its readiness
  is `capability_mismatch`; selection-for-execution, Preview, and Run remain
  unavailable until a governed replacement rail is implemented.
- `authorization_denied` covers route permission denial before any
  `IRunsPort.startRun` call.
- `capability_mismatch` covers canvas kinds or execution strategies that cannot
  preview or start a run.
- `backpressure` and `adapter_degraded` are runtime admission vocabulary slots;
  they are modeled now so future backend admission evidence can reuse the same
  read model instead of adding toolbar-local strings.
- The read model must preserve all blocker names even when the summary chooses
  one user-facing message.

## State Transitions

- `ready` moves to `blocked` when authorization is removed.
- `ready` moves to `blocked` when the active plan becomes stale or loses
  persisted preview proof.
- `ready` moves to `blocked` when the visible graph no longer satisfies the
  execution graph validation rules.
- `blocked` moves to `ready` after a current persisted preview aligns with the
  active plan reference and runtime blockers clear.
- `blocked` stays `blocked` when capability mismatch, backpressure, or adapter
  degradation remains present.
- Readiness changes do not accept F-27 alpha full while cadence and risk triage
  remain open.

```mermaid
stateDiagram-v2
  [*] --> Blocked
  Blocked --> Ready: aligned persisted preview + authorization + capability
  Ready --> Blocked: stale plan or preview identity drift
  Ready --> Blocked: authorization_denied
  Ready --> Blocked: backpressure or adapter_degraded
  Blocked --> Blocked: capability_mismatch
```

## Consumers

| Consumer                           | Use                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `canvasExecutionState.ts`          | Builds Canvas execution state from graph validation, execution strategy, and readiness.    |
| `useCanvasExecutionActions.ts`     | Exposes `canStartRun`, `planRunReadiness`, and compatibility summary to route composition. |
| `CanvasToolbar.tsx`                | Renders the visible readiness panel while keeping blocker semantics in the read model.     |
| `CanvasToolbarPrimaryControls.tsx` | Renders workflow status and buttons without owning read-model semantics.                   |
| `useCanvasRunStartHandler.ts`      | Keeps run start fail-closed before calling `IRunsPort.startRun`.                           |
| F-27 route gate                    | Consumes plan/run readiness evidence for the internal alpha route matrix.                  |

## Architecture Diagram

```mermaid
flowchart TB
  Plan["PlanViewModel"]
  Preview["Persisted preview proof"]
  Auth["Route authorization"]
  Strategy["Canvas execution strategy"]
  Runtime["Runtime admission signals"]
  Readiness["PlanRunReadinessReadModel"]
  State["canvasExecutionState"]
  Toolbar["CanvasToolbarPrimaryControls"]
  StartRun["useCanvasRunStartHandler"]
  RunsPort["IRunsPort.startRun"]

  Plan --> Preview --> Readiness
  Auth --> Readiness
  Strategy --> Readiness
  Runtime --> Readiness
  Readiness --> State
  State --> Toolbar
  State --> Panel["PlanRunReadinessPanel"]
  State --> StartRun --> RunsPort
```

## Sequence Diagram

```mermaid
sequenceDiagram
  participant Canvas as Canvas route
  participant State as canvasExecutionState
  participant Readiness as observePlanRunReadiness
  participant Toolbar as Canvas toolbar
  participant Runs as IRunsPort.startRun

  Canvas->>State: derive execution state
  State->>Readiness: plan, preview proof, authorization, capability
  Readiness-->>State: PlanRunReadinessReadModel
  State-->>Toolbar: status summary, canStartRun, PlanRunReadinessReadModel
  Toolbar-->>Toolbar: render PlanRunReadinessPanel
  Toolbar-->>Canvas: user requests Run only when admitted
  Canvas->>Runs: startRun after readiness proof
```

## Evidence

- `apps/web/src/app/views/canvas/canvasPlanReadiness.test.ts`
- `apps/web/src/app/views/canvas/PlanRunReadinessPanel.test.tsx`
- `apps/web/src/app/views/canvas/useCanvasExecutionActions.runStartGuards.test.tsx`
- `apps/web/src/app/views/canvas/useCanvasExecutionActions.runStartSuccess.test.tsx`
- `apps/web/src/app/views/canvas/useCanvasExecutionActions.dbtPreviewRun.test.tsx`
- `apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts`

## Extension Rules

- Add new blocker names only in `PlanRunReadinessBlocker` and this guide.
- Do not add blocker interpretation to toolbar components.
- Do not treat fixture or localStorage state as runtime admission truth.
- Backend admission states must map into the existing read model before UI copy
  changes.

<a id="section-canvas-plan-run-readiness-user-stories"></a>

## Canvas Plan/Run Readiness User Stories

### Scope

These stories cover the Canvas stage that feeds F-27
`ObservePlanRunReadiness`. They do not replace runtime, planner, or run-start
contracts.

### Stories

- `US-F27-PLANRUN-001`: as an internal tester, I need Run to become available
  only after the current preview is persisted and aligned to the active
  planRef.
- `US-F27-PLANRUN-002`: as an internal tester, I need stale, missing, or
  mismatched plan proof to block Run with a plan-integrity reason.
- `US-F27-PLANRUN-003`: as an internal tester, I need route permission denial
  to block Run before any start-run API call.
- `US-F27-PLANRUN-004`: as an internal tester, I need unsupported canvas
  execution capability to block Plan and Run without inventing a local runtime
  path.
- `US-F27-PLANRUN-005`: as a runtime operator, I need future backpressure and
  adapter-degraded states to map into the same readiness read model.
- `US-F27-PLANRUN-006`: as an F-27 reviewer, I need plan/run readiness evidence
  to be accepted without implying alpha full while cadence and risk triage
  remain open.

### Negative Stories

- `US-F27-PLANRUN-N-001`: missing persisted preview proof keeps Run disabled
  and does not call `/runs/start`.
- `US-F27-PLANRUN-N-002`: persisted preview identity mismatch keeps Run
  disabled and does not call `/runs/start`.
- `US-F27-PLANRUN-N-003`: route authorization denial keeps Run disabled and
  does not call `IRunsPort.startRun`.
- `US-F27-PLANRUN-N-004`: unsupported execution strategy reports
  `capability_mismatch` and keeps run-start unavailable.
- `US-F27-PLANRUN-N-005`: backpressure or adapter degradation stays blocked
  until runtime admission clears.

### Scenario Coverage Matrix

| Scenario                     | Readiness blocker      | Evidence                                            |
| ---------------------------- | ---------------------- | --------------------------------------------------- |
| Persisted preview can start  | none                   | `canvas-dbt-author-code-run-live.cy.ts`             |
| Missing or stale plan proof  | `plan_integrity`       | `canvasPlanReadiness.test.ts`                       |
| Preview identity mismatch    | `plan_integrity`       | `useCanvasExecutionActions.runStartGuards.test.tsx` |
| Route permission denied      | `authorization_denied` | `useCanvasExecutionActions.runStartGuards.test.tsx` |
| Unsupported canvas execution | `capability_mismatch`  | `useCanvasExecutionActions.dbtPreviewRun.test.tsx`  |
| Backpressure vocabulary      | `backpressure`         | `canvasPlanReadiness.test.ts`                       |
| Adapter degraded vocabulary  | `adapter_degraded`     | `canvasPlanReadiness.test.ts`                       |

### Traceability

- Rail: `ObservePlanRunReadiness`.
- Read model: `PlanRunReadinessReadModel`.
- Component guide:
  `docs/architecture/components/web/graph/canvas-plan-run-readiness-component.md`.
- Route-level architecture guard:
  `apps/web/src/app/routes/internalAlphaRouteGate.architecture.test.ts`.

> Acceptance scope status: Review. Owner: Frontend / Runtime Safety / Product.
