# ADR Implementation Status

**Document ID:** `ARCH-ADR-STATUS`  
**Version:** `1.4`  
**Status:** Active  
**Owner:** Architecture Team  
**Updated:** 2026-03-03

---

## 1) Executive Summary (code-based)

| Area                                                | Current Status | Evidence in code                                                                                                                                                                                                                                                                                                | Notes                                                                                                                                                |
| --------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADR-0000 Code-generation traceability               | 🟡 Partial     | [`traceability:adr0`](../../package.json:39), [`TraceabilityService.validateAndBuildManifest()`](../../packages/@dvt/traceability-service/src/service.ts:27)                                                                                                                                                    | Tooling and governance pipeline exist; push-to-main now blocks regressions against the tracked issue baseline while repo-wide remediation continues. |
| ADR-0001 Temporal integration test policy           | 🟡 Partial     | [`integration.time-skipping.test.ts`](../../packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts:1)                                                                                                                                                                                            | Policy rules are present in tests; hardening remains iterative.                                                                                      |
| ADR-0002 Neo4j knowledge graph context repository   | Superseded     | [`ADR-0002-neo4j-knowledge-graph-context-repository.md`](./ADR-0002-neo4j-knowledge-graph-context-repository.md)                                                                                                                                                                                                | Retired on 2026-03-07. Repository-local manifest traceability replaces the graph workflow.                                                           |
| ADR-0003 Execution model sovereignty                | ✅ Implemented | [`WorkflowEngine`](../../packages/@dvt/engine/src/core/WorkflowEngine.ts:1)                                                                                                                                                                                                                                     | Engine remains lifecycle authority boundary.                                                                                                         |
| ADR-0004 Event sourcing strategy                    | ✅ Implemented | [`InMemoryTxStore.appendAndEnqueueTx()`](../../packages/@dvt/engine/src/state/InMemoryTxStore.ts:1), [`PostgresStateStoreAdapter.appendAndEnqueueTx()`](../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:1)                                                                                | Append-only + outbox behavior implemented in core stores.                                                                                            |
| ADR-0005 Contract formalization tooling             | 🟡 Partial     | [`@dvt/contracts`](../../packages/@dvt/contracts/package.json), [`contracts` workflow](../../.github/workflows/contracts.yml:1)                                                                                                                                                                                 | Baseline is solid; full conformance matrix remains progressive.                                                                                      |
| ADR-0006 Contract tooling governance                | 🟡 Partial     | [`contracts.yml`](../../.github/workflows/contracts.yml:1), [`contracts:index:check`](../../package.json:52)                                                                                                                                                                                                    | Governance gates exist and are actively tuned.                                                                                                       |
| ADR-0007 Run cancellation                           | ✅ Implemented | [`cancelRun()`](../../packages/@dvt/engine/src/core/WorkflowEngine.ts:1)                                                                                                                                                                                                                                        | Cancellation lifecycle and event path implemented.                                                                                                   |
| ADR-0008 Signal idempotency                         | 🟡 Partial     | [`IdempotencyKeyBuilder.signalKey()`](../../packages/@dvt/engine/src/core/idempotency.ts:1)                                                                                                                                                                                                                     | Signal keying is present; parity across all providers is still evolving.                                                                             |
| ADR-0009 Outbox ordering                            | ✅ Implemented | [`listPending()` ordering](../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:1)                                                                                                                                                                                                             | Ordered fetch/claiming strategy implemented at adapter level.                                                                                        |
| ADR-0010 Run event envelope split                   | ✅ Implemented | [`RunEventInput` / `RunEventPersisted`](../../packages/@dvt/engine/src/state/InMemoryTxStore.ts:1)                                                                                                                                                                                                              | Producer/store authority split reflected in engine state flow.                                                                                       |
| ADR-0011 RunStarted ownership                       | ✅ Implemented | [`WorkflowEngine.startRun()`](../../packages/@dvt/engine/src/core/WorkflowEngine.ts:1), [`TemporalAdapter`](../../packages/@dvt/adapter-temporal/src/TemporalAdapter.ts:1)                                                                                                                                      | Ownership is adapter/runtime-driven with engine lifecycle boundaries.                                                                                |
| ADR-0012 Plan integrity ownership                   | ✅ Implemented | [`StartRunApplicationService.startRunCore()`](../../packages/@dvt/engine/src/application/StartRunApplicationService.ts:1), [`PlanIntegrityValidator`](../../packages/@dvt/engine/src/security/planIntegrity.ts:1), [`RunPlanWorkflow`](../../packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts:1) | Engine now owns authoritative fetch/verify before dispatch; adapters consume verified plan.                                                          |
| ADR-0012a Canonical error codes                     | 🟡 Partial     | [`intentErrors.ts`](../../packages/@dvt/engine/src/contracts/intentErrors.ts:1), [`errors.ts`](../../packages/@dvt/contracts/src/errors.ts:1)                                                                                                                                                                   | Typed error model exists; full normalization matrix is still pending.                                                                                |
| ADR-0013 bootstrapRunTx atomicity                   | ✅ Implemented | [`IRunStateStore.bootstrapRunTx()`](../../packages/@dvt/engine/src/ports/IRunStateStore.ts:1), [`WorkflowEngine.startRun()`](../../packages/@dvt/engine/src/core/WorkflowEngine.ts:1)                                                                                                                           | Atomic bootstrap path implemented and used by engine lifecycle.                                                                                      |
| ADR-0014 Run-driven adapter model                   | ✅ Implemented | [`WorkflowEngine.startRun()`](../../packages/@dvt/engine/src/core/WorkflowEngine.ts:1), [`TemporalAdapter.startRun()`](../../packages/@dvt/adapter-temporal/src/TemporalAdapter.ts:1)                                                                                                                           | Adapter-first execution with engine-owned persistence is in place.                                                                                   |
| ADR-0015 getRunStatus read-model separation         | ✅ Implemented | [`SnapshotProjector`](../../packages/@dvt/engine/src/core/SnapshotProjector.ts:1), [`WorkflowEngine.getRunStatus()`](../../packages/@dvt/engine/src/core/WorkflowEngine.ts:1)                                                                                                                                   | Snapshot-first read path with replay fallback implemented.                                                                                           |
| ADR-0016 logicalAttemptId adapter ownership         | 🟡 Partial     | [`buildRunEvent()`](../../packages/@dvt/engine/src/core/WorkflowEngine.ts:1), temporal activity contracts                                                                                                                                                                                                       | Ownership rule exists; runtime-specific hardening is still in progress.                                                                              |
| ADR-0017 ExecutionPlan schema versioning            | ✅ Implemented | [`validateStartRunPreconditions()`](../../packages/@dvt/engine/src/core/WorkflowEngine.ts:1), planner/engine contract tests                                                                                                                                                                                     | Schema/version checks enforced on start path.                                                                                                        |
| ADR-0018 Shared kernel ownership governance         | ✅ Implemented | [`@dvt/contracts` structure](../../packages/@dvt/contracts/src/index.ts:1)                                                                                                                                                                                                                                      | Shared serializable contract ownership boundary established.                                                                                         |
| ADR-0019 Adapter equivalence & maintenance boundary | ✅ Implemented | [`IRunMaintenanceService`](../../packages/@dvt/engine/src/ports/IRunMaintenanceService.ts:1), [`RunMaintenanceService`](../../packages/@dvt/engine/src/services/RunMaintenanceService.ts:1)                                                                                                                     | Maintenance boundary extracted from lifecycle contract.                                                                                              |
| ADR-0029 Run Maintenance Service Extraction         | ✅ Implemented | [`IRunMaintenanceService`](../../packages/@dvt/engine/src/ports/IRunMaintenanceService.ts:1), [`RunMaintenanceService`](../../packages/@dvt/engine/src/services/RunMaintenanceService.ts:1)                                                                                                                     | Dedicated maintenance port/service in use.                                                                                                           |
| ADR-0030 Pre-dispatch intent log                    | ✅ Implemented | [`IStartRunIntentStore`](../../packages/@dvt/engine/src/ports/IStartRunIntentStore.ts:1), [`InMemoryStartRunIntentStore`](../../packages/@dvt/engine/src/state/InMemoryStartRunIntentStore.ts:1), [`reconcileOrphanedIntents()`](../../packages/@dvt/engine/src/services/RunMaintenanceService.ts:175)          | Crash-consistency intent/reconciliation flow implemented.                                                                                            |

Legend: ✅ Implemented · 🟡 Partial · ❌ Not started

---

## 1.1) Full ADR index (0000–0030)

Source of truth for ADR documents and statuses: [`ADR-Index.md`](./ADR-Index.md).

---

## 2) Notable updates in this revision

1. Added newly accepted ADRs to governance view:
   - [`ADR-0029 — Run Maintenance Service Extraction`](./ADR-0029-run-maintenance-service.md)
   - [`ADR-0030 — Pre-Dispatch Intent Log for startRun Crash Consistency`](./ADR-0030-pre-dispatch-intent-log.md)
2. Synchronized ADR status references with current ADR catalog (`0000–0030`).
3. Normalized ADR navigation to use:
   - [`index.md`](./index.md) as landing page
   - [`ADR-Index.md`](./ADR-Index.md) as complete catalog

---

## 3) Current focus (short horizon)

- Complete cross-adapter normalization for canonical errors (ADR-0012a).
- Continue provider parity hardening for signal/idempotency/runtime ownership (ADR-0008, ADR-0016).
- Keep ADR catalog and traceability outputs synchronized on each accepted ADR update.

---

## 4) Verification checklist

- [x] ADR catalog synchronized with current ADR files.
- [x] ADR-0029 and ADR-0030 included in status tracking.
- [x] ADR landing page references updated catalog/status docs.
- [ ] Full local CI/toolchain validation (requires dependency install in this workspace).
