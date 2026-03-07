---
title: DVT+ — Consolidated Architectural Review
status: Draft
owner: docs
last_reviewed: 2026-03-06
planning_type: review
---

# DVT+ — Consolidated Architectural Review

**Date:** 2026-03-05
**Basis:** Full codebase audit (all 23 packages + apps), ADR corpus (26+ ADRs), gap tracker G1–G10, architectural review Pass 1 + Pass 2, and cross-reference against three planning documents (Execution Model Spec, Architecture Handbook, God Diagram, Dependency Risk Map).
**Scope:** engine, planner, state, adapters, API, web UI, traceability, observability.

---

## 1. Executive Summary

The DVT+ platform is **~68% complete** by architectural surface area. Previous reviews underestimated coverage in three areas: the planner (`@dvt/planner` is 75% built, not an interface stub), the web UI (`apps/web` has 8 complete views on mock data), and the API (`apps/api` has a Fastify server with background workers but no domain routes).

The system's **core invariants are correctly implemented and ADR-backed**: event sourcing, idempotency, runSeq ordering, adapter isolation, intent-store crash consistency, and the getRunStatus/enrichRunStatus split. These are the hardest parts and they are done.

The remaining work is concentrated in **three wiring gaps** — all resolvable in 8–12 weeks:

1. **API engine routes** (POST /runs, GET /runs/:runId, DELETE, POST signal) — the engine is importable but no HTTP surface exists
2. **Real AuthZ** (JwtAuthorizer replacing AllowAllAuthorizer)
3. **UI→API wiring** (replacing `mockData.ts` with real `@tanstack/react-query` calls)

The architectural risks identified in Pass 1 and Pass 2 (stepTypeConfig, getSnapshot replay, outbox multi-instance, N+1 in maintenance sweeps) remain **open and unmitigated**. They do not block initial production but will cause production incidents at scale if unaddressed.

---

## 2. Codebase Reality — What Actually Exists

_This section corrects prior underestimates._

### 2.1 Packages inventory

| Package                     | Previous estimate | Actual status                                                                                                             |
| --------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `@dvt/engine`               | 90% ✅            | 90% ✅ — unchanged                                                                                                        |
| `@dvt/contracts`            | 95% ✅            | 95% ✅ — unchanged                                                                                                        |
| `@dvt/adapter-temporal`     | 70% ⚠️            | 70% ⚠️ — dbt result mapping pending                                                                                       |
| `@dvt/adapter-postgres`     | 85% ✅            | 85% ✅ — unchanged                                                                                                        |
| `@dvt/planner`              | 30% ⚠️ **WRONG**  | **75% ✅** — GraphBuilder, TopoSort, Depth, Planner.ts, stepFactory, manifest.ts, hashing, policies, limits               |
| `@dvt/planner-contracts`    | unknown           | ✅ PlannerInputStep, PlannerInputEnvelope                                                                                 |
| `@dvt/plan-interpreter`     | unknown           | **✅** — dagAnalyzer, types                                                                                               |
| `@dvt/plan-verifier`        | unknown           | **✅** — verifyPlanIdOrThrow, verifyPlanOrThrow, planVersion                                                              |
| `@dvt/dsl`                  | unknown           | **✅** — AST, parser, evaluator (gateway conditions)                                                                      |
| `@dvt/canonical`            | unknown           | ✅ — JCS + SHA256                                                                                                         |
| `@dvt/traceability-service` | stub              | **⚠️ 50%** — ICompiledCodeReader/Cache/Resolver, SqlJobFacetBuilder, StepStartedLineageMapper, Neo4j adapter, ADR catalog |
| `@dvt/observability`        | 80% ✅            | 80% ✅ — unchanged                                                                                                        |
| `@dvt/observability-otel`   | 80% ✅            | 80% ✅ — unchanged                                                                                                        |
| `apps/api`                  | 15% ⚠️ **WRONG**  | **35% ⚠️** — Fastify server, OTel, IntentReconcilerRuntime ✅; engine routes ❌                                           |
| `apps/web`                  | 0% ❌ **WRONG**   | **30% ⚠️** — 8 views (Canvas, Runs, Artifacts, Diff, Lineage, Cost, Plugins, Admin) on mock data                          |

### 2.2 Key architectural facts confirmed

- **Engine ↔ Planner are orthogonal** — zero imports between `@dvt/engine` and `@dvt/planner`. They communicate only through `PlanRef` via the API.
- **Planner is a pure function**: `buildPlan(PlannerInputEnvelopeV2) → {plan, canonicalPlanJson}`. `planId = sha256(JCS(planCore))`. Deterministic across runtimes.
- **ICompiledCodeStorage** has one method: `upload(sha256, content): storageUri`. Adapters: S3, MinIO, FileSystem, InMemory, Noop. This is the storage side of the plan artifact boundary — not yet exposed as a formal `IArtifactStore` domain port.
- **IntentReconcilerRuntime** in `apps/api/src/runtime/` uses metrics (counter, histogram, gauge) — confirming that the `IObservability` port is in active use in production code.
- **TraceabilityService** has a functioning OpenLineage pipeline skeleton: `StepStartedLineageMapper` → `SqlJobFacetBuilder` → `ILineageBackend` (Neo4j adapter exists but wiring is incomplete).

---

## 3. Gap Tracker — Updated Status

### Gaps G1–G10 (from DVT_ARCH_REVIEW_GAP_TASKS_20260226)

| Gap | Title                                   | Previous                         | Current   | Delta                                                                         |
| --- | --------------------------------------- | -------------------------------- | --------- | ----------------------------------------------------------------------------- |
| G1  | Temporal adapter real                   | In progress                      | ⚠️        | `lookupRunRef` ✅, lifecycle ✅, dbt step result mapping ❌                   |
| G2  | Postgres state store complete           | Closed                           | ✅ Closed | `listEvents` paging ✅, `listRuns(status)` ✅                                 |
| G3  | Start-run intent store + scheduler      | Code done, docs pending          | ✅ Closed | Postgres store ✅, reconciler ✅, API runtime ✅                              |
| G4  | compiledCodeRef ownership               | T4-2 done, T4-3/T4-4 in progress | ⚠️        | T4-2 ✅, T4-4 core ✅, T4-3 (adapter propagation to StepStarted.payload) ❌   |
| G5  | Independent outbox worker               | Pending                          | ⚠️        | OutboxWorker ✅, TokenBucketRateLimiter ✅; multi-instance ADR-0009 option ❌ |
| G6  | OpenLineage mapping tests + schema pin  | Pending                          | ❌        | No OL schema tests; OL spec version not pinned                                |
| G7  | Read models + standalone projector      | Pending                          | ⚠️        | SnapshotProjector ✅; async snapshot materialization ❌                       |
| G8  | Real auth in `apps/api`                 | Pending                          | ❌        | AllowAllAuthorizer only; JwtAuthorizer not started                            |
| G9  | StepTypeRegistry + typed stepTypeConfig | Pending                          | ❌        | `stepTypeConfig: Record<string, unknown>` unchanged                           |
| G10 | `outbox_lineage` worker + fail-open DLQ | Pending                          | ❌        | No `outbox_lineage` table or worker                                           |

### New gaps identified in this review (G11–G16)

| Gap | Title                                          | Blocks                               | Effort                |
| --- | ---------------------------------------------- | ------------------------------------ | --------------------- |
| G11 | API engine routes                              | UI real data; any external consumer  | 1 week                |
| G12 | UI → API wiring (replace mockData.ts)          | End-to-end visible system            | 1–2 weeks (after G11) |
| G13 | dbt step result mapping (`DbtExecutionResult`) | Step-level analytics; G4-T4-3        | 1–2 weeks             |
| G14 | SnapshotRebuildService                         | Production incident recovery         | 3–5 days              |
| G15 | TraceabilityService → Neo4j wiring             | Production lineage                   | 1–2 weeks             |
| G16 | catalog.json + run_results.json parsers        | Complete artifact ingestion pipeline | 1–2 weeks             |

---

## 4. Architectural Risk Register — Consolidated

Risks from Pass 1, Pass 2, and this review. Severity unchanged unless noted.

### Critical

| Risk                                                                                                                      | Severity | Likelihood | Status     | Mitigation                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------- | -------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------- |
| `stepTypeConfig: Record<string, unknown>` — implicit bilateral contract between Temporal adapter and Conductor; no schema | Critical | High       | ❌ Open    | Define `StepTypeRegistry` with versioned schemas per `stepKind` (G9)                           |
| `outbox_lineage` worker unspecified                                                                                       | High     | Certain    | ❌ Open    | Apply ADR-0009 INV-OUTBOX-001..005; define poll interval, DLQ, fail-open policy                |
| Plan storage service undefined as domain port                                                                             | High     | Certain    | ⚠️ Partial | `ICompiledCodeStorage` exists with 5 adapters; needs elevation to `IArtifactStore` formal port |

### High

| Risk                                                                                                               | Severity | Likelihood | Status                   | Mitigation                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------ | -------- | ---------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| N+1 in `detectStuckCancellingRuns` (2 queries × 100 candidates)                                                    | High     | Certain    | ❌ Open                  | Denormalize `cancelling_since` to `RunMetadata`                                                                       |
| N+1 in `reconcileOrphanedIntents` (1 DB + 1 Temporal call per intent)                                              | High     | Certain    | ❌ Open                  | Batch DB fetch; parallelize adapter calls with `Promise.allSettled`                                                   |
| `getSnapshot()` full event replay at UI scale (O(events) per request)                                              | High     | High       | ❌ Open                  | Async snapshot materialization after `appendAndEnqueueTx`; `workflow_snapshots` table                                 |
| OutboxWorker multi-instance ordering violation                                                                     | High     | High       | ❌ Open                  | Row-level advisory lock per outbox entry (ADR-0009 Option B)                                                          |
| `StepKind` unknown at scheduling time — bad plan fails inside Temporal, not at submission                          | High     | Medium     | ❌ Open                  | StepKind registry with validation at `buildPlan()` time (G9)                                                          |
| `compiledCodeRef` unavailable at StepStarted emission (compiled SQL is in `run_results.json`, not `manifest.json`) | High     | Certain    | ⚠️ In progress (G4-T4-3) | Option A: Planner stores compiled SQL during plan compilation; Option B: move `compiledCodeRef` to StepCompleted only |
| `dvt_cost` fire-and-forget bypasses outbox — Marquez downtime = silent cost loss                                   | High     | High       | ❌ Open                  | Route cost events through `outbox_lineage` (G10)                                                                      |
| API has no engine routes — engine cannot be called externally                                                      | High     | Certain    | ❌ Open (G11)            | `POST /runs`, `GET /runs/:id`, `DELETE /runs/:id`, `POST /runs/:id/signal`                                            |

### Medium

| Risk                                                                                | Severity | Likelihood | Status           | Mitigation                                                                   |
| ----------------------------------------------------------------------------------- | -------- | ---------- | ---------------- | ---------------------------------------------------------------------------- |
| `engineAttemptId: 1` hardcoded in `buildRunEvent` — incorrect for retried runs      | Medium   | Certain    | ❌ Open          | Pass actual attempt from `RunMetadata` or adapter context                    |
| `EngineRunRef` closed discriminated union — new provider = breaking contract change | Medium   | Medium     | ❌ Open          | Registry-based `{ provider: string; ref: unknown }` with typed accessors     |
| No run retention policy — `run_events` grows indefinitely                           | Medium   | High       | ❌ Open          | TTL / archival job; default 90 days (per THREAT_MODEL)                       |
| `getPgPool` singleton — pool exhaustion in one component blocks all                 | Medium   | Low        | ❌ Open          | Separate pools per major subsystem or per-component limits                   |
| OL spec version not pinned — facet schema breaking changes                          | Medium   | High       | ❌ Open (G6)     | Pin `_schemaURL` to specific OL spec version; CI validation                  |
| `StepSkipped → OL OTHER` produces ambiguous lineage graphs                          | Medium   | High       | ⚠️ Design needed | OL ABORT for upstream-failed skips vs OTHER for selector-excluded            |
| `IPlanContextResolver` N+1 plan fetches at scale (1000 resolveStep() calls)         | Medium   | High       | ❌ Open          | Cache keyed by `(planRef.sha256, stepId)`; plan is immutable → TTL unbounded |
| `RunPaused/RunResumed` creates temporal gap in OL lineage (false stuck-run alerts)  | Medium   | Medium     | ❌ Open          | Periodic OTHER heartbeat with `dvt_pause_state` facet                        |
| Temporal circuit breaker absent — `startRun` throws if Temporal unavailable         | Medium   | Medium     | ❌ Open          | Circuit breaker with graceful degradation in `TemporalAdapter.startRun`      |
| Tenant-level concurrency limits absent — unlimited concurrent `startRun` per tenant | Medium   | Medium     | ❌ Open          | Quota enforcement at engine boundary                                         |
| UI running entirely on mock data — contract drift risk                              | Medium   | Certain    | ❌ Open (G12)    | Wire UI to API routes after G11                                              |
| Zero tests in `apps/web`                                                            | Medium   | Certain    | ❌ Open          | Vitest + Testing Library for critical views                                  |
| `pg_advisory_lock` in SchemaManager incompatible with PgBouncer transaction pooling | Low      | Medium     | ❌ Open          | Use session-pooling mode or explicit schema_migrations table locking         |

---

## 5. Architectural Scorecard — Updated

| Dimension                 | Pass 1  | Pass 2  | This review | Change   | Justification                                                                                              |
| ------------------------- | ------- | ------- | ----------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| Conceptual clarity        | 8/10    | 7/10    | **8/10**    | +1       | Planner is 75% built and correctly designed; plan storage gap is partially resolved                        |
| Separation of concerns    | 7/10    | 7/10    | **7/10**    | =        | RunMaintenanceService SRP violation still present; `intentReconcilerRuntime` uses concrete types           |
| Replaceability of engine  | 6/10    | 6/10    | **6/10**    | =        | `EngineRunRef` closed union; `lookupRunRef` optional creates behavioral divergence                         |
| Determinism               | 7/10    | 6/10    | **7/10**    | +1       | `logicalAttemptId` implemented; `stepTypeConfig` and `engineAttemptId` still open                          |
| Extensibility             | 5/10    | 7.5/10  | **6/10**    | -1.5     | `ILineageBackend` port is clean; `StepTypeRegistry` still missing; `EngineRunRef` union still closed       |
| Operational realism       | 6/10    | 4.5/10  | **5/10**    | +0.5     | `IntentReconcilerRuntime` with metrics is production-grade; snapshot replay and outbox multi-instance open |
| Long-term maintainability | 7/10    | 6/10    | **7/10**    | +1       | ADR corpus at 26+; `@dvt/plan-verifier` + `@dvt/dsl` + `@dvt/canonical` well-scoped packages               |
| **Overall**               | **6.6** | **6.3** | **6.6**     | **+0.3** | Core gains; operational gaps unchanged                                                                     |

---

## 6. What Is Overbuilt

Unchanged from Pass 1 findings, plus one new item:

- **IStartRunIntentCommandStore/IStartRunIntentQueryStore CQRS split** at 6 methods total — architectural theater at this scale. `IStartRunIntentStore` with 6 methods is sufficient.
- **StartRunIntentSchemaManager** re-implements Flyway's core loop — maintenance burden if project adopts Flyway later.
- **compiledCodeRef (ADR-0032) at V0 scope** — S3 dependency for traceability introduces a failure mode (S3 outage = permanent lineage gap) worse than the problem it solves at V0 scale. Store SQL inline in `StepStarted.payload` capped at 64KB first.
- **`dvt_deps` facet per step** (Pass 2) — forces job version proliferation in Marquez for package updates. Phase 1: run-level only.
- **`reconcileOrphanedIntents` PENDING path** — calls `adapter.lookupRunRef()` for every PENDING orphaned intent, making external Temporal API calls in a background reconciliation loop. Temporal API slowdown blocks the entire sweep. Consider batching or parallel `Promise.allSettled`.

---

## 7. What Is Underbuilt

| Item                                                | Risk if deferred                                    | Effort                                                   |
| --------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| API engine routes (G11)                             | System not callable externally                      | 1 week                                                   |
| JwtAuthorizer / real AuthZ (G8)                     | Multi-tenant security gap                           | 2–3 weeks                                                |
| Async snapshot materialization (G7)                 | O(events) per UI request at scale                   | 1–2 weeks                                                |
| OutboxWorker multi-instance ordering (G5, ADR-0009) | Duplicate delivery in production                    | 1 week                                                   |
| StepTypeRegistry + plan validation (G9)             | Runtime failures instead of submission failures     | 1–2 weeks                                                |
| Run retention policy                                | Unbounded table growth                              | 1 week                                                   |
| UI → API wiring (G12)                               | Contract drift between UI model and domain          | 1–2 weeks (after G11)                                    |
| `compiledCodeRef` timing fix (G4-T4-3)              | OL StepStarted events permanently incomplete        | 1–2 weeks                                                |
| `outbox_lineage` worker (G10)                       | OL cost events lost on Marquez downtime             | 1–2 weeks                                                |
| SnapshotRebuildService (G14)                        | Production incidents require manual DB intervention | 3–5 days                                                 |
| `engineAttemptId` pass-through                      | Incorrect lineage for retried runs                  | 2–3 days                                                 |
| `cancelRun`/`signal` crash recovery                 | Partial cancellation with no compensation path      | 1 week                                                   |
| DAG cycle detection contract                        | Cyclic plans deadlock Temporal workflow             | Already in GraphBuilder — needs contract-level guarantee |
| Tenant concurrency limits                           | Unlimited run submission per tenant                 | 1–2 weeks                                                |

---

## 8. Recommendations — Priority Order

### P0 - Do now (production safety, high ratio impact/effort)

**P0-A: API engine routes**
Four routes over `WorkflowEngine` (already imported in `apps/api`). Pattern established by health routes.
Effort: **1 week**

**P0-B: SnapshotRebuildService**
Iterate `listRuns`, `listEvents`, project, save snapshot. Operational safety net.
Effort: **3-5 days**

**P0-C: Instrument WorkflowEngine with metrics**
5 metric calls following the pattern already in `intentReconcilerRuntime.ts`.
`dvt_run_started_total`, `dvt_run_duration_ms`, `dvt_run_failed_total`, `dvt_step_duration_ms`, `dvt_outbox_delivery_lag_ms`.
Effort: **2-3 days**

**P0-D: OutboxWorker row-level lock (ADR-0009 Option B)**
Multi-instance correctness. `FOR UPDATE SKIP LOCKED` per outbox entry.
Effort: **3-4 days**

### P1 - Sprint 2 (closes critical wiring gaps)

**P1-A: JwtAuthorizer real** — tenant-scoped JWT claims validation
Effort: **2-3 weeks**

**P1-B: IArtifactStore formal port** — elevate `ICompiledCodeStorage` to domain-level hexagonal port
Effort: **4-5 days**

**P1-C: dbt step result mapping** — `DbtExecutionResult` type + `StepFailed(reason)` structured
Effort: **1-2 weeks**

**P1-D: G4-T4-3 compiledCodeRef** — propagate `compiledCodeRef` to `StepStarted.payload` via adapter-temporal
Effort: **1 week** (G4 T4-3)

**P1-E: Async snapshot materialization** — post-`appendAndEnqueueTx` snapshot enqueue; `workflow_snapshots` table
Effort: **1-2 weeks**

### P2 - Sprint 3 (productization)

**P2-A: UI → API wiring** — replace `mockData.ts` with `@tanstack/react-query`; start with `RunsView` + `Canvas`
Effort: **1-2 weeks** (after P0-A)

**P2-B: StepTypeRegistry + plan validation** — close G9; validate `stepTypeConfig` at `buildPlan()` time
Effort: **1-2 weeks**

**P2-C: outbox_lineage worker** — close G10; apply ADR-0009 invariants; fail-open DLQ
Effort: **1-2 weeks**

**P2-D: Run retention policy** — TTL / archival job; 90-day default
Effort: **1 week**

**P2-E: OL schema pin + CI tests** — close G6
Effort: **1 week**

**P2-F: engineAttemptId pass-through** — pass actual attempt from `RunMetadata`
Effort: **2-3 days**

### P3 - Sprint 4 (extensibility)

**P3-A: SSE/WS streaming** — real-time status after P0-A + P2-A
Effort: **2 weeks**

**P3-B: TraceabilityService → Neo4j wiring** — close G15
Effort: **1-2 weeks**

**P3-C: catalog.json + run_results.json parsers** — close G16
Effort: **1-2 weeks**

**P3-D: Frontend tests** — minimal Vitest + Testing Library coverage for `RunsView` and `Canvas`
Effort: **1-2 weeks**

**P3-E: Replay/determinism certification suite**
Effort: **1 week**

### Post-MVP (no date)

- Plugin runtime sandbox (4–6 weeks)
- Conductor adapter (6–8 weeks — after Temporal production-hardened)
- `warehouse_cost` from Snowflake QUERY_HISTORY (2–3 weeks)
- Snowflake External Lineage backend (only if enterprise requirement)
- `EngineRunRef` registry-based extensibility (breaking change — plan carefully)
- PG partitioning `(tenant_id, created_at)` for `run_events` at scale

---

## 9. Phase Roadmap — Updated

```
Current sprint (this week)
|- P0-A: API engine routes                    [1 week]
|- P0-B: SnapshotRebuildService               [3-5 days]
|- P0-C: WorkflowEngine instrumentation       [2-3 days]
`- P0-D: OutboxWorker row-level lock          [3-4 days]

Sprint 2
|- P1-A: JwtAuthorizer real                   [2-3 weeks]
|- P1-B: IArtifactStore port formal           [4-5 days]
|- P1-C: dbt step result mapping              [1-2 weeks]
|- P1-D: G4-T4-3 compiledCodeRef propagation  [1 week]
`- P1-E: Async snapshot materialization       [1-2 weeks]

Sprint 3
|- P2-A: UI -> API wiring                     [1-2 weeks]
|- P2-B: StepTypeRegistry                     [1-2 weeks]
|- P2-C: outbox_lineage worker                [1-2 weeks]
|- P2-D: Run retention policy                 [1 week]
|- P2-E: OL schema pin + CI tests             [1 week]
`- P2-F: engineAttemptId pass-through         [2-3 days]

Sprint 4
|- P3-A: SSE/WS streaming                     [2 weeks]
|- P3-B: TraceabilityService -> Neo4j         [1-2 weeks]
|- P3-C: catalog + run_results parsers        [1-2 weeks]
|- P3-D: Frontend tests                       [1-2 weeks]
`- P3-E: Replay certification suite           [1 week]

Post-MVP
├── Plugin runtime sandbox                     [4-6 sem]
├── Conductor adapter                          [6-8 sem]
└── warehouse_cost attributor                  [2-3 sem]
```

---

## 10. Freeze List — Do Not Change Without ADR

The following are baked into stored data and cannot change without a migration plan and backward compatibility analysis:

1. **`IRunStateStore.v1.ts` event type set** — RunQueued, RunStarted, RunFailed, etc. Any new event type or payload field requires ARC-2 Evidence Doc with replay impact analysis.
2. **`idempotencyKey` generation formula** — `eventType + runId + logicalAttemptId + planId + planVersion`. Changing this invalidates deduplication for in-flight runs.
3. **`EngineRunRef` fields per provider** — adding/removing fields breaks deserialization of stored refs in `engine_run_ref JSONB`.
4. **`planId = sha256(JCS(planCore))`** — the planId derivation is baked into stored plans. A formula change requires a migration of all stored plan identifiers.
5. **`ILineageBackend` as single OL output port** — Marquez/Snowflake-specific logic must stay outside core.
6. **`INV-OL-003`** — Planner MUST NOT read from any OL store as input to plan generation.

---

## 11. Items to Delay

| Item                                  | Reason                                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| Conductor adapter                     | Temporal not yet production-hardened; behavioral parity not achievable without shims   |
| Plugin runtime                        | No isolation strategy; VM2 deprecated; Worker thread sandboxing needs infra investment |
| `dvt_deps` facet per step             | Forces Marquez job version proliferation; no concrete use case yet                     |
| Snowflake External Lineage dual-write | No enterprise requirement                                                              |
| Cost dashboard UI                     | Validate `dvt_cost` pipeline first                                                     |
| CompositeLineageBackend fan-out       | No concrete need until second backend required                                         |

---

## 12. Overall Coverage Summary

| Layer                                  | %        | Trend vs last review |
| -------------------------------------- | -------- | -------------------- |
| Engine Core                            | 90%      | =                    |
| State Platform                         | 90%      | =                    |
| Temporal Adapter                       | 70%      | =                    |
| Planner (`@dvt/planner`)               | 75%      | ↑ (was 30%)          |
| plan-interpreter + verifier + dsl      | 60%      | ↑ (was unknown)      |
| Observability (IObservability + OTel)  | 80%      | =                    |
| TraceabilityService                    | 50%      | ↑ (was stub)         |
| Artifact System (ICompiledCodeStorage) | 55%      | ↑ (was 10%)          |
| API Layer                              | 35%      | ↑ (was 15%)          |
| UI Layer                               | 30%      | ↑ (was 0%)           |
| CQRS write path                        | 90%      | =                    |
| CQRS read surface (API→UI)             | 15%      | ↑ (was 0%)           |
| AuthZ                                  | 15%      | =                    |
| Tests — engine                         | 85%      | =                    |
| Tests — API                            | 20%      | =                    |
| Tests — web                            | 0%       | =                    |
| **Overall**                            | **~68%** | **↑ from ~55%**      |

---

## 13. References

- Gap tracker: [`../gaps/GAP_EXECUTION_PLANS.md`](../gaps/GAP_EXECUTION_PLANS.md)
- Parallel tracks: [`../gaps/GAP_PARALLEL_EXECUTION_TRACKS.md`](../gaps/GAP_PARALLEL_EXECUTION_TRACKS.md)
- G4 task spec: [`../gaps/G4-TASK-SPECIFICATION.md`](../gaps/G4-TASK-SPECIFICATION.md)
- G3 task spec: [`../gaps/G3-TASK-SPECIFICATION.md`](../gaps/G3-TASK-SPECIFICATION.md)
- Execution Model Spec: [`../execution-model/dvt-execution-model.md`](../execution-model/dvt-execution-model.md)
- Reference Architecture: [`../../architecture/reference-architecture.md`](../../architecture/reference-architecture.md)
- God Diagram: [`../execution-model/dvt-system-map-god-diagram.md`](../execution-model/dvt-system-map-god-diagram.md)
- Dependency Risk Map: [`../execution-model/dvt-dependency-risk-map.md`](../execution-model/dvt-dependency-risk-map.md)
- ADR corpus: [`../../adr/`](../../adr/)
- OpenLineage spec: https://openlineage.io/
- Temporal: https://docs.temporal.io/
