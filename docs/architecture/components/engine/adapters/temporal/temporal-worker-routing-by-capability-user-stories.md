---
title: Temporal worker routing by capability user stories
status: Active
owner: Runtime / Temporal / Delivery
last_reviewed: 2026-05-13
domain: runtime
---

# Temporal Worker Routing By Capability User Stories

These user stories cover `MW-D2` and bind runtime routing behavior to tests.

| ID             | Actor                 | Story                                                | Acceptance                                                                                                                   |
| -------------- | --------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `US-MW-D2-001` | Runtime operator      | Route a step kind to a specialized activity queue.   | `TEMPORAL_STEP_ACTIVITY_ROUTES` maps `PYTHON_SCRIPT` to `dvt-temporal-python`; `executeStep` is scheduled on that queue.     |
| `US-MW-D2-002` | Runtime operator      | Keep existing behavior for unrouted step kinds.      | A step with no route omits the activity `taskQueue` option and uses the workflow queue default.                              |
| `US-MW-D2-003` | Engine maintainer     | Keep workflow starts tenant-scoped.                  | `TemporalAdapter.startRun()` still starts the workflow on `<baseQueue>-<tenantId>` and returns that queue in `EngineRunRef`. |
| `US-MW-D2-004` | Runtime maintainer    | Freeze routing for the lifetime of a run.            | `RunPlanWorkflowInput.stepActivityRouting` is copied into continue-as-new input.                                             |
| `US-MW-D2-005` | Plugin author         | Keep plugin registration separate from routing.      | A route only changes task queue selection; the worker must still compose a matching step activity registry.                  |
| `US-MW-D2-006` | Architecture reviewer | Prevent DBT from becoming the generic routing model. | Generic routing modules and the component guide remain DBT-free except for explicitly saying DBT is only a plugin consumer.  |

## Test Mapping

| Story          | Test                                                             |
| -------------- | ---------------------------------------------------------------- |
| `US-MW-D2-001` | `workflow-step-activity-routing.test.ts`                         |
| `US-MW-D2-002` | `workflow-step-activity-routing.test.ts`                         |
| `US-MW-D2-003` | `TemporalAdapter.startRun.test.ts`                               |
| `US-MW-D2-004` | `workflow-continue-as-new.test.ts`                               |
| `US-MW-D2-005` | `activities.test.ts`, `dbt-core-decoupling.architecture.test.ts` |
| `US-MW-D2-006` | `dbt-core-decoupling.architecture.test.ts`                       |
