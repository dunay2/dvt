---
title: DVT+ - Gap Execution Plans
status: Review
owner: docs
last_reviewed: 2026-03-07
planning_type: proposal
---

# DVT+ - Gap Execution Plans

Source of truth for execution gaps and delivery state.

- Baseline source: [`docs/architecture/system-delivery-status.md`](../../architecture/system-delivery-status.md)
- Last sync date: 2026-03-07
- Scope: Phase 1, Phase 1.5, Phase 2

## Executive State (2026-03-07)

| Gap | Title                                     | Phase     | Current state                                             |
| --- | ----------------------------------------- | --------- | --------------------------------------------------------- |
| G1  | Temporal Adapter real                     | Phase 1   | In progress (lookupRunRef done, full integration pending) |
| G2  | PostgresStateStore complete               | Phase 1   | Closed                                                    |
| G3  | IStartRunIntentStore Postgres + scheduler | Phase 1   | Implemented in code, pending final doc closure            |
| G4  | compiledCodeRef ownership                 | Phase 1   | Closed                                                    |
| G5  | Outbox worker independiente               | Phase 1.5 | Pending                                                   |
| G6  | OpenLineage mapping tests + schema pin    | Phase 1.5 | Pending                                                   |
| G7  | Read models + standalone projector        | Phase 1.5 | Pending                                                   |
| G8  | Auth real en apps/api                     | Phase 1.5 | Pending                                                   |
| G9  | StepTypeRegistry + typed stepTypeConfig   | Phase 2   | Pending                                                   |
| G10 | outbox_lineage worker + fail-open DLQ     | Phase 2   | Pending                                                   |

## Confirmed Progress Since Previous Draft

1. `G1` lookupRunRef is implemented and tested in Temporal adapter.
   - Code: [`packages/@dvt/adapter-temporal/src/TemporalAdapter.ts`](../../../packages/@dvt/adapter-temporal/src/TemporalAdapter.ts)
   - Tests: [`packages/@dvt/adapter-temporal/test/TemporalAdapter.lookupRunRef.test.ts`](../../../packages/@dvt/adapter-temporal/test/TemporalAdapter.lookupRunRef.test.ts)
2. `G3` durable intent store and reconciler worker are implemented and wired in runtime.
   - Store: [`packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts`](../../../packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts)
   - Worker: [`packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts`](../../../packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts)
   - Runtime wiring: [`apps/api/src/runtime/intentReconcilerRuntime.ts`](../../../apps/api/src/runtime/intentReconcilerRuntime.ts)
3. `G4` compiledCodeRef ownership is implemented end-to-end at package scope and documented as closed.
   - Contracts fixtures and validation tests: [`packages/@dvt/contracts/test/compiled-code-ref.contract.test.ts`](../../../packages/@dvt/contracts/test/compiled-code-ref.contract.test.ts)
   - Planner enrichment: [`packages/@dvt/planner/src/compiledCode/attachCompiledCodeRefs.ts`](../../../packages/@dvt/planner/src/compiledCode/attachCompiledCodeRefs.ts)
   - Temporal propagation: [`packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`](../../../packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts)
   - Traceability resolver/mapper: [`packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts`](../../../packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts)
4. CI hardening was added for workspace dependency builds before adapter-postgres tests.
   - Workflow: [`.github/workflows/test.yml`](../../../.github/workflows/test.yml)

## Gap-by-Gap Status

### G1 - Temporal Adapter real

- Status: In progress
- Done:
  - `lookupRunRef` implemented
  - unit tests for exists/not-found/error paths
  - `TemporalWorkerHost` lifecycle quality gate added (start once, no-op shutdown, deterministic Worker.create wiring)
  - Sonar debt removed in Temporal worker lifecycle tests (unused/empty-class/scope-smell cleanup)
- Pending:
  - stronger production integration coverage (time-skipping / dev server always-on gate)
  - operational validation of worker host defaults under load
- Reference task spec: [`G1 section`](#g1---temporal-adapter-real)

### G2 - PostgresStateStore complete

- Status: Closed
- Delivered:
  - `listEvents(options)` with paging cursor
  - `listRuns(status)` behavior completed in adapter
- Evidence:
  - [`packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`](../../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts)

### G3 - IStartRunIntentStore Postgres + scheduler

- Status: Implemented in code
- Delivered:
  - durable Postgres intent store
  - transition guards and typed errors
  - non-overlap reconciler worker with infra backoff/jitter/timeout guard
  - runtime wiring in `apps/api`
- Pending:
  - close remaining doc checklist items as "done" in task spec/evidence docs
  - keep integration/load evidence updated
- Task spec: [`G3-TASK-SPECIFICATION.md`](G3-TASK-SPECIFICATION.md)

### G4 - compiledCodeRef ownership

- Status: Closed
- Subtasks:

| Task | Scope                                             | Status                                      |
| ---- | ------------------------------------------------- | ------------------------------------------- |
| T4-1 | contracts type + exports + fixtures               | Done                                        |
| T4-2 | planner storage adapters + attachCompiledCodeRefs | Done in code                                |
| T4-3 | adapter-temporal propagation to StepStarted       | Done in code + tests + QA hardening cleanup |
| T4-4 | traceability reader/cache/SqlJobFacet             | Done in code + tests                        |

- Task spec: [`G4-TASK-SPECIFICATION.md`](G4-TASK-SPECIFICATION.md)
- QA architecture review: [`G4-T4-3-QA-ARCH-REVIEW.md`](G4-T4-3-QA-ARCH-REVIEW.md)

### G5 - Outbox worker independiente

- Status: Pending
- Target:
  - dedicated polling worker + publisher port + operational lifecycle

### G6 - OpenLineage mapping tests CI + schema pin

- Status: Pending
- Target:
  - deterministic OL mapping tests in CI
  - `_schemaURL` pinned in code

### G7 - Read models + standalone projector

- Status: Pending
- Target:
  - projector service and indexes for production read paths

### G8 - Auth real en apps/api

- Status: Pending
- Target:
  - JWT verification and tenant-scoped authz in runtime endpoints

### G9 - StepTypeRegistry + typed stepTypeConfig

- Status: Pending
- Target:
  - registry-based validation and safer step config contracts

### G10 - outbox_lineage worker + fail-open DLQ

- Status: Pending
- Target:
  - lineage delivery worker, DLQ, fail-open behavior for external lineage sinks

## Execution Order (Updated)

Recommended order for next cycles:

1. Close remaining `G1` integration quality gates.
2. Start Phase 1.5 in order: `G5 -> G6 -> G7 -> G8`.
3. Leave Phase 2 (`G9`, `G10`) after Phase 1.5 operational stability.

Parallel execution track detail:

- [`GAP_PARALLEL_EXECUTION_TRACKS.md`](GAP_PARALLEL_EXECUTION_TRACKS.md)

## Related Documents

- G3 detail: [`G3-TASK-SPECIFICATION.md`](G3-TASK-SPECIFICATION.md)
- G4 detail: [`G4-TASK-SPECIFICATION.md`](G4-TASK-SPECIFICATION.md)
- Parallel tracks: [`GAP_PARALLEL_EXECUTION_TRACKS.md`](GAP_PARALLEL_EXECUTION_TRACKS.md)
- G3 evidence: [`docs/evidence/ED-20260304-g3-intentstore-postgres-reconciler.md`](../../evidence/ED-20260304-g3-intentstore-postgres-reconciler.md)
- G4 evidence: [`docs/evidence/ED-20260304-compiledcoderef-ownership.md`](../../evidence/ED-20260304-compiledcoderef-ownership.md)
