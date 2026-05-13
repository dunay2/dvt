---
title: MW-D2 provider-neutral worker routing closeout
status: Accepted
date: 2026-05-13
owner: Runtime / Temporal / Delivery
planning_type: closeout
---

# MW-D2 Provider-Neutral Worker Routing Closeout

## Summary

`MW-D2` is implemented as adapter-owned Temporal activity routing by step kind.
Workflow starts remain tenant queue scoped. `executeStep` activities may now be
routed to capability-specific queues through `TEMPORAL_STEP_ACTIVITY_ROUTES`.

DBT stays disconnected from the routing model: it remains an optional plugin
profile and does not define generic routing semantics.

## Requirement Trace

| Requirement                                            | Decision   | Design                                      | Contract                                                                            | Code                                                                            | Test                                       | Runtime evidence            |
| ------------------------------------------------------ | ---------- | ------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------- |
| `MW-D2` route worker execution by step kind/capability | `ADR-0056` | Temporal worker routing by capability       | `TemporalAdapterConfig.activityRouting`, `RunPlanWorkflowInput.stepActivityRouting` | `packages/@dvt/adapter-temporal/src/config.ts`, `runPlanWorkflow.activities.ts` | `workflow-step-activity-routing.test.ts`   | activity `taskQueue` option |
| Preserve tenant workflow queue                         | `ADR-0056` | workflow queue separate from activity queue | `EngineRunRef.taskQueue` unchanged                                                  | `TemporalAdapter.startRun`                                                      | `TemporalAdapter.startRun.test.ts`         | returned run ref queue      |
| Freeze routing for in-flight runs                      | `ADR-0056` | workflow input snapshot                     | `RunPlanWorkflowInput.stepActivityRouting`                                          | `RunPlanWorkflow.ts`, `workflowCursorHelpers.ts`                                | `workflow-continue-as-new.test.ts`         | continue-as-new input       |
| Keep DBT as plugin consumer                            | `ADR-0056` | generic routing code DBT-free               | architecture guard                                                                  | `config.ts`, `TemporalAdapter.ts`, workflow helpers                             | `dbt-core-decoupling.architecture.test.ts` | component guide drift guard |

## Validation

Targeted red/green commands:

- `pnpm --filter @dvt/adapter-temporal exec vitest run test/smoke.test.ts test/workflow-step-activity-routing.test.ts test/TemporalAdapter.startRun.test.ts`
- `pnpm --filter @dvt/adapter-temporal exec vitest run test/workflow-continue-as-new.test.ts`
- `pnpm --filter dvt-api exec vitest run test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts`
- `pnpm --filter dvt-temporal-worker exec vitest run test/plugins/env.test.ts`

Final closeout validation is recorded in
[ED-20260513 MW-D2 Temporal worker routing](../../evidence/ed-20260513-mw-d2-temporal-worker-routing.md).

## Residual Scope

This slice does not add Python, Spark, SQL, or DBT worker images. It adds the
routing seam that lets those profiles be deployed without changing workflow
core. Worker deployment automation and global worker placement remain separate
scale tasks.
