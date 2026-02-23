# DVT+ Architectural Review — Principal/Staff Level

**Date**: 2026-02-23
**Reviewer Role**: Principal Software Architect (Data Platforms, dbt+Snowflake, Deterministic Execution, Workflow Orchestration, Clean Architecture, Plugin SaaS, Multi-tenant)
**Sources**: IWorkflowEngine.v2.0.md, ExecutionSemantics.v2.0.md, RunEvents.v2.0.md, IRunStateStore.v2.0.md, GlossaryContract.v2.0.md, SignalsAndAuth.v1.md, PluginSandbox.v1.md, TemporalAdapter.spec.md, ConductorAdapter.spec.md, ADR-0003, ADR-0004, engine-phases.md, dvt_v2_architecture.mmd, WorkflowEngine.ts, RunPlanWorkflow.ts, SnapshotProjector.ts, idempotency.ts, IProviderAdapter.ts, IRunStateStore.ts, executionPlan.ts, PostgresStateStoreAdapter.ts, @dvt/contracts, ROADMAP.md, review 20260222.md

---

## Core Principle Under Validation

> "The UI does not execute. The engine does not decide. The planner does not persist state."

---

## 1. Conceptual Soundness

### What is solid

**The three-tier separation is architecturally correct and enforced at the code level.** The [`WorkflowEngine`](packages/@dvt/engine/src/core/WorkflowEngine.ts:115) class does not contain planning logic. It receives a [`PlanRef`](packages/@dvt/contracts/src/types/contracts.ts:56) (not an `ExecutionPlan`), delegates to an adapter, and emits lifecycle events to the state store. The engine does not fetch plan bytes (ADR-0012). The engine does not decide execution order — that is the adapter's interpreter workflow responsibility. The state store is the append-only source of truth with monotonic `runSeq` ordering.

**The event sourcing model is well-specified.** The [`ExecutionSemantics.v2.0.md`](docs/architecture/engine/contracts/engine/ExecutionSemantics.v2.0.md:1) contract defines ordering authority (`runSeq`), deduplication authority (`(runId, idempotencyKey)`), and time-window authority (`persistedAt`). The timestamp split between `emittedAt` (producer) and `persistedAt` (append authority) is correct for distributed systems with clock skew.

**The idempotency key derivation is deterministic and well-tested.** The formula `SHA256(runId|stepIdNormalized|logicalAttemptId|eventType|planId|planVersion)` in [`IdempotencyKeyBuilder`](packages/@dvt/engine/src/core/idempotency.ts:30) matches the normative contract exactly. Golden test vectors exist. The exclusion of `tenantId` and `engineAttemptId` from the key is correct — these are envelope fields, not identity fields.

**ADR discipline is genuine.** 26+ ADRs with acceptance criteria, traceability annotations in code (`@baseline`, `@decision`, `@consequence`), and a previous review that found 7 active bugs by comparing ADR text to code. This is architecture as a verification tool.

### What is fragile

**The separation principle erodes at the adapter boundary.** The [`RunPlanWorkflow.ts`](packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts:113) contains the DAG walker ([`planExecutionLayers()`](packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts:347)), step scheduling logic, retry policy (hardcoded 3 retries, 2x backoff in activity proxy config at line 98-107), and continue-as-new thresholds. This is planning logic living inside the adapter. The principle says "the engine does not decide" — but the adapter is deciding execution order, parallelism strategy, and retry policy. The boundary between "adapter translates" and "adapter decides" is not enforced by any contract.

When Conductor is added, the same DAG walking logic must be reimplemented in the Conductor DSL generator. There is no shared `IPlanInterpreter` contract that both adapters must implement. The [`planExecutionLayers()`](packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts:347) function is Temporal-specific code that will be duplicated.

**The `ExecutionPlan` interface is underspecified.** The [`ExecutionPlan`](packages/@dvt/engine/src/contracts/executionPlan.ts:9) has `steps` with optional `dependsOn` and an open `Record<string, unknown>` extension. There is no normative schema for step types, no required fields beyond `stepId`, and no contract for what a step's execution semantics are. The plan is a bag of JSON with a stepId. This means every adapter must independently interpret what a step means, and there is no validation that two adapters interpret the same plan identically.

**State-driven UI at scale has an unresolved read model problem.** The [`getRunStatus()`](packages/@dvt/engine/src/core/WorkflowEngine.ts:283) method reads from snapshot or falls back to full event replay. But the [`WorkflowSnapshot`](packages/@dvt/engine/src/contracts/runEvents.ts:92) does not include step-level detail beyond status/timestamps/attempts. For a UI showing 1000-node dbt runs with logs, artifacts, error details, and cost attribution, the snapshot is insufficient. The UI will need to query the event log directly or maintain separate read models — neither of which is specified.

### What is missing

1. **`IExecutionPlanner` interface.** Referenced in the V2 architecture diagram ([`IExecutionPlanner`](docs/architecture/engine/dvt_v2_architecture.mmd:98)) but does not exist in code. No contract defines how plans are produced, validated, or versioned. Users produce `ExecutionPlan` objects with no formal contract.

2. **`IPlanInterpreter` or equivalent.** No contract ensures that Temporal and Conductor interpret the same plan identically. The DAG walker is adapter-specific code.

3. **Plan-to-adapter semantic equivalence tests.** No mechanism to verify that `planExecutionLayers()` in Temporal produces the same execution order as the Conductor DSL generator for the same plan.

4. **Read model specification for UI.** The contracts define write-side (events) and projection (snapshot) but not the read models the UI needs.

---

## 2. Architectural Risk Map

| Risk                                      | Severity | Likelihood                     | Why                                                                                                                                                                                                                                                                                                       | Mitigation                                                                                 |
| ----------------------------------------- | -------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Adapter semantic drift**                | Critical | Certain (when Conductor ships) | DAG walker lives in Temporal adapter. Conductor will reimplement independently. No shared contract or equivalence test.                                                                                                                                                                                   | Extract `IPlanInterpreter` contract. Shared golden-path execution order tests.             |
| **No IExecutionPlanner**                  | High     | Certain                        | Plans are produced ad-hoc. No validation contract. No versioning strategy for plan schema evolution.                                                                                                                                                                                                      | Define `IExecutionPlanner` interface before Phase 2.                                       |
| **Tenant isolation is WHERE-clause only** | High     | High                           | No RLS in Postgres. One missing WHERE clause = cross-tenant data breach. [`PostgresStateStoreAdapter`](packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:1) relies on application-level filtering.                                                                                          | Implement Postgres RLS. Add tenant isolation integration tests.                            |
| **Snapshot insufficiency for UI**         | High     | Certain (at scale)             | [`WorkflowSnapshot`](packages/@dvt/engine/src/contracts/runEvents.ts:92) lacks step logs, artifacts, error payloads, cost data. UI will bypass the projection layer.                                                                                                                                      | Define explicit read model contracts for UI views.                                         |
| **`applyEventToSnapshot` duplication**    | High     | Certain                        | The Postgres adapter has its own [`applyEventToSnapshot()`](packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:90) that must stay in sync with [`applyRunEvent()`](packages/@dvt/engine/src/core/SnapshotProjector.ts:24). Comment says "must be kept in sync" — this is a manual invariant. | Extract shared projection logic into `@dvt/projector` package.                             |
| **Event volume unbounded**                | Medium   | Certain (at scale)             | No retention policy. No archival. Append-only log grows without bound. 1000-step runs produce 2000+ events per run.                                                                                                                                                                                       | Define retention tiers, archival policy, and replay boundaries.                            |
| **`runSeq` contention under parallelism** | Medium   | High                           | Parallel step events from a single run contend on `MAX(runSeq)+1`. Under high parallelism, this becomes a serialization bottleneck.                                                                                                                                                                       | Use database sequences or pre-allocated ranges per run.                                    |
| **Plugin security boundary undefined**    | Medium   | Low (Phase 3)                  | [`PluginSandbox.v1.md`](docs/architecture/engine/contracts/extensions/PluginSandbox.v1.md:1) is DRAFT. vm2 is banned. No implementation exists.                                                                                                                                                           | Freeze plugin contract before Phase 3. Do not start implementation until engine is stable. |
| **Cost attribution complexity**           | Medium   | Medium                         | V2 diagram includes Snowflake cost ingestion, cost dashboards, cost estimator. No implementation. No data model.                                                                                                                                                                                          | Defer until Phase 3. Define cost event schema first.                                       |
| **Multi-engine abstraction leaks**        | Medium   | Certain (Phase 2)              | Temporal has deterministic replay. Conductor does not. The abstraction assumes both can provide equivalent guarantees. They cannot.                                                                                                                                                                       | Document parity gaps explicitly. Accept degraded guarantees for Conductor.                 |
| **Outbox delivery ordering**              | Low      | Medium                         | Outbox is at-least-once but not ordered. Events may be delivered out of `runSeq` order to consumers.                                                                                                                                                                                                      | Document ordering guarantees. Consumers must tolerate out-of-order delivery.               |

---

## 3. Engine Abstraction Critique

### Is `IWorkflowEngine` minimal and correct?

The interface in [`IWorkflowEngine.v2.0.md`](docs/architecture/engine/contracts/engine/IWorkflowEngine.v2.0.md:31) is:

```ts
interface IWorkflowEngine {
  startRun(planRef: PlanRef, context: RunContext): Promise<EngineRunRef>;
  cancelRun(engineRunRef: EngineRunRef): Promise<void>;
  getRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot>;
  signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void>;
}
```

This is minimal. Four methods. The actual implementation in [`WorkflowEngine.ts`](packages/@dvt/engine/src/core/WorkflowEngine.ts:115) adds `enrichRunStatus()`, `healthCheck()`, and `detectStuckRuns()` — all reasonable extensions that do not pollute the core contract.

**Problem**: `startRun` accepts `PlanRef` but the engine does not validate plan content. It validates `schemaVersion`, `uri` policy, and capabilities — but not the plan's structural correctness (valid DAG, no cycles, no orphan steps). That validation happens inside the adapter's workflow, which means a structurally invalid plan will fail at runtime inside Temporal, not at submission time. This is a poor user experience and wastes adapter resources.

**Recommendation**: Add `validatePlan(planRef: PlanRef): Promise<ValidationReport>` to the engine interface. Pre-flight validation before adapter dispatch.

### Is Temporal-first strategy wise?

Yes. Temporal provides deterministic replay, durable execution, and native signal handling. These are the hardest properties to build from scratch. Starting with the strongest runtime and degrading for weaker ones is correct.

The [`RunPlanWorkflow.ts`](packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts:113) is well-structured: deterministic (no `Date.now()`, no `Math.random()`, no Node.js APIs), delegates all side effects to activities, handles pause/resume/cancel via signals, and implements continue-as-new for history management.

### Is Conductor parity realistic?

No. The [`ConductorAdapter.spec.md`](docs/architecture/engine/adapters/conductor/ConductorAdapter.spec.md:1) documents fundamental parity gaps:

- No native deterministic replay
- No reliable pause/cancel (webhook-based, eventual)
- No parallel subworkflows (emulated)
- 30s default task timeout (strict)
- 32KB task output limit

The spec honestly labels these as gaps. The problem is that the `IWorkflowEngine` contract promises `signal()` with PAUSE/RESUME semantics that Conductor cannot reliably deliver. The contract does not have a mechanism for adapters to declare "I support PAUSE but it's eventual, not immediate." The capability system checks for feature presence but not quality-of-service.

**What will break when adding Conductor**: Signal delivery guarantees. The engine emits `RunPaused` immediately after `signal()` returns. If Conductor's pause is eventual, the state store will show PAUSED while the workflow is still executing steps. This is a consistency violation.

### Is the event model robust?

The three-layer transition enforcement in [`RunEvents.v2.0.md`](docs/architecture/engine/contracts/engine/RunEvents.v2.0.md:246) (Producer Guard → Append Authority Optional Validation → Projector Mandatory Validation) is well-designed. The projector is the mandatory enforcement layer, which is correct — it's the only layer that sees the full event history.

**Gap**: The [`SnapshotProjector`](packages/@dvt/engine/src/core/SnapshotProjector.ts:136) does not implement Layer 3 transition validation. It applies events unconditionally. An invalid transition (e.g., `StepCompleted` on a step that was never `StepStarted`) will silently corrupt the snapshot. The `default` case logs a warning for unknown event types but does not validate transitions.

### Is `ExecutionPlan` sufficiently expressive?

No. The [`ExecutionPlan`](packages/@dvt/engine/src/contracts/executionPlan.ts:9) interface is a metadata header plus an array of steps with `stepId`, optional `kind`, optional `dependsOn`, and an open `Record<string, unknown>`. There is no:

- Step type taxonomy (what kinds of steps exist?)
- Step parameter schema (what does a dbt-run step need vs. a SQL step?)
- Retry policy per step (the plan declares nothing; the adapter hardcodes 3 retries)
- Timeout per step
- Resource requirements per step
- Output schema per step

The plan is structurally a JSON blob with step IDs. This is insufficient for a multi-adapter system where two adapters must interpret the same plan identically.

---

## 4. Execution Planning Layer Analysis

### DAG analyzer based on dbt artifacts

The [`planExecutionLayers()`](packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts:347) function implements a topological sort that produces execution layers (groups of steps that can run in parallel). It validates no duplicate step IDs, detects cycles, and validates dependency references.

**Problem**: This function lives inside the Temporal workflow, not in a shared planning layer. It runs inside the Temporal V8 sandbox on every workflow execution. For a 1000-node dbt project, this is a non-trivial computation happening inside a deterministic replay context. If the function's behavior changes between deployments, Temporal replay will fail with non-determinism errors.

**Recommendation**: Move DAG analysis to a pre-flight planning step. The plan should arrive at the adapter with layers pre-computed. The adapter should validate, not compute.

### Partial execution guarantees

Not specified. The `ExecutionPlan` has no mechanism for declaring "execute only these nodes" or "skip these nodes." The `StepSkipped` event type exists but there is no planner-level skip/selection mechanism.

### Retry/backoff policy ownership

Retry policy is hardcoded in the Temporal activity proxy configuration:

```ts
retry: {
  initialInterval: '1s',
  maximumInterval: '60s',
  backoffCoefficient: 2,
  maximumAttempts: 3,
  nonRetryableErrorTypes: ['PermanentStepError'],
}
```

This is adapter-specific, not plan-driven. The `ExecutionPlan` has no retry policy field. The `RetryBackoffPolicy` mentioned in the V2 architecture diagram does not exist in code. When Conductor is added, it will have its own retry configuration that may differ.

**This violates the separation principle.** The planner should define retry policy. The adapter should translate it to runtime-specific configuration.

### Cost estimator realism

The V2 architecture diagram includes a [`CostEstimator`](docs/architecture/engine/dvt_v2_architecture.mmd:159) component. No code exists. No data model exists. No Snowflake cost query integration exists. This is aspirational.

For a realistic cost estimator, you need: Snowflake `QUERY_HISTORY` access, warehouse credit rates, per-query cost attribution, and historical cost data for estimation. This is a significant data engineering effort that depends on having production runs to calibrate against.

### Plan versioning strategy

The `ExecutionPlan` has `contractVersion` (plan schema version) and `planVersion` (specific plan instance version). The engine rejects unknown contract versions. This is correct but incomplete — there is no migration path from contract version 1.0.0 to 2.0.0. The `TemporalAdapter.spec.md` mentions cross-schema continuation via `continueAsNew` but no implementation exists.

### Assessment

The planning layer is **under-specified and under-built**. It is not over-engineered — the opposite. The V2 diagram shows 5 planning components (DAG Analyzer, Cost Estimator, Partial Execution Resolver, Retry Policy, Environment Resolver) but zero exist as code. The planning logic that does exist is embedded in the Temporal adapter where it should not be.

**Hidden coupling to Snowflake**: The cost estimator and analytics store assume Snowflake. If a tenant uses BigQuery or Databricks, the cost model breaks. This coupling should be behind an `ICostProvider` interface.

---

## 5. State & Metadata Layer Review

### Is Postgres sufficient?

For Phase 1, yes. Postgres handles append-only event logs, JSONB snapshots, transactional bootstrap, and outbox pattern well. The [`PostgresStateStoreAdapter`](packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:1) implements the correct patterns.

**Scaling concern**: At 1000+ tenants with thousands of concurrent runs, the `run_events` table will grow rapidly. With 2000 events per run and 10,000 runs/day, that's 20M rows/day. Postgres can handle this with partitioning, but the current schema has no partitioning strategy documented. The `run_metadata_tenant_created_idx` index helps for listing, but event queries by `runId` need a composite index on `(run_id, run_seq)` with partition pruning.

### Is Snowflake for analytics appropriate?

The V2 diagram shows Snowflake as an optional analytics store. This is appropriate for long-term metrics, cost attribution, and cross-tenant analytics. But no data pipeline exists to move events from Postgres to Snowflake. No schema exists. No ETL/ELT process is defined.

### Is lineage snapshotting scalable?

No lineage snapshotting exists. The V2 diagram shows a `LineageView` in the UI but no lineage data model, no lineage capture mechanism, and no lineage storage. dbt's `manifest.json` contains lineage information, but there is no component that parses it and stores it.

### Is artifact immutability realistic?

The V2 diagram shows an `ArtifactRepository` for immutable bundles. No implementation exists. The `ArtifactRef` type in contracts has `uri`, `kind`, `sha256` — the right fields for immutable references. But no storage backend, no upload mechanism, and no garbage collection policy exist.

### Write amplification risk

Each event write triggers: (1) event append, (2) snapshot upsert, (3) outbox enqueue — all in one transaction. This is 3x write amplification per event. For a 1000-step run with 2000 events, that's 6000 writes. Under parallel step execution, multiple events may be appended in a single `appendAndEnqueueTx` call, which helps. But the snapshot upsert is a full JSONB replacement, not a partial update. For a run with 1000 steps, the snapshot JSONB grows to ~100KB, and every event rewrites it entirely.

**Recommendation**: Consider incremental snapshot updates (JSONB path operations) or deferred snapshot materialization (batch every N events).

### Event sourcing vs mutable state tradeoffs

The system correctly chose event sourcing for the write side and materialized snapshots for the read side. This is the right pattern. The tradeoff is operational complexity: debugging requires understanding both the event log and the projection. The `SnapshotProjector.rebuild()` method provides a way to reconstruct state from events, which is essential for debugging.

**Missing**: No event compaction or archival strategy. The event log is append-only forever. At scale, this becomes a storage cost problem and a replay performance problem.

### UI read performance constraints

The [`getRunStatus()`](packages/@dvt/engine/src/core/WorkflowEngine.ts:283) method reads from snapshot (O(1)) or falls back to full replay. This is correct for status queries. But the UI needs more than status — it needs step details, logs, artifacts, error messages. These are in event payloads, not in the snapshot. The UI will need to query events directly, which means `listEvents()` with pagination. The keyset pagination (afterSeq + limit) is implemented, which is good.

**Gap**: No API endpoint specification for UI data needs. The engine exposes `getRunStatus()` and `listEvents()` but no higher-level read models (e.g., "give me the run timeline with step details and errors").

---

## 6. Plugin System Evaluation

### Current state

The plugin system does not exist as code. What exists:

- [`PluginSandbox.v1.md`](docs/architecture/engine/contracts/extensions/PluginSandbox.v1.md:1) — DRAFT contract defining trust tiers, isolation requirements, and execution limits
- A box in the V2 architecture diagram
- References to `IPluginRuntime` as a planned interface

### Isolation strategy

The contract correctly bans vm2 and Node.js `vm` module. It defines three trust tiers:

- **trusted**: process/container boundary
- **partner**: container sandbox with seccomp/AppArmor, network allowlist
- **untrusted**: gVisor/microVM, no network

This is the right tiering. The isolation requirements are realistic and well-specified.

### Can plugins compromise deterministic execution?

Yes, if plugins can emit events or modify run state. The contract does not specify whether plugins can:

1. Emit lifecycle events (StepStarted, StepCompleted, etc.)
2. Access the state store
3. Modify the execution plan mid-run
4. Interact with the adapter

If plugins can do any of these, they can break deterministic execution. The contract needs explicit MUST NOT rules for state mutation.

### Is capability-based security sufficient?

The capability system in [`capabilities.schema.json`](docs/architecture/engine/contracts/capabilities/capabilities.schema.json) defines 12 capabilities across 6 categories. This is a good start for adapter capability validation. For plugins, a separate capability model is needed — what APIs can a plugin call, what data can it access, what side effects can it produce.

### Assessment

The plugin system is correctly deferred. The contract is reasonable but incomplete. The critical missing piece is the interaction model between plugins and the execution engine. This must be designed alongside `IProviderAdapter` stability, not before.

---

## 7. What Is Overbuilt

1. **V2 architecture diagram scope.** The [`dvt_v2_architecture.mmd`](docs/architecture/engine/dvt_v2_architecture.mmd:1) includes 9 workflow engine options (Temporal, Conductor, BullMQ, Argo, Airflow, Prefect, Dagster, Flyte, Kestra), 4 event bus options, 3 git integration options, 5 UI foundations, 5 config libraries, and 7 observability tools. This is a technology catalog, not an architecture diagram. It creates a false impression of optionality that does not exist in the codebase. The actual system uses Temporal, Postgres, and React. Everything else is aspirational.

2. **Security documentation depth for unbuilt components.** [`SECURITY_INVARIANTS.v1.md`](docs/architecture/engine/security/SECURITY_INVARIANTS.v1.md:1) is 1150+ lines defining invariants for plugin tiers, deployment modes, supply chain security, and key rotation — for a system that cannot yet persist a run to a database. The threat model is 51KB. These documents are well-written but premature. Security invariants for components that don't exist create documentation debt.

3. **Signal catalog breadth.** [`SignalsAndAuth.v1.md`](docs/architecture/engine/contracts/engine/SignalsAndAuth.v1.md:1) defines 11 signal types including `INJECT_OVERRIDE`, `UPDATE_TARGET`, `EMERGENCY_STOP`, and `ESCALATE_ALERT`. The engine implements 3 (PAUSE, RESUME, CANCEL). The remaining 8 are specified but unimplemented. Specifying signals before the engine can execute a basic run is premature optimization of the control plane.

4. **Contract versioning infrastructure.** The system has v1.0, v1.1, v1.1.1, v2.0, v2.0.1 of multiple contracts, migration guides between versions, and a formal versioning policy — for contracts that have never been consumed by a production system. Version evolution is important, but versioning contracts before they've been validated by real usage produces churn, not stability.

---

## 8. What Is Underbuilt

1. **`IExecutionPlanner` interface.** The most critical missing contract. Without it, plans are unvalidated JSON blobs. Every adapter interprets them independently. There is no way to verify that two adapters produce equivalent execution for the same plan.

2. **Shared plan interpretation logic.** The DAG walker, layer computation, and dependency validation in [`planExecutionLayers()`](packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts:347) must be extracted into a shared package (`@dvt/plan-interpreter`) that both Temporal and Conductor adapters consume.

3. **Transition validation in projector.** The [`SnapshotProjector`](packages/@dvt/engine/src/core/SnapshotProjector.ts:136) does not validate state transitions. It applies events unconditionally. Layer 3 of the three-layer enforcement model (mandatory projector validation) is not implemented.

4. **Rollback guarantees.** What happens when `bootstrapRunTx` succeeds but the adapter fails mid-execution? The compensation in [`startRun()`](packages/@dvt/engine/src/core/WorkflowEngine.ts:170) calls `adapter.cancelRun()` on bootstrap failure, but there is no compensation for adapter failures after bootstrap. A run can be in PENDING in the state store while the Temporal workflow has crashed.

5. **Distributed consistency model.** The system has two sources of state: the Temporal workflow state and the Postgres event log. These can diverge. If Temporal completes a step but the `emitEvent` activity fails, the workflow has progressed but the state store has not. No reconciliation mechanism exists.

6. **Concurrency model.** What happens when two `signal()` calls arrive simultaneously for the same run? The engine resolves metadata, checks authorization, and calls `adapter.signal()` — but there is no locking or serialization. Two PAUSE signals could both succeed, producing duplicate `RunPaused` events. The idempotency key prevents duplicate persistence, but the adapter receives both signals.

7. **Backpressure strategy.** The outbox rate limiter exists ([`IOutboxRateLimiter`](packages/@dvt/engine/src/outbox/IOutboxRateLimiter.ts)) but only for `startRun`. There is no backpressure for event emission, signal processing, or status queries. Under load, the system will accept work faster than it can process it.

8. **Run retention policy.** No mechanism to archive, compact, or delete old runs. The event log and metadata grow without bound.

9. **SLA definitions.** The [`SLOs.md`](docs/architecture/engine/ops/SLOs.md) defines targets but no contractual SLAs. For a multi-tenant platform, tenants need guaranteed response times, not aspirational targets.

10. **Migration strategy.** No documented process for migrating from contract v1 to v2 in a running system. The [`MIGRATION_v1.1.1_to_v2.0.0.md`](docs/architecture/engine/contracts/MIGRATION_v1.1.1_to_v2.0.0.md) exists as a document but no code implements it.

---

## 9. Scalability Outlook (3-Year Horizon)

Assumptions: 1000+ tenants, thousands of concurrent runs, large dbt projects (1000+ nodes), cross-environment diffs, heavy cost dashboards.

### Bottlenecks

1. **`run_events` table growth.** At 20M rows/day (10K runs × 2K events), the table reaches 7.3B rows/year. Without partitioning and archival, queries degrade. Postgres can handle this with time-based partitioning on `(tenant_id, persisted_at)`, but this is not implemented.

2. **Snapshot JSONB size.** A 1000-step run produces a ~100KB snapshot. Full JSONB replacement on every event write means 100KB × 2000 events = 200MB of write I/O per run just for snapshots. This is the dominant write cost.

3. **Planner computation for large DAGs.** Topological sort of 1000 nodes is O(V+E), which is fast. But if the planner needs to compute cost estimates, partial execution sets, and environment resolution for each node, the computation grows. No caching strategy exists.

4. **Event bus fan-out.** The outbox delivers events to an event bus. If 100 consumers subscribe (UI instances, analytics pipelines, alerting systems), each event is delivered 100 times. At 20M events/day, that's 2B deliveries/day. The outbox pattern does not scale to this — you need a proper message broker (Kafka/NATS).

### Single points of failure

1. **Postgres.** All state is in one database. No read replicas documented. No failover strategy. If Postgres is unavailable, the entire system stops.

2. **Temporal cluster.** If Temporal is down, no runs execute. The engine can still read state (from Postgres), but no new runs can start and no in-flight runs progress.

3. **Outbox worker.** If the outbox worker crashes, events accumulate in the outbox table. Consumers stop receiving updates. The dead-letter mechanism exists but no alerting on outbox lag is implemented.

### Data growth pressure

| Data         | Growth Rate      | 1-Year Size   | 3-Year Size   |
| ------------ | ---------------- | ------------- | ------------- |
| run_events   | 20M rows/day     | 7.3B rows     | 22B rows      |
| run_metadata | 10K rows/day     | 3.6M rows     | 11M rows      |
| snapshots    | 10K upserts/day  | 3.6M rows     | 11M rows      |
| outbox       | Transient        | ~100K pending | ~100K pending |
| artifacts    | Depends on usage | Unknown       | Unknown       |

Without archival, the 3-year event log is ~22B rows at ~500 bytes/row = ~11TB. This is manageable with Postgres partitioning and cold storage archival, but requires engineering investment.

### Planner computation load

For 1000+ tenants each running 10+ plans/day with 1000+ nodes, the planner must compute ~10K execution plans/day. If each plan computation takes 100ms (DAG sort + cost estimate + partial execution), that's ~17 minutes of CPU/day — negligible. The bottleneck is not computation but I/O: fetching dbt manifests, querying Snowflake cost data, and resolving environment variables.

---

## 10. Architectural Scorecard

| Dimension                     | Score | Justification                                                                                                                                                                                                                                                                            |
| ----------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Conceptual clarity**        | 7/10  | The three-tier separation is well-articulated and mostly enforced. Concept drift between "workflow engine" and "platform product" creates confusion. The V2 diagram is a technology catalog, not a focused architecture.                                                                 |
| **Separation of concerns**    | 6/10  | Engine/state separation is clean. Planner/adapter separation is not — DAG walking, retry policy, and execution ordering live in the adapter. The `applyEventToSnapshot` duplication between engine and Postgres adapter is a concrete violation.                                         |
| **Replaceability of engine**  | 7/10  | The `IProviderAdapter` interface is minimal and correct. Temporal can be replaced with Conductor at the adapter level. But the DAG walker in `RunPlanWorkflow.ts` is Temporal-specific and must be reimplemented. True replaceability requires extracting shared interpretation logic.   |
| **Determinism**               | 8/10  | The idempotency key derivation is deterministic and well-tested. The Temporal workflow is replay-safe. The event sourcing model preserves ordering. Deduction: projector does not validate transitions (Layer 3 not implemented), and snapshot projection is duplicated across packages. |
| **Extensibility**             | 5/10  | The capability system exists but is minimal. The plugin contract is DRAFT. The `ExecutionPlan` is too loosely typed to support meaningful extension. No hook points for custom step types, custom validators, or custom cost policies.                                                   |
| **Operational realism**       | 3/10  | No production deployment exists. No Postgres in production. No Temporal in production. No monitoring dashboards deployed. No incident response tested. Observability docs exist but are aspirational. Stuck-run detection is implemented but untested in production.                     |
| **Long-term maintainability** | 6/10  | ADR discipline is strong. Code traceability annotations are good. Contract versioning policy exists. But: documentation volume is disproportionate to code volume (~5000 lines of contracts for ~2000 lines of engine code). The documentation will drift as the code evolves.           |

**Overall: 6.0/10** — Conceptually sound, implementation-incomplete, documentation-heavy.

---

## 11. Strategic Recommendations

### 3 Structural Changes

1. **Extract `@dvt/plan-interpreter` package.** Move [`planExecutionLayers()`](packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts:347), DAG validation, and layer computation out of the Temporal adapter into a shared package. Both Temporal and Conductor adapters must consume this package. Add golden-path tests that verify identical execution order across adapters. This is the single most important structural change for multi-adapter correctness.

2. **Extract `@dvt/projector` package.** Move [`applyRunEvent()`](packages/@dvt/engine/src/core/SnapshotProjector.ts:24) into a shared package consumed by both the engine and the Postgres adapter. Eliminate the duplicated [`applyEventToSnapshot()`](packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:90). Add Layer 3 transition validation to the projector.

3. **Define `IExecutionPlanner` interface.** Create the contract that specifies how plans are produced, what they must contain, and how they are validated. Include: step type taxonomy, retry policy per step, timeout per step, and pre-computed execution layers. This interface is the missing link between the planning layer and the engine.

### 3 Clarifications Needed

1. **What is the consistency model between Temporal state and Postgres state?** When they diverge (and they will), which is authoritative? The contracts say Postgres is the source of truth, but if Temporal has progressed and Postgres has not, the run is in an inconsistent state. Define the reconciliation strategy.

2. **What are the Conductor parity acceptance criteria?** The capability matrix shows gaps, but there is no documented decision on which gaps are acceptable. Can Conductor runs have weaker pause/resume guarantees? If so, how does the UI communicate this to users?

3. **What is the plan schema evolution strategy?** When `ExecutionPlan` v1.0.0 needs to become v2.0.0 (e.g., adding per-step retry policy), how are in-flight runs on v1 handled? The Temporal spec mentions cross-schema continuation but no implementation exists.

### 3 Things to Freeze Immediately

1. **`RunEventWrite` / `RunEventRecord` envelope schema.** This is the most critical contract in the system. Every consumer depends on it. The v2.0.1 specification is well-defined. Freeze it. No more changes without a major version bump and 6-month deprecation window.

2. **Idempotency key derivation formula.** The SHA-256 formula with `|` delimiter and fixed field order is correct and tested. Freeze it. Any change breaks all existing event deduplication.

3. **`IProviderAdapter` interface.** The 5-method interface (`startRun`, `cancelRun`, `getRunStatus`, `signal`, `capabilities`) is minimal and correct. Freeze it. Adding methods to this interface forces changes in every adapter.

### 3 Things to Delay

1. **Plugin system implementation.** Delay until Phase 3 minimum. The engine must be stable and in production before the extension surface is built. Building plugins before `IExecutionPlanner` is stable will produce an API that needs breaking changes.

2. **Cost attribution and Snowflake analytics.** Delay until production runs generate real cost data. Estimating costs without historical data is guesswork. Build the cost event schema first, collect data for 3 months, then build the estimator.

3. **Multi-event-bus support (Kafka/NATS/Redis).** The outbox pattern with Postgres polling is sufficient for Phase 1 and Phase 2. Adding Kafka/NATS adds operational complexity without proportional benefit until event volume exceeds what Postgres polling can handle (~100K events/minute).

esumen ejecutivo
Score global: 6.0/10 — Conceptualmente sólido, implementación incompleta, documentación desproporcionada.

Hallazgos críticos
La separación Planner/Engine/State se erosiona en el adapter boundary. El DAG walker (planExecutionLayers()), la política de retry (hardcoded 3 retries), y la lógica de ejecución paralela viven dentro del Temporal adapter — no en un planner compartido. Cuando Conductor se añada, esta lógica se reimplementará independientemente sin contrato de equivalencia.

IExecutionPlanner no existe. Es la interfaz más referenciada en el diagrama V2 (IExecutionPlanner) pero no tiene código ni contrato. Los planes son JSON blobs sin validación estructural.

applyEventToSnapshot está duplicado. El engine tiene applyRunEvent() y el Postgres adapter tiene su propia copia en applyEventToSnapshot() con un comentario "must be kept in sync" — invariante manual que fallará.

Layer 3 de validación de transiciones no implementado. El SnapshotProjector aplica eventos incondicionalmente. Transiciones inválidas corrompen el snapshot silenciosamente.

Tenant isolation es solo WHERE-clause. Sin RLS en Postgres. Un bug en una query = breach cross-tenant.

3 cambios estructurales recomendados
Extraer @dvt/plan-interpreter — DAG walker compartido entre adapters
Extraer @dvt/projector — proyección compartida con validación Layer 3
Definir IExecutionPlanner — contrato formal para producción de planes
3 cosas a congelar inmediatamente
Schema RunEventWrite/RunEventRecord (v2.0.1)
Fórmula de idempotency key SHA-256
Interfaz IProviderAdapter (5 métodos)
3 cosas a diferir
Plugin system (hasta Phase 3 mínimo)
Cost attribution / Snowflake analytics (hasta tener datos reales)
Multi-event-bus (Kafka/NATS) — outbox con Postgres es suficiente hasta Phase
