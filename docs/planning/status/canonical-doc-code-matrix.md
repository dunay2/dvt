---
title: Canonical Doc Code Matrix
status: Active
owner: docs
last_reviewed: 2026-03-08
planning_type: status
---

# Canonical Doc Code Matrix

First manual traceability matrix for `T19`, `T20`, and `T22`.

This file is the curated counterpart to:

- [Generated Code State](generated-code-state.md)
- [Generated Spec Traceability](generated-spec-traceability.md)

Use it to answer three practical questions quickly:

1. Which document is the current source of truth for this topic?
2. Which code paths implement it?
3. Which tests and commands verify it?

## Topic Summary

| Topic                                         | Primary packages                                                                       | Canonical spec                                                                                                                                                                                  | Current status                                                                                                           |
| --------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Workflow engine core                          | `@dvt/contracts`, `@dvt/engine`                                                        | [IWorkflowEngine v1](../../architecture/engine/contracts/engine/IWorkflowEngine.v1.md), [ExecutionSemantics v1](../../architecture/engine/contracts/engine/ExecutionSemantics.v1.md)            | [System Delivery Status](../../architecture/system-delivery-status.md)                                                   |
| Temporal adapter runtime                      | `@dvt/adapter-temporal`                                                                | [TemporalAdapter Specification](../../architecture/engine/adapters/temporal/TemporalAdapter.spec.md), [Temporal Engine Policies](../../architecture/engine/adapters/temporal/EnginePolicies.md) | [Gap Execution Plans](../gaps/GAP_EXECUTION_PLANS.md)                                                                    |
| Postgres state store                          | `@dvt/adapter-postgres`, `@dvt/state-store`                                            | [Postgres State Store Adapter](../../architecture/engine/adapters/state-store/postgres/StateStoreAdapter.md)                                                                                    | [System Delivery Status](../../architecture/system-delivery-status.md)                                                   |
| Intent reconciler and pre-dispatch intent log | `@dvt/adapter-postgres`, `@dvt/engine`, `apps/api`                                     | [ADR-0030](../../adr/ADR-0030-pre-dispatch-intent-log.md), [G3 Task Specification](../gaps/G3-TASK-SPECIFICATION.md)                                                                            | [Gap Execution Plans](../gaps/GAP_EXECUTION_PLANS.md)                                                                    |
| Outbox worker runtime                         | `@dvt/engine`, `@dvt/adapter-postgres`                                                 | [Gap Execution Plans](../gaps/GAP_EXECUTION_PLANS.md)                                                                                                                                           | [System Delivery Status](../../architecture/system-delivery-status.md)                                                   |
| compiledCodeRef ownership                     | `@dvt/contracts`, `@dvt/planner`, `@dvt/adapter-temporal`, `@dvt/traceability-service` | [ADR-0032](../../adr/ADR-0032-compiledcoderef-ownership.md), [G4 Task Specification](../gaps/G4-TASK-SPECIFICATION.md)                                                                          | [Gap Execution Plans](../gaps/GAP_EXECUTION_PLANS.md)                                                                    |
| OpenLineage mapping and delivery debt         | `@dvt/traceability-service`                                                            | [Gap Execution Plans](../gaps/GAP_EXECUTION_PLANS.md)                                                                                                                                           | [System Delivery Status](../../architecture/system-delivery-status.md)                                                   |
| Documentation governance and checks           | `scripts/*`, `tools/ci/*`                                                              | [Testing and CI Capabilities](../../guides/testing-and-ci-capabilities.md), [Mandatory AI Workflow](../../guides/SISTEMA%20DE%20TRABAJO%20OBLIGATORIO%20PARA%20IA.md)                           | [Documentation Restructuring Diagnostic and Roadmap](../proposals/documentation-restructuring-diagnostic-and-roadmap.md) |

## Topic Details

### Workflow engine core

- Canonical spec:
  [IWorkflowEngine v1](../../architecture/engine/contracts/engine/IWorkflowEngine.v1.md)
  and
  [ExecutionSemantics v1](../../architecture/engine/contracts/engine/ExecutionSemantics.v1.md)
- Current status source:
  [System Delivery Status](../../architecture/system-delivery-status.md)
- Primary code:
  [packages/@dvt/contracts/src/contracts/engine/IWorkflowEngine.v1.ts](../../../packages/@dvt/contracts/src/contracts/engine/IWorkflowEngine.v1.ts)
  and
  [packages/@dvt/engine/src/core/WorkflowEngine.ts](../../../packages/@dvt/engine/src/core/WorkflowEngine.ts)
- Key tests:
  [packages/@dvt/engine/test/core/WorkflowEngine.test.ts](../../../packages/@dvt/engine/test/core/WorkflowEngine.test.ts),
  [packages/@dvt/engine/test/core/WorkflowEngine.intentLog.test.ts](../../../packages/@dvt/engine/test/core/WorkflowEngine.intentLog.test.ts),
  [packages/@dvt/engine/test/contracts/IWorkflowEngine.types.test.ts](../../../packages/@dvt/engine/test/contracts/IWorkflowEngine.types.test.ts)
- Verification:
  `pnpm test:engine`
  and
  `pnpm validate:contracts`

### Temporal adapter runtime

- Canonical spec:
  [TemporalAdapter Specification](../../architecture/engine/adapters/temporal/TemporalAdapter.spec.md)
  and
  [Temporal Engine Policies](../../architecture/engine/adapters/temporal/EnginePolicies.md)
- Current status source:
  [Gap Execution Plans](../gaps/GAP_EXECUTION_PLANS.md) (`G1`)
- Primary code:
  [packages/@dvt/adapter-temporal/src/TemporalAdapter.ts](../../../packages/@dvt/adapter-temporal/src/TemporalAdapter.ts)
  and
  [packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts](../../../packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts)
- Key tests:
  [packages/@dvt/adapter-temporal/test/TemporalAdapter.lookupRunRef.test.ts](../../../packages/@dvt/adapter-temporal/test/TemporalAdapter.lookupRunRef.test.ts),
  [packages/@dvt/adapter-temporal/test/TemporalWorkerHost.lifecycle.test.ts](../../../packages/@dvt/adapter-temporal/test/TemporalWorkerHost.lifecycle.test.ts),
  [packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts](../../../packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts)
- Evidence:
  [ED-20260304 - TemporalAdapter.lookupRunRef implementation](../../evidence/ED-20260304-temporal-lookup-run-ref.md)
  and
  [ED-20260308 - Temporal adapter operational close-out](../../evidence/ED-20260308-temporal-operational-close-out.md)
- Verification:
  `pnpm test:adapter-temporal`, `pnpm test:adapter-temporal:integration`

### Postgres state store

- Canonical spec:
  [Postgres State Store Adapter](../../architecture/engine/adapters/state-store/postgres/StateStoreAdapter.md)
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
  [G3 Task Specification](../gaps/G3-TASK-SPECIFICATION.md)
- Current status source:
  [Gap Execution Plans](../gaps/GAP_EXECUTION_PLANS.md) (`G3`)
- Primary code:
  [packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts](../../../packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts),
  [packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts](../../../packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts),
  [apps/api/src/runtime/intentReconcilerRuntime.ts](../../../apps/api/src/runtime/intentReconcilerRuntime.ts)
- Key tests:
  [packages/@dvt/adapter-postgres/test/PostgresStartRunIntentStore.test.ts](../../../packages/@dvt/adapter-postgres/test/PostgresStartRunIntentStore.test.ts)
  and
  [packages/@dvt/engine/test/workers/IntentReconcilerWorker.test.ts](../../../packages/@dvt/engine/test/workers/IntentReconcilerWorker.test.ts)
- Evidence:
  [ED-20260304 - G3 intent store Postgres reconciler](../../evidence/ED-20260304-g3-intentstore-postgres-reconciler.md)
- Verification:
  `pnpm test:adapter-postgres`
  and
  `pnpm test:engine`

### Outbox worker runtime

- Canonical source today:
  [Gap Execution Plans](../gaps/GAP_EXECUTION_PLANS.md) (`G5`)
  until a dedicated runtime/runbook spec exists
- Current status source:
  [System Delivery Status](../../architecture/system-delivery-status.md)
- Primary code:
  [packages/@dvt/engine/src/outbox/OutboxWorker.ts](../../../packages/@dvt/engine/src/outbox/OutboxWorker.ts)
  and
  [packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts](../../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts)
- Key tests:
  [packages/@dvt/engine/test/outbox/OutboxWorker.test.ts](../../../packages/@dvt/engine/test/outbox/OutboxWorker.test.ts)
  and
  [packages/@dvt/adapter-postgres/test/smoke.test.ts](../../../packages/@dvt/adapter-postgres/test/smoke.test.ts)
- Verification:
  `pnpm test:engine`
  and
  `pnpm test:adapter-postgres`

### compiledCodeRef ownership

- Canonical spec:
  [ADR-0032](../../adr/ADR-0032-compiledcoderef-ownership.md)
  and
  [G4 Task Specification](../gaps/G4-TASK-SPECIFICATION.md)
- Current status source:
  [Gap Execution Plans](../gaps/GAP_EXECUTION_PLANS.md) (`G4`)
- Primary code:
  [packages/@dvt/planner/src/compiledCode/attachCompiledCodeRefs.ts](../../../packages/@dvt/planner/src/compiledCode/attachCompiledCodeRefs.ts),
  [packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts](../../../packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts),
  [packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts](../../../packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts)
- Key tests:
  [packages/@dvt/contracts/test/compiled-code-ref.contract.test.ts](../../../packages/@dvt/contracts/test/compiled-code-ref.contract.test.ts),
  [packages/@dvt/planner/test/compiledCode/attachCompiledCodeRefs.test.ts](../../../packages/@dvt/planner/test/compiledCode/attachCompiledCodeRefs.test.ts),
  [packages/@dvt/traceability-service/test/lineage/compiledCodeRef.test.ts](../../../packages/@dvt/traceability-service/test/lineage/compiledCodeRef.test.ts),
  [packages/@dvt/traceability-service/test/lineage/CachedRetryCompiledCodeResolver.test.ts](../../../packages/@dvt/traceability-service/test/lineage/CachedRetryCompiledCodeResolver.test.ts),
  [packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.test.ts](../../../packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.test.ts)
- Evidence:
  [ED-20260304 - compiledCodeRef ownership](../../evidence/ED-20260304-compiledcoderef-ownership.md)
- Verification:
  `pnpm --filter @dvt/contracts test`
  and
  `pnpm --filter @dvt/planner test`
  and
  `pnpm --filter @dvt/adapter-temporal test`
  and
  `pnpm --filter @dvt/traceability-service test`

### OpenLineage mapping and delivery debt

- Canonical source today:
  [Gap Execution Plans](../gaps/GAP_EXECUTION_PLANS.md) (`G6`, `G10`)
  until there is a dedicated accepted runtime spec for lineage delivery
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
- Verification:
  `pnpm --filter @dvt/traceability-service test`
  and
  `pnpm traceability:adr0`

### Documentation governance and checks

- Canonical docs:
  [Testing and CI Capabilities](../../guides/testing-and-ci-capabilities.md)
  and
  [Mandatory AI Workflow](../../guides/SISTEMA%20DE%20TRABAJO%20OBLIGATORIO%20PARA%20IA.md)
- Current status source:
  [Documentation Restructuring Diagnostic and Roadmap](../proposals/documentation-restructuring-diagnostic-and-roadmap.md)
- Primary code:
  [scripts/sync-docs.cjs](../../../scripts/sync-docs.cjs),
  [scripts/docs-doctor.cjs](../../../scripts/docs-doctor.cjs),
  [scripts/docs-quality-check.cjs](../../../scripts/docs-quality-check.cjs),
  [scripts/docs-canonical-check.cjs](../../../scripts/docs-canonical-check.cjs),
  [tools/ci/arc-check.mjs](../../../tools/ci/arc-check.mjs),
  [tools/ci/doc-check.mjs](../../../tools/ci/doc-check.mjs)
- Verification:
  `pnpm docs:ci`

## Minimum Traceability Tuple

For any active technical doc that governs code behavior, record at least this tuple somewhere explicit:

- `canonical_spec`: the normative doc that defines behavior or invariants
- `status_doc`: the file that states current implementation or gap status
- `code_paths`: the main implementation files
- `test_paths`: the tests that prove the behavior
- `verification_cmd`: the command that should fail if the behavior regresses
- `evidence_or_risk`: the evidence doc or risk record when the change is high-impact

This tuple is the minimum manual format until frontmatter fields are standardized repo-wide.

## Scope Left For The Next Pass

This first matrix intentionally does not yet cover every workspace.

Still missing from explicit topic mapping:

- `apps/web`
- `@dvt/cli`
- `@dvt/dsl`
- `@dvt/plan-verifier`
- `@dvt/observability`
- `@dvt/observability-otel`
- smaller contract-only packages with no separate active planning topic

The next pass should either map those packages to an active canonical doc or explicitly mark them as `reference-only`.
