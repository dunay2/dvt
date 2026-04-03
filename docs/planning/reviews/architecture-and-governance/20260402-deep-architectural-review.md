---
title: Deep Technical Architectural Review - DVT+ System
status: Active
owner: Architecture
date: 2026-04-02
planning_type: review
reviewer: Principal / Staff Software Architect
scope: Full system architecture, contracts, engine, planner, state, delivery, RBAC, multi-tenancy
---

# Deep Technical Architectural Review - DVT+ System

**Date:** 2026-04-02
**Scope:** IWorkflowEngine, ExecutionPlan, Temporal-first strategy, state-as-source-of-truth, dbt artifact DAG, multi-tenant + RBAC + cost model
**Method:** Source code analysis + ADR catalog + contract specifications + runtime wiring

---

## 1. Conceptual Soundness

### Core Separation Under Review

> "The UI does not execute. The engine does not decide. The planner does not persist state."

### What Is Solid

**The planner is genuinely pure.** `Planner.ts` is a deterministic domain service
with no I/O. It orchestrates sub-services (GraphBuilder, NodeSelector,
TopoSort, StepFactory, PlanAssembler) and produces an immutable
`ExecutionPlan`. Metrics are optional callbacks that cannot affect output.
`PlanAssembler` computes `planId = sha256(JCS(planCore))` using RFC-8785
canonical JSON. Same inputs produce the same plan across runtimes. This is
correctly positioned.

**The engine does not fetch plan bytes.** ADR-0012 assigns plan integrity
ownership to adapters. The engine sees only `PlanRef { uri, sha256,
schemaVersion, planId, planVersion }`. It validates metadata (URI scheme,
schema version compatibility) but never touches plan content. This is a real
separation, not a paper one.

**State is genuinely the source of truth.** ADR-0015 separates
`getRunStatus()` (event-log-only, adapter-independent) from
`enrichRunStatus()` (adapter-dependent, optional enrichment). The
`WorkflowSnapshot` is a derived projection from the append-only event log.
The UI polls snapshots, not the engine or adapter.

**IWorkflowEngine is minimal.** Five methods: `startRun`, `cancelRun`,
`getRunStatus`, `enrichRunStatus`, `signal`. This is deliberately small.
There is no `dispatchStep` or `retryStep` — the adapter owns step execution.

### What Is Fragile

**Event emission ownership leaks the separation.** Temporal activities write
directly to `IRunStateStore`. This means the adapter's internal execution
units (activities) hold a direct dependency on the state store interface. If
state store is slow or unreachable, step execution blocks. The engine cannot
intervene. This is architecturally correct (adapter owns step execution) but
operationally fragile. There is no circuit breaker between activities and
state store, and no local buffering fallback.

**The `tenantId` isolation relies on discipline, not types.** Every method
takes `tenantId: string` as a parameter. If a caller passes the wrong
`tenantId`, the system returns wrong data silently. There is no branded type
(`TenantId` newtype), no compile-time enforcement. The authorization boundary
catches this at the API layer, but internal service-to-service calls within
the same process have no guard. A bug in a background worker (outbox,
projector, archival) that loses tenant context would be silent corruption.

**`ExecutionPlan.stepTypeConfig` is `Record<string, unknown>`.** This is
intentionally untyped to decouple the contract from step kind registries. But
it means the adapter must blindly trust whatever the planner puts there. No
schema validation at the adapter boundary for step-specific config. If
planner emits malformed `stepTypeConfig`, the failure surfaces deep inside
Temporal activity execution, not at admission.

### What Is Missing

**No contract-level schema for `stepTypeConfig` per `StepKind`.** The system
defines `StepKind` (`DBT_MODEL`, `DBT_TEST`, etc.) but has no per-kind
schema validation for the config blob. This gap will widen as step kinds
multiply.

**No explicit concurrency model for snapshot projection.** Multiple event
appends can race against snapshot rebuilds. The PostgreSQL adapter uses
advisory locks for coordinated rebuild, but the contract does not mandate
this. An alternative adapter implementation could corrupt snapshots under
concurrent writes.

**No formal state machine specification for `RunStatus` transitions.** The
event types imply transitions (`RunQueued` -> `RunStarted` -> `RunCompleted`
etc.) but there is no explicit finite state machine definition in code that
rejects invalid transitions at the event append boundary. Invalid event
sequences are detectable only during snapshot projection (read side), not at
write time.

---

## 2. Architectural Risk Map

| Risk                                              | Severity | Likelihood | Why                                                                                                      | Mitigation                                                                                                             |
| ------------------------------------------------- | -------- | ---------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| State store unavailability blocks step execution  | High     | Medium     | Temporal activities write directly to IRunStateStore; no local buffer or fallback                        | Add circuit breaker between activity and state store; implement local event buffer with async drain                    |
| Silent tenant isolation breach in workers         | Critical | Low        | `tenantId: string` has no branded type; background workers reconstruct context from records              | Introduce `TenantId` branded type at `@dvt/contracts`; add runtime assertion at port entry points                      |
| Idempotency key formula drift across producers    | Critical | Low        | All producers must use identical SHA-256 formula; any deviation = silent deduplication failure           | Shared `IIdempotencyKeyBuilder` is correct mitigation; enforce single canonical implementation, ban re-implementations |
| Snapshot staleness under high event volume        | Medium   | Medium     | If snapshot rebuild lags behind event append rate, `getRunStatus` falls back to full O(n) replay         | Set snapshot rebuild SLA; add metric alert on replay latency; consider incremental projection                          |
| `stepTypeConfig` schema drift                     | Medium   | High       | Untyped `Record<string, unknown>` means planner-adapter contract is implicit                             | Define per-`StepKind` JSON Schema; validate at plan verification boundary (`@dvt/plan-verifier`)                       |
| Event ordering violation across outbox resharding | High     | Low        | `shardCount` change requires drain + cutover; mixed processing during transition corrupts ordering       | ADR-0033 addresses this; enforce operational runbook; add CI check for shard config consistency                        |
| Cost attribution missing entirely                 | Medium   | High       | No cost estimator exists; no cost model at planner or engine layer                                       | Defer cost model to runtime telemetry collection; do not attempt planner-time estimation                               |
| Admin route RBAC bypass                           | High     | Low        | `/admin/runs/:runId/rebuild-snapshot` behind feature flag but no RBAC check in handler                   | Add explicit admin-role RBAC check to admin routes regardless of feature flag state                                    |
| Outbox head-of-line blocking cascades             | Medium   | Medium     | Strict stream integrity (INV-OUTBOX-005) means one failed event blocks all subsequent events for a runId | Correct by design for consistency; but requires operational DLQ triage process and alerting                            |
| Archive unit tenant skew                          | Low      | Medium     | Multi-tenant archive units retain fast tenant's data until slowest tenant's retention expires            | Accept for simplicity; document SLA impact; consider per-tenant units if retention SLA becomes binding                 |
| Plugin/adapter security boundary undefined        | Medium   | Medium     | Adapters have full access to state store; no sandboxing or capability restriction model                  | Define adapter capability contract; restrict state store access surface per adapter type                               |
| Write amplification under high-throughput runs    | Medium   | Medium     | Each event append = event + outbox record + snapshot upsert = 3+ writes minimum                          | Batch event appends; defer snapshot upsert to async projection; accept write amplification for auditability            |

---

## 3. Engine Abstraction Critique

### IWorkflowEngine: Minimal and Correct

The 5-method interface is the right size. `startRun`, `cancelRun`,
`getRunStatus`, `enrichRunStatus`, `signal` cover the full lifecycle without
leaking step-level concerns. The absence of `dispatchStep` or `retryStep` is
a correct architectural decision — step dispatch belongs to the adapter's
execution model (Temporal workflows/activities), not the engine contract.

### Temporal-First Strategy: Wise With Caveats

Temporal is a strong choice for durable workflow execution with built-in
retry, timeout, and signal semantics. The adapter correctly maps DVT+
policies to Temporal-native constructs via `TemporalPolicyMapper`:

- Planner `retry.kind` / `retry.maxAttempts` -> Temporal `RetryPolicy`
- Planner `timeout.maxSeconds` -> Temporal `scheduleToCloseTimeout`
- Backoff is adapter-owned (planner always emits `backoffMs=0`)

**Caveat 1: `continueAsNew` boundary.** Large DAGs (1000+ steps) will hit
Temporal history size limits. The adapter mentions
`continueAsNewAfterLayerCount` but this is not governed by contract. If this
threshold is wrong, workflow execution silently degrades. This needs a
documented SLA.

**Caveat 2: Task queue isolation model.** Task queues are
`dvt_${tenantId}` — one queue per tenant. At 1000+ tenants, this creates
1000+ task queues. Temporal handles this, but worker scaling becomes a tenant
density problem. No documentation exists on worker-per-tenant vs shared
worker pool strategy.

### Event Model: Robust

The `EventEnvelope` design is solid:

- `eventId` (UUID v4, globally unique)
- `idempotencyKey` (SHA-256, deterministic from business fields)
- `runSeq` (monotonic per runId, assigned by state store)
- `emittedAt` (producer clock, informational) vs `persistedAt` (store clock,
  authoritative)
- `logicalAttemptId` (domain retry counter) vs `engineAttemptId` (provider
  retry counter)

The exclusion of `payload` from idempotency key (ADR-0010) is correct —
payload serialization can drift across schema versions.

### ExecutionPlan: Sufficiently Expressive

The plan carries:

- Topologically ordered steps with explicit `dependsOn`
- `gateway` with DSL expressions for conditional execution
- `requiresCapabilities` for adapter-capability negotiation (ADR-0036)
- `fallbackBehavior` (`reject` | `emulate` | `degrade`)
- `inputHashSha256` for deterministic identity
- `planVersion` + `schemaVersion` + `contractVersion` (triple versioning)

**Where determinism assumptions could fail:**

1. **JCS canonicalization across runtimes.** `planId` depends on RFC-8785 JCS.
   If a non-Node runtime (Bun, Deno) has a JCS implementation with different
   floating-point serialization, the same logical plan produces a different
   `planId`. This is tested but the test matrix is Node-only today.

2. **`createdAtIso` in plan metadata.** The plan includes `createdAtIso`
   which is a timestamp. If this field is included in the `planCore` that
   feeds the `planId` hash, then the same logical plan built at different
   times produces different `planId` values. Verify whether `createdAtIso` is
   excluded from the JCS input.

3. **Step ordering stability.** `TopoSort` produces deterministic output for
   identical input graphs. But if the input graph comes from a dbt manifest
   where `Object.keys()` ordering changes across dbt versions, the topo sort
   input changes, and so does the plan. The `ManifestGraphDeriver` should
   sort node keys before processing.

---

## 4. Execution Planning Layer Analysis

### DAG Analyzer

`GraphBuilder` constructs adjacency lists from dbt manifest nodes. It
validates individual nodes (`GraphNodeValidator`), enforces uniqueness
(`NodeRegistry`), builds reverse index (`AdjacencyIndex`), and enforces
`maxEdges` limits. Topological sort via `TopoSort.ts` with depth
calculation and limit enforcement (`maxNodes`, `maxEdges`, `maxDepth`).

`ManifestGraphDeriver` parses dbt manifests: extracts `nodes`,
`resource_type`, `depends_on.nodes`. Supports `model`, `test`, `snapshot`.
Silently skips unknown resource types (fail-open, per ADR-0006).

**No Snowflake coupling found.** The DAG analysis is genuinely
database-agnostic. No SQL dialect, connection string, or Snowflake-specific
construct appears in the planner. Step execution details are adapter-owned.

### Partial Execution Guarantees

The planner provides:

- Topological ordering with explicit `dependsOn`
- No circular dependency guarantee (validated at build time)
- Step-level atomicity (succeeded or failed, not partial)

The planner does NOT provide:

- Atomic multi-step transactions
- Rollback on step failure
- Compensation semantics
- Checkpoint/resume contract

Partial execution recovery is engine-owned but under-specified. The execution
model document is a working draft and does not define recovery paths in
detail.

### Retry/Backoff Policy Ownership

Clean separation:

- **Planner owns semantic intent:** `retry.kind` (`at-most-once` |
  `at-most-N`), `retry.maxAttempts`, `timeout.kind`, `timeout.maxSeconds`
- **Adapter owns infrastructure strategy:** backoff intervals, non-retryable
  error types, worker concurrency limits

`resolvePolicies()` has a placeholder for conflict detection but only one
check exists today (concurrency + retries mismatch). This is under-specified.

### Cost Estimator Realism

**There is no cost estimator.** The planner emits no cost or duration
predictions. `PlannerMetrics` provides observability callbacks
(`recordDuration`, `recordNodeCount`, `recordPlanSize`) but these are
execution telemetry, not cost models.

This is the correct decision for now. Planner-time cost estimation for dbt
models requires query history, warehouse size, and credit pricing — all
runtime concerns. Attempting this at plan time would introduce tight coupling
to Snowflake billing APIs and produce unreliable estimates.

Cost attribution should be a runtime-collected, post-execution concern.

### Plan Versioning Strategy

Triple versioning is in place:

1. **`planVersion`** (`1.0`) — execution artifact version, runtime
   compatibility
2. **`schemaVersion`** (`v1.2`) — structural format, contract evolution
3. **`contractVersion`** (`1.0.0`) — `@dvt/contracts` package version

`EXECUTION_PLAN_VERSION_REGISTRY` + `PLAN_RUNTIME_COMPATIBILITY_MATRIX`
govern which adapters accept which plan versions.

Currently only one plan version exists (`1.0`). The governance overhead is
high for one version, but justified — the registry pattern prevents silent
incompatibility during multi-version rollouts. This is pre-investment, not
over-engineering.

### Is This Layer Over-Engineered or Under-Specified?

**Over-engineered:** No. The complexity is proportional to the invariants
being enforced. Each sub-service has a single responsibility. The triple
versioning is forward-looking but justified.

**Under-specified areas:**

- Policy conflict detection (`resolvePolicies()` placeholder)
- Custom policy namespace (registry exists, no implementers)
- Observability tag cardinality rules (undefined vocabulary for
  `plan.observability.extra`)
- Recovery semantics for partially executed plans

---

## 5. State and Metadata Layer Review

### Artifact Immutability: Realistic With Caveats

Events are append-only. `run_events` table uses `(runId, runSeq)` primary
key. No UPDATE/DELETE operations in hot storage (except archival purge after
grace period). Deduplication via `(runId, idempotencyKey)` unique constraint.

Immutability enforcement:

- **Database level:** Primary keys prevent duplicate sequence assignment
- **Application level:** `AppendResult` separates `appended` from `deduped`
- **Archive level:** Rolling SHA-256 checksums over JCS-canonicalized events;
  mutation invalidates the archive

**Caveat:** Snapshot is mutable (upserted atomically). This is correct — it
is a derived projection, not the source of truth. But if a consumer treats
snapshot as authoritative and skips event verification, it violates the
model.

### Write Amplification

Each event append produces:

1. Event row in `run_events`
2. Outbox record for delivery
3. Snapshot upsert (if inline projection enabled)
4. Idempotency index row

Minimum 3 writes per event, 4 if idempotency index is separate. For a 100-
step DAG with 3 events per step (Started/Completed + Run-level), that is
~900 writes per run. At 1000 concurrent runs, ~900K writes. This is
manageable with PostgreSQL but requires connection pooling and batch tuning.

**Mitigation already in place:** `appendAndEnqueueTx` batches events in a
single transaction. Snapshot can be deferred to async projection worker.

### Event Sourcing vs Mutable State Tradeoffs

The system correctly chose event sourcing for the write model with snapshot
projection for the read model. This gives:

- Full audit trail
- Deterministic replay
- Temporal queries ("what was the state at time T?")
- Decoupled read/write scaling

The cost is write amplification and projection lag. Both are being addressed
(batch appends, async projection, snapshot rebuild worker).

The `InMemoryRunStateCommandPort` implementation mirrors the PostgreSQL
semantics faithfully, which is a sign of a well-designed port interface.

---

## 6. Frontend Observability Assessment

The frontend observability story is honest about its current state:

1. **Shell-level health** (top bar, health banner) — implemented via
   `usePlatformHealthSnapshotQuery`
2. **Run observability** (`/runs`, `/runs/:runId`) — implemented
3. **Cost prototype** (`CostView`) — exists but not routed

There is no dedicated observability route. The architecture document
correctly documents this gap rather than describing a dashboard that does not
exist.

**Assessment:** The frontend observability is appropriately scoped for Phase

1. The backend telemetry contracts are not mature enough to power richer
   dashboards. Building frontend surfaces ahead of backend contract maturity
   would create coupling to unstable APIs.

---

## 7. What Is Overbuilt

1. **Triple versioning for one plan version.** `planVersion`, `schemaVersion`,
   and `contractVersion` all exist, governed by registries, ADRs, and
   compatibility matrices. Currently only `planVersion: '1.0'` exists. The
   governance overhead is real. **Verdict:** Justified as pre-investment.
   The cost of adding versioning retroactively is much higher than maintaining
   it from day one. But monitor governance burden — if only one version
   exists after 6 months, reassess.

2. **Archive lifecycle with CRC32 tenant bucketing, rolling checksums, and
   multi-phase verification.** The archive system (ADR-0037) is production-
   grade for a system that does not yet have production archival needs.
   Export, verify, grace window, drop — this is a 4-phase lifecycle for data
   that could be solved with a simple `DELETE WHERE age > retention`. **Verdict:**
   The complexity is justified IF compliance/audit requirements demand
   verifiable, restorable archives. If the use case is just storage cost
   reduction, this is over-built. Clarify the driver.

3. **Custom policy namespace registry.** Defined in
   `CustomPolicyNamespaceRegistry.v1.ts` but has zero implementers. No
   extension examples. This is speculative extensibility. **Verdict:**
   Remove or freeze until a real consumer exists.

4. **`enrichRunStatus` as a separate IWorkflowEngine method.** This exists to
   provide adapter-level substatus enrichment. If the system truly follows
   "state as source of truth," this method should not be in the core engine
   interface. It should be a separate enrichment service behind a circuit
   breaker. Having it on `IWorkflowEngine` signals that the engine knows
   about adapter-level details, which contradicts the separation principle.

---

## 8. What Is Underbuilt

1. **Migration strategy for contract evolution.** ADR-0017 defines versioning
   semantics but there is no migration tooling. When `planVersion` goes from
   `1.0` to `2.0`, there is no documented strategy for: migrating in-flight
   runs, handling mixed-version plans in the same tenant, or rolling back
   a plan version upgrade. The compatibility matrix says what is accepted,
   not how to transition.

2. **Distributed consistency model.** The system has eventual consistency
   between event append and snapshot projection, between bootstrap and
   adapter start, between outbox enqueue and delivery. But there is no
   unified consistency model document that maps all eventual consistency
   windows, their maximum expected durations, and the failure modes when
   windows are exceeded.

3. **Concurrency model for snapshot projection.** Multiple workers can attempt
   snapshot rebuilds concurrently. PostgreSQL adapter uses advisory locks, but
   this is an implementation detail, not a contract requirement. An
   alternative adapter could corrupt snapshots.

4. **Backpressure end-to-end.** `StartRunAdmissionGuard` handles admission-
   level backpressure. `TokenBucketRateLimiter` handles outbox enqueue rate.
   But there is no backpressure signal from Temporal back to the engine. If
   Temporal task queues are saturated, the engine keeps accepting runs. The
   system needs a feedback loop from adapter capacity to admission control.

5. **SLA definitions.** No formal SLA document exists. Performance targets
   are embedded in configuration defaults (poll interval 1s, batch size 100,
   claim timeout 5m, backpressure thresholds). There is no SLA for: event
   append latency, snapshot freshness, outbox delivery latency, plan
   compilation time, or end-to-end run start latency.

6. **Rollback guarantees.** Schema rollback exists (`planSchemaRollback`,
   `rollbackSchemaTo`) but requires maintenance mode (`hasActiveClients() ===
false`). There is no zero-downtime rollback strategy. For a multi-tenant
   SaaS system, maintenance windows are costly.

7. **Run retention policy.** ADR-0037 defines archive lifecycle but there is
   no tenant-configurable retention policy. All tenants share the same
   `hotRetentionDays`. Enterprise tenants may require longer retention;
   free-tier tenants may need aggressive purging.

8. **RunStatus state machine as executable code.** Transitions are implied by
   event types but not enforced at write time. An invalid event sequence
   (e.g., `StepCompleted` before `StepStarted`) would be persisted and only
   caught during snapshot projection.

---

## 9. Scalability Outlook (3-Year Horizon)

**Assumptions:** 1000+ tenants, thousands of concurrent runs, 1000+ node dbt
projects, cross-environment diffs, cost dashboards.

### Bottlenecks

| Component                     | Bottleneck                                                                                                          | At Scale Impact                                                            | Mitigation Path                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| PostgreSQL `run_events` table | Write throughput at ~900 writes/run x 1000 concurrent = 900K writes                                                 | Table bloat, index maintenance, vacuum pressure                            | Partition by `tenantId` or `persistedAt`; consider TimescaleDB for time-series event data |
| Snapshot projection           | Full replay O(n) on cache miss; 1000-step DAG = 3000 events to replay                                               | `getRunStatus` latency spike when snapshot stale                           | Incremental projection (apply delta, not full replay); checkpoint snapshots at intervals  |
| Outbox worker                 | Single shard processes one runId at a time; head-of-line blocking on failure                                        | Delivery latency increases linearly with failed events                     | Increase shard count; implement per-shard worker pools; add auto-DLQ with faster triage   |
| Temporal task queues          | 1000+ tenants = 1000+ task queues; worker scaling per tenant                                                        | Worker orchestration complexity; cold-start latency for low-volume tenants | Shared worker pools with tenant routing; dedicated workers only for high-volume tenants   |
| Planner computation           | 1000-node DAG topo sort is O(V+E); acceptable. But `inputHashSha256` computation over large JCS input could be slow | Plan compilation latency                                                   | Profile JCS canonicalization for 1000-node plans; stream hashing if needed                |
| Idempotency index             | One row per unique event; at 1M runs x 300 events = 300M rows                                                       | Index lookup latency, storage pressure                                     | Partition by `runId` prefix; add TTL-based cleanup after archive                          |
| Archive export                | Large archive units block DELETE until verified                                                                     | Hot storage grows during verification window                               | Reduce archive unit granularity (hourly instead of daily); parallelize verification       |

### Single Points of Failure

1. **PostgreSQL.** All state (events, snapshots, outbox, intents, metadata)
   lives in PostgreSQL. If PostgreSQL is unavailable, the entire system is
   down. No read replicas are documented for status queries.

2. **Temporal server.** All execution depends on Temporal. If Temporal is
   unavailable, no runs can start or progress. Temporal is designed for
   high availability but it is still a single infrastructure dependency.

3. **Outbox worker.** If the outbox worker is down, events accumulate
   indefinitely. Downstream consumers see stale data. No automatic failover
   is documented.

### Data Growth Pressure

At 1000 tenants x 10 runs/day x 300 events/run x 365 days = ~1.1B
events/year. With an average event size of 1KB, that is ~1TB/year in
`run_events` alone. PostgreSQL can handle this with partitioning, but
requires active management.

The archive lifecycle (ADR-0037) addresses this with hot -> cold tiering.
But the hot retention window (7-30 days) still holds ~30M events at
steady state. This requires PostgreSQL tuning (connection pooling, vacuum
scheduling, index maintenance).

---

## 10. Architectural Scorecard

| Dimension                     | Score | Justification                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Conceptual clarity**        | 8/10  | The three-way separation (planner/engine/state) is well-defined and consistently enforced. Loses points for implicit `stepTypeConfig` contract and missing RunStatus state machine formalization.                                                                                                                                                   |
| **Separation of concerns**    | 8/10  | Hexagonal architecture is correctly applied. Ports and adapters are cleanly separated. Loses points for `enrichRunStatus` on the engine interface (should be a separate service) and activity-to-state-store coupling.                                                                                                                              |
| **Replaceability of engine**  | 7/10  | IWorkflowEngine is minimal. IProviderAdapter is well-defined. But Temporal-specific concerns leak through `estimateRunRef`, `lookupRunRef`, `capabilities()` — these optional methods create adapter-specific surface area. Replacing Temporal with Conductor requires implementing these optional methods or the engine must handle their absence. |
| **Determinism**               | 9/10  | Three-layer determinism gate (ESLint + replay tests + CI). Golden vectors for idempotency keys and signals. JCS canonical hashing. SHA-256 plan identity. Loses 1 point for untested cross-runtime JCS compatibility and potential `createdAtIso` inclusion in hash input.                                                                          |
| **Extensibility**             | 7/10  | Plugin model via adapters is clean. `requiresCapabilities` enables capability negotiation. `StepKind` is extensible. But custom policy namespace has zero consumers, and step-kind-specific validation does not exist. Adding a new step kind requires implicit knowledge of what `stepTypeConfig` shape the adapter expects.                       |
| **Operational realism**       | 6/10  | Backpressure, rate limiting, DLQ, and archival are all designed. But no SLA definitions, no formal consistency model, no end-to-end backpressure from adapter to admission, no zero-downtime rollback, and admin routes lack RBAC. Operational runbooks exist but are thin.                                                                         |
| **Long-term maintainability** | 7/10  | 38 ADRs, versioned contracts, governance inventory, CI enforcement gates, ARC policy — strong documentation discipline. But governance overhead is high (every contract change requires evidence doc + risk register entry + ADR backing). At scale, this process will slow delivery velocity unless tooling automates compliance.                  |

### SOLID, Hexagonal, OOP, CQRS Assessment

**SOLID:**

- **S (Single Responsibility):** Strong. Each package has a clear bounded
  responsibility. `Planner`, `PlanAssembler`, `GraphBuilder` are each
  single-purpose.
- **O (Open/Closed):** Good. `StepKind` is extensible via new factory
  functions. Adapter interface accepts new providers. But `stepTypeConfig`
  is untyped, which undermines the Open/Closed principle — adding a new step
  kind requires modifying adapter interpretation code, not just extending.
- **L (Liskov Substitution):** Good. `IProviderAdapter` implementations
  (Temporal, mock) are substitutable. But optional methods
  (`estimateRunRef`, `lookupRunRef`) create behavioral variance —
  `StartRunExecutionService` must branch on their presence.
- **I (Interface Segregation):** Strong. `IRunStateStoreRead`,
  `IRunStateStoreWrite`, `IRunStateStoreMaintenance` are properly segregated.
  `IOutboxStorage` is separate from state store. `IObservability` is
  decomposed into `metrics`, `traces`, `logs`.
- **D (Dependency Inversion):** Strong. Domain depends on port interfaces.
  Adapters implement ports. Composition root (apps/api) wires concrete
  implementations.

**Hexagonal Architecture:**

- Correctly implemented. Domain core (engine, planner) defines ports.
  Adapters (postgres, temporal) implement ports. Application layer (api)
  is the composition root. Dependency arrows point inward.
- **Violation risk:** `@dvt/delivery` package contains both domain logic
  (backpressure policy) and application logic (worker runtime). Consider
  splitting domain rules from runtime orchestration.

**OOP:**

- The system uses a mix of OOP (classes for adapters, services) and
  functional patterns (pure functions for plan assembly, hashing). This is
  appropriate for TypeScript. No concerns.

**CQRS:**

- Correctly implemented. Write side: append-only event log via
  `IRunStateStoreWrite`. Read side: `WorkflowSnapshot` via
  `IRunStateStoreRead`. Transactional outbox bridges write-to-read
  propagation. `getRunStatus` reads only from projection, never from
  write model directly.

### Lack / Underbuilt Areas

1. **RunStatus state machine enforcement at write time** — most critical gap
2. **Per-`StepKind` schema validation for `stepTypeConfig`** — will cause
   runtime failures as step kinds multiply
3. **End-to-end backpressure from adapter capacity to admission** — system
   will accept runs it cannot execute
4. **SLA definitions** — no measurable operational targets
5. **Branded types for domain identifiers** (`TenantId`, `RunId`, `PlanId`)
   — string confusion risk
6. **Distributed consistency model documentation** — eventual consistency
   windows are implicit
7. **Zero-downtime rollback strategy** — maintenance mode required
8. **Tenant-configurable retention policies** — one-size-fits-all today

---

## 11. Strategic Recommendations

### 3 Structural Changes

1. **Extract `enrichRunStatus` from `IWorkflowEngine` into a separate
   `IRunEnrichmentService`.** The engine contract should be pure state-
   authority. Adapter-level enrichment is an optional, degradable capability
   that should not share the same interface. This also removes the only
   method on `IWorkflowEngine` that requires adapter availability for a
   "read" operation.

2. **Introduce `TenantId`, `RunId`, `PlanId` branded types in
   `@dvt/contracts`.** Replace all `tenantId: string` parameters with
   `tenantId: TenantId`. This provides compile-time prevention of
   parameter swapping and makes tenant isolation enforceable by the type
   system. Cost: one-time migration across all port signatures.

3. **Add RunStatus state machine validation at the event append boundary.**
   Before persisting an event, validate that the transition from current
   state to the event's implied state is legal. Reject invalid transitions
   at write time, not at projection time. This prevents state corruption
   from entering the event log. Implement as a guard in
   `appendAndEnqueueTx`.

### 3 Clarifications Needed

1. **Is `createdAtIso` included in the `planCore` JCS input for `planId`
   computation?** If yes, the same logical plan built at different times
   produces different `planId` values, which breaks determinism semantics.
   If no, document the exclusion explicitly.

2. **What is the target SLA for event delivery latency (outbox enqueue to
   downstream consumer receipt)?** The outbox worker polls every 1 second
   with batch size 100. Under load, delivery latency depends on shard
   density and failure rate. The system needs a measurable target (e.g.,
   "p99 delivery within 5 seconds for healthy events").

3. **What drives the archive lifecycle complexity — compliance/audit
   requirements or storage cost reduction?** If compliance, the current
   design (export, verify, grace window, drop) is justified. If storage
   cost, a simpler TTL-based purge with optional backup would suffice.

### 3 Things to Freeze Immediately

1. **Idempotency key formula (SHA-256 preimage structure).** This is
   immutable. Any change breaks deduplication across all producers. Document
   this as a frozen invariant with a "never change without major version
   bump" policy.

2. **IWorkflowEngine 5-method surface.** Do not add methods. If new
   capabilities are needed, create adjacent interfaces
   (`IRunEnrichmentService`, `IRunMaintenanceService`). The engine contract
   must remain minimal.

3. **Event envelope schema (EventEnvelope fields).** The fields `eventId`,
   `idempotencyKey`, `runSeq`, `persistedAt`, `emittedAt`,
   `logicalAttemptId`, `engineAttemptId` are load-bearing. Adding or
   removing fields requires major version bump. Freeze the v2 envelope.

### 3 Things to Delay

1. **Cost attribution and cost dashboards.** No backend cost model exists.
   Building frontend cost surfaces now would create coupling to unstable or
   nonexistent APIs. Wait until runtime telemetry collection is mature and
   at least one production deployment provides real cost data.

2. **Multi-engine abstraction (Conductor adapter).** Only Temporal exists
   today. Building a Conductor adapter before the Temporal adapter is
   hardened in production would split engineering attention without validated
   demand. Prove the abstraction with Temporal first.

3. **Custom policy namespace extensibility.** Zero consumers exist.
   Speculative extensibility carries maintenance cost. Freeze the registry
   and revisit when a real consumer appears.

---

## 12. Prioritized Task List

### P0 — Must Address Before Production

| #   | Task                                                                                                                   | Rationale                                                                                                | Effort                |
| --- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------- |
| 1   | Add RunStatus state machine validation at event append boundary                                                        | Invalid event sequences silently corrupt the event log; fixing after the fact requires event log surgery | Medium                |
| 2   | Add RBAC check to admin routes (`/admin/runs/:runId/rebuild-snapshot`)                                                 | Feature flag alone is not sufficient; any authenticated user can trigger snapshot rebuilds if flag is on | Small                 |
| 3   | Define and document formal SLA targets for event delivery, snapshot freshness, plan compilation, and run start latency | Without SLAs, there is no definition of "healthy" for monitoring and alerting                            | Small (documentation) |
| 4   | Introduce `TenantId` branded type at `@dvt/contracts` and propagate to all port signatures                             | Silent tenant isolation breach in background workers is a critical risk                                  | Large                 |
| 5   | Add per-`StepKind` JSON Schema validation in `@dvt/plan-verifier`                                                      | Untyped `stepTypeConfig` will cause runtime failures as step kinds multiply                              | Medium                |

### P1 — Should Address Before Scale

| #   | Task                                                                                                    | Rationale                                                                            | Effort                 |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------- |
| 6   | Extract `enrichRunStatus` from `IWorkflowEngine` into `IRunEnrichmentService`                           | Keeps engine contract pure; removes adapter availability dependency from "read" path | Medium                 |
| 7   | Document distributed consistency model (all eventual consistency windows, max durations, failure modes) | Implicit consistency assumptions become production incidents at scale                | Medium (documentation) |
| 8   | Add end-to-end backpressure from Temporal task queue saturation to admission control                    | System accepts runs it cannot execute when Temporal is saturated                     | Medium                 |
| 9   | Partition `run_events` table by `persistedAt` (time-based) or `tenantId`                                | 1B+ events/year without partitioning causes vacuum pressure and index bloat          | Medium                 |
| 10  | Add circuit breaker between Temporal activities and state store                                         | State store unavailability blocks all step execution with no fallback                | Medium                 |
| 11  | Implement incremental snapshot projection (apply delta, not full replay)                                | O(n) replay on cache miss for 1000-step DAGs is unacceptable at scale                | Large                  |
| 12  | Verify `ManifestGraphDeriver` sorts node keys before processing                                         | `Object.keys()` ordering variance across dbt versions changes plan identity          | Small                  |

### P2 — Should Address For Enterprise Readiness

| #   | Task                                                                           | Rationale                                                                        | Effort                |
| --- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | --------------------- |
| 13  | Add tenant-configurable retention policies                                     | Enterprise tenants need longer retention; free-tier needs aggressive purging     | Medium                |
| 14  | Define Temporal `continueAsNew` threshold as a governed contract parameter     | Undocumented threshold silently degrades large DAG execution                     | Small                 |
| 15  | Document worker scaling strategy (per-tenant vs shared pool) for 1000+ tenants | 1000+ task queues requires explicit worker density planning                      | Small (documentation) |
| 16  | Add zero-downtime schema rollback strategy                                     | Maintenance-mode-only rollback is costly for multi-tenant SaaS                   | Large                 |
| 17  | Remove or freeze custom policy namespace registry until a real consumer exists | Speculative extensibility carries maintenance cost                               | Small                 |
| 18  | Split `@dvt/delivery` domain rules from runtime orchestration                  | Package mixes backpressure policy (domain) with worker runtime (application)     | Medium                |
| 19  | Add snapshot projection concurrency requirement to `IRunStateStore` contract   | Advisory locks are implementation detail; contract must mandate mutual exclusion | Small                 |
| 20  | Verify `createdAtIso` exclusion from `planId` JCS computation                  | If included, same logical plan at different times produces different identity    | Small                 |

### P3 — Monitor and Revisit

| #   | Task                                                                          | Rationale                                                               | Effort |
| --- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------ |
| 21  | Assess triple versioning governance burden after 6 months                     | If still only `planVersion: '1.0'`, the overhead may not be justified   | Small  |
| 22  | Evaluate archive lifecycle complexity against actual compliance requirements  | If driver is storage cost only, simplify to TTL-based purge             | Medium |
| 23  | Consider read replicas for status queries under high polling load             | PostgreSQL single-writer is a bottleneck for read-heavy UI polling      | Large  |
| 24  | Evaluate TimescaleDB or similar for time-series event data at 1B+ events/year | Native time-partitioning and compression for append-only event workload | Large  |

---

## 13. Pattern Recommendations

### Patterns to Strengthen

| Pattern                    | Current State                                                   | Recommendation                                                                              |
| -------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Event Sourcing**         | Well-implemented; append-only log with idempotency and ordering | Add state machine validation at write boundary (P0 #1); add incremental projection (P1 #11) |
| **Hexagonal Architecture** | Correctly applied; ports define boundaries, adapters implement  | Split `@dvt/delivery` domain/runtime (P2 #18); extract `enrichRunStatus` (P1 #6)            |
| **CQRS**                   | Write/read model separation is clean                            | Document consistency windows (P1 #7); add read replica strategy (P3 #23)                    |
| **Transactional Outbox**   | Atomic enqueue with shard-based routing and DLQ                 | Improve backpressure feedback loop (P1 #8); tune shard count for scale                      |
| **Idempotency**            | SHA-256 formula with golden vectors and CI gates                | Freeze formula (Strategic Rec #1); add signal idempotency enforcement at API boundary       |

### Patterns to Introduce

| Pattern                              | Why                                                    | Where                                                      |
| ------------------------------------ | ------------------------------------------------------ | ---------------------------------------------------------- |
| **Branded/Nominal Types**            | Prevent string confusion for domain identifiers        | `@dvt/contracts`: `TenantId`, `RunId`, `PlanId`, `StepId`  |
| **State Machine as Code**            | Enforce valid RunStatus transitions at write boundary  | `@dvt/engine` or `@dvt/contracts`: explicit FSM definition |
| **Circuit Breaker**                  | Protect step execution from state store unavailability | Between Temporal activities and `IRunStateStore` calls     |
| **Adapter Capability Contract**      | Restrict state store access surface per adapter type   | Define capability scopes per adapter in `IProviderAdapter` |
| **Consistency Window Documentation** | Map all eventual consistency boundaries                | Cross-cutting architectural document                       |

### Patterns to Avoid

| Anti-Pattern                             | Risk                                            | Current Exposure                                                            |
| ---------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| **Speculative extensibility**            | Maintenance cost without consumers              | Custom policy namespace, multi-engine abstraction before Temporal hardening |
| **Implicit contracts**                   | Runtime failures from unvalidated assumptions   | `stepTypeConfig: Record<string, unknown>`                                   |
| **Shared mutable state between workers** | Race conditions, corruption                     | Snapshot projection without contract-mandated mutual exclusion              |
| **Feature flags as security gates**      | Feature flag flip exposes unprotected endpoints | Admin routes behind `DVT_ADMIN_ROUTES_ENABLED` without RBAC                 |

---

_Review complete. No motivational language. No filler. Every score justified.
Every recommendation actionable._
