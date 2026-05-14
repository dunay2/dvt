---
title: AR-C2 Prometheus SLA hardcut
status: Accepted
date: 2026-05-14
owners:
  - dvt-api
  - dvt-outbox-worker
  - '@dvt/engine'
arc_level: ARC-2
breaking: false
code_refs:
  - apps/api/src/infrastructure/telemetry/startRunSlaMetrics.ts
  - apps/api/src/application/services/slaTiming.ts
  - apps/outbox-worker/src/ops/monitor/renderOutboxWorkerMetrics.ts
  - packages/@dvt/engine/test/core/WorkflowEngine.helpers.ts
evidence:
  tests:
    - pnpm --filter dvt-api test -- PrometheusSlaSemantics.architecture.test.ts ObservabilityStartRunSlaTelemetry.test.ts startRunAuthorizedFacade.auth.test.ts startRunAuthorizedFacade.enginePassThrough.test.ts PlannerBackedStartRunUseCase.test.ts
    - pnpm --filter dvt-outbox-worker test -- OutboxWorkerMonitor.test.ts
    - pnpm --filter @dvt/engine typecheck
    - pnpm --filter @dvt/engine test -- WorkflowEngineCoreService.test.ts WorkflowEngine.intentLog.test.ts
---

# AR-C2 Prometheus SLA Hardcut Evidence

This evidence records the hard cut from AR-C2 latency metric names with
millisecond suffixes to current-version Prometheus seconds histograms.

The slice also fixes one engine test-helper type drift by using
`asIsoUtcString(...)` before constructing `SequenceClock`.
