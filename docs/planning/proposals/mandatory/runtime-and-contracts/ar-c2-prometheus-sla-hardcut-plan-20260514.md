---
title: AR-C2 Prometheus SLA Hardcut Plan
status: Accepted
owner: Runtime / SRE / Docs
last_reviewed: 2026-05-14
planning_type: mandatory-proposal
---

# AR-C2 Prometheus SLA Hardcut Plan

## Think-First Analysis

Problem: AR-C2 SLA latency metrics are implemented and documented with
millisecond-oriented metric names. Prometheus practice and mature histogram
examples use base units in metric names, especially `_seconds` for duration
histograms.

Root cause: AR-C2 established operational signal names before creating one
semantic component boundary. Code constants, runbooks, evidence docs, and tests
then repeated those names without a guard that checks unit semantics.

Selected option: hard-cut AR-C2 latency metrics to current-version Prometheus
`_seconds` names, convert observations at the telemetry boundary, update the
runbooks and evidence docs, add owned-concern docblocks, and add a semantic
architecture test.

Rejected alternatives:

- Add legacy `_ms` aliases: rejected by user decision and because duplicate
  series would keep drift alive.
- Move AR-C2 to OpenLineage: rejected because lineage answers provenance, not
  runtime SLA thresholds and Prometheus alerting.
- Fix only docs: rejected because exported metric identity is the contract.

## Fowler Matrix

| Scenario                   | Opportunity             | Fowler pattern                                    | DDD owner                      | Command/query rail                                            | Implementation surfaces                              | Unit or package test           | Architecture test               | User-flow test                   | Out of scope         |
| -------------------------- | ----------------------- | ------------------------------------------------- | ------------------------------ | ------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------ | ------------------------------- | -------------------------------- | -------------------- |
| Prometheus metric hard cut | Unit drift              | Replace Type Code With Explicit Semantic Contract | AR-C2 Prometheus SLA component | `AR-C2OperationalEvidenceCommand` reads the resulting signals | API telemetry, outbox worker monitor, AR-C2 runbooks | API and outbox telemetry tests | AR-C2 Prometheus semantic guard | N/A - telemetry scrape semantics | Legacy aliases       |
| Component documentation    | Documentation drift     | Single Source of Truth                            | Engine operations docs         | Planning DB task rails and AR-C2 evidence rail                | component docs, user stories, buzon analysis         | docs feature mechanization     | same guard                      | N/A                              | Grafana provisioning |
| Label cardinality guard    | Hidden operational cost | Introduce Assertion                               | AR-C2 telemetry policy         | Prometheus scrape surface                                     | telemetry modules and guard test                     | package tests                  | semantic guard                  | N/A                              | Non-AR-C2 metrics    |

## Feature Mechanization

```feature-mechanization
version: 1
featureId: AR-C2-PROMETHEUS-SLA-HARDCUT
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/ar-c2-prometheus-sla-hardcut-plan-20260514.md
componentGuides: [docs/architecture/components/engine/ops/ar-c2-prometheus-sla-component.md]
userStories: [docs/architecture/components/engine/ops/ar-c2-prometheus-sla-user-stories.md]
governingSources: [AGENTS.md, docs/planning/status/governance-document-rule-inventory.md, docs/guides/ai-work-protocol.md, docs/architecture/command-query-rail-governance.md, docs/architecture/fowler-opportunity-planning-governance.md, docs/architecture/reference-architecture.md, docs/runbooks/api-runtime-sla-canonical-20260404.md, docs/runbooks/ar-c2-sla-signal-threshold-mapping-20260404.md, docs/architecture/components/engine/ops/observability.md]
allowedImplementationSurfaces: [buzon/20260514-codex-fowler-ar-c2-prometheus-sla-hardcut-analysis.md, docs/planning/proposals/mandatory/runtime-and-contracts/ar-c2-prometheus-sla-hardcut-plan-20260514.md, docs/planning/closeouts/20260514-ar-c2-prometheus-sla-hardcut-closeout.md, docs/architecture/components/engine/ops/index.md, docs/architecture/components/engine/ops/ar-c2-prometheus-sla-component.md, docs/architecture/components/engine/ops/ar-c2-prometheus-sla-user-stories.md, docs/architecture/components/engine/ops/observability.md, docs/architecture/components/engine/ops/runbooks/incident-response.md, docs/architecture/system/distributed-consistency-model.md, docs/guides/api-control-plane-technical-manual-20260404.md, docs/guides/api-control-plane-user-manual-20260404.md, docs/guides/ar-c2-observability-technical-manual-20260404.md, docs/guides/outbox-worker-user-manual-20260404.md, docs/runbooks/api-runtime-sla-canonical-20260404.md, docs/runbooks/ar-c2-sla-signal-threshold-mapping-20260404.md, docs/runbooks/ar-c2-evidence-generated-latest.md, apps/api/src/application/ports/StartRunSlaTelemetry.ts, apps/api/src/application/services/startRunAuthorizedFacade.ts, apps/api/src/application/services/PlannerBackedStartRunUseCase.ts, apps/api/src/application/services/slaTiming.ts, apps/api/src/infrastructure/telemetry/startRunSlaMetrics.ts, apps/api/src/infrastructure/telemetry/ObservabilityStartRunSlaTelemetry.ts, apps/api/src/infrastructure/telemetry/ObservabilityRunStatusStalenessTelemetry.ts, apps/api/test/infrastructure/telemetry/ObservabilityStartRunSlaTelemetry.test.ts, apps/api/test/infrastructure/telemetry/PrometheusSlaSemantics.architecture.test.ts, apps/api/test/application/services/startRunAuthorizedFacade.auth.test.ts, apps/api/test/application/services/startRunAuthorizedFacade.enginePassThrough.test.ts, apps/api/test/application/services/PlannerBackedStartRunUseCase.test.ts, apps/api/test/modules/registerOperationalHooks.cases.ts, apps/outbox-worker/src/ops/OutboxWorkerMonitor.ts, apps/outbox-worker/src/ops/monitor/OutboxDeliveryTelemetry.ts, apps/outbox-worker/src/ops/monitor/model.ts, apps/outbox-worker/src/ops/monitor/renderOutboxWorkerMetrics.ts, apps/outbox-worker/test/ops/OutboxWorkerMonitor.test.ts, packages/@dvt/engine/test/core/WorkflowEngine.helpers.ts]
forbiddenImplementationSurfaces: [packages/@dvt/engine/src/**, packages/@dvt/contracts/**, packages/@dvt/adapter-*/**, packages/@dvt/planner/**, apps/web/**]
commandQueryRails:
  - {name: AR-C2OperationalEvidenceCommand, type: command, dddOwner: AR-C2 evidence collector policy}
domainObjects:
  - {name: AR-C2 Prometheus SLA component, type: policy, owner: docs/architecture/components/engine/ops/ar-c2-prometheus-sla-component.md}
fowlerSignals: [Unit drift removed, Documentation drift guarded, Semantic encapsulation added, Cardinality policy asserted]
architectureGuards: [pnpm --filter dvt-api test -- PrometheusSlaSemantics.architecture.test.ts, pnpm docs:feature-mechanization:implementation]
cypressFlows: [N/A - operational telemetry semantics only]
completionGate: [pnpm docs:feature-mechanization -- --feature AR-C2-PROMETHEUS-SLA-HARDCUT, pnpm --filter dvt-api test -- PrometheusSlaSemantics.architecture.test.ts, pnpm --filter dvt-api test -- ObservabilityStartRunSlaTelemetry.test.ts startRunAuthorizedFacade.auth.test.ts startRunAuthorizedFacade.enginePassThrough.test.ts PlannerBackedStartRunUseCase.test.ts, pnpm --filter dvt-outbox-worker test -- OutboxWorkerMonitor.test.ts, pnpm docs:sync, pnpm docs:status:generate, pnpm governance:refresh, pnpm docs:feature-mechanization:implementation, pnpm verify:prepush]
redGreenCycles:
  - {id: semantic-prometheus-hardcut-guard, redTest: pnpm --filter dvt-api test -- PrometheusSlaSemantics.architecture.test.ts, expectedFailure: AR-C2 docs and code still expose millisecond latency metric names and lack the component guide, patchSurfaces: [apps/api/test/infrastructure/telemetry/PrometheusSlaSemantics.architecture.test.ts, docs/architecture/components/engine/ops/ar-c2-prometheus-sla-component.md, docs/architecture/components/engine/ops/ar-c2-prometheus-sla-user-stories.md], greenTest: pnpm --filter dvt-api test -- PrometheusSlaSemantics.architecture.test.ts}
  - {id: api-latency-seconds-port, redTest: pnpm --filter dvt-api test -- ObservabilityStartRunSlaTelemetry.test.ts startRunAuthorizedFacade.auth.test.ts startRunAuthorizedFacade.enginePassThrough.test.ts PlannerBackedStartRunUseCase.test.ts, expectedFailure: API telemetry still records millisecond metric names and millisecond values, patchSurfaces: [apps/api/src/application/ports/StartRunSlaTelemetry.ts, apps/api/src/application/services/startRunAuthorizedFacade.ts, apps/api/src/application/services/PlannerBackedStartRunUseCase.ts, apps/api/src/infrastructure/telemetry/startRunSlaMetrics.ts, apps/api/src/infrastructure/telemetry/ObservabilityStartRunSlaTelemetry.ts], greenTest: pnpm --filter dvt-api test -- ObservabilityStartRunSlaTelemetry.test.ts startRunAuthorizedFacade.auth.test.ts startRunAuthorizedFacade.enginePassThrough.test.ts PlannerBackedStartRunUseCase.test.ts}
  - {id: outbox-event-delivery-seconds, redTest: pnpm --filter dvt-outbox-worker test -- OutboxWorkerMonitor.test.ts, expectedFailure: outbox event delivery latency histogram is still exported as milliseconds, patchSurfaces: [apps/outbox-worker/src/ops/OutboxWorkerMonitor.ts, apps/outbox-worker/src/ops/monitor/OutboxDeliveryTelemetry.ts, apps/outbox-worker/src/ops/monitor/model.ts, apps/outbox-worker/src/ops/monitor/renderOutboxWorkerMetrics.ts, apps/outbox-worker/test/ops/OutboxWorkerMonitor.test.ts], greenTest: pnpm --filter dvt-outbox-worker test -- OutboxWorkerMonitor.test.ts}
symbols:
  - {name: START_RUN_SLA_METRICS, path: apps/api/src/infrastructure/telemetry/startRunSlaMetrics.ts, dddOwner: AR-C2 Prometheus SLA component, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [explicit current metric identity], architectureGuard: pnpm --filter dvt-api test -- PrometheusSlaSemantics.architecture.test.ts, cypressCoverage: N/A, unitTests: [pnpm --filter dvt-api test -- ObservabilityStartRunSlaTelemetry.test.ts]}
  - {name: elapsedSlaSecondsSince, path: apps/api/src/application/services/slaTiming.ts, dddOwner: AR-C2 Prometheus SLA component, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [named unit conversion at telemetry boundary], architectureGuard: pnpm --filter dvt-api test -- PrometheusSlaSemantics.architecture.test.ts, cypressCoverage: N/A, unitTests: [pnpm --filter dvt-api test -- startRunAuthorizedFacade.auth.test.ts PlannerBackedStartRunUseCase.test.ts]}
  - {name: DELIVERY_EVENT_LATENCY_BUCKETS_SECONDS, path: apps/outbox-worker/src/ops/monitor/model.ts, dddOwner: AR-C2 Prometheus SLA component, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [base-unit outbox latency buckets], architectureGuard: pnpm --filter dvt-api test -- PrometheusSlaSemantics.architecture.test.ts, cypressCoverage: N/A, unitTests: [pnpm --filter dvt-outbox-worker test -- OutboxWorkerMonitor.test.ts]}
  - {name: CreateEngineInput, path: packages/@dvt/engine/test/core/WorkflowEngine.helpers.ts, dddOwner: engine test helper, cqRails: [N/A - test helper], fowlerSignals: [fixture input boundary], architectureGuard: pnpm --filter @dvt/engine typecheck, cypressCoverage: N/A, unitTests: [pnpm --filter @dvt/engine test -- WorkflowEngineCoreService.test.ts WorkflowEngine.intentLog.test.ts]}
  - {name: makeDefaultEngineClock, path: packages/@dvt/engine/test/core/WorkflowEngine.helpers.ts, dddOwner: engine test helper, cqRails: [N/A - test helper], fowlerSignals: [typed ISO clock fixture hygiene], architectureGuard: pnpm --filter @dvt/engine typecheck, cypressCoverage: N/A, unitTests: [pnpm --filter @dvt/engine test -- WorkflowEngineCoreService.test.ts WorkflowEngine.intentLog.test.ts]}
  - {name: makeWorkflowEngineFixtureInput, path: packages/@dvt/engine/test/core/WorkflowEngine.helpers.ts, dddOwner: engine test helper, cqRails: [N/A - test helper], fowlerSignals: [fixture input boundary], architectureGuard: pnpm --filter @dvt/engine typecheck, cypressCoverage: N/A, unitTests: [pnpm --filter @dvt/engine test -- WorkflowEngineCoreService.test.ts WorkflowEngine.intentLog.test.ts]}
  - {name: createEngine, path: packages/@dvt/engine/test/core/WorkflowEngine.helpers.ts, dddOwner: engine test helper, cqRails: [N/A - test helper], fowlerSignals: [typed ISO clock fixture hygiene], architectureGuard: pnpm --filter @dvt/engine typecheck, cypressCoverage: N/A, unitTests: [pnpm --filter @dvt/engine test -- WorkflowEngine.helpers.ts]}
  - {name: makeScriptedClock, path: packages/@dvt/engine/test/core/WorkflowEngine.helpers.ts, dddOwner: engine test helper, cqRails: [N/A - test helper], fowlerSignals: [typed ISO clock fixture hygiene], architectureGuard: pnpm --filter @dvt/engine typecheck, cypressCoverage: N/A, unitTests: [pnpm --filter @dvt/engine test -- WorkflowEngineCoreService.test.ts WorkflowEngine.intentLog.test.ts]}
  - {name: currentFile, path: apps/api/test/infrastructure/telemetry/PrometheusSlaSemantics.architecture.test.ts, dddOwner: AR-C2 Prometheus semantic guard, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [repo-relative guard anchoring], architectureGuard: pnpm --filter dvt-api test -- PrometheusSlaSemantics.architecture.test.ts, cypressCoverage: N/A, unitTests: [pnpm --filter dvt-api test -- PrometheusSlaSemantics.architecture.test.ts]}
  - {name: repoRoot, path: apps/api/test/infrastructure/telemetry/PrometheusSlaSemantics.architecture.test.ts, dddOwner: AR-C2 Prometheus semantic guard, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [repo-relative guard anchoring], architectureGuard: pnpm --filter dvt-api test -- PrometheusSlaSemantics.architecture.test.ts, cypressCoverage: N/A, unitTests: [pnpm --filter dvt-api test -- PrometheusSlaSemantics.architecture.test.ts]}
  - {name: readRepoFile, path: apps/api/test/infrastructure/telemetry/PrometheusSlaSemantics.architecture.test.ts, dddOwner: AR-C2 Prometheus semantic guard, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [documentation-code drift guard], architectureGuard: pnpm --filter dvt-api test -- PrometheusSlaSemantics.architecture.test.ts, cypressCoverage: N/A, unitTests: [pnpm --filter dvt-api test -- PrometheusSlaSemantics.architecture.test.ts]}
  - {name: semanticSurfaces, path: apps/api/test/infrastructure/telemetry/PrometheusSlaSemantics.architecture.test.ts, dddOwner: AR-C2 Prometheus semantic guard, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [explicit guarded surfaces], architectureGuard: pnpm --filter dvt-api test -- PrometheusSlaSemantics.architecture.test.ts, cypressCoverage: N/A, unitTests: [pnpm --filter dvt-api test -- PrometheusSlaSemantics.architecture.test.ts]}
  - {name: currentPrometheusMetricNames, path: apps/api/test/infrastructure/telemetry/PrometheusSlaSemantics.architecture.test.ts, dddOwner: AR-C2 Prometheus semantic guard, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [current metric identity], architectureGuard: pnpm --filter dvt-api test -- PrometheusSlaSemantics.architecture.test.ts, cypressCoverage: N/A, unitTests: [pnpm --filter dvt-api test -- PrometheusSlaSemantics.architecture.test.ts]}
  - {name: legacyPrometheusMetricNames, path: apps/api/test/infrastructure/telemetry/PrometheusSlaSemantics.architecture.test.ts, dddOwner: AR-C2 Prometheus semantic guard, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [legacy alias rejection], architectureGuard: pnpm --filter dvt-api test -- PrometheusSlaSemantics.architecture.test.ts, cypressCoverage: N/A, unitTests: [pnpm --filter dvt-api test -- PrometheusSlaSemantics.architecture.test.ts]}
  - {name: identifierLabelNames, path: apps/api/test/infrastructure/telemetry/PrometheusSlaSemantics.architecture.test.ts, dddOwner: AR-C2 Prometheus semantic guard, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [bounded label policy], architectureGuard: pnpm --filter dvt-api test -- PrometheusSlaSemantics.architecture.test.ts, cypressCoverage: N/A, unitTests: [pnpm --filter dvt-api test -- PrometheusSlaSemantics.architecture.test.ts]}
  - {name: createCounterStub, path: apps/api/test/infrastructure/telemetry/ObservabilityStartRunSlaTelemetry.test.ts, dddOwner: AR-C2 telemetry test fixture, cqRails: [N/A - test helper], fowlerSignals: [typed test double], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: N/A, unitTests: [pnpm --filter dvt-api test -- ObservabilityStartRunSlaTelemetry.test.ts]}
  - {name: createGaugeStub, path: apps/api/test/infrastructure/telemetry/ObservabilityStartRunSlaTelemetry.test.ts, dddOwner: AR-C2 telemetry test fixture, cqRails: [N/A - test helper], fowlerSignals: [typed test double], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: N/A, unitTests: [pnpm --filter dvt-api test -- ObservabilityStartRunSlaTelemetry.test.ts]}
  - {name: createLogStub, path: apps/api/test/infrastructure/telemetry/ObservabilityStartRunSlaTelemetry.test.ts, dddOwner: AR-C2 telemetry test fixture, cqRails: [N/A - test helper], fowlerSignals: [typed test double], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: N/A, unitTests: [pnpm --filter dvt-api test -- ObservabilityStartRunSlaTelemetry.test.ts]}
  - {name: createTraceStub, path: apps/api/test/infrastructure/telemetry/ObservabilityStartRunSlaTelemetry.test.ts, dddOwner: AR-C2 telemetry test fixture, cqRails: [N/A - test helper], fowlerSignals: [typed test double], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: N/A, unitTests: [pnpm --filter dvt-api test -- ObservabilityStartRunSlaTelemetry.test.ts]}
  - {name: createObservabilityForSlaTest, path: apps/api/test/infrastructure/telemetry/ObservabilityStartRunSlaTelemetry.test.ts, dddOwner: AR-C2 telemetry test fixture, cqRails: [N/A - test helper], fowlerSignals: [typed observability fixture], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: N/A, unitTests: [pnpm --filter dvt-api test -- ObservabilityStartRunSlaTelemetry.test.ts]}
  - {name: createOperationalHookApp, path: apps/api/test/modules/registerOperationalHooks.cases.ts, dddOwner: operational hook test fixture, cqRails: [N/A - test helper], fowlerSignals: [smaller lifecycle scenario], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: N/A, unitTests: [pnpm --filter dvt-api test -- modules.test.ts]}
  - {name: createStateStoreRoleSource, path: apps/api/test/modules/registerOperationalHooks.cases.ts, dddOwner: operational hook test fixture, cqRails: [N/A - test helper], fowlerSignals: [smaller lifecycle scenario], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: N/A, unitTests: [pnpm --filter dvt-api test -- modules.test.ts]}
  - {name: createWorkspaceGraphDraftStore, path: apps/api/test/modules/registerOperationalHooks.cases.ts, dddOwner: operational hook test fixture, cqRails: [N/A - test helper], fowlerSignals: [smaller lifecycle scenario], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: N/A, unitTests: [pnpm --filter dvt-api test -- modules.test.ts]}
  - {name: createProtectedRuntimeModuleHarness, path: apps/api/test/modules/registerOperationalHooks.cases.ts, dddOwner: operational hook test fixture, cqRails: [N/A - test helper], fowlerSignals: [smaller lifecycle scenario], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: N/A, unitTests: [pnpm --filter dvt-api test -- modules.test.ts]}
```

## Red/Green Plan

1. Add `PrometheusSlaSemantics.architecture.test.ts` and watch it fail on old
   `_ms` metric names and missing semantic docblocks.
2. Update API telemetry tests so expected metric names and observations are
   second-valued.
3. Update outbox monitor tests so event delivery buckets and sum are
   second-valued.
4. Implement the minimal code/doc changes to pass those tests.
5. Refresh docs indexes and governance projections.
