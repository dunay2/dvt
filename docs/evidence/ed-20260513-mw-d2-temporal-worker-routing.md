---
title: MW-D2 Temporal worker routing by capability
status: Accepted
date: 2026-05-13
owners:
  - packages/@dvt/adapter-temporal
  - apps/api
  - apps/temporal-worker
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/config.ts
  - packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.activities.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.stepExecution.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.types.ts
  - packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
  - apps/api/src/modules/providerAdapters/createTemporalProviderAdapterFactory.ts
  - apps/api/src/plugins/env.ts
  - apps/temporal-worker/src/plugins/env.ts
  - apps/temporal-worker/src/runtime/temporalWorkerRuntimeResources.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal exec vitest run test/smoke.test.ts test/workflow-step-activity-routing.test.ts test/TemporalAdapter.startRun.test.ts
    - pnpm --filter @dvt/adapter-temporal exec vitest run test/workflow-continue-as-new.test.ts
    - pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-core-decoupling.architecture.test.ts
    - pnpm --filter dvt-api exec vitest run test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts
    - pnpm --filter dvt-temporal-worker exec vitest run test/plugins/env.test.ts
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm --filter dvt-api test
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-temporal-worker test
    - pnpm --filter dvt-temporal-worker typecheck
    - pnpm verify:prepush
---

# MW-D2 Temporal Worker Routing By Capability

This evidence records the ARC-2 proof for provider-neutral Temporal worker
routing by step kind/capability.

## Scope

The slice adds optional activity task-queue routing for `executeStep`. It does
not change workflow start routing, engine lifecycle semantics, plan contracts,
or DB schema.

## Proof Points

- Route config is validated by `loadTemporalAdapterConfig`.
- `TemporalAdapter.startRun()` freezes routes into workflow input.
- `createStepActivities()` attaches `taskQueue` only for routed step kinds.
- Continue-as-new preserves the route snapshot.
- API and temporal-worker composition roots accept the route env.
- Architecture guards keep DBT out of generic routing ownership.
