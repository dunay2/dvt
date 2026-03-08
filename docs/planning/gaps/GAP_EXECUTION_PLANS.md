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

## Traceability Anchors

This file is the active status doc for execution gaps. Use it together with:

- [System Delivery Status](../../architecture/system-delivery-status.md) for the cross-system implementation snapshot
- [Canonical Doc Code Matrix](../status/canonical-doc-code-matrix.md) for the curated doc -> code -> test -> command mapping

Minimum tuple for this document:

- `canonical_spec`: gap-specific. See each gap section below.
- `status_doc`: [`docs/planning/gaps/GAP_EXECUTION_PLANS.md`](GAP_EXECUTION_PLANS.md)
- `code_paths`: listed in each active gap section
- `test_paths`: listed in each active gap section or linked evidence doc
- `verification_cmd`: gap-specific. See each active gap section below.
- `evidence_or_risk`: linked evidence docs and risk records where the gap is already formalized

## Executive State (2026-03-07)

| Gap | Title                                     | Phase     | Current state                                             |
| --- | ----------------------------------------- | --------- | --------------------------------------------------------- |
| G1  | Temporal Adapter real                     | Phase 1   | In progress (lookupRunRef done, full integration pending) |
| G2  | PostgresStateStore complete               | Phase 1   | Closed                                                    |
| G3  | IStartRunIntentStore Postgres + scheduler | Phase 1   | Closed                                                    |
| G4  | compiledCodeRef ownership                 | Phase 1   | Closed                                                    |
| G5  | Outbox worker independiente               | Phase 1.5 | Partial                                                   |
| G6  | OpenLineage mapping tests + schema pin    | Phase 1.5 | Partial                                                   |
| G7  | Read models + standalone projector        | Phase 1.5 | Partial                                                   |
| G8  | Auth real en apps/api                     | Phase 1.5 | Implemented in code (arch tests pending)                  |
| G9  | StepTypeRegistry + typed stepTypeConfig   | Phase 2   | Pending                                                   |
| G10 | outbox_lineage worker + fail-open DLQ     | Phase 2   | Pending                                                   |

## Confirmed Progress Since Previous Draft

1. `G1` real Temporal adapter primitives and integration gates exist in repo.
   - Code: [`packages/@dvt/adapter-temporal/src/TemporalAdapter.ts`](../../../packages/@dvt/adapter-temporal/src/TemporalAdapter.ts)
   - Worker host: [`packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts`](../../../packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts)
   - Tests: [`packages/@dvt/adapter-temporal/test/TemporalAdapter.lookupRunRef.test.ts`](../../../packages/@dvt/adapter-temporal/test/TemporalAdapter.lookupRunRef.test.ts)
   - Integration suite: [`packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`](../../../packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts)
   - PR gate: [`.github/workflows/pr-quality-gate.yml`](../../../.github/workflows/pr-quality-gate.yml)
2. `G3` durable intent store and reconciler worker are implemented, wired in runtime, and formally closed in evidence.
   - Store: [`packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts`](../../../packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts)
   - Worker: [`packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts`](../../../packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts)
   - Runtime wiring: [`apps/api/src/runtime/intentReconcilerRuntime.ts`](../../../apps/api/src/runtime/intentReconcilerRuntime.ts)
   - Evidence: [`docs/evidence/ED-20260304-g3-intentstore-postgres-reconciler.md`](../../evidence/ED-20260304-g3-intentstore-postgres-reconciler.md)
3. `G4` compiledCodeRef ownership is implemented end-to-end at package scope and documented as closed.
   - Contracts fixtures and validation tests: [`packages/@dvt/contracts/test/compiled-code-ref.contract.test.ts`](../../../packages/@dvt/contracts/test/compiled-code-ref.contract.test.ts)
   - Planner enrichment: [`packages/@dvt/planner/src/compiledCode/attachCompiledCodeRefs.ts`](../../../packages/@dvt/planner/src/compiledCode/attachCompiledCodeRefs.ts)
   - Temporal propagation: [`packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`](../../../packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts)
   - Traceability resolver/mapper: [`packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts`](../../../packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts)
4. `G5` already has reusable worker and storage foundations in code.
   - Worker core: [`packages/@dvt/engine/src/outbox/OutboxWorker.ts`](../../../packages/@dvt/engine/src/outbox/OutboxWorker.ts)
   - Postgres outbox APIs: [`packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`](../../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts)
5. `G6` and `G7` are not green, but they are no longer zero-state.
   - Lineage mapping/tests: [`packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts`](../../../packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts)
   - In-process projector: [`packages/@dvt/engine/src/core/SnapshotProjector.ts`](../../../packages/@dvt/engine/src/core/SnapshotProjector.ts)

## Gap-by-Gap Status

### G1 - Temporal Adapter real

- Status: In progress (close-out phase)
- Traceability tuple:
  - `canonical_spec`: [TemporalAdapter Specification](../../architecture/engine/adapters/temporal/TemporalAdapter.spec.md), [Temporal Engine Policies](../../architecture/engine/adapters/temporal/EnginePolicies.md)
  - `status_doc`: [GAP_EXECUTION_PLANS.md](GAP_EXECUTION_PLANS.md)
  - `code_paths`: `packages/@dvt/adapter-temporal/src/TemporalAdapter.ts`, `packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts`
  - `test_paths`: `packages/@dvt/adapter-temporal/test/TemporalAdapter.lookupRunRef.test.ts`, `packages/@dvt/adapter-temporal/test/TemporalWorkerHost.lifecycle.test.ts`, `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`
  - `verification_cmd`: `pnpm test:adapter-temporal`
  - `evidence_or_risk`: [ED-20260304 - TemporalAdapter.lookupRunRef implementation](../../evidence/ED-20260304-temporal-lookup-run-ref.md)
- Done:
  - `lookupRunRef` implemented
  - unit tests for exists/not-found/error paths
  - `TemporalWorkerHost` lifecycle quality gate added (start once, no-op shutdown, deterministic Worker.create wiring)
  - time-skipping integration suite exists for success/failure/cancel/gateway/crash-recovery paths
  - dedicated PR quality gate runs `adapter-temporal test:integration`
- Pending:
  - keep the integration lane healthy as Temporal runtime contracts evolve
  - operational validation of worker host defaults under load
  - align logging and tracing injection across adapters so runtime diagnostics are consistent
  - review timeout policy alignment across Temporal, Conductor, and mock adapters
  - treat `AbortSignal` support as a deferred follow-up when Temporal SDK support becomes practical

### G2 - PostgresStateStore complete

- Status: Closed
- Delivered:
  - `listEvents(options)` with paging cursor
  - `listRuns(status)` behavior completed in adapter
- Evidence:
  - [`packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`](../../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts)

### G3 - IStartRunIntentStore Postgres + scheduler

- Status: Closed
- Traceability tuple:
  - `canonical_spec`: [ADR-0030](../../adr/ADR-0030-pre-dispatch-intent-log.md), [G3 Task Specification](G3-TASK-SPECIFICATION.md)
  - `status_doc`: [GAP_EXECUTION_PLANS.md](GAP_EXECUTION_PLANS.md)
  - `code_paths`: `packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts`, `packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts`, `apps/api/src/runtime/intentReconcilerRuntime.ts`
  - `test_paths`: `packages/@dvt/adapter-postgres/test/PostgresStartRunIntentStore.test.ts`, `packages/@dvt/engine/test/workers/IntentReconcilerWorker.test.ts`
  - `verification_cmd`: `pnpm test:adapter-postgres`, `pnpm test:engine`
  - `evidence_or_risk`: [ED-20260304 - G3 intent store Postgres reconciler](../../evidence/ED-20260304-g3-intentstore-postgres-reconciler.md)
- Delivered:
  - durable Postgres intent store
  - transition guards and typed errors
  - non-overlap reconciler worker with infra backoff/jitter/timeout guard
  - runtime wiring in `apps/api`
- Closure evidence:
  - [`docs/evidence/ED-20260304-g3-intentstore-postgres-reconciler.md`](../../evidence/ED-20260304-g3-intentstore-postgres-reconciler.md)
- Non-blocking follow-up:
  - keep integration/load evidence current as production telemetry grows
- Task spec: [`G3-TASK-SPECIFICATION.md`](G3-TASK-SPECIFICATION.md)

### G4 - compiledCodeRef ownership

- Status: Closed
- Traceability tuple:
  - `canonical_spec`: [ADR-0032](../../adr/ADR-0032-compiledcoderef-ownership.md), [G4 Task Specification](G4-TASK-SPECIFICATION.md)
  - `status_doc`: [GAP_EXECUTION_PLANS.md](GAP_EXECUTION_PLANS.md)
  - `code_paths`: `packages/@dvt/planner/src/compiledCode/attachCompiledCodeRefs.ts`, `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`, `packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts`
  - `test_paths`: `packages/@dvt/contracts/test/compiled-code-ref.contract.test.ts`, `packages/@dvt/planner/test/compiledCode/attachCompiledCodeRefs.test.ts`, `packages/@dvt/traceability-service/test/lineage/compiledCodeRef.test.ts`, `packages/@dvt/traceability-service/test/lineage/CachedRetryCompiledCodeResolver.test.ts`, `packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.test.ts`
  - `verification_cmd`: `pnpm --filter @dvt/contracts test`, `pnpm --filter @dvt/planner test`, `pnpm --filter @dvt/adapter-temporal test`, `pnpm --filter @dvt/traceability-service test`
  - `evidence_or_risk`: [ED-20260304 - compiledCodeRef ownership](../../evidence/ED-20260304-compiledcoderef-ownership.md)
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

- Status: Partial
- Traceability tuple:
  - `canonical_spec`: [GAP_EXECUTION_PLANS.md](GAP_EXECUTION_PLANS.md) until a dedicated runtime spec or runbook exists
  - `status_doc`: [GAP_EXECUTION_PLANS.md](GAP_EXECUTION_PLANS.md)
  - `code_paths`: `packages/@dvt/engine/src/outbox/OutboxWorker.ts`, `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`
  - `test_paths`: `packages/@dvt/engine/test/outbox/OutboxWorker.test.ts`, `packages/@dvt/adapter-postgres/test/smoke.test.ts`
  - `verification_cmd`: `pnpm test:engine`, `pnpm test:adapter-postgres`
  - `evidence_or_risk`: none yet; promote to evidence or risk record once a standalone runtime/process is introduced
- Delivered:
  - outbox persistence APIs (`listPending`, `markDelivered`, `markFailed`, `replayDeadLetters`)
  - reusable engine `OutboxWorker` core
- Remaining:
  - standalone polling runtime/process
  - explicit subscriber delivery contract for projector/event-bus consumers
  - retry, backoff, and dead-letter operational policy for worker delivery failures
  - publisher wiring and operational lifecycle outside the API process
  - shard strategy / scaling model
  - lag, health, and error metrics aligned with runbook/ops expectations

### G6 - OpenLineage mapping tests CI + schema pin

- Status: Partial
- Traceability tuple:
  - `canonical_spec`: [GAP_EXECUTION_PLANS.md](GAP_EXECUTION_PLANS.md) until lineage delivery has a dedicated accepted runtime spec
  - `status_doc`: [GAP_EXECUTION_PLANS.md](GAP_EXECUTION_PLANS.md)
  - `code_paths`: `packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts`, `packages/@dvt/traceability-service/src/lineage/resolver/CachedRetryCompiledCodeResolver.ts`
  - `test_paths`: `packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.test.ts`, `packages/@dvt/traceability-service/test/lineage/CachedRetryCompiledCodeResolver.test.ts`
  - `verification_cmd`: `pnpm --filter @dvt/traceability-service test`, `pnpm traceability:adr0`
  - `evidence_or_risk`: consider promotion to a dedicated risk record if `_schemaURL` drift remains open after the next hardening pass
- Delivered:
  - compiled-code lineage resolver/cache/facet mapping package code
  - package-level tests for mapper/guard/resolver paths
- Remaining:
  - deterministic OL translation hardening in CI
  - `_schemaURL` pinned in emitted OpenLineage payloads/contracts
  - delivery/runtime concerns stay open outside package scope

### G7 - Read models + standalone projector

- Status: Partial
- Delivered:
  - in-process `SnapshotProjector` in engine
- Remaining:
  - standalone projector service
  - denormalized read models and indexes for production read paths

### G8 - Auth real en apps/api

- Status: Implemented in code
- Delivered:
  - `TenantHierarchyAuthorizationPolicy` with full tenant → project → environment grant hierarchy
  - `OidcAuthenticator` + `JwksJwtVerifier` (jose-based JWKS) behind `IJwtVerifierGateway`
  - `AuthorizeCommandScopeService` with `PrincipalRef`-keyed access loading and structured audit
  - `PostgresPrincipalAccessRepository` (JSONB-backed, with migration)
  - `StructuredAuditLogger` implementing `IAuthAuditPort`
  - `POST /runs/start` protected end-to-end — wired in `app.ts` when `OIDC_*` vars present
  - `StartRunFacadeResult` semantic result type — no HTTP models in application layer
  - `authErrorMapper` in entrypoints/http — single HTTP mapping point
  - Route exposure policy: `/readyz`, `/version`, `/db/ready` all gated by explicit flags
- Pending:
  - `dependency-cruiser` architectural tests (T8-6)
  - Replace `NotImplementedStartRunUseCase` with engine-backed use case (T8-7)
- Spec: [`G8-REAL-AUTH-FINAL-SPEC.md`](G8-REAL-AUTH-FINAL-SPEC.md)

### G9 - StepTypeRegistry + typed stepTypeConfig

- Status: Pending
- Target:
  - registry-based validation and safer step config contracts

### G10 - outbox_lineage worker + fail-open DLQ

- Status: Pending
- Target:
  - lineage delivery worker, DLQ, fail-open behavior for external lineage sinks
  - explicit worker parameters: poll interval, batch size, ordering, retry, and lag metrics

## Execution Order (Updated)

Recommended order for next cycles:

1. Finish `G1` operational close-out.
2. Start `G5` and `G6` in parallel.
3. Start `G7` and `G8` after `G5/G6` direction is stable.
4. Leave Phase 2 (`G9`, `G10`) after Phase 1.5 operational stability.

Parallel execution track detail:

- [`GAP_PARALLEL_EXECUTION_TRACKS.md`](GAP_PARALLEL_EXECUTION_TRACKS.md)

## Related Documents

- G3 detail: [`G3-TASK-SPECIFICATION.md`](G3-TASK-SPECIFICATION.md)
- G4 detail: [`G4-TASK-SPECIFICATION.md`](G4-TASK-SPECIFICATION.md)
- Parallel tracks: [`GAP_PARALLEL_EXECUTION_TRACKS.md`](GAP_PARALLEL_EXECUTION_TRACKS.md)
- G3 evidence: [`docs/evidence/ED-20260304-g3-intentstore-postgres-reconciler.md`](../../evidence/ED-20260304-g3-intentstore-postgres-reconciler.md)
- G4 evidence: [`docs/evidence/ED-20260304-compiledcoderef-ownership.md`](../../evidence/ED-20260304-compiledcoderef-ownership.md)
- G8 spec: [`G8-REAL-AUTH-FINAL-SPEC.md`](G8-REAL-AUTH-FINAL-SPEC.md)
