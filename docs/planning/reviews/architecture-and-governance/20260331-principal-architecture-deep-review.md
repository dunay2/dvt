---
title: Principal Architecture Deep Review - DVT (2026-03-31)
status: Draft
owner: docs
last_reviewed: 2026-03-31
planning_type: review
---

---

title: Principal Architecture Deep Review - DVT (2026-03-31)
status: Active
owner: Architecture
date: 2026-03-31
review_type: principal-architecture
scope: engine, planner, state-store, temporal-adapter, contracts

---

# Principal Architecture Deep Review - DVT (2026-03-31)

**Reviewer posture:** Staff/Principal Software Architect.  
**Method:** Code-first. Documents consulted only to calibrate intent vs implementation.  
**Sources used:** `packages/@dvt/engine`, `packages/@dvt/planner`, `packages/@dvt/adapter-temporal`, `packages/@dvt/adapter-postgres`, `packages/@dvt/contracts`, `docs/planning/execution-model/dvt-execution-model.md`, `docs/architecture/reference-architecture.md`, and the ADR index (ADR-0003 through ADR-0038).

---

## 1. Conceptual Soundness

### What is solid

**Hexagonal port discipline** - `WorkflowEngine` depends exclusively on declared ports
(`IRunStateStoreRead`, `IRunStateStoreWrite`, `IProviderAdapter`, `IStartRunIntentStore`,
`IRunAccessPolicy`, `IObservability`). No SDK import leaks into engine core. This is the
strongest architectural asset in the repository.

**Planner purity** - `Planner.buildPlan` has no I/O dependencies. No database call, no
network, no state read. It receives an envelope and returns a deterministic
`{ plan, canonicalPlanJson }`. The hash is reproducible: `sha256(JCS({ nodes, selection, policies }))` ->
input hash, then `sha256(JCS({ metadata: { planVersion, inputHashSha256 }, steps }))` -> planId. This
is correct.

**CQRS write/read split at state store** - `IRunStateStoreWrite` (bootstrap + append) and
`IRunStateStoreRead` (metadata, events, snapshot) are distinct interfaces. `appendAndEnqueueTx`
enforces atomic append + outbox enqueue. This correctly owns the dual-write hazard.

**Pre-dispatch intent pattern** - The `StartRunExecutionService` two-paths
(`startRunWithEstimatedRef` / `startRunWithoutEstimatedRef`) cover the adapter crash window.
`estimateRunRef` allows pre-bootstrap before the network call. ADR-0030 is fully implemented.

**Event envelope discipline** - `EventInput` carries no `runSeq`/`persistedAt`. The storage
layer assigns them. Callers cannot forge ordering.

**Temporal workflow determinism** - `RunPlanWorkflow` is explicitly clean: no `Date.now()`,
no `Math.random()`, no Node.js APIs. Activities own all side effects. `continueAsNew` is
implemented with full state forwarding.

---

### What is fragile

#### F1 - `manifestRef` path is a dead code path in the planner

`PlannerInputEnvelopeV2` declares `manifestRef` as the **canonical production path**.
`GRAPH_SOURCE_COMPATIBILITY_POLICY` says `nodes` and `manifest` are compatibility-only.
`InputEnvelopeValidator` likely validates the one-active-source rule. But `Planner.normalizeInput`
resolves nodes as:

```ts
if (Array.isArray(input.nodes) && input.nodes.length > 0) {
  nodes = input.nodes;
} else if (input.graphSource !== undefined) {
  nodes = input.graphSource.nodes;
} else {
  nodes = [];      // <- if only manifestRef is provided, this executes
}
if (nodes.length === 0) throw new PlannerError(INVALID_INPUT, ...)  // <- immediate throw
```

`manifestRef` is never resolved to nodes inside `buildPlan`. The `PlannerFacade` may do
artifact resolution upstream, but the `Planner` class itself - the domain service - cannot
accept the canonical production path. The contract says "canonical"; the code makes it
unreachable.

**Severity:** Critical. Any caller that follows the documented production path and passes
only `manifestRef` will receive an `INVALID_INPUT` error from the domain core.

---

#### F2 - Dual `ExecutionPlan` type identity

Two `ExecutionPlan` shapes exist:

- `ExecutionPlanV2` (planner side, `contracts/src/contracts/planner/ExecutionPlan.v2.ts`) - has
  `metadata.planVersion`, no `schemaVersion`.
- `ExecutionPlan` (engine/state-store side, `contracts/src/engine/IRunStateStore.v1.ts`) - has
  `metadata.schemaVersion` as a field, no structured `planVersion` registry typing.

There is no explicit conversion contract between these two shapes. The Temporal adapter's
`activities.fetchPlan(planRef)` returns `ExecutionPlan` (engine side). The planner emits
`ExecutionPlanV2`. If an adapter fetches a plan produced by the planner and interprets it
through the engine-side type, `schemaVersion` will be undefined and any validation that
checks it will silently pass or fail depending on strictness.

**Severity:** High. Silent schema mismatch at the adapter boundary.

---

#### F3 - Event ordering violation in the cancel path

Engine `cancel()` flow:

1. `adapter.cancelRun(runRef)` -> Temporal cancels the workflow -> Temporal workflow signal handler
   sets `state.cancelled = true` -> on next layer boundary: `activities.emitEvent('RunCancelled')` writes
   `RunCancelled` to state store.
2. `emitRunEvent(..., 'RunCancelRequested')` - engine emits this AFTER the adapter call returns.

The Temporal workflow can complete (emit `RunCancelled`) before the engine emits
`RunCancelRequested`, because `adapter.cancelRun` is a fire-and-forget cancel request - the
workflow can process it asynchronously on the next activity boundary. The event log can
therefore contain:

```
seq 1: RunQueued
seq 2: RunStarted
seq 3: RunCancelled       <- emitted by workflow activity
seq 4: RunCancelRequested <- emitted by engine after adapter.cancelRun returns
```

This violates the state machine in Section 13.2 of the execution model spec. `RunCancelled` is
terminal; `RunCancelRequested` arriving after it is an orphaned intermediate state event.

The projector (`SnapshotProjector`) receives these events in order and must produce a
coherent snapshot. Whether it handles this gracefully depends on its state machine
implementation, but the event log itself is now semantically invalid.

**Severity:** High. Observable in integration tests and production.

---

#### F4 - `TemporalAdapter.getRunStatus` violates the provider enrichment contract

The execution model spec Section 17.2 says: `enrichRunStatus` may call the provider adapter to
obtain substatus/transient diagnostics. Provider status is **enrichment, not authority**.

`TemporalAdapter.getRunStatus` actually calls `stateStore.listEvents()` and
`projector.rebuild()`. It is doing the authoritative projection, not provider enrichment.
This means `IProviderAdapter.getRunStatus` is implemented as a state-store projection

- not as a provider-native status query. The name says "provider status" but the body says
  "I am a projector."

This coupling means the Temporal adapter has a direct runtime dependency on
`IRunStateStoreReadLike` and `SnapshotProjectorLike`. If you replace Temporal with
Conductor, Conductor's adapter must also inject a state store - a provider-agnostic concern
leaking into provider-specific code.

**Severity:** Medium. Breaks the principle "adapters receive validated contracts, not
internal aggregates."

---

#### F5 - `PostgresStateStoreAdapter` uses inheritance for composition

`PostgresStateStoreAdapter extends PostgresStateStoreRuntime`. The runtime owns wiring,
connection lifecycle, and internal methods. The adapter exposes the public surface by
delegating to `*Internal` methods guarded by `this.ready()`.

This is SOLID/OOP incorrect. Inheritance is used where composition belongs. The adapter
should hold a reference to a runtime object. The current structure means:

- The adapter IS a runtime - it can call any internal method.
- `ready()` is a lifecycle concern mixed with the domain boundary.
- Subclassing `PostgresStateStoreRuntime` makes it impossible to test the adapter with a
  different runtime implementation.

**Severity:** Medium. Structural debt that will resist refactoring.

---

#### F6 - Concurrent `startRun` race window

The admission guard (`StartRunAdmissionGuard.assertStartRunAllowed`) reads state
(`getRunMetadataByRunId`) to check for duplicate runs. Then intent is created. Then adapter
is started. Between the read and the bootstrap (`bootstrapRunTx`), two concurrent calls with
the same `runId` can both pass admission. The second will fail at `bootstrapRunTx` with
`RunAlreadyExistsError`, but by then:

- Intent 1 is created
- Intent 2 is created
- Adapter 1 is started (Temporal workflow launched)
- Adapter 2 may also be started if timing allows

The `intentStore.createIntent` does NOT enforce uniqueness by (runId, logicalAttemptId) at
the database level as a gate before adapter dispatch. If two concurrent callers race, both
can create intents and both can call `adapter.startRun`. Temporal will reject the second
workflow start (same `workflowId` = deterministic from `runId`), but the intent for the
second call will be left in PENDING/DISPATCHED state and must be reconciled by the orphan
reconciler.

This is partially mitigated by ADR-0030 reconciliation, but the race window is real and
its recovery path is the reconciler - not prevention.

**Severity:** Medium. Requires operational confidence in the reconciler.

---

### What is missing

- **Distributed lock or intent uniqueness enforcement** before adapter dispatch.
- **Plugin capability contract** (mentioned in spec Section 21, absent from code).
- **Cost attribution port** (mentioned in spec Section 9 of the cost review, absent from contracts).
- **ArtifactStore boundary** (partial - referenced in planner ports but no production implementation).
- **Backpressure contract** (partially in API layer, not in engine or state store layer).
- **`schemaVersion` validation in engine** - `PlanRef` carries `schemaVersion`, but the engine
  does not validate this against the plan registry before dispatching.

---

## 2. Architectural Risk Map

| Risk                                                     | Severity | Likelihood | Why                                                                                                                                                                         | Mitigation                                                                                                                                                                                                         |
| -------------------------------------------------------- | -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **R01 - `manifestRef` path throws INVALID_INPUT**        | Critical | High       | `Planner.normalizeInput` produces empty nodes when only `manifestRef` is provided                                                                                           | Implement manifest resolution in `PlannerFacade` and verify the path reaches non-empty nodes before entering domain                                                                                                |
| **R02 - Cancel event ordering violation**                | High     | Medium     | `RunCancelled` can precede `RunCancelRequested` in the event log                                                                                                            | Engine must not emit `RunCancelRequested` if adapter is async-cancel; use a different event for the engine-side action or reorder the sequence                                                                     |
| **R03 - Dual ExecutionPlan type mismatch**               | High     | Medium     | Planner emits `ExecutionPlanV2`, engine consumes `ExecutionPlan` - different shapes                                                                                         | Define a single shared type or an explicit adapter type converter with validation                                                                                                                                  |
| **R04 - TemporalAdapter state store coupling**           | Medium   | Certain    | `TemporalAdapter.getRunStatus` directly uses `IRunStateStoreReadLike` and `SnapshotProjectorLike`                                                                           | Move projection out of adapter; have engine own the full read path                                                                                                                                                 |
| **R05 - Concurrent startRun race**                       | Medium   | Low        | Admission guard read-before-intent without distributed lock                                                                                                                 | Add `INSERT ... ON CONFLICT DO NOTHING` uniqueness at intent creation or add advisory lock per runId                                                                                                               |
| **R06 - PostgresStateStoreAdapter inheritance coupling** | Medium   | Certain    | Structural - adapter IS the runtime                                                                                                                                         | Refactor to composition; extract `PostgresStateStoreRuntime` as an injected dependency                                                                                                                             |
| **R07 - `continueAsNew` state loss on plan change**      | High     | Low        | If the plan artifact is mutated at the same URI between continueAsNew rollovers, the resumed workflow fetches a different plan                                              | Make plan URI content-addressed (sha256-keyed), enforce immutability at fetch time                                                                                                                                 |
| **R08 - `RunPlanWorkflow.emitEvent` idempotency gap**    | High     | Low        | Activity retries (up to 3) can call `appendAndEnqueueTx` multiple times for the same event                                                                                  | The state store must deduplicate by `(runId, idempotencyKey)`. If the idempotencyKey for each emitEvent call is not derived deterministically from the workflow execution context, retries create duplicate events |
| **R09 - Snapshot staleness under high load**             | Medium   | High       | At 1000+ concurrent runs, snapshot writes may lag event writes; stale snapshot causes full event replay                                                                     | Add snapshot-write lag monitoring; set max-event-replay-count threshold before forcing projector rebuild                                                                                                           |
| **R10 - Plan artifact availability SLA**                 | High     | Low        | `fetchPlan` is called on every workflow execution and after every continueAsNew rollover                                                                                    | Plan artifacts must have TTL >= max workflow duration; enforce this at plan storage boundary                                                                                                                       |
| **R11 - Single `planVersion = 1.0` registry**            | Low      | Certain    | No migration path tested for introducing `2.0`; compatibility matrix is ADR-only                                                                                            | Implement registry compatibility check in engine before dispatch; add integration test for schema version mismatch                                                                                                 |
| **R12 - Write amplification in event log**               | Medium   | High       | Sequential `emitStepStartedForLayer` before parallel execution creates N events per layer; for 1000-node plans, this is 1000 sequential round-trips before execution starts | Batch `StepStarted` event emission or emit them lazily at step start                                                                                                                                               |
| **R13 - Plugin security boundary absent**                | High     | Certain    | Plugin runtime is specified in the execution model but has zero implementation                                                                                              | Do not allow plugin execution paths until a deny-by-default sandbox is implemented                                                                                                                                 |
| **R14 - Cost attribution undefined**                     | Medium   | Certain    | No contract, no port, no implementation                                                                                                                                     | Freeze any cost-dashboard commitments until the cost attribution port is defined at the engine boundary                                                                                                            |

---

## 3. Engine Abstraction Critique

### Is `IWorkflowEngine` minimal and correct?

```ts
startRun(planRef, context): Promise<EngineRunRef>
cancelRun(engineRunRef): Promise<void>
getRunStatus(engineRunRef): Promise<RunStatusSnapshot>
enrichRunStatus(engineRunRef): Promise<RunStatusSnapshot>
signal(engineRunRef, request): Promise<void>
```

Five operations. Minimal. The `getRunStatus` / `enrichRunStatus` split correctly separates
authoritative state from provider enrichment. This is a well-designed minimal surface.

The `healthCheck()` method on `WorkflowEngine` is **not** on the `IWorkflowEngine` interface.
It exists on the concrete class. This means it is not testable through the contract boundary.
It is also ping-based, which is a weak health signal (latency, not functional correctness).

### Is Temporal-first strategy wise?

Yes, for this problem domain. Temporal provides:

- Workflow history and replay
- Activity retry with backoff
- Signal/query/timer primitives
- Durable execution across crashes

The `continueAsNew` pattern for large plans (1000+ nodes) is the correct solution for
Temporal history limits. The implementation is correct.

**Risk:** The Temporal adapter is Phase 1 closed, but `TemporalAdapterStub` still exists in
the engine package and throws on every call. Two adapter implementations exist with different
contracts. The stub must be explicitly removed from any production wiring.

### Is the event model robust?

The event model (`EventType`, `RunEventInputBase`, `EventInput`, `EventEnvelope`) is well-structured.
`idempotencyKey` is mandatory. `runSeq` is assigned by storage. The types enforce the
write-shape/persisted-shape distinction.

**Gap:** `payloadVersion: 1` is hardcoded in `RunEventInputBase`. If a payload schema needs to
change, there is no migration path for events already in the log. Event replay of historical
events with a new projector that expects `payloadVersion: 2` will fail silently or incorrectly.

### Where determinism assumptions could fail

1. **`new Date().toISOString()` in `PlanAssembler.assembleFinalPlan`** - `createdAtIso` is
   stamped with the real clock and placed in the final plan object. This field is excluded
   from the hash (`planCore` does not include `createdAtIso`). Two plan objects with the same
   `planId` will differ in `createdAtIso`. Any code that hashes the full plan object (not just
   the core) will produce inconsistent results.

2. **`gateway` step DSL evaluation** - Gateway decisions are computed inside the Temporal
   workflow using `collectDownstreamStepIds` and the gateway expression evaluator. If the DSL
   evaluation is not strictly deterministic (no external reads, no `Date.now()`), Temporal
   replay will fail. This must be verified against the `@dvt/dsl` implementation.

3. **`stepTypeConfig: Record<string, unknown>`** - This opaque blob is included in the plan
   and influences step behavior. If a step type uses `stepTypeConfig` to pass non-deterministic
   values (env variables, timestamps), determinism is broken without detection.

---

## 4. Execution Planning Layer Analysis

### DAG analyzer based on dbt artifacts

The `GraphBuilder` -> `TopoSort` -> `NodeSelector` pipeline is clean. Each step has a single
responsibility. `topoSort` using Kahn's algorithm is correct and deterministic for fixed
input ordering (nodes are sorted by `nodeId` before processing).

**Issue:** `Planner.normalizeInput` flattens `manifestRef` -> empty nodes. The manifest
parsing path (raw dbt manifest -> `GraphNode[]`) is in `domain/manifest.ts`, but the planner
core never invokes it on the `manifestRef` path. The application layer (`PlannerFacade`) must
bridge this, but then the planner's CQRS contract is broken: the command handler cannot be
called with the canonical input type.

### Partial execution guarantees

Node selection (`NodeSelector`) supports `includeUpstream` / `includeDownstream`. This is
correct. But there is no explicit contract guaranteeing that partial execution preserves
consistency for downstream consumers of skipped steps. If a step is skipped due to gateway
decisions, its downstream dependents receive `StepSkipped` events. If a consumer project
(lineage, cost attribution) expects all step events to be present, partial execution silently
produces an incomplete lineage record.

### Retry/backoff policy ownership

Infrastructure retries: Temporal activity retry (3 attempts, 1s-60s backoff, 2x coefficient).
Business retries: `logicalAttemptId` counter, `reserveRetryAttempt` at state store.
These two layers are distinct and do not contaminate each other - this is correct per ADR-0016.

**Gap:** There is no retry policy per step kind. All steps share the same activity retry
config (`maximumAttempts: 3`). A Snowflake query step and a compilation step have different
failure modes and should have different retry policies.

### Cost estimator realism

Zero implementation. The cost model is referenced in documentation and ADR notes but has no
code representation: no port, no contract, no adapter, no hook in the engine. Any roadmap
item that depends on cost attribution is blocked until this is defined.

### Plan versioning strategy

`SUPPORTED_EXECUTION_PLAN_VERSIONS = ['1.0']`. ADR-0036 defines the registry and compatibility
matrix. The implementation is correct for a single-version world.

**Gap:** The engine does not validate `PlanRef.schemaVersion` against the registry at
dispatch time. An engine receiving a `schemaVersion: 'v2.0'` plan will attempt to dispatch
it to an adapter that may not understand it. There is no runtime guard.

### Is this layer over-engineered?

The planner itself (CQRS command model, step factory, graph builder, assembler) is
appropriately structured for the problem size. It is not over-engineered.

The `GRAPH_SOURCE_COMPATIBILITY_POLICY` constant is over-documented for code that does not
enforce it at runtime. If the policy is real, enforce it in code. If it is aspirational,
remove the constant.

### Is it under-specified?

Yes. The plan lifecycle after creation is under-specified:

- Who owns plan storage? `IArtifactResolver` exists but has no production implementation.
- What is the plan TTL enforcement mechanism?
- Who validates plan integrity before dispatch? `IPlanIntegrityValidator` is defined but
  never called in the engine dispatch path visible in the code.

---

## 5. State & Metadata Layer Review

### Is artifact immutability realistic?

For the event log: yes. `appendAndEnqueueTx` is append-only. `bootstrapRunTx` rejects
duplicate `runId`. `runSeq` is assigned by the storage layer. These guarantees hold at the
contract level.

**Write amplification risk:** Each step in a layer emits 2 events (StepStarted, then
StepCompleted or StepFailed). For a 1000-node dbt project across 10 concurrent runs, that is
up to 20,000 sequential event writes per run. `StepStarted` events are emitted
sequentially per layer (`for await` in `emitStepStartedForLayer`), not batched. This is N
round-trips per layer per run.

### Event sourcing vs mutable state tradeoffs

**Correct tradeoff:** Snapshots are derived, not authoritative. `getStatus` uses snapshot
first, event replay fallback. This is the standard CQRS read optimization.

**Unresolved tension:** The snapshot is written inside `appendAndEnqueueTx` (or by a
separate projector worker). If the projector worker fails after event commit but before
snapshot write, the snapshot lags the event log. This is the documented staleness risk
(R-20260330-snapshot-staleness-caller-view.yaml). The mitigation (staleness query +
projector worker) is implemented. The monitoring for snapshot lag is not.

**`RunMetadata` contains provider-specific fields at top level** - `providerWorkflowId`,
`providerRunId`, `providerNamespace`, `providerTaskQueue`, `providerConductorUrl` are all
flat fields on `RunMetadata`. This means the shared-kernel type bleeds provider details.
When Conductor is added, more provider-specific fields will accumulate. This should be a
discriminated union or a provider-specific metadata extension.

---

## 7. What Is Overbuilt?

### Observability layering in engine core

Every engine operation wraps in `observability.withContext -> observability.traces.withSpan ->`
`try/catch span.setStatus -> span.recordException`. This is 15+ lines of wrapper for every
operation. The pattern is correct but the volume creates cognitive noise in core service
implementations. A helper function or decorator pattern would reduce this to 3-4 lines.

### `StartRunCoordinator` / `StartRunExecutionService` / `StartRunAdmissionGuard` decomposition

The `startRun` path is split across:

- `WorkflowEngine.startRun` (normalization + trace setup)
- `StartRunCoordinator.execute` (orchestration + metrics)
- `StartRunAdmissionGuard.assertStartRunAllowed` + `resolveAdapter`
- `StartRunExecutionService.executeStartRun` (two sub-paths)
- `StartRunFailurePolicy.handleStartRunError` (compensation)
- `StartRunEventFactory` (event construction)

Six collaborators for a single operation. Each class is SRP-correct in isolation. Together
they are over-decomposed for the current scale. This level of decomposition makes sense for
a team of 10+ where ownership separation matters. For the current repository size, it adds
navigation cost without proportional benefit.

### `GRAPH_SOURCE_COMPATIBILITY_POLICY` constant

This exported constant documents a policy that is not enforced in the runtime. Remove or
enforce it.

---

## 8. What Is Underbuilt?

### Migration strategy

There is no documented or implemented migration strategy for:

- Existing event logs when `payloadVersion` changes.
- Snapshot schema changes (the `WorkflowSnapshot` type).
- `RunMetadata` schema changes (new provider fields).
- `ExecutionPlan` schema version evolution beyond `1.0`.

### Version evolution of contracts

ADR-0017 defines `ExecutionPlan` schema versioning. ADR-0036 defines the version registry.
The engine does not enforce version compatibility at dispatch time. The plan interpreter
(`@dvt/plan-interpreter`) processes whatever schema it receives without version-gating.

### Rollback guarantees

The `PostgresStateStoreAdapter.rollbackSchemaTo` exists. There is no documented integration
test that verifies rollback followed by replay produces a correct result. Schema rollback
with existing event data is untested.

### Distributed consistency model

No explicit mechanism for:

- Cross-shard run uniqueness enforcement before adapter dispatch.
- Leader election for the outbox worker (ADR-0033 defines the sharding model; implementation
  exists but cluster-mode fencing has no integration test evidence).

### Concurrency model

The engine has no admission control for per-tenant or per-plan concurrency limits at the
engine layer. The API layer has backpressure (circuit breaker + persisted fallback). The
engine itself accepts any call. At 1000 tenants with 10 concurrent runs each, the engine
processes up to 10,000 concurrent `startRun` calls with no throttle.

### Backpressure strategy

Backpressure exists at the API layer (low-TTL cache + circuit breaker + persisted last-known-good).
Nothing equivalent exists at the engine -> state store boundary. A burst of events can exhaust
the Postgres connection pool without the engine being aware.

### Run retention policy

ADR-0038 defines delivery-buffer retention. ADR-0037 defines lifecycle archival. The
implementation of automated retention enforcement (TTL-based purge of old run events) is not
present in the code. Runs accumulate indefinitely.

### SLA definitions

No SLA contract exists for:

- Plan build time (the planner has a `timeoutMs` limit, but no p99 target).
- `startRun` end-to-end latency.
- `getRunStatus` read latency.
- Snapshot rebuild time.

---

## 9. Scalability Outlook - 3-Year Horizon

**Assumptions:** 1000+ tenants, thousands of concurrent runs, 1000+ node dbt projects,
heavy cost dashboards, cross-environment diffs.

### Bottlenecks

**1. Postgres event log write throughput**  
At 1000 concurrent runs, each emitting 2 events per step per layer (sequential), and each
layer taking at least 1 round-trip to Postgres, the event log will become the primary I/O
bottleneck. The `appendAndEnqueueTx` call is synchronous per event batch. There is no
write batching across concurrent runs.

**2. Snapshot projection lag**  
The projector worker is a single-tenant-at-a-time process. With 1000 tenants, the
staleness queue will grow. The staleness query (`PostgresSnapshotStalenessQuery`) pulls a
batch, but there is no documented batch size limit that accounts for 1000+ tenants.

**3. Planner computation for 1000-node graphs**  
`GraphBuilder.execute` is O(N) in node count. `topoSort` is O(V+E). `NodeSelector` with
`includeUpstream = true` can be O(V+E). For 1000 nodes, this is fast. For 5000 nodes
(large enterprise dbt projects), JCS canonicalization of the full step list may start to
matter. The `maxPlanSizeBytes` guard exists but no performance baseline exists.

**4. Temporal history limits**  
`continueAsNew` is implemented with a `continueAsNewAfterLayerCount` threshold. For
1000-node projects with 20+ layers and 50+ steps per layer, the Temporal workflow history
can grow to 10,000+ events before a rollover triggers (depending on the threshold). The
default Temporal history limit is 51,200 events. At 1000 events per rollover, this is safe.
But step-level activities emit 2 events each (StartActivity, CompleteActivity) in Temporal
history - so a 1000-node run emits 2000 Temporal history events minimum.

**5. Plan artifact availability**  
`fetchPlan` is called on every workflow execution and after every `continueAsNew`. With 1000
concurrent runs and a slow artifact store, this becomes a latency multiplier.

**6. Single points of failure**

- Temporal cluster: single point of failure for all run execution. No multi-region failover
  is documented.
- Postgres: single writer. Read replicas exist in the design but not in the current
  implementation (same connection pool for reads and writes in `PostgresStateStoreRuntime`).
- Outbox worker: sharding is defined (ADR-0033) but a full shard-fencing integration test
  is absent.

**7. Data growth pressure**  
Run events are append-only. With 10,000 runs/day x 1000 events/run = 10 million rows/day.
At 1000 tenants, this is 10 billion rows/year without retention. ADR-0037 and ADR-0038
define retention but the automated enforcement is absent.

---

## 10. Architectural Scorecard

| Dimension                     | Score | Justification                                                                                                                                                                                                                                                                            |
| ----------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Conceptual clarity**        | 8/10  | The three-separation principle (planner/engine/state) is clearly articulated and mostly enforced. Deducted for the dual `ExecutionPlan` type identity problem and the `manifestRef` dead path.                                                                                           |
| **Separation of concerns**    | 7/10  | Engine, planner, and state store are genuinely separated. Deducted for `TemporalAdapter` owning projection (F4), and `PostgresStateStoreAdapter` inheritance coupling (F5).                                                                                                              |
| **Replaceability of engine**  | 7/10  | `IWorkflowEngine` contract is clean and minimal. `TemporalAdapter` is properly isolated. Deducted because the adapter carries state-store references, which will need to be decoupled before another adapter can be cleanly substituted.                                                 |
| **Determinism**               | 7/10  | Planner hash is correct. Workflow is sandbox-clean. Deducted for `createdAtIso` volatility in plan object (not in hash but in the returned plan), the cancel event ordering violation (F3), and the missing gateway DSL determinism verification.                                        |
| **Extensibility**             | 6/10  | Plugin runtime is documented but absent. Step retry policy is global (not per kind). `stepTypeConfig` is opaque. Cost attribution port is missing. Multi-engine abstraction has no second production engine to validate the abstraction.                                                 |
| **Operational realism**       | 6/10  | OIDC auth + backpressure + intent reconciler show operational maturity. Deducted for absent retention enforcement, no snapshot-lag monitoring, no run concurrency throttle at engine layer, and no SLA definition.                                                                       |
| **Long-term maintainability** | 7/10  | ADR coverage is unusually strong (38 ADRs). Governance is enforced. Contract formalism is real. Deducted for over-decomposition of `startRun` path (F5 collaborators), inheritance coupling in Postgres adapter, and the dead `manifestRef` path which will mislead future contributors. |

**Total: 48/70** - Architecturally credible foundation with concrete, addressable defects.

---

## SOLID / Hexagonal / CQRS / OOP Assessment

### SOLID

- **SRP** - Mostly observed. `WorkflowEngineCoreService` handles cancel, status, enrichStatus,
  and signal. Four different operations in one class. Acceptable given they share the same
  authorization and adapter resolution flow. The `startRun` path is over-decomposed
  in the opposite direction.
- **OCP** - Adapter map (provider -> adapter) allows extension without modifying the engine.
  Step kinds are registry-extensible. Pass.
- **LSP** - `IRunStateStore = IRunStateStoreWrite & IRunStateStoreRead & IRunStateStoreMaintenance`.
  Composing via intersection types is correct. `PostgresStateStoreAdapter` satisfies all three.
  Pass.
- **ISP** - `IRunStateStoreWrite` and `IRunStateStoreRead` are separated. `IWorkflowEngine` is
  minimal. `IProviderAdapter` has 4 methods. Pass. Exception: `runStateCommandPortBridge.ts`
  introduces a redundant facade over the write port.
- **DIP** - Engine depends on ports, not implementations. Adapters depend on ports. Pass.
  Exception: `PostgresStateStoreAdapter extends PostgresStateStoreRuntime` - this is a DIP
  violation at the adapter layer.

### Hexagonal

Ports and adapters are correctly identified and implemented. The engine's domain boundary
is not polluted with infrastructure concerns. The adapter module boundary is respected.
**Defect:** `TemporalAdapter` holds `IRunStateStoreReadLike` - infrastructure leaked into
infrastructure (cross-adapter coupling).

### CQRS

Write side: `appendAndEnqueueTx`, `bootstrapRunTx`. Read side: `getSnapshot`, `listEvents`,
`getRunStatus`. Commands and queries are genuinely separated at the interface level. The
projector is a pure function (`rebuild(runId, events) -> RunStatusSnapshot`). Correct.

### OOP

Domain objects (`ExecutionPlan`, `RunContext`, `SignalRequest`) are typed value objects.
`WorkflowEngine` is a service with dependency injection. `Planner` is a pure domain service.
The `BuildPlanCommand` / `AssemblePlanCommand` pattern is DDD command modeling done correctly.

---

## 11. Strategic Recommendations

### 3 Structural Changes

**S1 - Fix `manifestRef` resolution in the planner pipeline**  
`Planner.buildPlan` must resolve `manifestRef` to nodes before the normalization step.
The `PlannerFacade` must inject an `IArtifactResolver` and pass resolved nodes to the
planner, OR the planner must accept an `IArtifactResolver` port and resolve it internally.
Currently, passing the canonical production input to the planner core throws `INVALID_INPUT`.
This is the highest-priority defect. It blocks any production caller that follows the
documented API.

**How to advance:** Implement `IArtifactResolver` (the port exists in
`packages/@dvt/planner/src/ports/IArtifactResolver.ts`). Wire it into `PlannerFacade`.
Ensure `PlannerFacade` resolves manifest -> nodes before calling `Planner.buildPlan`. Add
integration test: `PlannerFacade.buildPlan({ manifestRef: {...} })` -> valid plan.

---

**S2 - Fix the cancel event ordering violation**  
The engine must not emit `RunCancelRequested` after `adapter.cancelRun` returns. The
adapter is a fire-and-continue call - the workflow processes the cancel signal asynchronously.
The correct model is:

- Engine emits `RunCancelRequested` BEFORE calling `adapter.cancelRun`.
- The workflow emits `RunCancelled` when it processes the cancel signal.
- Both events are in the correct state machine order.

Alternatively: do not emit `RunCancelRequested` from the engine at all. Let the workflow own
the full cancel lifecycle through `RunCancelRequested` -> `RunCancelled`. The engine's cancel
path becomes: authorize -> adapter.cancelRun -> done. The workflow emits the events.

**How to advance:** Choose one model. Document in ADR-0007 (run cancellation semantics).
Add a determinism replay test that asserts `RunCancelRequested` appears before `RunCancelled`
in the event log for the cancel path.

---

**S3 - Resolve the dual `ExecutionPlan` type identity**  
Define a single canonical `ExecutionPlan` type in `@dvt/contracts`. Both the planner and
the engine consume it. The planner emits it; the engine receives it via `PlanRef` resolution.
The current two-type situation (`ExecutionPlanV2` vs engine-side `ExecutionPlan`) creates
silent schema divergence.

**How to advance:** Create a migration ADR. Align the two types. The engine-side `ExecutionPlan`
in `IRunStateStore.v1.ts` should reference or extend `ExecutionPlanV2` from the planner
contracts. Enforce this with a `satisfies` check or a type assertion in a contract test.

---

### 3 Clarifications Needed

**C1 - Who owns `StepStarted` event emission?**  
The workflow emits `StepStarted` via activity. The engine never emits `StepStarted`.
Is this intentional? If the engine is responsible for domain event emission and the
workflow is responsible for physical execution, then having the workflow emit domain state
events violates the boundary. If the workflow owns event emission, then the engine's event
model is not the authoritative record - the workflow is. This needs explicit architectural
decision.

**C2 - What is the `TemporalAdapterStub` lifecycle?**  
`TemporalAdapterStub` throws on every method. The real `TemporalAdapter` exists and is
"closed for Phase 1." When does the stub get removed from production wiring? Is it ever
wired in non-test code? This needs to be tracked or the stub should be deleted.

**C3 - What does `IPlanIntegrityValidator.fetchAndValidate` protect against at runtime?**  
The interface exists. The engine does not call it in the dispatch path visible in
`StartRunExecutionService`. Is plan integrity validation happening at the API layer only?
If a malformed plan URI reaches the adapter, the failure will be an unstructured activity
error in Temporal rather than a clean rejection at dispatch.

---

### 3 Things to Freeze Immediately

**F1 - Freeze new planner graph-source paths**  
No new graph source variants (`manifestRef`, `graphSource`, `nodes`, `manifest`) should be
added until the `manifestRef` dead-path bug is fixed. The current state has the canonical
path non-functional. Adding more paths before fixing the canonical one increases surface area
of broken behavior.

**F2 - Freeze plugin runtime integration**  
The execution model spec describes a plugin runtime with deny-by-default capabilities,
isolation, and auditing. None of this exists. Do not allow any PR that calls "plugin
execution" or wires an external code executor into the engine until a security review and
sandbox design is in place.

**F3 - Freeze `RunMetadata` schema expansion**  
`RunMetadata` already has 5 provider-specific flat fields. Adding more for Conductor or
future adapters will make this type a God object. Freeze new fields until a discriminated
union provider metadata model is designed and adopted.

---

### 3 Things to Delay

**D1 - Delay cost attribution implementation**  
No port exists. No data source is defined. Any work on cost attribution before the data
model is agreed will be throwaway. Define the cost port contract first; implement when
Snowflake query history integration is ready.

**D2 - Delay multi-engine abstraction expansion**  
The Conductor adapter is a stub. There is one production engine (Temporal). Do not design
or implement abstractions for the second engine before there is a real Conductor integration
requirement. Premature abstraction for a hypothetical second engine adds maintenance cost
without benefit.

**D3 - Delay SSE/WebSocket streaming**  
The status read path is snapshot-first + replay fallback. SSE/WebSocket streaming is
mentioned in Sprint 4 of the execution model spec. Before streaming can be meaningful, the
snapshot staleness problem must be solved at scale. Implementing streaming over stale
snapshots delivers incorrect real-time data. Delay until snapshot-write latency is
measurable and bounded.

---

## How to Advance Critical Tasks

### Critical Task 1 - Fix `manifestRef` dead path (BLOCKING)

1. Read `packages/@dvt/planner/src/ports/IArtifactResolver.ts` - port exists.
2. Implement a production `ArtifactResolver` that fetches manifest bytes from the
   object store and deserializes them to `DbtManifestLike`.
3. Inject `IArtifactResolver` into `PlannerFacade`.
4. In `PlannerFacade.buildPlan`, when `manifestRef` is present: resolve -> parse manifest ->
   derive nodes using `domain/manifest.ts` -> pass as `nodes` to `Planner.buildPlan`.
5. Add integration test: `manifestRef` path produces valid plan with correct `inputHashSha256`.
6. ARC-2 required: this touches `packages/@dvt/planner/**` and `packages/@dvt/contracts/**`.

### Critical Task 2 - Cancel event ordering (HIGH, correctness risk)

1. Decide ownership model: engine-emits vs workflow-emits for `RunCancelRequested`.
2. If engine-emits: move `emitRunEvent('RunCancelRequested')` to BEFORE `adapter.cancelRun(ref)`.
3. Add determinism replay test: assert `runSeq(RunCancelRequested) < runSeq(RunCancelled)`.
4. Update ADR-0007 with the chosen ownership model.
5. ARC-2 required: touches `packages/@dvt/engine/**`.

### Critical Task 3 - Dual ExecutionPlan type (HIGH, schema integrity)

1. Create `docs/evidence/ED-YYYYMMDD-execution-plan-type-unification.md`.
2. Define a single `ExecutionPlanV2` as the canonical type in `@dvt/contracts`.
3. Add `satisfies ExecutionPlanV2` check in the engine-side plan parsing code.
4. Add contract test: planner output satisfies engine-side `ExecutionPlan` type.
5. ARC-2 required.

### Important Task 4 - `TemporalAdapter.getRunStatus` projection removal

1. Remove `IRunStateStoreReadLike` and `SnapshotProjectorLike` from `TemporalAdapterDeps`.
2. Have `TemporalAdapter.getRunStatus` call the actual Temporal workflow query API (or
   return a live status from the workflow's `statusQuery`).
3. The engine's `enrichStatus` already reads snapshot + merges provider view. The adapter
   should provide only the provider-native substatus, not the full projection.
4. ARC-2 required: touches `packages/@dvt/adapter-temporal/**`.

### Important Task 5 - `PostgresStateStoreAdapter` composition refactor

1. Extract `PostgresStateStoreRuntime` as an injectable dependency instead of a base class.
2. `PostgresStateStoreAdapter` holds a `runtime: PostgresStateStoreRuntime` field and
   delegates to it.
3. This enables testing the adapter with a mock runtime.
4. ARC-2 required.

---

## Summary Table - Priority Order

| ID   | Description                                | Type              | Priority | ARC               |
| ---- | ------------------------------------------ | ----------------- | -------- | ----------------- |
| CT1  | `manifestRef` dead path in planner         | Bug / correctness | **P0**   | ARC-2             |
| CT2  | Cancel event ordering violation            | Bug / correctness | **P0**   | ARC-2             |
| CT3  | Dual ExecutionPlan type                    | Schema integrity  | **P1**   | ARC-2             |
| CT4  | TemporalAdapter projection coupling        | Structural        | **P1**   | ARC-2             |
| CT5  | PostgresStateStoreAdapter inheritance      | Structural        | **P2**   | ARC-2             |
| CT6  | `payloadVersion` migration model           | Extensibility     | **P2**   | ADR required      |
| CT7  | Plan schema version validation at dispatch | Safety            | **P2**   | ARC-2             |
| CT8  | Per-kind step retry policy                 | Operational       | **P3**   | ADR required      |
| CT9  | Run retention enforcement                  | Operational       | **P3**   | Already ADR'd     |
| CT10 | Snapshot lag monitoring                    | Operational       | **P3**   | Evidence required |
