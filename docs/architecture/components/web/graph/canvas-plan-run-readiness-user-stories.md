---
title: Canvas Plan/Run Readiness User Stories
status: Review
owner: Frontend / Runtime Safety / Product
last_reviewed: 2026-05-18
planning_type: user-stories
task_ids:
  - F-27
---

# Canvas Plan/Run Readiness User Stories

## Scope

These stories cover the Canvas stage that feeds F-27
`ObservePlanRunReadiness`. They do not replace runtime, planner, or run-start
contracts.

## Stories

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

## Negative Stories

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

## Scenario Coverage Matrix

| Scenario                     | Readiness blocker      | Evidence                                            |
| ---------------------------- | ---------------------- | --------------------------------------------------- |
| Persisted preview can start  | none                   | `canvas-dbt-author-code-run-live.cy.ts`             |
| Missing or stale plan proof  | `plan_integrity`       | `canvasPlanReadiness.test.ts`                       |
| Preview identity mismatch    | `plan_integrity`       | `useCanvasExecutionActions.runStartGuards.test.tsx` |
| Route permission denied      | `authorization_denied` | `useCanvasExecutionActions.runStartGuards.test.tsx` |
| Unsupported canvas execution | `capability_mismatch`  | `useCanvasExecutionActions.dbtPreviewRun.test.tsx`  |
| Backpressure vocabulary      | `backpressure`         | `canvasPlanReadiness.test.ts`                       |
| Adapter degraded vocabulary  | `adapter_degraded`     | `canvasPlanReadiness.test.ts`                       |

## Traceability

- Rail: `ObservePlanRunReadiness`.
- Read model: `PlanRunReadinessReadModel`.
- Component guide:
  `docs/architecture/components/web/graph/canvas-plan-run-readiness-component.md`.
- Route-level architecture guard:
  `apps/web/src/app/routes/internalAlphaRouteGate.architecture.test.ts`.
