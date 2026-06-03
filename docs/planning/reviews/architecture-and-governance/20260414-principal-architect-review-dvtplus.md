---
title: 'DVT+ Principal/Staff Architect Review — 2026-04-14'
status: Final
author: Principal Architect Review (automated)
date: 2026-04-14
scope: Full-stack architecture — engine, planner, state store, adapters, API, contracts
governing_sources:
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/architecture/reference-architecture.md
  - docs/planning/execution-model/dvt-execution-model.md
  - docs/adr/ (ADR-0003 through ADR-0049)
  - packages/@dvt/engine/src
  - packages/@dvt/contracts/src
  - packages/@dvt/planner/src
  - packages/@dvt/adapter-temporal/src
  - packages/@dvt/adapter-postgres/src
  - apps/api/src
  - docs/risk-register/quality/
---

# DVT+ Principal/Staff Architect Review — 2026-04-14

> **Methodology**: Source-first. All findings are grounded in actual code,
> ADR text, and risk register entries that exist in this repository as of
> 2026-04-14. No invented definitions. No flattery.

---

## 1. Conceptual Soundness

### The Three-Clause Principle under pressure

> "The UI does not execute. The engine decides on its domain. The planner does not persist state."

This is the central governance claim. The analysis below is a clause-by-clause verdict.

---

### Clause 1: "The UI does not execute" — **TRUE, enforced at the API boundary**

`apps/api` exposes `POST /runs/start`, `POST /plans/preview`, and signal
endpoints. The absence of adapter-level calls in route handlers is verified.
The API emits a `StartRunCommand` to the engine and waits for `EngineRunRef`.
This clause holds.

### Clause 2: "The engine decides on its domain" — **PARTIALLY TRUE**

`IWorkflowEngine.ts` is minimal (five methods). The engine-owned port is stable and
correct. However, the current `WorkflowEngine` core is still an application
service orchestrator, not a domain service. It owns:

- authorization (`policy.assertTenantAccess`, `policy.validatePlanRef`)
- rate-limit enforcement (`policy.checkRateLimit`)
- intent-log persistence (`IStartRunIntentStore`)
- observability instrumentation (spans, metrics, traces)
- crash compensation logic (`StartRunFailurePolicy`)

ADR-0039 §F2 identified this in March 2026 and prescribed `StartRunApplicationService`
extraction. That extraction happened (`StartRunApplicationService` and
`StartRunAdmissionGuard` exist), but the split is not yet fully clean — the
composition is not uniformly governed by a port boundary. The engine still
imports `IRunAccessPolicy` carrying a mixed concern (authorization +
rate-limiting in one interface), violating ADR-0039 §2.1.

**Verdict**: The intent is correct but the boundary is porous at the
application/domain seam.

### Clause 3: "The planner does not persist state" — **TRUE**

`IPlanner.buildPlan()` → `PlannerBuildResultV1`. No I/O. No state. The
`PlannerFacade` validates and maps input, delegates to `Planner.execute()`,
and returns a value object. The planner does not know the state store exists.

---

### What is solid

| Area                                         | Evidence                                                                                                                                                                         |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ExecutionPlan` content-addressable identity | `planId = sha256(JCS(planCore))`. Tamper-evident, reproducible. Verifiable by any consumer without trusting the producer.                                                        |
| Plan/policy separation                       | ADR-0046 correctly separates `ExecutionPlan` (planner-owned topology) from `RunExecutionPolicy` (engine-owned runtime admission). This is a non-trivial and correct split.       |
| Event sourcing invariants                    | Append-only, monotonic `runSeq`, idempotency key uniqueness on `(runId, idempotencyKey)`, snapshot as rebuildable cache. ADR-0004 is consistently referenced.                    |
| Retry lineage authority                      | ADR-0040 split `engineAttemptId` (provider diagnostic) from `logicalAttemptId` (business lineage). This is architecturally precise.                                              |
| Pre-dispatch intent log                      | ADR-0030 closes the crash-consistency window between `adapter.startRun()` and `bootstrapRunTx()`. The mechanism is correct: optimistic log, reconciler, cancellation of orphans. |
| DAG interpreter isolation                    | `planExecutionLayers()` in `@dvt/plan-interpreter` is pure, side-effect free, deterministic. Safe for Temporal sandbox execution.                                                |
| Outbox sharding                              | ADR-0033 adopts deterministic shard-by-runId with PostgreSQL advisory lock fencing. Avoids distributed coordination plumbing.                                                    |
| `IProviderAdapter` port                      | Adapter receives `ResolvedRunContext` + `PlanRef` + `ExecutionPlan`. No state access. No business decisions. Correct port shape.                                                 |
| Bounded context boundaries                   | ADR-0034 governs seven contexts with one-way dependency rules. The package graph reflects this discipline.                                                                       |
| Plan version registry                        | ADR-0036 replaces the inline literal `'2.3'` with a governed registry (`CURRENT_EXECUTION_PLAN_VERSION`, `SUPPORTED_EXECUTION_PLAN_VERSIONS`). Forward evolution is bounded.     |

---

### What is fragile

**F1 — `reserveRetryAttempt` is optional on `IRunStateStoreWrite`**

```typescript
reserveRetryAttempt?(tenantId: string, sourceRunId: string): Promise<RetryAttemptReservation>;
```

The `?` makes the invariant from ADR-0040 unenforceable at the type level. Any
future state store implementation can silently omit it without a compile error.
The PostgreSQL and in-memory stores implement it, but the contract does not
guarantee it. This is a regression waiting to happen.

**F2 — `RunPlanWorkflow` carries the full `ExecutionPlan` in the start payload**

```typescript
export interface RunPlanWorkflowInput {
  plan: ExecutionPlan;  // ← full graph
  planRef: { ... };
  ctx: ResolvedRunContext;
  completedStepResults?: Record<string, Record<string, unknown>>; // ← grows
  gatewayDecisions?: Record<string, boolean>;                      // ← grows
  skippedStepIds?: string[];
}
```

Temporal's default max payload is 2 MB (configurable, but operationally
constrained). For a 1,000-node dbt project, the initial payload alone may
exceed this. More critically, `completedStepResults` and `gatewayDecisions`
are carried across every `continueAsNew` boundary and grow with each processed
layer. The `continueAsNew` mechanism prevents Temporal history size from
becoming infinite, but it does not reduce the input payload. This is a hard
scalability ceiling that cannot be patched without a structural change to how
the workflow accesses plan state.

**F3 — ADR-0045 is `Proposed`, not `Accepted`**

The current `getRunStatus()` hot path in the Postgres adapter relies on
`run_snapshots`, which is a rich projection. If the snapshot is stale (which
is the normal state during active execution), the fallback path is event
replay: O(N events) per run. Under 1,000+ concurrent tenants each polling
for status, this will create a PostgreSQL read bottleneck. The dedicated
`run_status_heads` narrow read model proposed in ADR-0045 is the correct fix,
but it is not implemented.

**F4 — Gateway expression language is unspecified and unevaluated**

```typescript
gateway?: {
  dslVersion: '1.0';
  expression: string;   // ← raw string, no grammar, no AST
}
```

`workflowHelpers.ts` calls `buildGatewayContext`. There is no documented
grammar, no formal evaluator, no sandboxed execution, and no injection risk
analysis. If these expressions ever include user-provided input, this becomes
a code injection surface. Even without external input, the lack of a formal
grammar makes determinism across Temporal replay not provably guaranteed.

**F5 — `IRunAccessPolicy` mixes authorization and infrastructure rate-limiting**

ADR-0039 §2.1 says rate-limiting should be separated from authorization, with
rate-limiting moving to infrastructure or a decorator. The current
`IRunAccessPolicy` still bundles `checkRateLimit()` alongside
`assertTenantAccess()`. This violates SRP and makes the access control surface
harder to test and replace independently.

**F6 — `stepTypeConfig: Record<string, unknown>` is an untyped runtime coupling**

The kind-specific configuration for every step is an opaque blob. The Temporal
activity must know the internal layout of this blob per step kind. There is no
compile-time or schema-time guarantee that the activity receives a valid
config. `DbtStepTypeConfigSchema.safeParse` exists, but it executes at
adapter runtime, not at plan-build time. A malformed config produces a
failed run, not a failed plan build.

**F7 — RETRY_STEP not implemented**

ADR-0048 correctly removed RETRY_STEP from canonical signals. But no
`retryStep(runRef, stepId, request)` use case has been created. Failed dbt
model steps in a 1,000-step plan require a full re-run. This is an operational
gap with direct impact on production usefulness for large projects.

---

### What is missing

- **Cost attribution model**: Confirmed absent. Frontend test: `reason: 'Backend cost capability is not implemented yet'`. No ADR, no contract, no implementation. Any cost-aware roadmap claim is aspirational.
- **SLA contracts**: No per-run deadline. No system-wide timeout budget. `startToCloseTimeout: '30m'` in Temporal activity proxies is an operational default, not an SLA contract.
- **Distributed consistency model**: Eventually consistent outbox pipeline. No cross-tenant ordering guarantees are stated or enforced.
- **Run concurrency limits per tenant**: `checkRateLimit` controls outbox throughput (token bucket), not active concurrent run count. No saturation circuit breaker.
- **Step-level recovery**: RETRY_STEP removed from signals, replacement not shipped. See F7 above.

---

## 2. Architectural Risk Map

| Risk                                                   | Severity   | Likelihood  | Why                                                                                                                                                                                                                        | Mitigation                                                                                                                                                        |
| ------------------------------------------------------ | ---------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Temporal payload overflow on large dbt projects        | **HIGH**   | **HIGH**    | `RunPlanWorkflowInput.plan` carries the full graph. `completedStepResults` grows across `continueAsNew` boundaries. No plan-pointer-only mode.                                                                             | Replace full plan in workflow input with a plan reference + on-demand step resolution via activity. ADR or structural change required.                            |
| `run_snapshots` read bottleneck under high concurrency | **HIGH**   | **HIGH**    | ADR-0045 is Proposed. Current `getRunStatus` fallback is O(N events) read. 1,000+ tenants polling will saturate PostgreSQL.                                                                                                | Implement ADR-0045 `run_status_heads`. This is the correct structural fix, not indexing.                                                                          |
| `reserveRetryAttempt?` optional type leak              | **HIGH**   | **MEDIUM**  | Any new state store silently breaks retry lineage authority (ADR-0040) with no compile error.                                                                                                                              | Make `reserveRetryAttempt` mandatory on `IRunStateStoreWrite`. This is a one-line contract change with wide invariant impact.                                     |
| Gateway expression injection / non-determinism         | **HIGH**   | **MEDIUM**  | `gateway.expression: string` has no grammar, no sandbox, no injection analysis. Temporal replay depends on deterministic evaluation.                                                                                       | Define and publish a formal gateway DSL grammar. Implement a sandboxed evaluator. Block user-controlled expression strings until this is done.                    |
| Cost attribution absent                                | **MEDIUM** | **CERTAIN** | Frontend explicitly says "not implemented". If cost dashboards are a product commitment, the cost model needs contracts first.                                                                                             | Create `ICostAttributionStore` port and `CostEvent` contract. Attach cost hooks to step lifecycle events before the project needs them.                           |
| RETRY_STEP not implemented                             | **MEDIUM** | **HIGH**    | ADR-0048 cleaned the contract gap but shipped no replacement. Production dbt runs fail entirely on one step failure.                                                                                                       | Build `retryStep(runRef, stepId, request)` as a dedicated use case with authorization, idempotency, and lineage per ADR-0040 semantics.                           |
| `stepTypeConfig` opaque blob coupling                  | **MEDIUM** | **HIGH**    | Planner and adapter share implicit field layout through `Record<string, unknown>`. Schema drift at planner side produces runtime crashes, not build-time errors.                                                           | Type the well-known `stepTypeConfig` shapes directly on `ExecutionStepV1`. Stop using the blob for canonical fields.                                              |
| Outbox hot-shard starvation                            | **MEDIUM** | **MEDIUM**  | `shard_id = hash(runId) % shardCount`. A tenant running many concurrent runs with consecutive runIds will concentrate load on a narrow shard set. No hot-shard rebalancing today.                                          | Monitor shard distribution in production before it becomes a blocker. Document resharding SOP based on ADR-0033.                                                  |
| ADR governance overhead becoming a velocity tax        | **MEDIUM** | **HIGH**    | 49+ ADRs, 80+ open risk items, ARC-2 required for engine/contracts/adapters. The close rate of risk items is lower than the open rate (visible in the register dates).                                                     | Triage risk register to distinguish `open` (active) from `monitored` (stable, no action needed). Introduce quarterly risk retirement reviews.                     |
| Multi-tenant RLS not active in PostgreSQL              | **MEDIUM** | **LOW**     | ADR-0031 mandates application-level tenant checks. PostgreSQL RLS transaction context is wired but not enforced as a primary database-level guarantee. A query bypass in the application layer = cross-tenant data access. | Activate row-level security on `run_events`, `run_snapshots`, and `run_metadata` tables. Application-level checks are defense-in-depth, not the primary boundary. |
| `IProviderAdapter.estimateRunRef` optional             | **LOW**    | **MEDIUM**  | When absent, the engine cannot pre-bootstrap `run_metadata` before `adapter.startRun()`. The narrow crash window (ADR-0030) remains for adapters without this hook.                                                        | Document `estimateRunRef` as effectively mandatory for production adapters. Make the absence observable (log a warning).                                          |
| Plan store supersession and archival not enforced      | **LOW**    | **HIGH**    | ADR-0043 defines plan record lifecycle (supersession, archival). PostgreSQL plan store exists. But retention enforcement and supersession rules are not yet active runtime policy.                                         | Implement plan record state transitions as guarded writes, not advisory conventions.                                                                              |

---

## 3. Engine Abstraction Critique

### Is `IWorkflowEngine` minimal and correct?

```typescript
interface IWorkflowEngine {
  startRun(planRef, context): Promise<EngineRunRef>;
  recoverRun(sourceRunId, planRef, context): Promise<EngineRunRef>;
  cancelRun(engineRunRef): Promise<void>;
  getRunStatus(engineRunRef): Promise<CanonicalRunStatus>;
  signal(engineRunRef, request): Promise<void>;
}
```

Five methods. Focused. The status read is explicitly separated from provider
status by contract (`ADR-0015`). `recoverRun` cleanly models business recovery
as distinct from `startRun`. This is correct.

**What is wrong**: `signal()` is a generic multi-purpose method accepting a
`SignalRequest` union. After ADR-0048 and ADR-0049, the valid canonical signals
are `PAUSE`, `RESUME`, `CANCEL`. The contract still presents `signal()` as a
general-purpose door through which future signals could enter. A typed signal
demultiplexer (`pauseRun`, `resumeRun`, `cancelRun`) would be more honest
about the actual product surface, even if the underlying implementation
delegates to one dispatch function.

### Is Temporal-first strategy wise?

For the current use case (dbt run orchestration with 10–200 nodes per plan,
pause/resume/cancel semantics, guaranteed replay): yes, Temporal is the right
choice. The `RunPlanWorkflow` + activities model is a clean match for
fan-out/fan-in with durable state.

**The strategic risk**: The entire plan execution exists as `RunPlanWorkflow`
state inside Temporal. DVT's own `run_events` log is authoritative for the
_domain fact record_, but the _live execution state_ (which steps are complete,
gateway decisions, skip sets) lives exclusively in Temporal's workflow history
and in-memory. If Temporal becomes unavailable or the history corrupts, the
in-flight run state is lost. The `run_events` log cannot reconstruct which
Temporal activity is currently executing.

This creates a dual-state problem: DVT's event log is the authority for
lifecycle facts, but Temporal's history is the authority for execution context.
These two must be kept consistent by the outbox/event emission mechanism, which
is eventually consistent.

### Is the event model robust?

Yes, for the current scope. Monotonic `runSeq`, idempotency key uniqueness,
`appendAndEnqueueTx` atomicity, CQRS projection from events — these are
correct fundamentals.

**Where determinism assumptions could fail**:

1. **Gateway evaluation**: `gateway.expression` evaluation in `workflowHelpers.ts`
   is called inside the Temporal workflow with `buildGatewayContext`. Temporal
   mandates deterministic workflow code. If the expression evaluator has any
   non-deterministic path (e.g., depends on step result ordering, uses
   `Date.now()`, or branches on object key order), Temporal replay will diverge.
   There is no documented grammar or evaluation spec to verify this.

2. **`continueAsNew` payload growth**: The accumulated state carried in
   `completedStepResults` grows monotonically as steps execute. This state is
   the replay context for resumed execution after a `continueAsNew`. If the
   state structure changes between deployments (schema drift on the internal
   workflow state), replayed executions on in-flight runs will fail. There is
   no migration path for in-flight `continueAsNew` state.

3. **Activity timeout asymmetry**: `executeStep` uses `startToCloseTimeout: '30m'`
   globally. A slow Snowflake query, a dbt test taking longer than 30 minutes,
   or a network partition will trigger a Temporal activity timeout, producing a
   failed step. This is a generic timeout, not a per-step SLA. There is no
   per-step deadline in the `ExecutionStepV1` contract.

### Is `ExecutionPlan` sufficiently expressive?

For dbt-native orchestration: yes. The `dependsOn` DAG + `stepKind` +
`stepTypeConfig` + optional `gateway` covers the current use case.

**The ceiling**: The plan is static at creation time. There is no mechanism for
dynamic fan-out (compute N sub-steps based on a runtime query result), no
sub-workflow delegation, no plan parameterization at execution time. For
customers with complex conditional pipeline patterns (e.g., "run model A only
if yesterday's model B row count > threshold"), the gateway expression is the
only primitive — and it is currently under-specified.

---

## 4. Execution Planning Layer Analysis

### DAG analyzer and planner: correct

`planExecutionLayers()` is pure and correct. Topological sort + cycle detection

- parallelism grouping in one pass. `validateDag()` returns structural
  metadata (step count, layer count, max parallelism). These are solid primitives.

`Planner.buildPlan()` follows the CQRS + SRP breakdown: `InputEnvelopeValidator`
→ `GraphBuilder` → `NodeSelector` → `PlanAssembler`. Each class owns one
responsibility. The `dbtStepFactory` default is encapsulated behind the
`StepFactory` port, which is injected. This is correct.

### Partial execution guarantees

`PlannerSelection.selectedNodeIds` with `includeUpstream` / `includeDownstream`
allows partial plan scoping. The node selection logic resolves transitively.
**What is not guaranteed**: if a partial plan references a step whose upstream
is excluded, and the upstream has a non-trivial `stepTypeConfig`, the partial
plan may depend on external preconditions that are not modeled. The planner
does not validate pre-run state consistency.

### Retry/backoff policy ownership

`ExecutionStepRetryPolicyV1` is materialized into the plan by the planner and
consumed by the Temporal adapter. ADR-0040 governs business retry lineage.
The implementation is coherent: planner owns the per-step technical retry
shape; the adapter implements it using Temporal activity retry options.

**Issue**: The retry intervals use `Temporal-compatible duration strings`
(`${number}s`). This is explicitly called out in the contract as intentional
because Temporal is the only production runtime. If a non-Temporal adapter is
ever added, it must reverse-engineer this duration format. The coupling is
acknowledged but not resolved.

### Cost estimator realism

**There is no cost estimator**. The frontend test confirms this with the string
`'Backend cost capability is not implemented yet'`. There is no `ICostEstimator`
port, no `CostEvent` contract, no Snowflake query cost attribution. The
`PlannerInputEnvelopeV1` has an `observability.tags` bag but no cost signals.

Any architectural claim that this system is "cost-aware" is false today. This
is not a plan to build one — this is the absence of one.

### Plan versioning strategy

ADR-0036 uses a registry (`SupportedPlanVersion`) and a versioned union type.
The `PLAN_RUNTIME_ADMISSION_MATRIX` in `@dvt/plan-verifier` is the
definitive source for which runtime accepts which plan version. This is correct
forward-looking design.

**Gap**: There is no migration strategy for in-flight runs on an old plan
version when a new version is deployed. Temporal workflows started on `v2.3`
plans that execute `continueAsNew` after a deployment that emits `v2.4` plans
will face a shape mismatch. The compatibility matrix governs admission at
`startRun` time, not mid-flight schema evolution.

### Is this layer over-engineered?

For the current dbt use case: slightly. The `GenericGraphSourceV1` abstraction
for non-dbt workflows is correct in principle but has zero production users.
The `TransformationFlowCompiler`, `TransformationFlowDesignGraph`, and related
types in the contracts add surface area that is not backed by a concrete runtime.

It is not over-engineered in the sense of being premature complexity for its
stated goal. It is over-engineered in the sense that the abstraction is ahead
of the implementation by one full product cycle.

---

## 5. State & Metadata Layer Review

### Artifact immutability: realistic

Plan artifacts are stored by SHA-256 hash. Content-addressable storage is
correctly implemented: same bytes = same key, upload is idempotent. `PlanRef`
carries `sha256` + `planId`, giving a two-layer tamper-detection chain. This
is structurally sound.

**Operational risk**: If the backing object store (S3/MinIO) deletes a plan
artifact that is still referenced by active runs, the engine cannot start those
runs. There is no garbage collection protection for plan artifacts in active use.
The plan store has no reference counting or lease model for active plan artifacts.

### Write amplification risk

Each step event writes to:

1. `run_events` (authoritative log)
2. `outbox` (delivery buffer, same transaction via `appendAndEnqueueTx`)
3. `run_snapshots` (on `snapshotProjector` path, async)
4. Potentially `delivery_buffer`, `lineage_outbox` (downstream consumers)

For a 1,000-step plan with `STEP_STARTED` + `STEP_COMPLETED` per step, that is
2,000 event rows + 2,000 outbox rows + snapshot updates. PostgreSQL write
amplification is real at this scale, particularly given that outbox rows
themselves require a `shard_id` computation and index maintenance.

**Mitigation present**: Outbox purge (ADR-0038, 7-day default). But this is
reactive, not structural.

### Event sourcing vs mutable state tradeoffs

The system made the correct choice: append-only events as authority, snapshots
as read acceleration. The tradeoff — higher write cost, more complex read-path
management — is correctly documented in ADR-0004.

**The unresolved tradeoff**: `run_snapshots` is a rich projection that stores
workflow-internal state (`gatewayDecisions`, `paused`, `steps`, etc.). This
creates a de facto coupling between the state store's projection model and
Temporal's internal workflow state shape. Changing the workflow state model
requires a snapshot schema migration. ADR-0045 correctly identifies this but
is not yet accepted.

### Outbox ordering: correctly governed

ADR-0009 → ADR-0033. Same-run ordering is guaranteed by `shard_id` determinism
and advisory lock fencing. The model is correct. The operational constraint
(resharding requires migration) is explicitly acknowledged.

---

## 6. What Is Overbuilt

**The ADR governance apparatus itself**. 49 ADRs, ARC-2 evidence + risk register
entry required for engine/contracts/adapters changes, `pnpm docs:sync` and
`pnpm docs:status:generate` required after any structural change. The
governance surface is correct in intent but the overhead-per-change ratio has
reached the point where the change-friction cost is non-trivial. The risk
register has ~80 open items. The accumulation rate (dozens of items opened in
April 2026 alone) exceeds the documented close rate. This is systemic — the
governance system is generating more work than it captures in closed decisions.

**`TransformationFlowCompiler` and related planner design-graph types** are
documented contract surface with no production execution path yet. They consume
maintenance bandwidth and create surface area for boundary drift without
delivering user value today.

**`GenericGraphSourceV1` abstraction** is one level of abstraction above where
the code actually executes. All production plans today are dbt-derived. The
generic interface is correct in direction but adds indirection cost before the
use case exists.

**Multi-engine abstraction** (`IProviderAdapter`, `conductor` in `VALID_PROVIDERS`,
`mock` adapter). The mock is necessary for testing. Conductor is not
implemented. The `VALID_PROVIDERS` set advertising `conductor` creates a
contract impression that is ahead of reality.

---

## 7. What Is Underbuilt

**Step-level recovery (RETRY_STEP)**. ADR-0048 correctly removed RETRY_STEP
from signals but created no replacement. A 1,000-step dbt run that fails at
step 997 must be fully restarted. This is the most immediate operational
limitation for production use.

**Cost attribution**. Zero implementation. Frontend explicitly disabled. No
plan API, no step-level cost events, no Snowflake warehouse credit tracking.
This is a strategic product gap if cost-aware orchestration is in the roadmap.

**Row-level security in PostgreSQL**. ADR-0031 governs application-level tenant
isolation. Postgres RLS is wired (`setTenantContext`) but inactive as a
database-level enforcement layer. Application-level checks are the sole
cross-tenant barrier. A query-construction bug bypasses tenant isolation with
no database-level backstop.

**Dedicated status-head read model**. ADR-0045 (Proposed). The current hot
read path uses full snapshots. The narrow `run_status_heads` table needed for
O(1) status reads at scale is not implemented.

**Run execution deadline / timeout contract**. `startToCloseTimeout: '30m'` is
a global Temporal activity default. There is no per-run, per-step, or
per-tenant timeout budget in the contracts. An unbounded slow query will occupy
a Temporal worker slot for 30 minutes per step, with no early warning.

**Backpressure at the run admission boundary**. `PostgresBackpressureSnapshotReader`
exists. Token-bucket rate limiting (`OutboxRateLimiter`) exists on the outbox.
There is no per-tenant concurrent-run saturation check. A single tenant can
launch hundreds of concurrent runs that all hit the outbox simultaneously.

**Migration strategy for in-flight runs across plan version changes**. The plan
version registry (ADR-0036) governs at admission time. There is no strategy
for `continueAsNew`-state schema evolution across deployments. This is a
production deployment risk for long-running dbt jobs.

**Gateway expression formal specification**. `gateway.expression` is a raw
string with `dslVersion: '1.0'`. No grammar. No evaluator spec. No injection
analysis. This is both a determinism risk and an operability risk.

**`RETRY_RUN` as an application use case after ADR-0049**. ADR-0049 removed
`RETRY_RUN` from `SignalType` but the replacement use case (`recoverRun` on
`IWorkflowEngine`) exists at the contract level. The API layer does not yet
expose a `POST /runs/:runId/recover` endpoint. The recovery path is contracted
but not routed.

---

## 8. Scalability Outlook — 3-Year Horizon

Assumptions: 1,000+ tenants, thousands of concurrent runs, 1,000+ node dbt
projects, cross-environment diffs, heavy cost dashboards.

### Bottlenecks

| Component                       | Current ceiling                   | Why                                                                                                                        | Structural fix                                                                                           |
| ------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Temporal workflow input payload | ~2 MB per run start               | Full `ExecutionPlan` in `RunPlanWorkflowInput`. `completedStepResults` grows with each `continueAsNew`.                    | Plan-pointer-only workflow input. Steps resolved on-demand from artifact store inside activities.        |
| `run_snapshots` read            | Degrades under snapshot staleness | `getRunStatus()` fallback is O(N events) replay. ADR-0045 not implemented.                                                 | `run_status_heads` narrow read model per ADR-0045.                                                       |
| `run_events` table size         | Unbounded growth                  | 2,000+ rows per large run. No auto-archival enforcement. ADR-0037 defines the model but runtime enforcement is not active. | Enforce hot-to-warm archival window as a mandatory background job, not an opt-in.                        |
| Outbox write load               | N+N amplification per step        | Each step emits 2 rows (started + completed) into two tables simultaneously. Shard claim adds query overhead.              | Batch event emission per layer. Consider async batch outbox flush rather than per-event flush.           |
| Plan verifier + planner CPU     | O(N²) worst-case for dense DAGs   | Topological sort is O(N+E). For 1,000-node fully-connected sub-graphs, this is non-trivial.                                | Cap plan node count in limits. `resolveLimits()` exists. Enforce it strictly in the API admission layer. |

### Single points of failure

- **PostgreSQL** carries the authoritative event log, snapshots, run metadata,
  outbox, plan store, and intent store. It is the single operational substrate.
  A PostgreSQL primary failure halts the entire system, including reads.
  Read replicas for `getRunStatus` are not implemented.
- **Advisory locks** for outbox shard ownership are held on PostgreSQL sessions.
  Session loss = shard ownership loss. This is operationally observable but
  not automatically recovered.
- **Temporal namespace** is a single failure domain for all run executions. A
  Temporal service outage prevents any run from progressing, even if the DVT
  state store is healthy. The domain fact record (events) and the execution
  context (Temporal history) can diverge during partial outages.

### Data growth pressure

A single 1,000-step run produces:

- ~2,000 event rows in `run_events`
- ~2,000 outbox rows at peak
- N snapshot updates (at minimum one per layer transition)
- 1 plan artifact blob (potentially hundreds of KB for compiled SQL)

At 10,000 runs/day across 1,000 tenants: 20M event rows/day. PostgreSQL hot
storage requires aggressive archival enforcement. ADR-0037's 3-tier model is
architecturally correct, but the cold archive restore path is not proven.

### Planner computation load

`buildPlan()` is CPU-bound pure computation. For 1,000-node projects with
policy evaluation, node selection, topological sort, JCS canonicalization, and
SHA-256 hashing: benchmarks are absent from the codebase. Under concurrent
plan builds, the planner service becomes a CPU bottleneck. The planner has no
async concurrency model — it is effectively single-threaded per process instance.

---

## 9. Architectural Scorecard

| Dimension                 | Score (1–10) | Justification                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Conceptual clarity        | **8**        | The three-clause principle is sound and consistently referenced. ADR governance is thorough. Deduction: the "engine decides on its domain" clause is partially violated by the current application-layer conflation inside `WorkflowEngine`, and ADR-0045 identifying a real read-model gap that is not yet resolved.                                                                                                                      |
| Separation of concerns    | **7**        | ADR-0034 and ADR-0039 correctly identify the target. The package graph reflects this. Deduction: `IRunAccessPolicy` mixes authorization and rate-limiting; `stepTypeConfig` opaque blob leaks across the planner/adapter boundary; ADR-0039 F5 (providerSelection ENV reads) is mitigated but the function still lives in `@dvt/engine/application`, not in the composition root.                                                          |
| Replaceability of engine  | **6**        | `IWorkflowEngine` and `IProviderAdapter` are clean ports. The Temporal adapter is correctly isolated. Deduction: `RunPlanWorkflow`'s internal state shape (`continueAsNew` payload) is Temporal-specific. The retry interval format is Temporal-compatible strings. `WorkflowSignals` import from `@dvt/contracts` couples the contracts package to Temporal signal semantics. Replacing Temporal requires adapting three layers, not one. |
| Determinism               | **7**        | Planner is provably deterministic. Event sourcing with monotonic `runSeq` is correct. Deduction: gateway expression evaluation has no formal grammar or evaluator spec, making determinism during Temporal replay unverifiable. `continueAsNew` state schema has no migration path. Per-activity timeout is a global default, not per-step.                                                                                                |
| Extensibility             | **7**        | `IStepTypeRegistry` + `StepFactory` port + `IProviderAdapter` port are clean extension points. Deduction: `stepTypeConfig: Record<string, unknown>` makes step kind extension untyped at compile time. Gateway DSL extension is undefined. Cost attribution hooks are absent.                                                                                                                                                              |
| Operational realism       | **5**        | The system has 22+ worker processes, PostgreSQL advisory locks, 3-tier archival, outbox sharding, and an intent reconciler. The operational surface is complex. Deduction: no active RLS, no status-head read model, no cost attribution, no RETRY_STEP, no runbook for resharding under load, no SLA definition. Observability contracts exist but production validation is documented as incomplete.                                     |
| Long-term maintainability | **6**        | The architecture has strong invariants and explicit ADR governance. Deduction: 80+ open risk items with an accumulation rate exceeding closure rate. Governance overhead (ARC-2 + docs:sync + docs:workboard:generate per change) creates change-friction that will drive shortcuts. `stepTypeConfig` opaque blob is a maintainability defect as step kinds grow. Gateway DSL is an undocumented dependency.                               |
| **Overall**               | **6.6**      | Architecturally correct conceptual model with real but addressable implementation debt. The governance overhead-to-output ratio is the hidden risk — if the team cannot sustain the governance discipline at scale, the ADR-governed boundaries will drift exactly as the code did before the ADRs were written.                                                                                                                           |

---

## 10. SOLID / Hexagonal / OOP / CQRS Compliance

### SOLID

| Principle | Verdict      | Evidence                                                                                                                                                                                                                            |
| --------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SRP       | **Partial**  | `WorkflowEngine` still mixes domain service + use case orchestration (ADR-0039 §F2). `IRunAccessPolicy` bundles authorization + rate-limiting. `run_snapshots` contains both projection state and Temporal-internal workflow state. |
| OCP       | **Adequate** | `IProviderAdapter`, `IStepTypeRegistry`, `StepFactory` are all extension points via new implementations, not modifications.                                                                                                         |
| LSP       | **Adequate** | `reserveRetryAttempt?` on `IRunStateStoreWrite` violates LSP semantically: an implementor can substitute a store that silently breaks ADR-0040 semantics.                                                                           |
| ISP       | **Adequate** | `IRunStateStore` was split into `IRunStateStoreRead` + `IRunStateStoreWrite` (ADR-0039 §F3). `WorkflowActivitiesPort` in `RunPlanWorkflow` declares only the activity methods the workflow needs.                                   |
| DIP       | **Good**     | Engine domain depends on ports. `@dvt/engine` imports from `@dvt/contracts` (shared kernel), not from adapters. Adapters import from `@dvt/engine` via the adapter port. The dependency graph is inverted correctly.                |

### Hexagonal Architecture

The port/adapter boundaries are implemented correctly for the primary runtime
path. Engine ports (`IRunStateStore`, `IProviderAdapter`, `IStartRunIntentStore`,
`IObservability`) are explicitly declared. Adapters implement these ports.
The domain does not import from adapters.

**Gap**: `apps/api` module composition (`buildProtectedRuntimeModule.ts`) is the
composition root. It correctly wires adapters to ports. However, the boundary
between `apps/api` infrastructure and `@dvt/engine` application services is not
fully hardened — the API layer still contains business logic that belongs in the
engine application services (plan fetching, integrity validation sequencing).

### CQRS

Correctly applied in the planner (`BuildPlanCommand` → read result, no state
mutation) and in the state store (write via `appendAndEnqueueTx`, read via
`getSnapshot` + `listEvents`). The snapshot projector (`IProjector`) is the
correct CQRS read model for rich workflow state.

**Gap**: The hot status read path (`getRunStatus`) relies on the rich snapshot
projection rather than a purpose-built narrow read model. This is a CQRS
partition violation: the rich write-side projection is being used as the
hot-path read model. ADR-0045 proposes the fix.

---

## 11. Strategic Recommendations

### 3 Structural Changes to Make Now

**SC-1: Implement ADR-0045 — `run_status_heads` narrow read model**

This is the single highest-leverage structural change available. The current
hot `getRunStatus` path is fragile at scale. Implement the narrow status-head
table per ADR-0045, update it synchronously in `bootstrapRunTx` and
`appendAndEnqueueTx`, and route `getRunStatus` to this table. The snapshot
retains its role for full workflow state. This decouples the hot polling path
from snapshot staleness. Effort: 1 implementation sprint. Risk of not doing
it: status read latency degrades non-linearly under scale.

**SC-2: Remove full `ExecutionPlan` from `RunPlanWorkflowInput`**

Replace `plan: ExecutionPlan` in the workflow input with `planRef` only. Resolve
step details inside activities that need them, fetching from the artifact store
with a per-activity cache. This eliminates the Temporal payload ceiling for
large plans and stops `completedStepResults` from growing unboundedly in
`continueAsNew` payloads. Effort: 1–2 implementation sprints. This requires
updating `RunPlanWorkflow` and the artifact resolution path in activities.
Risk of not doing it: hard payload ceiling at ~300–500 nodes for a 2MB limit.

**SC-3: Make `reserveRetryAttempt` non-optional on `IRunStateStoreWrite`**

Remove the `?` from `reserveRetryAttempt`. This is a one-line contract change
with a broad invariant impact. Every future state store implementation must
provide it. The InMemory and PostgreSQL adapters already do. This closes the
ADR-0040 type-level gap without any runtime behavior change. Effort: trivial.
Risk of not doing it: silent retry lineage corruption in any future store.

---

### 3 Clarifications Needed

**CL-1: Define and publish the gateway expression grammar**

`gateway.expression` with `dslVersion: '1.0'` must have a formal grammar
document published under `docs/contracts/` or `docs/architecture/`. Without
it, the determinism guarantee inside Temporal replay cannot be verified.
The question to answer: what subset of JavaScript/expression syntax is this?
What is the evaluation context (available variables)? What are the
non-determinism prohibitions?

**CL-2: Define the cost attribution contract before any cost feature ships**

The product roadmap references cost-awareness. Before any implementation work
begins, the following must be specified: what is a cost event? Who owns the
cost event schema? Is cost attributed per step, per run, per tenant, per
Snowflake warehouse? Is cost estimated at plan time or measured at runtime?
Without these decisions, any cost feature built will require significant
rework.

**CL-3: Clarify the intended `run_snapshots` vs `run_status_heads` read model ownership after ADR-0045**

ADR-0045 is Proposed but not Accepted. The team must decide: does
`run_snapshots` become the rich workflow state store (not the hot-path status
source), or is it deprecated in favor of explicit separate projections? The
answer drives the PostgreSQL schema evolution and the projector contract.

---

### 3 Things to Freeze Immediately

**FR-1: Freeze `ExecutionPlan` schema changes until the in-flight migration story is defined**

`CURRENT_EXECUTION_PLAN_VERSION` is `v1.2`. Adding fields to `ExecutionPlan`
that are consumed by `RunPlanWorkflow` can break in-flight runs that execute
`continueAsNew` after a deployment. Freeze schema changes until an explicit
in-flight plan migration protocol is published.

**FR-2: Freeze addition of new signal types until ADR-0048/0049 cleanup is applied to the API surface**

ADR-0048 removed RETRY_STEP. ADR-0049 removed RETRY_RUN. The signal boundary
cleanup is not yet complete in the API layer (no `POST /runs/:runId/recover`
endpoint). Do not add new signal types until the existing cleanup is applied.

**FR-3: Freeze `stepTypeConfig: Record<string, unknown>` usage for canonical fields**

Stop adding new canonical fields to the opaque `stepTypeConfig` blob. Any
field that the runtime adapter accesses by name must be typed on
`ExecutionStepV1` directly. This applies to future step kinds.

---

### 3 Things to Delay

**DL-1: Delay the Conductor adapter**

`conductor` appears in `VALID_PROVIDERS`. There is no implementation, no ADR
for Conductor-specific behavior, no capability matrix entry. The mock adapter
is sufficient for testing. Remove Conductor from the advertised provider set
until there is a concrete plan to implement it.

**DL-2: Delay `TransformationFlowCompiler` full implementation**

The design-graph types and compiler summary types in `@dvt/contracts` are
ahead of any production use. The SQL-first path is the active delivery surface.
Stop expanding the compiler contract surface until the SQL-first path is fully
operational at production scale.

**DL-3: Delay cost attribution depth beyond step-level tagging**

When cost attribution is eventually built, start with: a) step-level cost event
emission (hook in step completion activities), b) tenant-scoped aggregation
table. Do not design warehouse-level credit attribution, cross-environment
cost diffing, or real-time cost budget enforcement until step-level tagging
is operational and producing real data. Build incrementally.

---

## 12. Action Plan

The following tasks are ranked by structural impact and implementation
feasibility. They address the findings in this review without introducing new
scope.

### Tier 1 — Critical (do before next production scale test)

```
T1.1  Make reserveRetryAttempt non-optional on IRunStateStoreWrite
      - File: packages/@dvt/engine/src/ports/IRunStateStore.ts
      - Change: remove ? from reserveRetryAttempt
      - ADR reference: ADR-0040
      - Effort: trivial (< 1 hour)
      - Blocks: reliable retry lineage under new store implementations

T1.2  Implement ADR-0045 run_status_heads narrow read model
      - Files: packages/@dvt/adapter-postgres/src (new table + mapper)
               packages/@dvt/engine/src/ports/IRunStateStore.ts (new read method)
               bootstrapRunTx, appendAndEnqueueTx (sync update)
      - ADR reference: ADR-0045 (accept and implement)
      - Effort: 1 sprint
      - Blocks: getRunStatus latency at scale

T1.3  Investigate and document gateway expression determinism
      - Files: docs/contracts/ (new grammar doc)
               packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts
      - Deliverable: formal grammar + evaluator spec + test cases
      - Effort: 2–3 days design + 1 sprint implementation
      - Blocks: production correctness guarantee for conditional workflows
```

### Tier 2 — High (before 100+ tenant scale)

```
T2.1  Remove full ExecutionPlan from RunPlanWorkflowInput
      - Files: packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
               packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts
               packages/@dvt/adapter-temporal/src/activities/ (step resolution)
      - ADR reference: new ADR required (structural change to temporal execution model)
      - Effort: 1–2 sprints
      - Blocks: Temporal payload ceiling for large dbt projects

T2.2  Separate rate-limiting from IRunAccessPolicy
      - Files: packages/@dvt/engine/src/security/RunAccessPolicy.ts
               packages/@dvt/engine/src/ports/IWorkflowEngine.ts (deps)
      - ADR reference: ADR-0039 §2.1
      - Effort: 0.5 sprint
      - Blocks: SRP compliance; testability of auth vs rate-limit

T2.3  Implement retryStep dedicated use case
      - Files: packages/@dvt/engine/src/ports/IWorkflowEngine.ts (new method)
               packages/@dvt/engine/src/application/ (new use case class)
               packages/@dvt/adapter-temporal/src/ (new signal or workflow interaction)
      - ADR reference: ADR-0048
      - Effort: 1–2 sprints
      - Blocks: production usability for large dbt runs with partial failures

T2.4  Activate PostgreSQL row-level security on tenant-scoped tables
      - Files: infra/db/ (migrations for RLS policy on run_events, run_snapshots, run_metadata)
      - ADR reference: ADR-0031
      - Effort: 0.5 sprint (migration + test)
      - Blocks: true database-level tenant isolation (not just application-level)
```

### Tier 3 — Medium (before 1,000-tenant production)

```
T3.1  Type canonical stepTypeConfig fields on ExecutionStepV1
      - Files: packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts
      - Deliverable: typed fields for compiledCodeRef and gateway on ExecutionStepV1
      - ADR reference: ADR-0041 contract-first discipline
      - Effort: 0.5 sprint

T3.2  Define ICostAttributionStore port and CostEvent contract
      - Files: packages/@dvt/contracts/src/ (new port + event contract)
      - Deliverable: port contract only (no implementation)
      - ADR reference: new ADR required
      - Effort: 1 sprint design; 0 implementation in this tier

T3.3  Publish in-flight plan migration protocol
      - Files: docs/adr/ (new ADR for continueAsNew state schema evolution)
               packages/@dvt/adapter-temporal/src/ (migration hooks)
      - Effort: 1 sprint design + 1 sprint implementation

T3.4  Retire or implement Conductor from VALID_PROVIDERS
      - Files: packages/@dvt/engine/src/application/providerSelection.ts
      - Deliverable: remove 'conductor' from the set or create a stub ADR
               documenting the future implementation contract
      - Effort: trivial

T3.5  Triage and close risk register items older than 60 days
      - Files: docs/risk-register/quality/
      - Deliverable: items classified as: Active + Blocked, Active + In-Progress,
               Monitored + No-Action-Needed, Closed
      - Effort: 0.5 sprint governance work
```

---

## 13. Summary Diagram

```
DVT+ Architecture — Current State Assessment (2026-04-14)

┌─────────────────────────────────────────────────────────────────────────────┐
│  PLANNER CONTEXT                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Planner.buildPlan() — PURE, DETERMINISTIC, CORRECT                  │   │
│  │  ExecutionPlan = sha256(JCS(planCore)) — SOLID                       │   │
│  │  IStepTypeRegistry / StepFactory — extensible port                   │   │
│  │  RISK: stepTypeConfig opaque blob / gateway expression unspecified   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                         │ PlannerBuildResultV1 (plan + executionPolicy)      │
└─────────────────────────┼───────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  EXECUTION CONTEXT                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  IWorkflowEngine — minimal 5-method contract — CORRECT               │   │
│  │  StartRunApplicationService — admission + intent log + dispatch      │   │
│  │  RISK: IRunAccessPolicy mixes auth+ratelimit (ADR-0039 F2 partial)   │   │
│  │  RISK: reserveRetryAttempt? optional (ADR-0040 type gap)            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│          │ IProviderAdapter                │ IRunStateStore                  │
└──────────┼─────────────────────────────────┼───────────────────────────────┘
           ▼                                  ▼
┌─────────────────────┐           ┌─────────────────────────────────────────┐│
│  TEMPORAL ADAPTER   │           │  STATE CONTEXT (PostgreSQL)             ││
│  RunPlanWorkflow    │           │  run_events (append-only) — CORRECT     ││
│  RISK: full plan in │           │  run_snapshots (rich projection)        ││
│  workflow payload   │           │  RISK: no run_status_heads (ADR-0045)   ││
│  RISK: continueAsNew│           │  outbox + shard fencing — CORRECT       ││
│  payload grows      │           │  RISK: RLS not active                   ││
│  RISK: 30m timeout  │           │  IStartRunIntentStore — CORRECT         ││
│  is a global floor  │           └─────────────────────────────────────────┘│
└─────────────────────┘                                                        │
                                                                               │
┌─────────────────────────────────────────────────────────────────────────────┘
│  MISSING CAPABILITIES
│  • Cost attribution: ABSENT
│  • RETRY_STEP use case: ABSENT
│  • run_status_heads read model: NOT IMPLEMENTED (ADR-0045 Proposed)
│  • PostgreSQL RLS: WIRED BUT INACTIVE
│  • Gateway DSL grammar: UNDOCUMENTED
│  • Run deadline / SLA contract: ABSENT
└─────────────────────────────────────────────────────────────────────────────
```

---

## Closing Statement

DVT+ is architecturally coherent at the conceptual level. The governing
principles — hexagonal architecture, event sourcing, bounded contexts,
content-addressed plan identity, domain-owned lifecycle — are correctly applied
in the core execution path. The design decisions are non-trivial and correctly
grounded in real-world distributed systems patterns.

The primary risks are not design defects. They are execution and scale gaps:

1. The Temporal payload ceiling for large plans is a hard limit with no
   current structural mitigation.
2. The `getRunStatus` hot path relies on a rich projection that degrades under
   scale. ADR-0045 is the fix but is not yet accepted.
3. The `reserveRetryAttempt?` type gap is a retry lineage invariant that can
   break silently.
4. The gateway expression language is undefined, creating an unverifiable
   determinism assumption.
5. Cost attribution does not exist, making any cost-aware product claim false.

The governance apparatus is the non-obvious risk. With 80+ open risk items and
an accumulation rate that exceeds the documented close rate, the repository is
in a governance inflation phase. If not actively managed, the ADR process will
become an obstacle to the structural fixes identified above.

The architecture deserves the rigor it has been given. The debt that has
accumulated is manageable. The action plan above addresses it in execution
order without introducing new scope.
