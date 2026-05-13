---
title: Temporal Step Activity Routing By Capability
status: Accepted
date: 2026-05-13
owners:
  - Runtime
  - Temporal Adapter
  - Delivery
arc_level: ARC-2
---

# ADR-0056: Temporal Step Activity Routing By Capability

## Status

Accepted.

## Context

`MW-C1` made Temporal step execution extensible by composing plugin-owned step
activities into `StepActivityDispatcher`. That removed DBT from the core
dispatcher, but all workflow step activities still ran on the workflow task
queue. A heterogeneous plan can contain executor families with different
runtime images. A Python, Spark, SQL, or DBT worker may need different binaries,
libraries, credentials, and scaling rules.

Routing by provider-specific hints inside `ExecutionPlan` would leak Temporal
deployment topology into the DVT execution contract. Routing only by DBT mode
would repeat the original anti-pattern: one plugin would define the generic
runtime model.

## Decision

Temporal workflow starts remain tenant/workflow-queue scoped. Step execution
activity routing is adapter-owned and optional.

- `TemporalAdapterConfig.activityRouting.routesByStepKind` maps a step kind to
  a provider-neutral capability label and a Temporal activity task queue.
- `TEMPORAL_STEP_ACTIVITY_ROUTES` is the environment input for that mapping.
- `TemporalAdapter.startRun()` freezes the validated mapping into
  `RunPlanWorkflowInput.stepActivityRouting`.
- `RunPlanWorkflow` uses the frozen routing snapshot when creating the
  `executeStep` activity proxy.
- `emitEvent`, `resolveExecutionSegment`, lifecycle signals, and workflow tasks
  stay on the workflow/core queue.
- Missing routes preserve the existing behavior: the activity proxy omits
  `taskQueue`, so Temporal uses the workflow task queue default.
- A routed worker must still compose the matching plugin activity. Routing to a
  queue without a registered activity remains a fail-closed
  `UnsupportedStepKindError`.

DBT remains a plugin consumer of this model. The routing model must not import
DBT symbols or make DBT the generic capability taxonomy.

## Consequences

Specialized worker images can be introduced without changing workflow control
flow or the shared execution-plan contract. Operators can deploy queue-local
worker pools for `executor.python`, `executor.spark`, `executor.sql`, or
`executor.dbt` while preserving a single workflow orchestration path.

In-flight workflows keep the routing snapshot they started with. Changing
`TEMPORAL_STEP_ACTIVITY_ROUTES` affects new runs only.

The model does not provide a global tenant-to-worker placement service, worker
deployment automation, or a new executor plugin. Those remain separate scale
and runtime tasks.

## Validation

- `packages/@dvt/adapter-temporal/test/smoke.test.ts`
- `packages/@dvt/adapter-temporal/test/TemporalAdapter.startRun.test.ts`
- `packages/@dvt/adapter-temporal/test/workflow-step-activity-routing.test.ts`
- `packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts`
- `packages/@dvt/adapter-temporal/test/dbt-core-decoupling.architecture.test.ts`
- `apps/api/test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts`
- `apps/temporal-worker/test/plugins/env.test.ts`
