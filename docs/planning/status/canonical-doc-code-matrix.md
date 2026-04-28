---
title: Canonical Doc Code Matrix
status: Active
owner: Architecture / Docs
last_reviewed: 2026-04-19
planning_type: status
---

# Canonical Doc Code Matrix

Curated manual traceability matrix for the active runtime, product, and
platform topics that need explicit doc -> code -> test -> command mapping.

This page is the topic-level counterpart to:

- [Generated Code State](./generated-code-state.md)
- [Generated Spec Traceability](./generated-spec-traceability.md)
- [Repository Map](../../concepts/repository-map.md)
- [Glossary](../../concepts/glossary.md)
- [Domain Language](../../concepts/domain-language.md)

Use it to answer three practical questions quickly:

1. Which document is the current source of truth for this topic?
2. Which code paths implement it?
3. Which tests and commands should fail if it regresses?

Package-by-package workspace coverage lives in
[Repository Map](../../concepts/repository-map.md). This matrix stays focused
on high-value behavioral topics.

When this page says `canonical spec`, `status doc`, or `reference-only`, those
terms follow the meanings defined in [Glossary](../../concepts/glossary.md) and
[Domain Language](../../concepts/domain-language.md).

## Topic Summary

<!-- markdownlint-disable MD060 -->

| Topic                                          | Primary packages                                                                       | Canonical spec                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Current status                                                                                                                                                                |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow engine core                           | `@dvt/contracts`, `@dvt/engine`, `apps/api`, `@dvt/artifacts`                          | [WorkflowEngine subsystem context](../../architecture/components/engine/architecture/workflow-engine-subsystem-context.md), [WorkflowEngine target architecture v1](../../architecture/components/engine/architecture/workflow-engine-target-architecture.v1.md)                                                                                                                                                                                                                                                                                                                         | [System Delivery Status](../../architecture/system-delivery-status.md)                                                                                                        |
| Temporal adapter runtime                       | `@dvt/adapter-temporal`                                                                | [TemporalAdapter Specification](../../architecture/components/engine/adapters/temporal/temporal-adapter-spec.md), [Temporal Engine Policies](../../architecture/components/engine/adapters/temporal/EnginePolicies.md)                                                                                                                                                                                                                                                                                                                                                                   | [System Delivery Status](../../architecture/system-delivery-status.md)                                                                                                        |
| Postgres state store                           | `@dvt/adapter-postgres`, `@dvt/state-store`                                            | [Postgres State Store Adapter](../../architecture/components/engine/adapters/state-store/postgres/StateStoreAdapter.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | [System Delivery Status](../../architecture/system-delivery-status.md)                                                                                                        |
| Intent reconciler and pre-dispatch intent log  | `@dvt/adapter-postgres`, `@dvt/engine`, `apps/api`                                     | [ADR-0030](../../adr/ADR-0030-pre-dispatch-intent-log.md), [G3 Task Specification](../archive/gaps/G3-TASK-SPECIFICATION.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                             | [System Delivery Status](../../architecture/system-delivery-status.md)                                                                                                        |
| Outbox worker runtime                          | `@dvt/delivery`, `dvt-outbox-worker`, `@dvt/adapter-postgres`                          | [G5 - Outbox Worker Consolidated Plan](../archive/gaps/G5-OUTBOX-WORKER-CONSOLIDATED-PLAN.md), [ADR-0034](../../adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md)                                                                                                                                                                                                                                                                                                                                                                                                      | [System Delivery Status](../../architecture/system-delivery-status.md)                                                                                                        |
| Read models and projector catch-up             | `@dvt/delivery`, `apps/projector-worker`, `@dvt/adapter-postgres`, `@dvt/engine`       | [ADR-0004](../../adr/ADR-0004-event-sourcing-strategy.md), [ADR-0015](../../adr/ADR-0015-getRunStatus-read-model-separation.md), [ED-20260316 - G7 closeout](../../evidence/critical/ED-20260316-g7-closeout.md)                                                                                                                                                                                                                                                                                                                                                                         | [System Delivery Status](../../architecture/system-delivery-status.md)                                                                                                        |
| compiledCodeRef ownership                      | `@dvt/contracts`, `@dvt/planner`, `@dvt/adapter-temporal`, `@dvt/traceability-service` | [ADR-0032](../../adr/ADR-0032-compiledcoderef-ownership.md), [G4 Task Specification](../archive/gaps/G4-TASK-SPECIFICATION.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                           | [System Delivery Status](../../architecture/system-delivery-status.md)                                                                                                        |
| OpenLineage mapping and delivery debt          | `@dvt/traceability-service`                                                            | [G6 OpenLineage CI and Schema Pin Plan](../archive/gaps/g6/G6-OPENLINEAGE-CI-SCHEMA-PIN-PLAN.md), [Traceability Contracts](../../contracts/traceability/index.md)                                                                                                                                                                                                                                                                                                                                                                                                                        | [System Delivery Status](../../architecture/system-delivery-status.md)                                                                                                        |
| API auth and runtime boundary                  | `apps/api`                                                                             | [G8 Real Auth Final Spec](../archive/gaps/G8-REAL-AUTH-FINAL-SPEC.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | [System Delivery Status](../../architecture/system-delivery-status.md)                                                                                                        |
| Workspace graph authoring draft persistence    | `@dvt/contracts`, `apps/api`, `apps/web`                                               | [Workspace authoring draft aggregate](../../architecture/components/planner/workspace-authoring-draft-aggregate.md), [Execution selection component](../../architecture/components/planner/execution-selection-component.md), [Workspace graph draft persistence v1](../../contracts/planner/workspace-graph-draft-persistence-v1.md), [Execution selection and executable subgraph v1](../../contracts/planner/execution-selection-and-executable-subgraph-v1.md), [Workspace graph draft application component](../../../apps/api/docs/workspace-graph-draft-application-component.md) | [TF-A2-C execution selection and executable subgraph plan](../proposals/mandatory/runtime-and-contracts/tf-a2-c-execution-selection-and-executable-subgraph-plan-20260423.md) |
| Web frontend shell and client routing          | `apps/web`                                                                             | [web component](../../architecture/components/web/index.md), [Read subsystem](../../architecture/system/subsystems/read/index.md), [Frontend runtime contract technical manual](../../architecture/components/web/runs/frontend-runtime-contract-technical-manual.md)                                                                                                                                                                                                                                                                                                                    | [System Delivery Status](../../architecture/system-delivery-status.md)                                                                                                        |
| Plan integrity and compatibility verification  | `@dvt/engine`, `@dvt/adapter-temporal`, `apps/api`, `@dvt/plan-verifier`               | [ADR-0012](../../adr/ADR-0012-plan-integrity-ownership.md), [ADR-0017](../../adr/ADR-0017_ExecutionPlan_Schema_Versioning.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                            | [System Delivery Status](../../architecture/system-delivery-status.md)                                                                                                        |
| Planner typed graph-source boundary            | `@dvt/contracts`, `@dvt/planner`, `apps/api`                                           | [Planner Contracts](../../contracts/planner/index.md), [ADR-0035](../../adr/ADR-0035-planner-public-contract-evolution-protocol.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                      | [Planner Current State Assessment](./planner-current-state-assessment.md)                                                                                                     |
| Deterministic DAG interpretation               | `@dvt/plan-interpreter`                                                                | [Plan Interpreter Package](../../architecture/shared/plan-interpreter.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | [Shared Package Architecture](../../architecture/shared/index.md)                                                                                                             |
| Gateway DSL evaluator                          | `@dvt/dsl`                                                                             | [Gateway DSL Package](../../architecture/shared/dsl.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | [Shared Package Architecture](../../architecture/shared/index.md)                                                                                                             |
| Observability contracts and cardinality policy | `@dvt/observability`                                                                   | [Observability Guide](../../architecture/components/engine/ops/observability.md), [Metrics Catalog](../../architecture/components/engine/ops/metrics-catalog.md)                                                                                                                                                                                                                                                                                                                                                                                                                         | [System Delivery Status](../../architecture/system-delivery-status.md)                                                                                                        |
| OpenTelemetry observability binding            | `@dvt/observability-otel`                                                              | [Observability Guide](../../architecture/components/engine/ops/observability.md), [@dvt/observability-otel README](../../../packages/@dvt/observability-otel/README.md)                                                                                                                                                                                                                                                                                                                                                                                                                  | [System Delivery Status](../../architecture/system-delivery-status.md)                                                                                                        |
| CLI validation surface                         | `@dvt/cli`                                                                             | [CLI Package](../../architecture/shared/cli.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | [Shared Package Architecture](../../architecture/shared/index.md)                                                                                                             |
| Canonicalization and hashing utilities         | `@dvt/crypto`                                                                          | [Crypto Package](../../architecture/shared/crypto.md), [ADR-0012](../../adr/ADR-0012-plan-integrity-ownership.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | [Shared Package Architecture](../../architecture/shared/index.md)                                                                                                             |
| Documentation governance and checks            | `scripts/*`, `tools/ci/*`, `tools/docs/*`                                              | [Testing and CI Capabilities](../../guides/testing-and-ci-capabilities.md), [AI Work Protocol](../../guides/ai-work-protocol.md), [Docs Markdown Governance Parser Component](../../guides/docs-markdown-governance-parser-component.md)                                                                                                                                                                                                                                                                                                                                                 | [Documentation Restructuring Diagnostic and Roadmap](../archive/proposals/documentation-restructuring-diagnostic-and-roadmap.md)                                              |

<!-- markdownlint-enable MD060 -->

## Topic Details

### Workflow engine core

- Canonical spec:
  [WorkflowEngine subsystem context](../../architecture/components/engine/architecture/workflow-engine-subsystem-context.md)
  and
  [WorkflowEngine target architecture v1](../../architecture/components/engine/architecture/workflow-engine-target-architecture.v1.md)
- Normative contract baseline:
  [IWorkflowEngine v1](../../architecture/components/engine/contracts/engine/IWorkflowEngine.v1.md)
  and
  [ExecutionSemantics v1](../../architecture/components/engine/contracts/engine/ExecutionSemantics.v1.md)
- Current status source:
  [System Delivery Status](../../architecture/system-delivery-status.md)
- Primary code:
  [packages/@dvt/engine/src/ports/IWorkflowEngine.ts](../../../packages/@dvt/engine/src/ports/IWorkflowEngine.ts)
  and
  [packages/@dvt/engine/src/core/WorkflowEngine.ts](../../../packages/@dvt/engine/src/core/WorkflowEngine.ts)
  and
  [packages/@dvt/engine/src/core/SnapshotProjector.ts](../../../packages/@dvt/engine/src/core/SnapshotProjector.ts)
- Key tests:
  [packages/@dvt/engine/test/core/WorkflowEngine.test.ts](../../../packages/@dvt/engine/test/core/WorkflowEngine.test.ts),
  [packages/@dvt/engine/test/core/WorkflowEngine.intentLog.test.ts](../../../packages/@dvt/engine/test/core/WorkflowEngine.intentLog.test.ts),
  [packages/@dvt/engine/test/core/SnapshotProjector.transitions.test.ts](../../../packages/@dvt/engine/test/core/SnapshotProjector.transitions.test.ts),
  [packages/@dvt/engine/test/contracts/IWorkflowEngine.types.test.ts](../../../packages/@dvt/engine/test/contracts/IWorkflowEngine.types.test.ts),
  [packages/@dvt/engine/test/contracts/package-surface.test.ts](../../../packages/@dvt/engine/test/contracts/package-surface.test.ts)
- Verification:
  `pnpm test:engine`
  and
  `pnpm validate:contracts`

### Temporal adapter runtime

- Canonical spec:
  [TemporalAdapter Specification](../../architecture/components/engine/adapters/temporal/temporal-adapter-spec.md)
  and
  [Temporal step plugin profile component](../../architecture/components/engine/adapters/temporal/temporal-step-plugin-profile.md)
  and
  [Temporal DBT worker plugin profile](../../architecture/components/engine/adapters/temporal/temporal-dbt-worker-plugin-profile.md)
  and
  [Temporal Engine Policies](../../architecture/components/engine/adapters/temporal/EnginePolicies.md)
- Current status source:
  [System Delivery Status](../../architecture/system-delivery-status.md)
- Primary code:
  [packages/@dvt/adapter-temporal/src/TemporalAdapter.ts](../../../packages/@dvt/adapter-temporal/src/TemporalAdapter.ts)
  and
  [packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts](../../../packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts)
  and
  [packages/@dvt/adapter-temporal/src/plugins/TemporalStepPluginProfile.ts](../../../packages/@dvt/adapter-temporal/src/plugins/TemporalStepPluginProfile.ts)
  and
  [packages/@dvt/adapter-temporal/src/plugins/dbt/DbtStepActivity.ts](../../../packages/@dvt/adapter-temporal/src/plugins/dbt/DbtStepActivity.ts)
- Key tests:
  [packages/@dvt/adapter-temporal/test/TemporalAdapter.lookupRunRef.test.ts](../../../packages/@dvt/adapter-temporal/test/TemporalAdapter.lookupRunRef.test.ts),
  [packages/@dvt/adapter-temporal/test/TemporalWorkerHost.lifecycle.test.ts](../../../packages/@dvt/adapter-temporal/test/TemporalWorkerHost.lifecycle.test.ts),
  [packages/@dvt/adapter-temporal/test/dbt-core-decoupling.architecture.test.ts](../../../packages/@dvt/adapter-temporal/test/dbt-core-decoupling.architecture.test.ts),
  [packages/@dvt/adapter-temporal/test/workflow-compiled-code-ref.test.ts](../../../packages/@dvt/adapter-temporal/test/workflow-compiled-code-ref.test.ts),
  [packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts](../../../packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts)
- Evidence:
  [ED-20260304 - TemporalAdapter.lookupRunRef implementation](../../evidence/critical/ED-20260304-temporal-lookup-run-ref.md)
  and
  [ED-20260308 - Temporal adapter operational close-out](../../evidence/critical/ED-20260308-temporal-operational-close-out.md)
- Verification:
  `pnpm test:adapter-temporal`
  and
  `pnpm test:adapter-temporal:integration`
- Capability-specific verification:
  `pnpm test:adapter-temporal:integration:transformation` when
  transformation-flow runtime semantics are in scope
  and
  `pnpm test:adapter-temporal:integration:postgres` when the relational
  Postgres execution path is in scope.
- Canonical local proof wrapper:
  `pnpm test:adapter-temporal:integration:postgres:docker`
  with
  [Temporal Postgres Proof Environment](../../runbooks/temporal-postgres-proof-environment.md)
  as the operator runbook.

### Postgres state store

- Canonical spec:
  [Postgres State Store Adapter](../../architecture/components/engine/adapters/state-store/postgres/StateStoreAdapter.md)
- Current status source:
  [System Delivery Status](../../architecture/system-delivery-status.md) (`G2`)
- Primary code:
  [packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts](../../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts)
- Key tests:
  [packages/@dvt/adapter-postgres/test/runStateCommandPortBridge.test.ts](../../../packages/@dvt/adapter-postgres/test/runStateCommandPortBridge.test.ts)
  and
  [packages/@dvt/adapter-postgres/test/smoke.test.ts](../../../packages/@dvt/adapter-postgres/test/smoke.test.ts)
- Verification:
  `pnpm test:adapter-postgres`
  and
  `pnpm validate:contracts`

### Intent reconciler and pre-dispatch intent log

- Canonical spec:
  [ADR-0030](../../adr/ADR-0030-pre-dispatch-intent-log.md)
  and
  [G3 Task Specification](../archive/gaps/G3-TASK-SPECIFICATION.md)
- Current status source:
  [System Delivery Status](../../architecture/system-delivery-status.md)
- Primary code:
  [packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts](../../../packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts),
  [packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts](../../../packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts),
  [apps/api/src/runtime/intentReconcilerRuntime.ts](../../../apps/api/src/runtime/intentReconcilerRuntime.ts)
- Key tests:
  [packages/@dvt/adapter-postgres/test/PostgresStartRunIntentStore.test.ts](../../../packages/@dvt/adapter-postgres/test/PostgresStartRunIntentStore.test.ts)
  and
  [packages/@dvt/engine/test/workers/IntentReconcilerWorker.test.ts](../../../packages/@dvt/engine/test/workers/IntentReconcilerWorker.test.ts)
- Evidence:
  [ED-20260304 - G3 intent store Postgres reconciler](../../evidence/critical/ED-20260304-g3-intentstore-postgres-reconciler.md)
- Verification:
  `pnpm test:adapter-postgres`
  and
  `pnpm test:engine`

### Outbox worker runtime

- Canonical spec:
  [G5 - Outbox Worker Consolidated Plan](../archive/gaps/G5-OUTBOX-WORKER-CONSOLIDATED-PLAN.md)
- Historical implementation record:
  [G5 - Outbox Worker Consolidated Plan](../archive/gaps/G5-OUTBOX-WORKER-CONSOLIDATED-PLAN.md)
- Current status source:
  [System Delivery Status](../../architecture/system-delivery-status.md)
- Primary code:
  [packages/@dvt/delivery/src/application/OutboxWorker.ts](../../../packages/@dvt/delivery/src/application/OutboxWorker.ts)
  and
  [packages/@dvt/delivery/src/application/OutboxWorkerRuntime.ts](../../../packages/@dvt/delivery/src/application/OutboxWorkerRuntime.ts)
  and
  [apps/outbox-worker/src/server.ts](../../../apps/outbox-worker/src/server.ts)
  and
  [apps/outbox-worker/src/runtime/createOutboxWorkerRuntime.ts](../../../apps/outbox-worker/src/runtime/createOutboxWorkerRuntime.ts)
  and
  [apps/outbox-worker/src/ops/OutboxWorkerMonitor.ts](../../../apps/outbox-worker/src/ops/OutboxWorkerMonitor.ts)
  and
  [apps/outbox-worker/src/ops/OperationalServer.ts](../../../apps/outbox-worker/src/ops/OperationalServer.ts)
  and
  [apps/outbox-worker/src/bus/HttpEventBus.ts](../../../apps/outbox-worker/src/bus/HttpEventBus.ts)
  and
  [packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts](../../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts)
- Key tests:
  [packages/@dvt/delivery/test/OutboxWorker.delivery.test.ts](../../../packages/@dvt/delivery/test/OutboxWorker.delivery.test.ts)
  and
  [apps/outbox-worker/test/runtime/OutboxWorkerRuntime.lifecycle.test.ts](../../../apps/outbox-worker/test/runtime/OutboxWorkerRuntime.lifecycle.test.ts)
  and
  [apps/outbox-worker/test/plugins/env.test.ts](../../../apps/outbox-worker/test/plugins/env.test.ts)
  and
  [apps/outbox-worker/test/bus/HttpEventBus.test.ts](../../../apps/outbox-worker/test/bus/HttpEventBus.test.ts)
  and
  [apps/outbox-worker/test/ops/OutboxWorkerMonitor.test.ts](../../../apps/outbox-worker/test/ops/OutboxWorkerMonitor.test.ts)
  and
  [apps/outbox-worker/test/ops/OperationalServer.test.ts](../../../apps/outbox-worker/test/ops/OperationalServer.test.ts)
  and
  [packages/@dvt/adapter-postgres/test/smoke.test.ts](../../../packages/@dvt/adapter-postgres/test/smoke.test.ts)
- Runbook:
  [docs/runbooks/outbox-worker-g5.md](../../runbooks/outbox-worker-g5.md)
- Verification:
  `pnpm --filter @dvt/delivery test`
  and
  `pnpm --filter dvt-outbox-worker typecheck`
  and
  `pnpm --filter dvt-outbox-worker build`
  and
  `pnpm --filter dvt-outbox-worker test`
  and
  `pnpm --filter dvt-outbox-worker test:arch`
  and
  `pnpm test:adapter-postgres`

### Read models and projector catch-up

- Canonical spec:
  [ADR-0004](../../adr/ADR-0004-event-sourcing-strategy.md)
  and
  [ADR-0015](../../adr/ADR-0015-getRunStatus-read-model-separation.md)
- Current status source:
  [System Delivery Status](../../architecture/system-delivery-status.md)
- Current posture:
  Read-model and projector delivery is shipped; `run_snapshots`
  formalization, standalone projector runtime, and provider run-id
  reconciliation are all delivered.
- Primary code:
  [packages/@dvt/engine/src/ports/IRunStateStore.ts](../../../packages/@dvt/engine/src/ports/IRunStateStore.ts)
  and
  [packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts](../../../packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts)
  and
  [packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts](../../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts)
  and
  [packages/@dvt/engine/src/core/WorkflowEngine.ts](../../../packages/@dvt/engine/src/core/WorkflowEngine.ts)
  and
  [packages/@dvt/delivery/src/application/ProjectorWorkerRuntime.ts](../../../packages/@dvt/delivery/src/application/ProjectorWorkerRuntime.ts)
  and
  [apps/projector-worker/src/server.ts](../../../apps/projector-worker/src/server.ts)
- Key tests:
  [packages/@dvt/engine/test/core/WorkflowEngine.test.ts](../../../packages/@dvt/engine/test/core/WorkflowEngine.test.ts)
  and
  [packages/@dvt/delivery/test/ProjectorWorkerRuntime.test.ts](../../../packages/@dvt/delivery/test/ProjectorWorkerRuntime.test.ts)
  and
  [apps/projector-worker/test/env.test.ts](../../../apps/projector-worker/test/env.test.ts)
  and
  [packages/@dvt/adapter-postgres/test/smoke.test.ts](../../../packages/@dvt/adapter-postgres/test/smoke.test.ts)
- Evidence:
  [ED-20260316 - G7 provider run-id reconciliation](../../evidence/critical/ED-20260316-g7-provider-ref-reconciliation.md)
  and
  [ED-20260316 - G7 closeout](../../evidence/critical/ED-20260316-g7-closeout.md)
- Verification:
  `pnpm --filter @dvt/contracts build`
  and
  `pnpm --filter @dvt/engine test`
  and
  `pnpm --filter @dvt/adapter-postgres test`
  and
  `pnpm --filter @dvt/delivery test`
  and
  `pnpm --filter dvt-projector-worker typecheck`
  and
  `pnpm --filter dvt-projector-worker build`
  and
  `pnpm --filter dvt-projector-worker test`

### compiledCodeRef ownership

- Canonical spec:
  [ADR-0032](../../adr/ADR-0032-compiledcoderef-ownership.md)
  and
  [G4 Task Specification](../archive/gaps/G4-TASK-SPECIFICATION.md)
- Current status source:
  [System Delivery Status](../../architecture/system-delivery-status.md)
- Primary code:
  [packages/@dvt/artifacts/src/compiledCode/attachCompiledCodeRefs.ts](../../../packages/@dvt/artifacts/src/compiledCode/attachCompiledCodeRefs.ts),
  [packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts](../../../packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts),
  [packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts](../../../packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts)
- Key tests:
  [packages/@dvt/contracts/test/compiled-code-ref.contract.test.ts](../../../packages/@dvt/contracts/test/compiled-code-ref.contract.test.ts),
  [packages/@dvt/planner/test/compiledCode/attachCompiledCodeRefs.test.ts](../../../packages/@dvt/planner/test/compiledCode/attachCompiledCodeRefs.test.ts),
  [packages/@dvt/traceability-service/test/lineage/compiledCodeRef.test.ts](../../../packages/@dvt/traceability-service/test/lineage/compiledCodeRef.test.ts),
  [packages/@dvt/traceability-service/test/lineage/CachedRetryCompiledCodeResolver.test.ts](../../../packages/@dvt/traceability-service/test/lineage/CachedRetryCompiledCodeResolver.test.ts),
  [packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.test.ts](../../../packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.test.ts)
- Evidence:
  [ED-20260304 - compiledCodeRef ownership](../../evidence/critical/ED-20260304-compiledcoderef-ownership.md)
- Verification:
  `pnpm --filter @dvt/contracts test`
  and
  `pnpm --filter @dvt/planner test`
  and
  `pnpm --filter @dvt/adapter-temporal test`
  and
  `pnpm --filter @dvt/traceability-service test`

### Planner typed graph-source boundary

- Canonical spec:
  [Planner Contracts](../../contracts/planner/index.md)
  and
  [ADR-0035](../../adr/ADR-0035-planner-public-contract-evolution-protocol.md)
- Target design references:
  [GenericGraphSource Technical Manual](../../guides/generic-graph-source-technical-manual-20260404.md)
  and
  [GenericGraphSource User Manual](../../guides/generic-graph-source-user-manual-20260404.md)
  and
  [MW-A2 GenericGraphSource plan](../proposals/mandatory/runtime-and-contracts/mw-a2-generic-graph-source-plan-20260404.md)
- Current status source:
  [Planner Current State Assessment](./planner-current-state-assessment.md)
  and
  [System Delivery Status](../../architecture/system-delivery-status.md)
- Status:
  `R2` closed `2026-03-20`; follow-up hard-cut remediation landed
  `2026-04-10`. `graphSource` / `GenericGraphSourceV1` is now the only
  canonical planner ingress. `manifestRef`, raw `manifest`, and direct `nodes`
  are rejected at the planner-backed runtime boundary and at the canonical
  planner contract boundary. `MW-A2` remains the design lineage for the
  generic graph-source model, not a live compatibility posture.
- Primary code:
  [packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts](../../../packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts),
  [packages/@dvt/contracts/src/schemas.ts](../../../packages/@dvt/contracts/src/schemas.ts),
  [packages/@dvt/planner/src/application/PlannerFacade.ts](../../../packages/@dvt/planner/src/application/PlannerFacade.ts),
  [apps/api/src/application/services/resolveCanonicalPlannerInputEnvelope.ts](../../../apps/api/src/application/services/resolveCanonicalPlannerInputEnvelope.ts),
  [apps/api/src/entrypoints/http/planRoutePlanSourcePolicy.ts](../../../apps/api/src/entrypoints/http/planRoutePlanSourcePolicy.ts),
  [packages/@dvt/planner/src/domain/InputEnvelopeValidator.ts](../../../packages/@dvt/planner/src/domain/InputEnvelopeValidator.ts),
  [packages/@dvt/planner/src/domain/Planner.ts](../../../packages/@dvt/planner/src/domain/Planner.ts),
  [apps/api/src/infrastructure/planner/ManifestArtifactResolver.ts](../../../apps/api/src/infrastructure/planner/ManifestArtifactResolver.ts)
- Key tests:
  [packages/@dvt/contracts/test/planner.contract.test.ts](../../../packages/@dvt/contracts/test/planner.contract.test.ts),
  [packages/@dvt/contracts/test/schema-sync.test.ts](../../../packages/@dvt/contracts/test/schema-sync.test.ts),
  [packages/@dvt/planner/test/unit/planner-facade.test.ts](../../../packages/@dvt/planner/test/unit/planner-facade.test.ts),
  [packages/@dvt/contracts/test/validation.test.ts](../../../packages/@dvt/contracts/test/validation.test.ts),
  [apps/api/test/entrypoints/http/planRoutePlanSourcePolicy.test.ts](../../../apps/api/test/entrypoints/http/planRoutePlanSourcePolicy.test.ts),
  [apps/api/test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts](../../../apps/api/test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts),
  [apps/api/test/entrypoints/http/compilePlanRoute.test.ts](../../../apps/api/test/entrypoints/http/compilePlanRoute.test.ts),
  [apps/api/test/infrastructure/planner/ManifestArtifactResolver.test.ts](../../../apps/api/test/infrastructure/planner/ManifestArtifactResolver.test.ts)
- Evidence:
  [ED-20260410 - Hard-cut planner-backed runtime ingress to canonical graphSource](../../evidence/ED-20260410-planner-hard-cut-boundary-remediation.md)
- Verification:
  `pnpm --filter @dvt/contracts build`
  and
  `pnpm --filter @dvt/contracts test`
  and
  `pnpm --filter @dvt/planner build`
  and
  `pnpm --filter @dvt/planner test`
  and
  `pnpm --filter dvt-api typecheck`
  and
  `pnpm --filter dvt-api test`
  and
  `pnpm validate:contracts`

### Step type registry and step config hardening

- Canonical source today:
  [ADR-0032](../../adr/ADR-0032-compiledcoderef-ownership.md)
  for the current `compiledCodeRef` carve-out inside opaque `stepTypeConfig`
- Current status source:
  [System Delivery Status](../../architecture/system-delivery-status.md)
- G9 status: **Closed 2026-03-14**
- Evidence:
  [ED-20260314 - G9 Step Type Registry Closeout](../../evidence/critical/ED-20260314-g9-step-type-registry-closeout.md)
- Primary code:
  [packages/@dvt/contracts/src/step-registry/StepTypeRegistry.ts](../../../packages/@dvt/contracts/src/step-registry/StepTypeRegistry.ts)
  and
  [packages/@dvt/planner/src/domain/stepFactory/dbtStepFactory.ts](../../../packages/@dvt/planner/src/domain/stepFactory/dbtStepFactory.ts)
  and
  [packages/@dvt/planner/src/domain/Planner.ts](../../../packages/@dvt/planner/src/domain/Planner.ts)
  and
  [packages/@dvt/adapter-temporal/src/workflows/workflowArtifactHelpers.ts](../../../packages/@dvt/adapter-temporal/src/workflows/workflowArtifactHelpers.ts)
- Design note:
  `stepTypeConfig` remains `Record<string, unknown>` in
  [ExecutionPlan.v1.ts](../../../packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts)
  and
  [schemas.ts](../../../packages/@dvt/contracts/src/schemas.ts)
  **by design** - extensibility requires the shared contract to stay open.
  Per-kind enforcement is at the Planner (build-time via `IStepTypeRegistry`) and each
  adapter (consumption-time via `DbtStepTypeConfigSchema`). Prohowting to a discriminated
  union would require an ADR contract review, not a G9 follow-up.
- Key tests:
  [packages/@dvt/contracts/test/step-registry.test.ts](../../../packages/@dvt/contracts/test/step-registry.test.ts)
  and
  [packages/@dvt/planner/test/unit/step-registry-integration.test.ts](../../../packages/@dvt/planner/test/unit/step-registry-integration.test.ts)
  and
  [packages/@dvt/adapter-temporal/test/workflow-compiled-code-ref.test.ts](../../../packages/@dvt/adapter-temporal/test/workflow-compiled-code-ref.test.ts)
- Verification:
  `pnpm --filter @dvt/contracts test` (32/32)
  and
  `pnpm --filter @dvt/planner test` (37/37)
  and
  `pnpm --filter @dvt/adapter-temporal test` (87/87)

### OpenLineage mapping and delivery debt

- Canonical source today:
  [G6 OpenLineage CI and Schema Pin Plan](../archive/gaps/g6/G6-OPENLINEAGE-CI-SCHEMA-PIN-PLAN.md)
  for package hardening scope,
  [Traceability Contracts](../../contracts/traceability/index.md)
  for the normative emitted facet artifacts,
  and
  [System Delivery Status](../../architecture/system-delivery-status.md)
  for current delivery/runtime posture
- Current status source:
  [System Delivery Status](../../architecture/system-delivery-status.md)
- Primary code:
  [packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts](../../../packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts)
  and
  [packages/@dvt/traceability-service/src/lineage/resolver/CachedRetryCompiledCodeResolver.ts](../../../packages/@dvt/traceability-service/src/lineage/resolver/CachedRetryCompiledCodeResolver.ts)
- Key tests:
  [packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.test.ts](../../../packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.test.ts)
  and
  [packages/@dvt/traceability-service/test/lineage/CachedRetryCompiledCodeResolver.test.ts](../../../packages/@dvt/traceability-service/test/lineage/CachedRetryCompiledCodeResolver.test.ts)
- Evidence:
  [ED-20260308 - G6 US-G6.1 facet contract surface](../../evidence/critical/ED-20260308-g6-us-g6-1-facet-contract-surface.md)
  and
  [ED-20260308 - G6 US-G6.2 lineage contract artifacts](../../evidence/critical/ED-20260308-g6-us-g6-2-lineage-contract-artifacts.md)
- Verification:
  `pnpm --filter @dvt/traceability-service test`
  and
  `pnpm traceability:adr0`

### API auth and runtime boundary

- Canonical spec:
  [G8 Real Auth Final Spec](../archive/gaps/G8-REAL-AUTH-FINAL-SPEC.md)
- Current status source:
  [System Delivery Status](../../architecture/system-delivery-status.md) (`G8`)
- Current posture:
  G8 is **Closed** and the protected runtime command/query surface now has a
  dedicated OIDC plus PostgreSQL integration lane.
  The active local component guides for the `start-run` slice are:
  `apps/api/docs/start-run-http-entrypoint-component.md`,
  `apps/api/docs/start-run-control-boundary-component.md`,
  `apps/api/docs/start-run-platform-identity-component.md`,
  `apps/api/docs/start-run-application-component.md`,
  `apps/api/docs/start-run-execution-capacity-admission-component.md`,
  and
  `apps/api/docs/start-run-admission-observability-component.md`.
- Primary code:
  [apps/api/src/app.ts](../../../apps/api/src/app.ts),
  [apps/api/src/application/services/WorkflowEngineFactory.ts](../../../apps/api/src/application/services/WorkflowEngineFactory.ts),
  [apps/api/src/application/services/BackpressureAwareStartRunUseCase.ts](../../../apps/api/src/application/services/BackpressureAwareStartRunUseCase.ts),
  [apps/api/src/modules/buildProtectedRuntimeModule.ts](../../../apps/api/src/modules/buildProtectedRuntimeModule.ts),
  [apps/api/src/modules/startRun/buildProtectedStartRunRuntime.ts](../../../apps/api/src/modules/startRun/buildProtectedStartRunRuntime.ts),
  [apps/api/src/entrypoints/http/startRunRoute.ts](../../../apps/api/src/entrypoints/http/startRunRoute.ts),
  [apps/api/src/entrypoints/http/listRunsRoute.ts](../../../apps/api/src/entrypoints/http/listRunsRoute.ts),
  [apps/api/src/entrypoints/http/getRunRoute.ts](../../../apps/api/src/entrypoints/http/getRunRoute.ts),
  [apps/api/src/entrypoints/http/getRunEventsRoute.ts](../../../apps/api/src/entrypoints/http/getRunEventsRoute.ts),
  [apps/api/src/entrypoints/http/signalRunRoute.ts](../../../apps/api/src/entrypoints/http/signalRunRoute.ts),
  [apps/api/src/infrastructure/backpressure/RawSqlBackpressureStore.ts](../../../apps/api/src/infrastructure/backpressure/RawSqlBackpressureStore.ts),
  [apps/api/src/infrastructure/backpressure/CachedBackpressureStore.ts](../../../apps/api/src/infrastructure/backpressure/CachedBackpressureStore.ts),
  [apps/api/src/infrastructure/backpressure/CircuitBreakingBackpressureStore.ts](../../../apps/api/src/infrastructure/backpressure/CircuitBreakingBackpressureStore.ts),
  [apps/api/src/infrastructure/backpressure/FileBackpressureFallbackStore.ts](../../../apps/api/src/infrastructure/backpressure/FileBackpressureFallbackStore.ts),
  [apps/api/src/infrastructure/auth/oidcAuthenticator.ts](../../../apps/api/src/infrastructure/auth/oidcAuthenticator.ts),
  [apps/api/src/infrastructure/auth/jwksJwtVerifier.ts](../../../apps/api/src/infrastructure/auth/jwksJwtVerifier.ts),
  [apps/api/src/infrastructure/auth/postgresPrincipalAccessRepository.ts](../../../apps/api/src/infrastructure/auth/postgresPrincipalAccessRepository.ts)
- Key tests:
  [apps/api/test/app.test.ts](../../../apps/api/test/app.test.ts),
  [apps/api/test/app/healthReadiness.test.ts](../../../apps/api/test/app/healthReadiness.test.ts),
  [apps/api/test/app/protectedRuntimeComposition.test.ts](../../../apps/api/test/app/protectedRuntimeComposition.test.ts),
  [apps/api/test/app/protectedRouteMounting.test.ts](../../../apps/api/test/app/protectedRouteMounting.test.ts),
  [apps/api/test/application/services/BackpressureAwareStartRunUseCase.admissionModes.test.ts](../../../apps/api/test/application/services/BackpressureAwareStartRunUseCase.admissionModes.test.ts),
  [apps/api/test/application/services/BackpressureAwareStartRunUseCase.duplicateFlow.test.ts](../../../apps/api/test/application/services/BackpressureAwareStartRunUseCase.duplicateFlow.test.ts),
  [apps/api/test/application/services/BackpressureAwareStartRunUseCase.executionCapacity.test.ts](../../../apps/api/test/application/services/BackpressureAwareStartRunUseCase.executionCapacity.test.ts),
  [apps/api/test/application/services/startRunApplicationComponent.architecture.test.ts](../../../apps/api/test/application/services/startRunApplicationComponent.architecture.test.ts),
  [apps/api/test/application/services/WorkflowEngineFactory.test.ts](../../../apps/api/test/application/services/WorkflowEngineFactory.test.ts),
  [apps/api/test/entrypoints/http/startRunHttpEntrypointComponent.architecture.test.ts](../../../apps/api/test/entrypoints/http/startRunHttpEntrypointComponent.architecture.test.ts),
  [apps/api/test/entrypoints/http/startRunRoute.validation.test.ts](../../../apps/api/test/entrypoints/http/startRunRoute.validation.test.ts),
  [apps/api/test/entrypoints/http/startRunRoute.planSourcePolicy.test.ts](../../../apps/api/test/entrypoints/http/startRunRoute.planSourcePolicy.test.ts),
  [apps/api/test/entrypoints/http/startRunRoute.authAndSuccess.test.ts](../../../apps/api/test/entrypoints/http/startRunRoute.authAndSuccess.test.ts),
  [apps/api/test/entrypoints/http/startRunRoute.engineErrorTranslation.test.ts](../../../apps/api/test/entrypoints/http/startRunRoute.engineErrorTranslation.test.ts),
  [apps/api/test/entrypoints/http/listRunsRoute.test.ts](../../../apps/api/test/entrypoints/http/listRunsRoute.test.ts),
  [apps/api/test/entrypoints/http/getRunRoute.test.ts](../../../apps/api/test/entrypoints/http/getRunRoute.test.ts),
  [apps/api/test/entrypoints/http/getRunEventsRoute.test.ts](../../../apps/api/test/entrypoints/http/getRunEventsRoute.test.ts),
  [apps/api/test/entrypoints/http/signalRunRoute.test.ts](../../../apps/api/test/entrypoints/http/signalRunRoute.test.ts),
  [apps/api/test/infrastructure/backpressure/RawSqlBackpressureStore.test.ts](../../../apps/api/test/infrastructure/backpressure/RawSqlBackpressureStore.test.ts),
  [apps/api/test/infrastructure/backpressure/CachedBackpressureStore.test.ts](../../../apps/api/test/infrastructure/backpressure/CachedBackpressureStore.test.ts),
  [apps/api/test/infrastructure/backpressure/CircuitBreakingBackpressureStore.test.ts](../../../apps/api/test/infrastructure/backpressure/CircuitBreakingBackpressureStore.test.ts),
  [apps/api/test/infrastructure/auth/postgresPrincipalAccessRepository.test.ts](../../../apps/api/test/infrastructure/auth/postgresPrincipalAccessRepository.test.ts),
  [apps/api/test/integration/protectedRuntime.integration.test.ts](../../../apps/api/test/integration/protectedRuntime.integration.test.ts)
- Evidence:
  [ED-20260320 - API runtime query integration](../../evidence/critical/ED-20260320-api-runtime-query-integration.md)
- Risk:
  [R-20260308 API auth runtime integration coverage](../../risk-register/quality/R-20260308-api-auth-runtime-integration-coverage.md)
- Verification:
  `pnpm --filter dvt-api typecheck`
  and
  `pnpm --filter dvt-api test`
  and
  `pnpm --filter dvt-api test:integration`

### Workspace graph authoring draft persistence

- Canonical spec:
  [Workspace authoring draft aggregate](../../architecture/components/planner/workspace-authoring-draft-aggregate.md)
  and
  [Execution selection component](../../architecture/components/planner/execution-selection-component.md)
  and
  [Executable subgraph derivation component](../../architecture/components/planner/executable-subgraph-derivation-component.md)
  and
  [Workspace graph draft persistence v1](../../contracts/planner/workspace-graph-draft-persistence-v1.md)
  and
  [Execution selection and executable subgraph v1](../../contracts/planner/execution-selection-and-executable-subgraph-v1.md)
  and
  [Workspace graph draft application component](../../../apps/api/docs/workspace-graph-draft-application-component.md)
- Planning context:
  [TF-A2 workspace authoring draft aggregate roots plan](../proposals/mandatory/runtime-and-contracts/tf-a2-workspace-authoring-draft-aggregate-roots-plan-20260423.md)
  and
  [TF-A2-C execution selection and executable subgraph plan](../proposals/mandatory/runtime-and-contracts/tf-a2-c-execution-selection-and-executable-subgraph-plan-20260423.md)
  and
  [TF-E2 Canvas empty authoring entrypoint design](../proposals/mandatory/frontend-and-ux/tf-e2-canvas-empty-authoring-entrypoint-design-20260422.md)
  and
  [TF-E2 Inspector authoring and lifecycle closure plan](../proposals/mandatory/frontend-and-ux/tf-e2-inspector-authoring-and-lifecycle-closure-plan-20260425.md)
  and
  [TF-E2 node and edge lifecycle closure plan](../proposals/mandatory/frontend-and-ux/tf-e2-node-and-edge-lifecycle-closure-plan-20260425.md)
- Primary code:
  [WorkspaceGraphAuthoringDraft.v1.ts](../../../packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphAuthoringDraft.v1.ts),
  [WorkspaceGraphAuthoringCommand.v1.ts](../../../packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphAuthoringCommand.v1.ts),
  [WorkspaceGraphDraft.v1.ts](../../../packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphDraft.v1.ts),
  [ExecutionSelection.v1.ts](../../../packages/@dvt/contracts/src/contracts/planner/ExecutionSelection.v1.ts),
  [ExecutableSubgraph.v1.ts](../../../packages/@dvt/contracts/src/contracts/planner/ExecutableSubgraph.v1.ts),
  [PlannerFacade.ts](../../../packages/@dvt/planner/src/application/PlannerFacade.ts),
  [ExecutableSubgraphDeriver.ts](../../../packages/@dvt/planner/src/application/ExecutableSubgraphDeriver.ts),
  [resolveAuthorizedExecutableSubgraph.ts](../../../apps/api/src/application/services/resolveAuthorizedExecutableSubgraph.ts),
  [PreviewPlanUseCase.ts](../../../apps/api/src/application/services/PreviewPlanUseCase.ts),
  [PlannerBackedStartRunUseCase.ts](../../../apps/api/src/application/services/PlannerBackedStartRunUseCase.ts),
  [workspaceGraphDraft.ts](../../../apps/api/src/application/ports/workspaceGraphDraft.ts),
  [getWorkspaceGraphDraftUseCase.ts](../../../apps/api/src/application/services/getWorkspaceGraphDraftUseCase.ts),
  [saveWorkspaceGraphDraftUseCase.ts](../../../apps/api/src/application/services/saveWorkspaceGraphDraftUseCase.ts),
  [workspaceGraphDraftAuthoring.ts](../../../apps/web/src/app/ports/workspaceGraphDraftAuthoring.ts),
  [workspaceGraphDraftProjection.ts](../../../apps/web/src/app/services/workspace/workspaceGraphDraftProjection.ts),
  [protectedRuntimeRejection.ts](../../../apps/web/src/app/services/api/protectedRuntimeRejection.ts),
  [plansService.api.ts](../../../apps/web/src/app/services/plans/plansService.api.ts),
  [runsService.api.ts](../../../apps/web/src/app/services/runs/runsService.api.ts),
  [canvasRunSelection.ts](../../../apps/web/src/app/views/canvas/canvasRunSelection.ts),
  [canvasPlanAction.ts](../../../apps/web/src/app/views/canvas/canvasPlanAction.ts),
  [canvasRunStartAction.ts](../../../apps/web/src/app/views/canvas/canvasRunStartAction.ts),
  [canvasInspectorAuthoring.types.ts](../../../apps/web/src/app/views/canvas/canvasInspectorAuthoring.types.ts),
  [canvasInspectorAuthoringModel.ts](../../../apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts),
  [canvasInspectorAuthoringCommand.ts](../../../apps/web/src/app/views/canvas/canvasInspectorAuthoringCommand.ts),
  [useCanvasInspectorCommands.ts](../../../apps/web/src/app/views/canvas/useCanvasInspectorCommands.ts),
  [CanvasInspectorPanel.tsx](../../../apps/web/src/app/views/canvas/CanvasInspectorPanel.tsx),
  [CanvasInspectorAuthoringSection.tsx](../../../apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx),
  [canvasDuplicateNodeCommand.ts](../../../apps/web/src/app/views/canvas/canvasDuplicateNodeCommand.ts),
  [useCanvasNodeDuplicateHandlers.ts](../../../apps/web/src/app/views/canvas/useCanvasNodeDuplicateHandlers.ts),
  [canvasConnectionAggregate.ts](../../../apps/web/src/app/views/canvas/canvasConnectionAggregate.ts),
  [useCanvasEdgeAuthoringHandlers.ts](../../../apps/web/src/app/views/canvas/useCanvasEdgeAuthoringHandlers.ts),
  [canvasDraftSessionWorkingSet.ts](../../../apps/web/src/app/views/canvas/canvasDraftSessionWorkingSet.ts),
  [canvasAuthoringGraphProjection.ts](../../../apps/web/src/app/views/canvas/canvasAuthoringGraphProjection.ts),
  [useCanvasViewportGraphModel.ts](../../../apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts),
  [app.ts](../../../apps/api/src/app.ts),
  [planCompileBoundary.ts](../../../apps/api/src/modules/planCompileBoundary.ts),
  [canvas-preview-run-persisted.cy.ts](../../../apps/web/cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts),
  [canvas-preview-run-live.cy.ts](../../../apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts),
  [e2eApiStub.ts](../../../apps/web/cypress/support/e2eApiStub.ts),
  [canvasDraftAuthoring.ts](../../../apps/web/cypress/support/canvasDraftAuthoring.ts),
  [canvasExecutionSelection.ts](../../../apps/web/cypress/support/canvasExecutionSelection.ts),
  [canvasPreviewArtifacts.ts](../../../apps/web/cypress/support/canvasPreviewArtifacts.ts),
  [liveProtectedRuntime.ts](../../../apps/web/cypress/support/liveProtectedRuntime.ts),
  [run-selected-closure-live-proof.cjs](../../../scripts/run-selected-closure-live-proof.cjs),
  and
  [workspaceSession.ts](../../../apps/web/cypress/support/workspaceSession.ts)
- Key tests:
  [execution-selection.contract.test.ts](../../../packages/@dvt/contracts/test/execution-selection.contract.test.ts),
  [execution-selection.architecture.test.ts](../../../packages/@dvt/contracts/test/execution-selection.architecture.test.ts),
  [executable-subgraph-deriver.test.ts](../../../packages/@dvt/planner/test/unit/executable-subgraph-deriver.test.ts),
  [executable-subgraph-deriver.architecture.test.ts](../../../packages/@dvt/planner/test/unit/executable-subgraph-deriver.architecture.test.ts),
  [workspace-graph-authoring-draft.contract.test.ts](../../../packages/@dvt/contracts/test/workspace-graph-authoring-draft.contract.test.ts),
  [workspace-graph-authoring-draft.architecture.test.ts](../../../packages/@dvt/contracts/test/workspace-graph-authoring-draft.architecture.test.ts),
  [execution-selection.ts](../../../packages/@dvt/contracts/test/validation/execution-selection.ts),
  [workspace-graph-draft.ts](../../../packages/@dvt/contracts/test/validation/workspace-graph-draft.ts),
  [workspaceGraphDraftApplicationComponent.architecture.test.ts](../../../apps/api/test/application/services/workspaceGraphDraftApplicationComponent.architecture.test.ts),
  [resolveAuthorizedExecutableSubgraph.test.ts](../../../apps/api/test/application/services/resolveAuthorizedExecutableSubgraph.test.ts),
  [executableSubgraphResolutionComponent.architecture.test.ts](../../../apps/api/test/application/services/executableSubgraphResolutionComponent.architecture.test.ts),
  [workspaceGraphDraftRoutes.test.ts](../../../apps/api/test/entrypoints/http/workspaceGraphDraftRoutes.test.ts),
  [protectedRuntime.integration.test.ts](../../../apps/api/test/integration/protectedRuntime.integration.test.ts),
  [planCompileBoundary.cases.ts](../../../apps/api/test/modules/planCompileBoundary.cases.ts),
  [protectedRuntimeAndPlanCompileArchitecture.cases.ts](../../../apps/api/test/modules/protectedRuntimeAndPlanCompileArchitecture.cases.ts),
  [canvasExecutionSelection.architecture.test.ts](../../../apps/web/src/app/views/canvas/canvasExecutionSelection.architecture.test.ts),
  [canvasRunStartIdentity.architecture.test.ts](../../../apps/web/src/app/views/canvas/canvasRunStartIdentity.architecture.test.ts),
  [canvasInspectorAuthoringModel.test.ts](../../../apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts),
  [canvasInspectorAuthoringComponent.architecture.test.ts](../../../apps/web/src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts),
  [CanvasInspectorPanel.test.tsx](../../../apps/web/src/app/views/canvas/CanvasInspectorPanel.test.tsx),
  [canvasDuplicateNodeCommand.test.ts](../../../apps/web/src/app/views/canvas/canvasDuplicateNodeCommand.test.ts),
  [useCanvasGraphHandlers.nodeDuplicate.test.tsx](../../../apps/web/src/app/views/canvas/useCanvasGraphHandlers.nodeDuplicate.test.tsx),
  [canvasConnectionAggregate.test.ts](../../../apps/web/src/app/views/canvas/canvasConnectionAggregate.test.ts),
  [useCanvasGraphHandlers.edgeReconnect.test.tsx](../../../apps/web/src/app/views/canvas/useCanvasGraphHandlers.edgeReconnect.test.tsx),
  [canvasAuthoringGraphProjection.test.ts](../../../apps/web/src/app/views/canvas/canvasAuthoringGraphProjection.test.ts),
  [canvasDraftSession.test.ts](../../../apps/web/src/app/views/canvas/canvasDraftSession.test.ts),
  [useCanvasViewportGraphModel.test.tsx](../../../apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx),
  [useCanvasController.core.test.tsx](../../../apps/web/src/app/views/canvas/useCanvasController.core.test.tsx),
  [useCanvasExecutionActions.planPreview.core.test.tsx](../../../apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.core.test.tsx),
  [useCanvasExecutionActions.runStart.test.tsx](../../../apps/web/src/app/views/canvas/useCanvasExecutionActions.runStart.test.tsx),
  [plansService.test.ts](../../../apps/web/src/app/services/plans/plansService.test.ts),
  [runsService.test.ts](../../../apps/web/src/app/services/runs/runsService.test.ts),
  [canvas-preview-run-persisted.cy.ts](../../../apps/web/cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts),
  [canvas-preview-run-live.cy.ts](../../../apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts),
  and
  [workspaceGraphDraftProjection.test.ts](../../../apps/web/src/app/services/workspace/workspaceGraphDraftProjection.test.ts)
- Evidence:
  [ed-20260423-tf-a2-c1-execution-selection-contract-pack.md](../../evidence/ed-20260423-tf-a2-c1-execution-selection-contract-pack.md)
  and
  [ed-20260423-tf-a2-c2-executable-subgraph-derivation.md](../../evidence/ed-20260423-tf-a2-c2-executable-subgraph-derivation.md)
  and
  [ed-20260423-tf-a2-c3-c4-api-web-adoption.md](../../evidence/ed-20260423-tf-a2-c3-c4-api-web-adoption.md)
  and
  [20260423 TF-A2-C5 selected-closure end-to-end proof closeout](../closeouts/20260423-tf-a2-c5-selected-closure-end-to-end-proof-closeout.md)
  and
  [20260425 TF-E2-B/C node and edge lifecycle closure closeout](../closeouts/20260425-tf-e2-b-c-node-edge-lifecycle-closure-closeout.md)
  and
  [20260425 TF-E2-D Inspector authoring closeout](../closeouts/20260425-tf-e2-d-inspector-authoring-closeout.md)
  and
  [20260424 TF-E2-E-A/B/C selected-closure browser proof closeout](../closeouts/20260424-tf-e2-e-a-b-c-selected-closure-browser-proof-closeout.md)
  and
  [20260424 TF-E2-E-D live selected-closure browser proof closeout](../closeouts/20260424-tf-e2-e-d-live-selected-closure-browser-proof-closeout.md)
  and
  [R-20260423-WORKSPACE-AUTHORING-DRAFT-AGGREGATE](../../risk-register/quality/R-20260423-WORKSPACE-AUTHORING-DRAFT-AGGREGATE.yaml)
- Verification:
  `pnpm --filter @dvt/planner test -- executable-subgraph-deriver.test.ts executable-subgraph-deriver.architecture.test.ts`
  and
  `pnpm --filter @dvt/planner build`
  and
  `pnpm --filter @dvt/contracts test -- execution-selection.contract.test.ts execution-selection.architecture.test.ts workspace-graph-authoring-draft.contract.test.ts workspace-graph-authoring-draft.architecture.test.ts validation.test.ts`
  and
  `pnpm --filter @dvt/contracts build`
  and
  `pnpm --filter dvt-api test -- authorizeWorkspaceGraphDraftCapabilityService.test.ts workspaceGraphDraftApplicationComponent.architecture.test.ts workspaceGraphDraftRoutes.test.ts resolveAuthorizedExecutableSubgraph.test.ts executableSubgraphResolutionComponent.architecture.test.ts`
  and
  `pnpm --filter @dvt/web test -- src/app/views/canvas/canvasExecutionSelection.architecture.test.ts src/app/views/canvas/canvasRunStartIdentity.architecture.test.ts src/app/views/canvas/useCanvasExecutionActions.planPreview.core.test.tsx src/app/views/canvas/useCanvasExecutionActions.runStart.test.tsx`
  and
  `pnpm --filter @dvt/web test -- src/app/services/plans/plansService.test.ts src/app/services/runs/runsService.test.ts`
  and
  `docker run --rm -t -v "F:/segundodvt/dvt:/repo" -w /repo/apps/web -e CYPRESS_baseUrl=http://host.docker.internal:4173 cypress/included:13.17.0 --project /repo/apps/web --config-file /repo/apps/web/cypress.config.ts --spec /repo/apps/web/cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts`
  and
  `pnpm --filter @dvt/web test:e2e:selected-closure:live`
  and
  `pnpm --filter dvt-api test -- test/modules.test.ts`
  and
  `pnpm --filter @dvt/web test -- src/app/services/workspace/workspaceGraphDraftProjection.test.ts`
  and
  `pnpm --filter dvt-api test:integration -- protectedRuntime.integration.test.ts`

### Web frontend shell and client routing

- Canonical spec:
  [web component](../../architecture/components/web/index.md)
  and
  [Read subsystem](../../architecture/system/subsystems/read/index.md)
  and
  [Frontend runtime contract technical manual](../../architecture/components/web/runs/frontend-runtime-contract-technical-manual.md)
- Current status source:
  [System Delivery Status](../../architecture/system-delivery-status.md) (`Entry Layer`)
- Primary code:
  [apps/web/src/main.tsx](../../../apps/web/src/main.tsx),
  [apps/web/src/app/App.tsx](../../../apps/web/src/app/App.tsx),
  [apps/web/src/app/routes.ts](../../../apps/web/src/app/routes.ts),
  [apps/web/src/app/components/TopAppBar.tsx](../../../apps/web/src/app/components/TopAppBar.tsx)
- Current test posture:
  The workspace exposes package-level unit/integration tests (`vitest`) plus a
  browser E2E lane (`Cypress`) for frontend-to-runtime contract checks.
- Key tests:
  [apps/web/src/capabilities/platform-health/application/platformHealthCapability.test.ts](../../../apps/web/src/capabilities/platform-health/application/platformHealthCapability.test.ts),
  [apps/web/src/capabilities/platform-health/infrastructure/httpPlatformHealthClient.test.ts](../../../apps/web/src/capabilities/platform-health/infrastructure/httpPlatformHealthClient.test.ts),
  [apps/web/src/app/views/canvas/useCanvasController.core.test.tsx](../../../apps/web/src/app/views/canvas/useCanvasController.core.test.tsx),
  [apps/web/src/app/views/canvas/useCanvasController.negative.test.tsx](../../../apps/web/src/app/views/canvas/useCanvasController.negative.test.tsx),
  [apps/web/src/app/views/canvas/useCanvasController.persistence.test.tsx](../../../apps/web/src/app/views/canvas/useCanvasController.persistence.test.tsx),
  [apps/web/src/app/views/runs/RunStates.test.tsx](../../../apps/web/src/app/views/runs/RunStates.test.tsx),
  [apps/web/cypress/e2e/runs/runs-runtime-contract.cy.ts](../../../apps/web/cypress/e2e/runs/runs-runtime-contract.cy.ts)
- Verification:
  `pnpm --filter @dvt/web test`
  and
  `pnpm --filter @dvt/web typecheck`
  and
  `pnpm --filter @dvt/web build`
  and
  `pnpm --filter @dvt/web test:e2e`
- Gap:
  Mock-data paths still dominate the client surface via
  [apps/web/src/app/data/mockData.ts](../../../apps/web/src/app/data/mockData.ts)
  and
  [apps/web/src/app/data/mockDbtData.ts](../../../apps/web/src/app/data/mockDbtData.ts)

### Plan integrity and compatibility verification

- Canonical spec:
  [ADR-0012](../../adr/ADR-0012-plan-integrity-ownership.md)
  and
  [ADR-0017](../../adr/ADR-0017_ExecutionPlan_Schema_Versioning.md)
- Current status source:
  [System Delivery Status](../../architecture/system-delivery-status.md) (`Plan Verifier`)
- Primary code:
  [packages/@dvt/engine/src/application/StartRunApplicationService.ts](../../../packages/@dvt/engine/src/application/StartRunApplicationService.ts)
  and
  [packages/@dvt/engine/src/security/planIntegrity.ts](../../../packages/@dvt/engine/src/security/planIntegrity.ts)
  and
  [packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts](../../../packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts)
  and
  [apps/api/src/application/services/WorkflowEngineFactory.ts](../../../apps/api/src/application/services/WorkflowEngineFactory.ts)
  and
  [packages/@dvt/plan-verifier/src/verify.ts](../../../packages/@dvt/plan-verifier/src/verify.ts)
  and
  [packages/@dvt/plan-verifier/src/planVersion.ts](../../../packages/@dvt/plan-verifier/src/planVersion.ts)
- Key tests:
  [packages/@dvt/engine/test/contracts/engine.test.ts](../../../packages/@dvt/engine/test/contracts/engine.test.ts)
  and
  [packages/@dvt/engine/test/services/StartRunApplicationService.test.ts](../../../packages/@dvt/engine/test/services/StartRunApplicationService.test.ts)
  and
  [packages/@dvt/adapter-temporal/test/activities.test.ts](../../../packages/@dvt/adapter-temporal/test/activities.test.ts)
  and
  [apps/api/test/integration/plannerEngineContract.test.ts](../../../apps/api/test/integration/plannerEngineContract.test.ts)
  and
  [packages/@dvt/plan-verifier/test/verify.test.ts](../../../packages/@dvt/plan-verifier/test/verify.test.ts)
- Verification:
  `pnpm --filter @dvt/engine test`
  and
  `pnpm --filter @dvt/adapter-temporal test`
  and
  `pnpm --filter dvt-api test`
  and
  `pnpm --filter @dvt/plan-verifier test`

### Deterministic DAG interpretation

- Canonical spec:
  [Plan Interpreter Package](../../architecture/shared/plan-interpreter.md)
- Current status source:
  [Shared Package Architecture](../../architecture/shared/index.md)
- Primary code:
  [packages/@dvt/plan-interpreter/src/dagAnalyzer.ts](../../../packages/@dvt/plan-interpreter/src/dagAnalyzer.ts),
  [packages/@dvt/plan-interpreter/src/types.ts](../../../packages/@dvt/plan-interpreter/src/types.ts),
  [packages/@dvt/plan-interpreter/src/errors.ts](../../../packages/@dvt/plan-interpreter/src/errors.ts)
- Key tests:
  [packages/@dvt/plan-interpreter/test/dagAnalyzer.test.ts](../../../packages/@dvt/plan-interpreter/test/dagAnalyzer.test.ts)
  and
  [packages/@dvt/adapter-temporal/test/workflow-dag-scheduler.test.ts](../../../packages/@dvt/adapter-temporal/test/workflow-dag-scheduler.test.ts)
- Verification:
  `pnpm --filter @dvt/plan-interpreter test`

### Gateway DSL evaluator

- Canonical spec:
  [Gateway DSL Package](../../architecture/shared/dsl.md)
- Current status source:
  [Shared Package Architecture](../../architecture/shared/index.md)
- Primary code:
  [packages/@dvt/dsl/src/index.ts](../../../packages/@dvt/dsl/src/index.ts),
  [packages/@dvt/dsl/src/v1/ast.ts](../../../packages/@dvt/dsl/src/v1/ast.ts),
  [packages/@dvt/dsl/src/v1/parser.ts](../../../packages/@dvt/dsl/src/v1/parser.ts),
  [packages/@dvt/dsl/src/v1/evaluator.ts](../../../packages/@dvt/dsl/src/v1/evaluator.ts),
  [packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts](../../../packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts)
- Key tests:
  [packages/@dvt/dsl/test/dsl-v1.test.ts](../../../packages/@dvt/dsl/test/dsl-v1.test.ts)
- Risk:
  [R-20260307 workflow gateway context guard](../../risk-register/adapters/R-20260307-workflow-gateway-context-guard.md)
- Verification:
  `pnpm --filter @dvt/dsl test`
- Gap:
  publish an accepted DSL specification or explicitly replace the package with a
  different supported policy mechanism

### Observability contracts and cardinality policy

- Canonical spec:
  [Observability Guide](../../architecture/components/engine/ops/observability.md)
  and
  [Metrics Catalog](../../architecture/components/engine/ops/metrics-catalog.md)
- Current status source:
  [System Delivery Status](../../architecture/system-delivery-status.md)
- Primary code:
  [packages/@dvt/observability/src/contracts/IObservability.ts](../../../packages/@dvt/observability/src/contracts/IObservability.ts),
  [packages/@dvt/observability/src/contracts/ObservabilityContext.ts](../../../packages/@dvt/observability/src/contracts/ObservabilityContext.ts),
  [packages/@dvt/observability/src/policy/cardinalityPolicy.ts](../../../packages/@dvt/observability/src/policy/cardinalityPolicy.ts)
- Key tests:
  [packages/@dvt/observability/test/cardinalityPolicy.test.ts](../../../packages/@dvt/observability/test/cardinalityPolicy.test.ts)
- Verification:
  `pnpm --filter @dvt/observability test`

### OpenTelemetry observability binding

- Canonical source today:
  [Observability Guide](../../architecture/components/engine/ops/observability.md)
  for the operational model plus
  [@dvt/observability-otel README](../../../packages/@dvt/observability-otel/README.md)
  for package-local wiring notes
- Current status source:
  [System Delivery Status](../../architecture/system-delivery-status.md)
- Primary code:
  [packages/@dvt/observability-otel/src/OtelObservability.ts](../../../packages/@dvt/observability-otel/src/OtelObservability.ts)
- Key tests:
  [packages/@dvt/observability-otel/test/OtelObservability.test.ts](../../../packages/@dvt/observability-otel/test/OtelObservability.test.ts)
- Verification:
  `pnpm --filter @dvt/observability-otel test`
- Gap:
  production wiring is still scaffold-level and not validated as an accepted
  runtime baseline

### CLI validation surface

- Canonical spec:
  [CLI Package](../../architecture/shared/cli.md)
- Current status source:
  [Shared Package Architecture](../../architecture/shared/index.md)
  and
  [Generated Code State](./generated-code-state.md)
- Primary code:
  [packages/@dvt/cli/package.json](../../../packages/@dvt/cli/package.json),
  [packages/@dvt/cli/validate-contracts.cjs](../../../packages/@dvt/cli/validate-contracts.cjs),
  [packages/@dvt/cli/run-golden-paths.cjs](../../../packages/@dvt/cli/run-golden-paths.cjs),
  [packages/@dvt/cli/src/index.ts](../../../packages/@dvt/cli/src/index.ts)
- Key tests:
  [packages/@dvt/cli/test/smoke.test.ts](../../../packages/@dvt/cli/test/smoke.test.ts)
- Verification:
  `pnpm test:cli`
  and
  `pnpm --filter @dvt/cli validate-contracts`
- Gap:
  the workspace still exposes script entrypoints more than a real exported CLI
  command surface

### Canonicalization and hashing utilities

- Canonical spec:
  [Crypto Package](../../architecture/shared/crypto.md)
  and
  [ADR-0012](../../adr/ADR-0012-plan-integrity-ownership.md)
- Current status source:
  [Shared Package Architecture](../../architecture/shared/index.md)
- Primary code:
  [packages/@dvt/canonical/src/jcs.ts](../../../packages/@dvt/canonical/src/jcs.ts),
  [packages/@dvt/canonical/src/sha256.ts](../../../packages/@dvt/canonical/src/sha256.ts),
  [packages/@dvt/engine/src/utils/jcs.ts](../../../packages/@dvt/engine/src/utils/jcs.ts),
  [packages/@dvt/engine/src/utils/sha256.ts](../../../packages/@dvt/engine/src/utils/sha256.ts)
- Key tests:
  [packages/@dvt/canonical/test/canonical.test.ts](../../../packages/@dvt/canonical/test/canonical.test.ts)
- Verification:
  `pnpm --filter @dvt/crypto test`
- Gap:
  the workspace path (`packages/@dvt/canonical`) still does not match the
  package name (`@dvt/crypto`), so discoverability still depends on central docs

### Documentation governance and checks

- Canonical docs:
  [Testing and CI Capabilities](../../guides/testing-and-ci-capabilities.md)
  and
  [AI Work Protocol](../../guides/ai-work-protocol.md)
  and
  [Docs Markdown Governance Parser Component](../../guides/docs-markdown-governance-parser-component.md)
- Current status source:
  [Documentation Restructuring Diagnostic and Roadmap](../archive/proposals/documentation-restructuring-diagnostic-and-roadmap.md)
- Primary code:
  [scripts/sync-docs.cjs](../../../scripts/sync-docs.cjs),
  [scripts/docs-doctor.cjs](../../../scripts/docs-doctor.cjs),
  [scripts/docs-quality-check.cjs](../../../scripts/docs-quality-check.cjs),
  [scripts/docs-canonical-check.cjs](../../../scripts/docs-canonical-check.cjs),
  [tools/docs/lib/markdown.ts](../../../tools/docs/lib/markdown.ts),
  [tools/ci/arc-check.mjs](../../../tools/ci/arc-check.mjs),
  [tools/ci/doc-check.mjs](../../../tools/ci/doc-check.mjs)
- Key tests:
  [tools/ci/docs-markdown-component-architecture.test.mjs](../../../tools/ci/docs-markdown-component-architecture.test.mjs),
  [tools/ci/docs-frontmatter-bom.test.mjs](../../../tools/ci/docs-frontmatter-bom.test.mjs)
- Verification:
  `pnpm test:ci-tools`
  and
  `pnpm docs:ci`

## Minimum Traceability Tuple

For any active technical doc that governs code behavior, record at least this
tuple somewhere explicit:

- `canonical_spec`: the normative doc that defines behavior or invariants
- `status_doc`: the file that states current implementation or gap status
- `code_paths`: the main implementation files
- `test_paths`: the tests that prove the behavior
- `verification_cmd`: the command that should fail if the behavior regresses
- `evidence_or_risk`: the evidence doc or risk record when the change is
  high-impact

This tuple is the minimum manual format until frontmatter fields are
standardized repo-wide.
