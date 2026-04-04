---
title: 'DVT+ Deep Architectural Review — Principal Architect'
status: Complete
date: 2026-04-02
reviewer: Principal / Staff Architect (AI-assisted)
scope: Full system — engine, planner, contracts, adapters, state-store, API, workers
review_type: architecture-and-governance
---

# DVT+ Deep Architectural Review

**Date:** 2026-04-02
**Reviewer:** Principal / Staff Software Architect
**Method:** Source-code-first review of all packages, apps, contracts, and ADRs.

---

## 1. Conceptual Soundness

### The Core Principle Under Validation

> "The UI does not execute. The engine does not decide. The planner does not persist state."

**Verdict: The separation is structurally enforced at the code level. It is not aspirational.**

### What Is Solid

**Planner / Engine separation is real and clean.**

- The `Planner` class (`packages/@dvt/planner/src/domain/Planner.ts`) is a pure, deterministic domain service. It has zero dependencies on state stores, adapters, or side-effecting infrastructure. It takes `PlannerInputEnvelopeV1` and returns `{ plan: ExecutionPlan; canonicalPlanJson: string }`. It does not write to disk, database, or outbox. This is correct.
- The `WorkflowEngine` (`packages/@dvt/engine/src/core/WorkflowEngine.ts`) delegates run initiation to `StartRunCoordinator` and lifecycle operations to `WorkflowEngineCoreService`. It does not call the planner. The planner is invoked upstream in the API app layer (`PlannerBackedStartRunUseCase`), which stores the plan and passes a `PlanRef` down. The engine never sees a raw manifest or DAG — it sees an opaque `PlanRef` with a SHA-256 hash.
- `PlanRef` is the bridge: the engine receives it, the adapter fetches and verifies the bytes. Per ADR-0012, the adapter owns plan-bytes trust boundary. The engine never fetches plan content.

**State as source of truth is implemented, not hypothetical.**

- `IRunStateStoreWrite.bootstrapRunTx` and `appendAndEnqueueTx` are the only write paths. Events go into the event store within a Postgres transaction, along with outbox enqueue and snapshot materialization (`PostgresRunStateCoordinator`). The snapshot is a projection, not the authority.
- `getRunStatus` in `WorkflowEngineCoreService` reads from snapshot first, falls back to full event replay. This is ADR-0004 compliant.
- `applyRunEvent` in `@dvt/run-domain` is a pure function: it takes a `WorkflowSnapshot` and an `EventEnvelope` and mutates the snapshot deterministically. Terminal state guards are enforced (cannot transition from COMPLETED/FAILED/CANCELLED).

**Adapter abstraction is minimal and correct.**

- `IProviderAdapter` has exactly 6 methods: `startRun`, `cancelRun`, `getRunStatus`, `signal`, plus optional `estimateRunRef`, `capabilities`, `lookupRunRef`, `ping`. This is the right surface area.
- `TemporalAdapter` is a complete, non-stub implementation. `RunPlanWorkflow` is a full deterministic Temporal workflow with layer-based execution, continue-as-new support, gateway evaluation, pause/resume/cancel signals.

### What Is Fragile

**1. Conductor adapter does not exist in practice.**

- `ConductorAdapterStub.ts` and `TemporalAdapterStub.ts` exist in the engine package under `adapters/`. The Conductor adapter is purely a type-level stub. The multi-engine abstraction claims to support `'temporal' | 'conductor' | 'mock'` as providers (see `RunMetadata.provider`), but only Temporal has a real implementation. This creates a false impression of portability.
- **Risk:** If anyone tries to use the Conductor path, they will discover it does not work. The abstraction cost is being paid for a path that may never be exercised.

**2. The planner has an implicit Snowflake/dbt coupling.**

- While `PlannerInputEnvelopeV1` is formally generic (accepts `graphSource`, `manifestRef`, `manifest`, `nodes`), the actual step factory is `dbtStepFactory` by default. The `StepKind` type is `string`, but the only registered kinds are `DBT_MODEL`, `DBT_TEST`, `DBT_SNAPSHOT`. The `GenericGraphSourceV1` type exists for multi-workflow planning, but there is no generic step factory implementation.
- **Risk:** The planner claims to be dbt-agnostic via its types but is dbt-specific via its runtime defaults. Extending to non-dbt workflows requires writing a new step factory, new registry entries, and potentially new adapter activities — all of which are undocumented.

**3. UI state-driven model depends on snapshot freshness.**

- The API reads snapshots via `getRunStatus`. Snapshots are updated transactionally with event append. But if the outbox worker lags or the projector crashes mid-transaction, there is a window where the snapshot is stale. The fallback to full replay is correct, but expensive for runs with thousands of events.
- The `IRunSnapshotStalenessQuery` contract exists but its implementation's behavior under load is unvalidated.

### What Is Missing

**1. No contract for the API-to-Engine boundary.**

- The API app (`apps/api`) defines its own `startRunCommandContract.ts`, `startRunResultContract.ts`, `startRunUseCaseContract.ts`, etc. These are local to the API app. There is no shared contract between the API and the engine that is versioned in `@dvt/contracts`. The `StartRunCommand` type in the API is not the same as the engine's `PlanRef + RunContext` — there is an impedance-mismatch bridge in `PlannerBackedStartRunUseCase`.
- **Risk:** The API's contract surface can drift from the engine's expectations without triggering contract CI checks.

**2. No explicit distributed transaction model for the startRun path.**

- The `startRun` flow is: admission guard → create intent → bootstrap run (Postgres tx: metadata + RunQueued event + outbox) → adapter.startRun (Temporal workflow start) → if fail, failure policy. ADR-0030 addresses the crash consistency gap between intent creation and dispatch. But the actual compensation logic in `StartRunFailurePolicy` handles the gap with best-effort event emission and intent marking. There is no saga or distributed transaction coordinator.
- **Impact:** Acceptable for current scale. At 1000+ concurrent startRun calls, partial failures in the Temporal → Postgres path could produce orphaned intents that require manual reconciliation (or the `ReconcileOrphanedIntents` job, which is not fully wired yet based on what I can see in source).

---

## 2. Architectural Risk Map

| #   | Risk                                               | Severity | Likelihood              | Why                                                                                                                                                                                                                                                                                                                        | Mitigation                                                                                                                   |
| --- | -------------------------------------------------- | -------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| R1  | **Snapshot staleness under outbox lag**            | High     | Medium                  | Snapshot is updated in the same TX as event append, but if the write path is slow or contended, `getRunStatus` may serve stale data. Replay fallback is O(n) on event count.                                                                                                                                               | Implement snapshot-age alerting. Add a fast-path `lastSeq` comparison in `getSnapshot` to detect divergence.                 |
| R2  | **Outbox ordering guarantees are per-run only**    | Medium   | Medium                  | The outbox `SKIP LOCKED` claim ensures per-run ordering (no event is claimed if a prior event for the same run is undelivered), but cross-run ordering is best-effort (created_at ASC). ADR-0009 (Outbox Ordering) is still `Proposed`, not `Accepted`.                                                                    | Harden ADR-0009 to `Accepted`. Document that cross-run ordering is not guaranteed and consumers must handle this.            |
| R3  | **Conductor adapter is vaporware**                 | Low      | High (it will be tried) | `ConductorAdapterStub` exists. Provider enum includes `'conductor'`. No implementation.                                                                                                                                                                                                                                    | Either build it or remove the enum value and stub. Don't ship a type-level promise with no runtime backing.                  |
| R4  | **Tenant isolation in backpressure is shallow**    | Medium   | Medium                  | `BackpressureStore.getTenantSnapshot` returns `pendingEventsPerTenant` but the outbox table is shared across tenants. Shard assignment is by `md5(run_id)`, not by tenant. A noisy tenant's events pollute shards that other tenants use.                                                                                  | Consider per-tenant shard affinity or tenant-prefixed shard allocation.                                                      |
| R5  | **Event log growth is unbounded in practice**      | High     | High                    | `IRunStateStore` has no TTL or retention policy at the storage level. `RunArchiveCoordinator` and `DeliveryBufferPurger` exist but require explicit scheduling. If operators don't configure the archive worker, the event table grows without bound.                                                                      | Make retention policy mandatory in deployment config. Add a health-check that alerts when event count exceeds threshold.     |
| R6  | **Plan-bytes fetch in adapter is a latency spike** | Medium   | High                    | Per ADR-0012, the adapter fetches plan bytes and verifies SHA-256. This happens inside `adapter.startRun()`, which is called while the engine holds the startRun span open. For large plans (1000+ steps → large JSON), this adds hundreds of ms to run start latency.                                                     | Consider pre-warming plan cache at the adapter level. Add a plan-size metric to monitor.                                     |
| R7  | **No circuit breaker on adapter calls**            | Medium   | Medium                  | `WorkflowEngineCoreService` wraps adapter calls in `withTimeout` but there is no circuit breaker. If Temporal is down, every call waits for the timeout, creating a cascade. The IWorkflowEngine v2.0 spec says "circuit breaking is the infrastructure layer's responsibility" but no infrastructure layer implements it. | Implement a circuit breaker in `ObservedTemporalAdapter` or at the adapter registry level.                                   |
| R8  | **Idempotency key collision at scale**             | Low      | Low                     | `IdempotencyKeyBuilder.runEventKey` derives keys from `(eventType, tenantId, runId, logicalAttemptId, planId, planVersion, stepId?)`. If any two distinct events produce the same key, one is silently deduplicated. The derivation looks sound but is not formally tested for collision resistance at scale.              | Add property-based tests for key uniqueness across realistic event distributions.                                            |
| R9  | **continue-as-new state serialization**            | Medium   | Low                     | `RunPlanWorkflow` carries `completedStepResults`, `gatewayDecisions`, `skippedStepIds` across continue-as-new boundaries. For plans with 1000+ steps, this payload grows large. Temporal has a 4MB event history limit, but the `continueAsNew` input is also bounded by gRPC message size (default 4MB).                  | Add a plan-step-count guard that rejects plans exceeding a safe threshold for the configured `continueAsNewAfterLayerCount`. |
| R10 | **RBAC is tenant-only, not role-based**            | Medium   | High (at scale)         | `IRunAccessPolicy` has only `assertTenantAccess`, `validatePlanRef`, and `checkRateLimit`. There is no role differentiation (admin vs. viewer vs. executor). `IAuthorizer` is an opaque interface with a single method.                                                                                                    | Extend `IRunAccessPolicy` with role-based checks before multi-tenant SaaS launch.                                            |

---

## 3. Engine Abstraction Critique

### IWorkflowEngine — Is It Minimal and Correct?

**Yes.** The interface has 5 methods:

```typescript
startRun(planRef: PlanRef, context: RunContext): Promise<EngineRunRef>
cancelRun(engineRunRef: EngineRunRef): Promise<void>
getRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot>
enrichRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot>
signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void>
```

The `getRunStatus` / `enrichRunStatus` split per ADR-0015 is correct: the former reads from state only (no adapter dependency), the latter enriches from the provider. This keeps the hot read path fast and the diagnostic path honest about its latency cost.

The `signal` method accepts typed `SignalRequest` with `type: 'PAUSE' | 'RESUME' | 'CANCEL' | 'RETRY_STEP' | 'RETRY_RUN'`. RETRY\_\* is marked as Phase 2 in the Temporal adapter. This is honest.

**One concern:** `startRun` takes `PlanRef` which carries `requiresCapabilities`. The engine validates these against `adapter.capabilities()`. If the adapter doesn't implement `capabilities()`, validation is skipped. This is fail-open, which is documented but risky if a plan requires a capability the adapter cannot provide.

### Temporal-First Strategy — Is It Wise?

**Yes, with a caveat.** Temporal is the only real adapter. The workflow (`RunPlanWorkflow`) is well-implemented:

- Deterministic: no `Date.now()`, no `Math.random()`, no Node.js APIs.
- Layer-based execution with `planExecutionLayers` from `@dvt/plan-interpreter`.
- Continue-as-new for long-running plans.
- Gateway evaluation with downstream step skipping.
- Signal handling (pause/resume/cancel) at safe points between layers.

**The caveat:** The Temporal-first strategy is a Temporal-only strategy in practice. The multi-engine abstraction adds complexity (adapter registry, provider selection, per-provider metrics) without delivering the promised portability. If Conductor is ever needed, the adapter contract is clean enough to implement — but the current codebase pretends it's already there.

### Event Model — Is It Robust?

**Yes.** The event model is well-designed:

- 12 event types covering the full run lifecycle: `RunQueued`, `RunStarted`, `RunPaused`, `RunResumed`, `RunCancelRequested`, `RunCancelled`, `RunCompleted`, `RunFailed`, `StepStarted`, `StepCompleted`, `StepFailed`, `StepSkipped`.
- Each event has `eventId`, `idempotencyKey`, `runSeq` (strictly increasing), `emittedAt`, full tenant/project/environment scoping.
- Deduplication by `(runId, idempotencyKey)` at the storage layer.
- The `applyRunEvent` pure function enforces state transition guards (no transition from terminal states).
- `CompiledCodeRef` in `StepStarted.payload` follows content-addressable storage pattern (ADR-0032).

**Where determinism could fail:**

1. **Clock skew between workflow and engine.** `emittedAt` is set by the activity caller (inside the Temporal workflow), not by the storage layer. If the activity host's clock drifts, `emittedAt` may not be monotonically increasing relative to `runSeq`. This is acceptable because `runSeq` is the ordering authority (ADR-0004), not `emittedAt`.
2. **Activity retry creates duplicate events.** Temporal retries activities automatically. The activity `emitEvent` calls `appendAndEnqueueTx` which uses `idempotencyKey` for dedup. If the activity succeeds but the response is lost, Temporal retries, and the second attempt is deduplicated. This is correct. However, the `idempotencyKey` derivation must be deterministic for the same logical event — which it is, since it's derived from `(eventType, tenantId, runId, logicalAttemptId, planId, planVersion, stepId?)`.

### ExecutionPlan — Is It Sufficiently Expressive?

**Mostly yes.** The plan carries:

- `metadata.planVersion` (from `SupportedPlanVersion` registry per ADR-0036).
- `metadata.planId` = SHA-256 of the canonical JSON of `PlanCore`.
- `metadata.inputHashSha256` = SHA-256 of `{ nodes, selection, policies }`.
- `steps[]` with `stepId`, `kind`, `dependsOn`, `stepTypeConfig`, optional `gateway` with DSL expression.
- `observability` bag for tags and extra data.

**What it lacks:**

- No explicit concurrency limits per layer. The workflow executes all steps in a layer with `Promise.all`, which for a layer with 500 nodes means 500 concurrent activity executions.
- No explicit resource requirements (memory, CPU) per step. Cost estimation is aspirational — the `estimator` is referenced in docs but absent from the planner source code.
- No plan-level retry policy. Retry semantics are hardcoded in the Temporal activity proxy config (3 attempts, exponential backoff). The plan cannot override this per-step.

---

## 4. Execution Planning Layer Analysis

### DAG Analyzer

`GraphBuilder` correctly:

- Validates node invariants (non-empty nodeId, resourceType, array dependsOn).
- Enforces uniqueness (NodeRegistry).
- Builds adjacency index with edge-count limits.
- Rejects dangling dependencies (dependsOn referencing non-existent nodes).

`TopoSort` (Kahn's algorithm based on the code structure) produces a deterministic topological ordering. `computeTopoDepth` calculates critical-path depth.

**The DAG analyzer does not detect cycles.** `topoSort` will produce incomplete results for cyclic graphs (Kahn's algorithm naturally skips cycles), but there is no explicit cycle detection error. A cyclic input will silently produce a plan missing some steps.

**Fix:** Add an explicit check: if `topo.length < selected.length`, there is a cycle. Throw `PlannerErrorCode.GRAPH_CYCLE`.

### Partial Execution Guarantees

Node selection (`NodeSelector`) supports `selectedNodeIds` with optional `includeUpstream` and `includeDownstream`. This enables partial execution. However:

- There is no mechanism to mark previously-completed steps as "skip" in a re-execution.
- There is no diff against a prior plan's execution state.
- Partial execution is all-or-nothing within the selected scope.

### Retry/Backoff Policy Ownership

Retry policy is owned by the Temporal activity proxy configuration:

```typescript
retry: {
  initialInterval: '1s',
  maximumInterval: '60s',
  backoffCoefficient: 2,
  maximumAttempts: 3,
  nonRetryableErrorTypes: ['PermanentStepError'],
}
```

This is static. The plan has no per-step retry override. The `TemporalPolicyMapper` exists but maps plan-level policies to Temporal-level configs, not per-step.

**Assessment:** Under-specified. For production use with diverse step types (model builds vs. tests vs. snapshots), different steps need different retry characteristics. A model build that fails due to Snowflake timeout should retry with longer intervals than a test that fails due to assertion error.

### Cost Estimator

**Does not exist in code.** The planner has `metrics.recordPlanSize()` and `metrics.recordNodeCount()` but no cost estimation function. Cost attribution is referenced in documentation as a future capability.

### Plan Versioning Strategy

Well-implemented per ADR-0017 and ADR-0036:

- `SupportedPlanVersion` type controls which plan versions are accepted.
- `PlanVersionPolicy` in the engine validates that the plan's version is in the supported set.
- `CURRENT_EXECUTION_PLAN_VERSION` is bumped in `@dvt/contracts`.

**This is solid.** The versioning strategy allows forward-compatible plan evolution without breaking existing runs.

### Coupling to Snowflake

**Indirect.** The planner itself has no Snowflake imports. But:

- `dbtStepFactory` creates steps with `kind: 'DBT_MODEL' | 'DBT_TEST' | 'DBT_SNAPSHOT'`.
- The Temporal activity `executeStep` presumably calls dbt, which calls Snowflake.
- The `DbtStepTypeConfig` (from `@dvt/contracts/step-registry`) carries dbt-specific config.

The coupling is at the step-factory and activity level, not the planner core. This is the correct layer for it to live.

---

## 5. State & Metadata Layer Review

### Artifact Immutability

**Implemented correctly.** Plans are content-addressed by SHA-256. The `planId` is derived from the canonical JSON of the plan core. Once a plan is stored via `IPlanValidationLifecycleStore.storePlan()`, its content cannot change without changing its `planId`. Events are append-only with `runSeq` monotonically increasing.

### Write Amplification Risk

Each event write triggers:

1. `INSERT INTO run_events` (the event itself)
2. `UPDATE workflow_snapshots` (snapshot materialization)
3. `INSERT INTO outbox` (for delivery)

That is 3 writes per event, within a single Postgres transaction. For a run with 1000 steps, step events alone produce ~3000 writes (StepStarted + StepCompleted per step = 2000 events × 3 writes). Plus run-level events (RunQueued, RunStarted, RunCompleted = 3 more events × 3 writes).

**At 1000 concurrent runs with 1000 steps each:** ~6 million Postgres writes in a short burst. This is the primary scalability bottleneck.

### Event Sourcing vs. Mutable State Tradeoffs

The system uses a hybrid: events are the authority, but a materialized snapshot exists for fast reads. This is the correct pattern. The snapshot is updated transactionally with each event append, not via an async projector (which would introduce consistency lag).

**Trade-off accepted:** The transactional snapshot update adds latency to the write path (~1-2ms per event) but eliminates read-time rebuild cost. For the expected read:write ratio (many UI polls per event write), this is correct.

**The `rebuildSnapshot` maintenance operation exists** for recovery, which is essential for the event-sourcing model.

---

## 7. What Is Overbuilt

### 1. Multi-Engine Abstraction

The `IProviderAdapter` abstraction, adapter registry (`Map<provider, IProviderAdapter>`), provider selection logic in `StartRunAdmissionGuard.resolveAdapter()`, and per-provider metrics are fully implemented infrastructure for a second engine that does not exist.

**Cost:** Every engine operation carries provider-dispatch overhead, metric tagging with provider labels, and error handling branches for adapter resolution. The `ConductorAdapterStub` and `TemporalAdapterStub` are dead code.

**Verdict:** The interface is clean and worth keeping. The stubs and provider-selection complexity for Conductor should be deleted. If/when Conductor is needed, the interface is ready.

### 2. Observability Layering

`IObservability` with `IMetrics`, `ITraces`, `ILogs`, plus `ObservedTemporalAdapter` wrapping `TemporalAdapter`, plus `NoopObservability` for tests — this is a well-designed abstraction but every engine method has 10+ lines of observability boilerplate: `withContext → withSpan → try/catch → setStatus → recordException`. The engine source files are ~60% observability code and ~40% business logic.

**Verdict:** Not premature, but heavy. Consider an aspect-oriented pattern or middleware to reduce boilerplate. The observability contract itself is correct.

### 3. Contract Versioning Apparatus

38 ADRs. Versioned contract files (`IWorkflowEngine.v1_1_1.ts`, `ExecutionPlan.v1.ts`, `RunEvents.v2.ts`). Schema versioning policy. Plan version registry. Contract compatibility matrix. This is governance for a system that currently has one consumer (the API app) and one adapter (Temporal).

**Verdict:** Premature for current scale, correct for planned scale. The governance is justified if multiple teams or external consumers will use these contracts. If this remains a single-team system, the governance overhead is substantial.

### 4. Plan Executability Validation Layer

`IPlanExecutabilityValidator`, `PlanValidationLifecycle`, `PlanAdmissionLink`, `PlanExecutabilityRecord` — a full validation lifecycle for plans before they reach the engine. The `PlannerBackedStartRunUseCase` calls `validator.validatePlan(planRef, targetAdapter)` and can reject plans before engine submission.

**Verdict:** Useful at scale. Currently may be solving problems that don't exist yet (which plans would fail validation that wouldn't also fail at the adapter?). But the pattern is correct.

---

## 8. What Is Underbuilt

### 1. Migration Strategy

No database migration framework is visible in the source. `PostgresSchemaManager` exists with `setTenantContext` and schema quoting, but there are no migration files, no version tracking, no rollback scripts. For a system that stores critical run history in Postgres, this is a gap.

**Needed:** Flyway, node-pg-migrate, or equivalent with version-tracked migrations. Without this, schema changes require manual coordination.

### 2. Version Evolution of Contracts

ADR-0017 defines the strategy, but the actual version evolution path is untested. What happens when a v1 plan is submitted to a system that only supports v2? The `PlanVersionPolicy` exists but the rejection path and client communication are not wired. There is no contract upgrade/migration tool.

### 3. Rollback Guarantees

No rollback mechanism exists for a partially-completed run. If a run fails at step 750 of 1000, the only options are: (a) investigate and fix, (b) start a new run. There is no mechanism to roll back the effects of completed steps (undo dbt models, revert Snowflake state). This is inherent to the problem domain (you can't "un-run" a dbt model) but should be explicitly documented as a non-goal.

### 4. Distributed Consistency Model

The system uses Postgres transactions for event storage + outbox + snapshot, and Temporal for workflow execution. These are two separate consistency domains connected by asynchronous outbox delivery. The consistency model is:

- **Postgres:** ACID per transaction.
- **Temporal:** Durable execution with at-least-once delivery.
- **Bridge:** Outbox pattern with dead-letter queue.

This is correct but undocumented. There is no formal consistency model document. Operators and developers don't know what guarantees they get.

### 5. Concurrency Model

No explicit concurrency limits on:

- Concurrent runs per tenant.
- Concurrent steps per layer (all steps in a layer execute in parallel via `Promise.all`).
- Concurrent outbox claims across workers.
- Concurrent API requests per tenant.

The backpressure guard limits admission by outbox lag and pending event count, but does not limit concurrent run starts.

### 6. Backpressure Strategy

`StartRunAdmissionGuard` (in `@dvt/delivery`) checks `pendingEventsPerTenant` and `outboxOldestAgeMs`. The `BackpressureAwareStartRunUseCase` wraps the delegate use case with this check. This is admission-level backpressure only.

**Missing:** Runtime backpressure within a running workflow. If Temporal activity workers are overloaded, there is no mechanism to slow down step dispatch within a layer. The workflow dispatches all steps in a layer simultaneously.

### 7. Run Retention Policy

`RunArchiveCoordinator`, `RunArchiveVerifier`, `RunArchiveDeleter`, `RunArchiveRestorer` exist in `@dvt/state-store`. `DeliveryBufferPurger` exists for outbox cleanup. ADR-0037 and ADR-0038 cover archive and delivery buffer policies.

**But:** There is no default retention policy. No configuration says "archive runs older than 30 days." The operators must set this up manually. For a production system, retention should be on by default.

### 8. SLA Definitions

No SLA contracts exist for:

- `startRun` latency (API → engine → adapter → Temporal workflow start).
- `getRunStatus` latency (read path).
- Event delivery latency (outbox → event bus).
- Plan compilation time.

`IPlanCompileLatencyTelemetry` and `StartRunSlaTelemetry` exist as telemetry ports, but no SLA thresholds are defined.

---

## 9. Scalability Outlook (3-Year Horizon)

Assumptions: 1000+ tenants, thousands of concurrent runs, 1000+ node dbt projects.

### Bottlenecks

**1. Postgres write throughput.** 3 writes per event × 2000 events per run × 1000 concurrent runs = 6M writes. Postgres on a single instance will not sustain this. Sharding the event store by tenant or run is necessary.

**2. Outbox delivery throughput.** The outbox worker uses `SKIP LOCKED` with shard-based claim. This scales horizontally by adding workers per shard. But the current shard assignment is by `md5(run_id)`, not by tenant. A large tenant can saturate a shard, starving others.

**3. Temporal workflow history.** `continue-as-new` mitigates this, but the state carried across (completedStepResults, gatewayDecisions, skippedStepIds) grows with plan size. For a 1000-step plan, this is ~100KB serialized — within bounds, but approaching the Temporal payload limit for very large plans.

**4. Plan compilation for large projects.** The planner builds the full graph in memory, sorts topologically, and hashes the result. For 10,000-node dbt projects (which exist), this is O(n log n) for sorting and O(n) for hashing. Acceptable, but `sha256CanonicalJson` serializes the entire plan to JSON and hashes it — for a 10,000-step plan, that's ~5MB of JSON. The `maxPlanSizeBytes` limit exists to cap this.

### Single Points of Failure

**1. Postgres.** All state, events, outbox, snapshots, metadata, and plan storage live in Postgres. If Postgres is unavailable, the entire system is unavailable. No read replica strategy is visible.

**2. Temporal server.** All workflow execution depends on Temporal. If Temporal is down, no runs can start, and running workflows stall.

### Data Growth Pressure

Event log grows proportionally to (runs × steps × events-per-step). Without archival, a system processing 10,000 runs/day with 100 steps each generates ~2M events/day, ~60M events/month. At ~1KB per event (including JSON payload), that's ~60GB/month of event data. Plus outbox, snapshots, and metadata.

---

## 10. Architectural Scorecard

| Criterion                     | Score | Justification                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Conceptual clarity**        | 8/10  | The Planner/Engine/State separation is real and enforced. The principle is visible in the code. Loses points for the Conductor illusion and the undocumented consistency model.                                                                                                                                                                                                                               |
| **Separation of concerns**    | 9/10  | Excellent. Planner is pure. Engine delegates to adapters. State is behind ports. API layer uses decorator/chain-of-responsibility for cross-cutting concerns (backpressure, planning, telemetry).                                                                                                                                                                                                             |
| **Replaceability of engine**  | 7/10  | The adapter interface is correct and minimal. Temporal can be replaced. But the deeply integrated Temporal-specific workflow code (RunPlanWorkflow with continue-as-new, activities, signal handlers) is 800 lines of non-trivial logic that would need to be reimplemented for any new engine. The abstraction boundary is at the right level; the volume of engine-specific code is the cost.               |
| **Determinism**               | 9/10  | Plan compilation is deterministic (same input → same planId via SHA-256 of canonical JSON). Workflow execution is deterministic (Temporal replay-safe). Event projection is deterministic (pure function). The idempotency key derivation is deterministic. High marks.                                                                                                                                       |
| **Extensibility**             | 7/10  | Step kinds are extensible via `IStepTypeRegistry`. Graph sources are extensible (`GenericGraphSourceV1`). But extending to new step kinds requires changes in contracts, planner step factory, adapter activities, and registry — 4 packages for one extension point.                                                                                                                                         |
| **Operational realism**       | 5/10  | The system has health checks, observability ports, backpressure guards, dead-letter queues, and archive lifecycle. But no default retention policy, no migration framework, no circuit breaker, no runbooks for common failure modes, no SLA definitions, and no Postgres scaling strategy. The operational tooling exists but is not wired for production.                                                   |
| **Long-term maintainability** | 7/10  | 38 ADRs, strong governance, versioned contracts, and automated CI checks give structural durability. But 720 TS files in packages + 311 in apps + 122 test files for a system that currently runs one workflow type on one engine is high complexity per delivered feature. The governance overhead (docs syncing, workboard generation, evidence docs, risk register entries) adds friction to every change. |

### SOLID/Hexagonal/OOP/CQRS Assessment

| Principle     | Adherence   | Evidence                                                                                                                                                                                                                      |
| ------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SRP**       | Strong      | Each class has one responsibility. `GraphBuilder` builds graphs. `NodeSelector` selects nodes. `PlanAssembler` assembles plans. `StartRunCoordinator` coordinates start-run.                                                  |
| **OCP**       | Moderate    | Extension via `IStepTypeRegistry` and `IProviderAdapter`. But adding a new step kind requires changes in multiple packages (not truly closed for modification).                                                               |
| **LSP**       | Strong      | `InMemoryRunStateCommandPort` and `PostgresRunStateCoordinator` are substitutable. `TemporalAdapter` and `MockAdapter` implement the same interface.                                                                          |
| **ISP**       | Strong      | `IRunStateStoreRead` and `IRunStateStoreWrite` are separate. `IWorkflowEngineCore` is separate from `IWorkflowEngine`. Activity port in the workflow is narrowly typed.                                                       |
| **DIP**       | Strong      | Engine depends on `IProviderAdapter`, `IRunStateStoreRead`, `IRunStateStoreWrite`, `IRunAccessPolicy` — all abstractions. Concrete Postgres/Temporal implementations are injected.                                            |
| **Hexagonal** | Strong      | Ports (`IProviderAdapter`, `IRunStateStore`, `IArtifactResolver`, `ICompiledCodeStorage`, `IObservability`) are in domain/contracts. Adapters (`adapter-temporal`, `adapter-postgres`) are in separate packages.              |
| **CQRS**      | Implemented | `BuildPlanCommand`/`BuildGraphCommand` as command objects. Read models as return types. `getRunStatus` (query) vs. `appendAndEnqueueTx` (command) separation. But it's lightweight CQRS — no separate read/write data stores. |

---

## 11. Strategic Recommendations

### 3 Structural Changes

**S1. Delete the Conductor adapter stub and remove `'conductor'` from the provider union.**
The multi-engine abstraction is sound as an interface. The stub is noise. Remove it. When Conductor is needed, the interface is ready. The provider type should be `'temporal' | 'mock'` until a real second adapter ships.

**S2. Extract per-step retry policy from the Temporal activity proxy into the ExecutionPlan.**
Add `retryPolicy?: { maxAttempts: number; initialInterval: string; maxInterval: string; backoffCoefficient: number }` to `ExecutionStepV1`. Let the adapter read it from the plan instead of hardcoding it. This enables step-kind-specific retry behavior without changing the adapter code.

**S3. Implement tenant-aware outbox sharding.**
Change shard assignment from `md5(run_id)` to `md5(tenant_id)` or add a `tenant_shard_id` column. This prevents noisy-tenant starvation and enables per-tenant throughput controls.

### 3 Clarifications Needed

**C1. Is the Conductor adapter planned for the next 12 months?** If no, delete it. If yes, create a time-boxed ADR.

**C2. What is the target Postgres scaling strategy?** Single instance, read replicas, Citus, or something else? The write amplification numbers demand an answer before 100 tenants.

**C3. What is the consistency guarantee for `getRunStatus` relative to the latest event?** The code says "snapshot first, replay fallback" but there is no formal SLA for freshness.

### 3 Things to Freeze Immediately

**F1. `IWorkflowEngine` contract.** It is minimal, correct, and stable. Do not add methods.

**F2. Event type enum.** The 12 event types cover the full lifecycle. Adding event types has ripple effects through `applyRunEvent`, snapshot materialization, outbox delivery, and consumers. Freeze this until there is a clear need.

**F3. `PlanCore` structure.** `planId = sha256(JCS(planCore))` is a load-bearing invariant. Any change to `PlanCore` changes the hash, which changes plan identity. Do not modify this structure.

### 3 Things to Delay

**D1. Cost attribution.** No code exists. No cost model exists. The planner has metrics but no cost estimation. Building this requires understanding Snowflake pricing per query, which is runtime-dependent and cannot be statically estimated from a plan. Delay until there is real customer demand.

**D2. Cross-environment diffs.** This requires comparing plan outputs across environments, which requires a plan repository with environment tagging. The plan store exists but has no environment dimension. Delay until the plan store is mature.

**D3. Multi-workflow support (non-dbt).** The `GenericGraphSourceV1` type exists, but no step factory, no activity implementation, and no adapter support. Delay until there is a concrete second workflow type with a real user.

---

## Appendix: Proposals for the Most Problematic Areas

### Proposal A: Outbox Scalability

**Problem:** Write amplification (3 writes/event) + shared shard space across tenants.

**Attack plan:**

1. **Short term (< 2 weeks):** Add monitoring for per-shard event throughput and per-tenant event counts. This gives visibility before making structural changes.
2. **Medium term (< 2 months):** Implement tenant-aware shard assignment. Change the shard formula from `md5(run_id)` to `hash(tenant_id) % shard_count`. This isolates tenant workloads.
3. **Long term (< 6 months):** Evaluate partitioning `run_events` table by `tenant_id` using Postgres native partitioning. This enables per-tenant data management and improves query performance for tenant-scoped reads.

### Proposal B: Cycle Detection in Planner

**Problem:** The planner silently drops cyclic nodes from the topological sort.

**Attack plan:**

1. After `topoSort`, compare `topo.length` against `selected.length`.
2. If `topo.length < selected.length`, the missing nodes are in a cycle.
3. Throw `PlannerErrorCode.GRAPH_CYCLE` with the list of missing nodeIds.
4. Add tests with cyclic inputs.
5. Effort: 1-2 hours. Impact: Prevents silent data loss in plans.

### Proposal C: Circuit Breaker for Adapter Calls

**Problem:** No circuit breaker on Temporal adapter calls. Timeout-only protection.

**Attack plan:**

1. Implement a simple circuit breaker (closed/open/half-open) in `ObservedTemporalAdapter` or as a generic adapter wrapper.
2. Configuration: failure threshold (e.g., 5 consecutive failures), open duration (e.g., 30s), half-open probe count (1).
3. When open, `startRun` fails fast with `ADAPTER_UNAVAILABLE` instead of waiting for timeout.
4. Add circuit breaker state to `healthCheck()` response.
5. Effort: 2-3 days. Impact: Prevents cascade failures when Temporal is degraded.

### Proposal D: Default Retention Policy

**Problem:** Event log grows without bound if operators don't configure archival.

**Attack plan:**

1. Define default retention policy: archive runs older than 30 days, delete archives older than 90 days.
2. Make the archive worker a required deployment component (not optional).
3. Add a health check that counts un-archived terminal runs older than the retention threshold and emits an alert.
4. Effort: 1-2 days for the default config + health check. Impact: Prevents unbounded data growth.

### Proposal E: API-to-Engine Contract Formalization

**Problem:** The API app defines its own command/result types that are not in `@dvt/contracts`.

**Attack plan:**

1. Extract `StartRunCommand` and `StartRunResult` types into `@dvt/contracts/api/`.
2. Add contract tests that validate the API's command matches what the engine expects.
3. Include these in the contract CI checks.
4. Effort: 1-2 days. Impact: Prevents drift between API and engine.
