---
title: DVT+ - Gap Execution Plans
status: Review
owner: Architecture / Delivery / Docs
last_reviewed: 2026-03-12
planning_type: proposal
---

# DVT+ - Gap Execution Plans

Source of truth for execution gaps and delivery state.

- Baseline source: [`docs/architecture/system-delivery-status.md`](../../architecture/system-delivery-status.md)
- Last sync date: 2026-03-12
- Scope: Phase 1, Phase 1.5, Phase 2

Concept anchors for this page:

- [Glossary](../../concepts/glossary.md) for `gap`, `status`, `closed`,
  `partial`, `canonical spec`, and `verification tuple`
- [Domain Language](../../concepts/domain-language.md) for the rule that
  planning, status, and contracts must not compete as parallel sources of truth
- [Roadmap Of Record](../roadmap/index.md) for repository-wide sequencing and
  priority

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

## Executive State (2026-03-08)

| Gap | Title                                     | Phase     | Current state                            |
| --- | ----------------------------------------- | --------- | ---------------------------------------- |
| G1  | Temporal Adapter real                     | Phase 1   | Closed                                   |
| G2  | PostgresStateStore complete               | Phase 1   | Closed                                   |
| G3  | IStartRunIntentStore Postgres + scheduler | Phase 1   | Closed                                   |
| G4  | compiledCodeRef ownership                 | Phase 1   | Closed                                   |
| G5  | Outbox worker independiente               | Phase 1.5 | Partial                                  |
| G6  | OpenLineage mapping tests + schema pin    | Phase 1.5 | Partial                                  |
| G7  | Read models + standalone projector        | Phase 1.5 | Partial                                  |
| G8  | Auth real en apps/api                     | Phase 1.5 | Implemented in code (arch tests pending) |
| G9  | StepTypeRegistry + typed stepTypeConfig   | Phase 2   | Pending                                  |
| G10 | outbox_lineage worker + fail-open DLQ     | Phase 2   | Pending                                  |

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

- Status: Closed
- Traceability tuple:
  - `canonical_spec`: [TemporalAdapter Specification](../../architecture/engine/adapters/temporal/TemporalAdapter.spec.md), [Temporal Engine Policies](../../architecture/engine/adapters/temporal/EnginePolicies.md)
  - `status_doc`: [GAP_EXECUTION_PLANS.md](GAP_EXECUTION_PLANS.md)
  - `code_paths`: `packages/@dvt/adapter-temporal/src/TemporalAdapter.ts`, `packages/@dvt/adapter-temporal/src/TemporalClient.ts`, `packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts`
  - `test_paths`: `packages/@dvt/adapter-temporal/test/TemporalAdapter.lookupRunRef.test.ts`, `packages/@dvt/adapter-temporal/test/TemporalWorkerHost.lifecycle.test.ts`, `packages/@dvt/adapter-temporal/test/smoke.test.ts`, `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`
  - `verification_cmd`: `pnpm test:adapter-temporal`, `pnpm test:adapter-temporal:integration`
  - `evidence_or_risk`: [ED-20260304 - TemporalAdapter.lookupRunRef implementation](../../evidence/ED-20260304-temporal-lookup-run-ref.md), [ED-20260308 - Temporal adapter operational close-out](../../evidence/ED-20260308-temporal-operational-close-out.md), [R-20260308 - Temporal runtime hardening residuals](../../risk-register/adapters/R-20260308-temporal-operational-hardening-residuals.md)
- Delivered:
  - `lookupRunRef` implemented
  - unit tests for exists/not-found/error paths
  - `TemporalWorkerHost` lifecycle quality gate added (start once, no-op shutdown, deterministic Worker.create wiring)
  - time-skipping integration suite exists for success/failure/cancel/gateway/crash-recovery paths
  - dedicated PR quality gate runs `adapter-temporal test:integration`
  - runtime closure command now requires both unit and time-skipping integration coverage
  - `connectTimeoutMs` now actively bounds Temporal client connection attempts
  - worker host start/shutdown/unexpected exit now emit logs, traces, and metrics
  - `lookupRunRef()` and `ping()` now emit provider-side operational diagnostics
- Non-blocking follow-up:
  - keep the integration lane healthy as Temporal runtime contracts evolve
  - gather load evidence for worker-host defaults from higher-level environments
  - review cross-adapter timeout harmonization as a separate consistency pass

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

- Status: Closed
- Closed: 2026-03-12
- Evidence: [ED-20260312-g5-canary-local-docker](../../evidence/ED-20260312-g5-canary-local-docker.md)
- Traceability tuple:
  - `canonical_spec`: [G5 - Outbox Worker Consolidated Plan](G5-OUTBOX-WORKER-CONSOLIDATED-PLAN.md)
  - `status_doc`: [GAP_EXECUTION_PLANS.md](GAP_EXECUTION_PLANS.md)
  - `code_paths`: `apps/outbox-worker/src/server.ts`, `apps/outbox-worker/src/runtime/createOutboxWorkerRuntime.ts`, `apps/outbox-worker/src/ownership/PgShardOwnershipGate.ts`, `apps/outbox-worker/src/ops/OutboxWorkerMonitor.ts`, `apps/outbox-worker/src/ops/OperationalServer.ts`, `apps/outbox-worker/src/bus/HttpEventBus.ts`, `packages/@dvt/engine/src/outbox/OutboxWorker.ts`, `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`
  - `test_paths`: `apps/outbox-worker/test/runtime/OutboxWorkerRuntime.test.ts`, `apps/outbox-worker/test/plugins/env.test.ts`, `apps/outbox-worker/test/ownership/PgShardOwnershipGate.test.ts`, `apps/outbox-worker/test/ownership/PgShardOwnershipGate.integration.test.ts`, `apps/outbox-worker/test/bus/HttpEventBus.test.ts`, `apps/outbox-worker/test/ops/OutboxWorkerMonitor.test.ts`, `apps/outbox-worker/test/ops/OperationalServer.test.ts`, `apps/outbox-worker/test/sharding/concurrentWorkerOrdering.test.ts`, `apps/outbox-worker/test/canary/standaloneCanaryAcceptance.test.ts`, `packages/@dvt/engine/test/outbox/OutboxWorker.test.ts`, `packages/@dvt/adapter-postgres/test/smoke.test.ts`
  - `verification_cmd`: `pnpm --filter dvt-outbox-worker typecheck`, `pnpm --filter dvt-outbox-worker build`, `pnpm --filter dvt-outbox-worker test`, `pnpm test:engine`, `pnpm test:adapter-postgres`
  - `evidence_or_risk`: closed — local-docker canary evidence in [ED-20260312-g5-canary-local-docker](../../evidence/ED-20260312-g5-canary-local-docker.md); advisory lock exclusivity proven by `PgShardOwnershipGate.integration.test.ts` (2/2 pass against the repo `postgres:16` compose service, 2026-03-12); keep [R-20260311-G5.3 correctness closeout residuals](../../risk-register/quality/R-20260311-g5-3-correctness-closeout-residuals.md), [R-20260311-G5.4 operability and fencing residuals](../../risk-register/quality/R-20260311-g5-4-operability-and-fencing-residuals.md), and [R-20260308-G5-OUTBOX-WORKER-01](../../risk-register/adapters/R-20260308-g5-state-store-outbox-worker-drift.md) visible for downstream contract hardening and `outbox_lineage` flow (Phase 2 / G10)
- Working refs:
  - [`G5 - AI Execution Tracker`](G5-AI-EXECUTION-TRACKER.md)
  - [`G5 / US-G5.3 Correctness Hardening Plan`](G5-US-G5.3-CORRECTNESS-HARDENING-PLAN.md)
  - [`G5 / US-G5.4 Operability And Ownership Hardening Plan`](G5-US-G5.4-OPERABILITY-AND-OWNERSHIP-HARDENING-PLAN.md)
  - [`G5 / US-G5.5 Sharding And Fencing Plan`](G5-US-G5.5-SHARDING-AND-FENCING-PLAN.md)
  - [`docs/adr/_drafts/ADR-G5-independent-outbox-worker-runtime.md`](../../adr/_drafts/ADR-G5-independent-outbox-worker-runtime.md)
  - [`docs/adr/ADR-0033-outbox-worker-sharding-and-fencing-model.md`](../../adr/ADR-0033-outbox-worker-sharding-and-fencing-model.md)
  - [`docs/planning/gaps/g5-outbox-worker-guide.md`](g5-outbox-worker-guide.md)
  - [`docs/planning/proposals/g5-outbox-worker-development-proposal-20260308.md`](../proposals/g5-outbox-worker-development-proposal-20260308.md)
- Delivered:
  - outbox persistence APIs (`listPending`, `markDelivered`, `markFailed`, `replayDeadLetters`)
  - reusable engine `OutboxWorker` core
  - standalone `apps/outbox-worker` host scaffold with runtime loop, env parsing, shutdown wiring, and bounded HTTP publisher mode
  - operational endpoints (`/healthz`, `/readyz`, `/metrics`) with explicit runtime states (`starting`, `idle`, `draining`, `failing`, `stopped`)
  - structured logs and counters for claim, delivery, retry, DLQ, lag, and runtime errors
  - initial operator runbook for canary expectations and rollback boundaries
  - accepted `ADR-0033` plus the first executable `G5.5` slice: persisted `shard_id`, shard-aware claim selection, and single-shard-compatible topology defaults in runtime config
  - the second executable `G5.5` slice: startup advisory-lock ownership sessions held on a dedicated PostgreSQL connection and wired into the standalone host
  - the third executable `G5.5` slice: post-start ownership-loss detection stops the standalone host and keeps retry backlog readiness scoped to the owned shard set
  - the fourth executable `G5.5` slice: deterministic concurrent-worker ordering proof at the worker/storage boundary using shard-scoped ownership tests
  - the fifth executable `G5.5` slice: real PostgreSQL advisory lock exclusivity integration test — two independent `PgShardOwnershipGate` instances against the repo `postgres:16` compose service; gate2 returns null while gate1 holds shard 0 advisory lock, and gate2 acquires after gate1 releases; 2/2 targeted pass (2026-03-12)
  - automated repo-side canary acceptance test proving `passive → active → delivery → stop` through the production host/runtime composition without a live database dependency
- Non-blocking follow-up:
  - explicit subscriber delivery contract for projector/event-bus consumers
  - stale-readiness hardening, explicit shutdown withdrawal, and freshness-aware operational probes
  - explicit ownership/fencing policy for rollout safety before any dual-active deployment posture is tolerated
  - canary or contract proof that supported downstream consumers absorb duplicate delivery idempotently
  - real PostgreSQL orphan-claim recovery and backlog sanity evidence for the hardened claim path
  - deployment-grade downstream target contract beyond the current minimal HTTP publisher mode

### G6 - OpenLineage mapping tests CI + schema pin

- Status: Partial
- Traceability tuple:
  - `canonical_spec`: [G6 OpenLineage CI and Schema Pin Plan](g6/G6-OPENLINEAGE-CI-SCHEMA-PIN-PLAN.md), [Traceability Contracts](../../contracts/traceability/index.md)
  - `status_doc`: [GAP_EXECUTION_PLANS.md](GAP_EXECUTION_PLANS.md)
  - `code_paths`: `packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts`, `packages/@dvt/traceability-service/src/lineage/resolver/CachedRetryCompiledCodeResolver.ts`
  - `test_paths`: `packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.test.ts`, `packages/@dvt/traceability-service/test/lineage/CachedRetryCompiledCodeResolver.test.ts`
  - `verification_cmd`: `pnpm --filter @dvt/traceability-service test`, `pnpm traceability:adr0`
  - `evidence_or_risk`: [ED-20260308 - G6 US-G6.1 facet contract surface](../../evidence/ED-20260308-g6-us-g6-1-facet-contract-surface.md), [ED-20260308 - G6 US-G6.2 lineage contract artifacts](../../evidence/ED-20260308-g6-us-g6-2-lineage-contract-artifacts.md)
- Working refs:
  - [G6 hub](g6/index.md)
  - [G6 OpenLineage CI and Schema Pin Plan](g6/G6-OPENLINEAGE-CI-SCHEMA-PIN-PLAN.md)
  - [G6 Architecture and QA Review](g6/G6-ARCHITECTURE-QA-REVIEW-20260308.md)
  - [Traceability Contracts](../../contracts/traceability/index.md)
- Delivered:
  - compiled-code lineage resolver/cache/facet mapping package code
  - package-level tests for mapper/guard/resolver paths
  - `_schemaURL` pinned in emitted `sql` and `dvt_dbt_details` facets
  - repo-local normative artifacts for emitted lineage facets under [Traceability Contracts](../../contracts/traceability/index.md)
- Remaining:
  - deterministic OL translation hardening in CI
  - offline schema validation execution against vendored/local artifacts
  - committed golden fixtures for mapper regression coverage
  - explicit golden and schema verification commands for closure
  - delivery/runtime concerns stay open outside package scope under `G10`

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

1. Start `G5` and `G6` in parallel.
2. Start `G7` and `G8` after `G5/G6` direction is stable.
3. Leave Phase 2 (`G9`, `G10`) after Phase 1.5 operational stability.

Parallel execution track detail:

- [`GAP_PARALLEL_EXECUTION_TRACKS.md`](GAP_PARALLEL_EXECUTION_TRACKS.md)

## Related Documents

- Planning gaps hub: [`docs/planning/gaps/index.md`](index.md)
- G3 detail: [`G3-TASK-SPECIFICATION.md`](G3-TASK-SPECIFICATION.md)
- G4 detail: [`G4-TASK-SPECIFICATION.md`](G4-TASK-SPECIFICATION.md)
- Parallel tracks: [`GAP_PARALLEL_EXECUTION_TRACKS.md`](GAP_PARALLEL_EXECUTION_TRACKS.md)
- G3 evidence: [`docs/evidence/ED-20260304-g3-intentstore-postgres-reconciler.md`](../../evidence/ED-20260304-g3-intentstore-postgres-reconciler.md)
- G4 evidence: [`docs/evidence/ED-20260304-compiledcoderef-ownership.md`](../../evidence/ED-20260304-compiledcoderef-ownership.md)
- G8 spec: [`G8-REAL-AUTH-FINAL-SPEC.md`](G8-REAL-AUTH-FINAL-SPEC.md)
