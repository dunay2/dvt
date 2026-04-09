---
title: Principal Architecture Review - DVT+
status: Historical
owner: Architecture
last_reviewed: 2026-03-16
planning_type: review
---

# Principal Architecture Review - DVT+

## Source basis

This review is constrained to the repository artifacts that map to the sources
requested:

1. `dvt_workflow_engine_artifact` ->
   [docs/architecture/engine/index.md](../../architecture/engine/index.md)
2. `dvt_v2_architecture_explanation` ->
   [docs/archive/DVT+\_Architectural_Review_20260225.md](../../archive/DVT+_Architectural_Review_20260225.md)
3. `DVT_Product_Definition_V0`:
   no standalone file with that exact name exists in the repo. The product
   principle is only reachable indirectly through the source mapping recorded in
   [docs/archive/DVT+\_Architectural_Review_20260226_AI.en.md](../../archive/DVT+_Architectural_Review_20260226_AI.en.md),
   plus explicit product-principle references in
   [docs/architecture/engine/contracts/engine/RunEvents.v2.0.md](../../architecture/engine/contracts/engine/RunEvents.v2.0.md),
   [docs/architecture/engine/security/SECURITY_INVARIANTS.v1.md](../../architecture/engine/security/SECURITY_INVARIANTS.v1.md),
   and
   [docs/architecture/engine/roadmap/engine-phases.md](../../architecture/engine/roadmap/engine-phases.md).

That gap matters. A system this opinionated should not depend on an absent
product-definition file and a chain of indirect references to recover its core
separation principle.

## 1. Conceptual Soundness

### What is solid

- The high-level split is correct in intent. The engine receives `PlanRef`,
  not the full plan. That is the right boundary if the planner owns plan
  materialization and integrity.
- State as source of truth is the only sane choice for this product. The docs
  consistently anchor execution truth in the event/state layer rather than in
  Temporal runtime state.
- The event model is structurally sound. `runSeq`, append authority,
  idempotency, and derived snapshots are the right primitives for deterministic
  replay and read isolation.
- Temporal-first is the correct implementation order. Trying to build adapter
  parity before closing one real execution model would have collapsed the
  contract into lowest-common-denominator garbage.

### What is fragile

- The separation slogan is not actually closed as a system invariant.
  `UI does not execute` is mostly enforceable. `Planner does not persist` is
  plausible. `Engine does not decide` is not clean because gateway expression
  evaluation still lives in runtime semantics. If runtime evaluates branching
  logic, runtime is deciding.
- `ExecutionPlan` is conceptually central but structurally homeless. The docs
  want it planner-owned, engine-consumed, adapter-validated, versioned, and
  integrity-checked. That is too much coupling for a contract that has no
  clear single owner in the source set.
- The Conductor story is semantically overstated. The docs say
  Temporal-first / Conductor-next, but the Conductor spec itself admits weak
  determinism, degraded pause/cancel, and no real replay. That is not
  replaceability. That is partial behavioral emulation.
- State-driven UI is realistic only if read models stay brutally narrow.
  It is not realistic if the UI is expected to derive rich live execution
  state from the append log or from Snowflake analytics paths.

### What is missing

- A single, explicit source for the product-definition contract.
- A hard statement of which decisions are allowed in runtime and which must
  be frozen at planning time.
- A planner specification with enough detail to deserve the architectural
  centrality the docs assign to it.
- An explicit compatibility and migration strategy for `ExecutionPlan`
  evolution.
- A formal concurrency model for `startRun`, signals, retries, and projector
  lag.

## 2. Architectural Risk Map

| Risk                                      | Severity | Likelihood | Why                                                                                                                                                       | Mitigation                                                                                                        |
| ----------------------------------------- | -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Planner/engine responsibility creep       | Critical | High       | The docs say engine does not decide, but gateway evaluation and retry semantics are not actually frozen into planner-owned policy                         | Freeze a hard decision table: what planner decides, what engine executes, what adapter merely translates          |
| Conductor parity fiction                  | High     | High       | The Conductor spec already admits missing replay, weak pause/cancel, and externalized determinism                                                         | Change the promise from engine replaceability to state-equivalence only                                           |
| State explosion                           | Critical | High       | Event log + outbox + snapshots + analytics storage + lineage projections produce layered write amplification with no closed retention story               | Define hot/cold retention, archival triggers, projector rebuild budgets, and pruning ownership now                |
| Event duplication / idempotency breakdown | High     | Medium     | Idempotency is well-described, but deterministic retries across planner/engine/adapter boundaries are still underspecified                                | Centralize idempotency enforcement in append authority and add failure-mode matrices for retries                  |
| Multi-tenant isolation flaw               | Critical | Medium     | The system claims multi-tenant security, but the source set still relies on design intent more than systemic enforcement proof                            | Require tenant-scoped contracts, negative tests, and enforcement at every storage and read boundary               |
| Plugin sandbox compromise                 | Critical | Medium     | Plugin isolation is still a concept surface, not a closed execution boundary                                                                              | Forbid in-process untrusted plugins; use process or stronger isolation only                                       |
| Cost attribution fantasy                  | High     | High       | The docs imply cost-aware execution and dashboards without a real capture pipeline from warehouse activity to run/step identity                           | Delay precise cost attribution until query tagging, warehouse metadata ingestion, and attribution semantics exist |
| Operational complexity overload           | High     | High       | The architecture carries event sourcing, outbox, read models, two workflow engines, plugin extensibility, analytics, lineage, and security layers at once | Narrow Phase 1/2 scope and stop promising Phase 3 abstractions as current architecture facts                      |
| Contract migration failure                | High     | Medium     | Versioning is documented, but migration mechanics, negotiation, and rollback semantics are not                                                            | Add concrete version matrix, deprecation windows, and migration tooling before publishing more contracts          |
| Write amplification on hot path           | High     | High       | Append-only events plus snapshot projection plus outbox plus lineage is an expensive persistence model                                                    | Quantify write budget per run and per tenant, then cap or batch where semantics allow                             |

## 3. Engine Abstraction Critique

### Is `IWorkflowEngine` minimal and correct?

It is minimal enough. It is not correct enough.

The contract is small, but its surrounding assumptions are not closed:

- `startRun(planRef, context)` is correct only if the planner is the sole owner
  of plan semantics and the engine never needs to reopen plan content for
  branching policy. The current source set does not fully support that claim.
- `signal()` is underspecified relative to distributed concurrency and retry
  semantics.
- The contract surface does not describe maintenance responsibilities,
  projector lag semantics, or failure propagation across adapters.

Minimal API does not rescue missing semantics.

### Is Temporal-first wise?

Yes. That part is right.

Temporal gives:

- deterministic replay,
- durable workflow state,
- proper long-running orchestration primitives,
- an honest model for workflow signals and continuation.

The problem is not Temporal-first. The problem is pretending that a
Temporal-shaped engine contract is still cleanly portable to Conductor.

### Is Conductor parity realistic?

No.

The Conductor document itself destroys that assumption:

- no strong replay,
- no native signals,
- degraded cancel,
- degraded pause,
- weak determinism,
- external task execution model.

That means:

- same final snapshot might be possible,
- same execution semantics are not.

The docs need to stop using language that implies runtime substitutability.
Conductor is a degraded backend, not a peer execution engine.

### Is the event model robust?

Mostly yes, but only at the semantic skeleton level.

What is robust:

- append-only log,
- projector-derived state,
- `runSeq` authority,
- idempotency key semantics,
- state-store primacy.

What is still fragile:

- handling of retries across logical attempts,
- interaction between runtime branching and projector correctness,
- projector lag and rebuild semantics under sustained scale,
- state transitions when adapters do not provide equivalent operational
  guarantees.

### What could break when adding Conductor?

- any workflow behavior that assumes replay fidelity,
- pause/resume UX promises,
- retry semantics tied to in-workflow deterministic history,
- signal ordering expectations,
- any plan construct whose correctness depends on replayed branching history.

### Where determinism assumptions could fail

- gateway DSL evaluation,
- plugin hooks touching runtime or planning path,
- any activity result that is treated as if it were a deterministic decision,
- any cross-engine assumption that final-state equivalence implies execution
  equivalence.

## 4. Execution Planning Layer Analysis

This layer is the weakest architectural surface in the whole source set.

### DAG analyzer based on dbt artifacts

The concept is correct. dbt artifacts are the right graph source.

The problem is not the source. The problem is the missing execution-grade
planner contract around it.

The docs do not sufficiently define:

- graph normalization,
- node selection semantics,
- environment-specific artifact variation,
- partial execution validity boundaries,
- plan reproducibility guarantees from the same artifact set.

That means the planner is carrying strategic importance without strategic
specification depth.

### Partial execution guarantees

Underspecified.

The system wants:

- resumability,
- deterministic retries,
- selective replay,
- cost-aware execution.

Those requirements force a very explicit definition of:

- step eligibility,
- retry ownership,
- dependency invalidation,
- materialized state reuse,
- artifact reuse safety.

The source set does not close those rules.

### Retry/backoff policy ownership

This is currently muddled.

It should be one of these, and only one:

- planner-owned policy encoded into `ExecutionPlan`,
- engine-owned operational retry policy,
- adapter-owned transport retry only.

Right now the docs imply all three. That is unstable. If planner, engine, and
adapter each own part of retry semantics, nobody owns correctness.

### Cost estimator realism

The current ambition is disconnected from the documented architecture depth.

If you want cost attribution that matters:

- warehouse-side query identity must map to run/step identity,
- shared compute cost must be apportioned,
- retries and partial execution must not double count,
- state and analytics pipelines must reconcile.

That is a real data product, not a field on a plan.

### Plan versioning strategy

Documented as policy, not as executable operational design.

Missing:

- compatibility matrix,
- migration path for in-flight runs,
- rollback path when a newer planner emits a now-invalid plan,
- ownership of version translation.

### Is this layer over-engineered?

No. It is under-specified, not over-engineered.

The ambition is large. The actual planner contract is too thin for that
ambition. The architecture is pretending the planner is a solved layer when it
is still mostly a placeholder in system semantics.

### Is it under-specified?

Yes. This is the main architectural hole.

### Does it introduce hidden coupling to Snowflake?

Potentially yes.

The docs want dbt artifacts, cost awareness, and warehouse-oriented execution
insight. Unless the planner is aggressively normalized around warehouse-agnostic
concepts, it will drift into Snowflake-specific assumptions under the excuse of
"practical optimization".

## 5. State & Metadata Layer Review

### Is Postgres sufficient?

For early control-plane truth, yes.

For the declared long horizon without aggressive partitioning, retention, and
archival, no.

Postgres is fine for:

- authoritative run metadata,
- event append authority,
- hot snapshots,
- outbox / DLQ,
- admin and operational reads.

Postgres is not fine as an unbounded forever-home for:

- high-volume event history,
- rich lineage snapshots,
- cost analytics,
- long-term audit growth without an archival model.

### Is Snowflake for analytics appropriate?

Yes, if it stays out of the hot control plane.

No, if anyone is tempted to use it for UI freshness.

That line must be frozen:

- Postgres/read models for control plane,
- Snowflake for analytics and heavy retrospective views.

### Is lineage snapshotting scalable?

Not as implied.

Full lineage snapshotting per run is an obvious storage bomb. The only durable
model that scales is:

- immutable artifact reference,
- projection of required facts,
- selective derived views,
- no full graph duplication per run unless regulation requires it.

### Is artifact immutability realistic?

Yes in principle. Only if backed by real storage rules.

`sha256` in a contract is not immutability. It is detection. The storage layer
still needs versioned, immutable, or content-addressed persistence or the whole
story degrades into "we detect after damage".

### Write amplification risk

High.

The architecture wants:

- append-only run events,
- snapshots,
- outbox,
- lineage delivery,
- analytics exports,
- possibly replay and rebuild.

That is a lot of writes per meaningful business action. This is manageable only
if you define:

- what is synchronous,
- what is asynchronous,
- what is best-effort,
- what is rebuildable,
- and where duplication is intentionally accepted.

### Event sourcing vs mutable state tradeoffs

The event-sourced choice is right for correctness and replay.

But the architecture is pretending it gets event sourcing benefits without
paying event sourcing operational costs. That is false. You either invest in
projection discipline, retention, rebuild, and backpressure, or event sourcing
turns into a write-heavy liability.

### UI read performance constraints

The UI can be state-driven at scale only if:

- read models are narrow,
- snapshot freshness has a bounded SLA,
- high-cardinality analytics are pushed out of hot-path reads,
- there is a real lag strategy when projectors fall behind.

Those guarantees are not yet architecturally explicit enough.

## 6. Plugin System Evaluation

### Isolation strategy

This is not production-ready architecture. It is still a security research note.

If plugins can touch:

- planning hooks,
- runtime hooks,
- UI injection,
- capability registration,

then the boundary must be stronger than "we will sandbox it somehow".

The only credible answer for untrusted plugins is a hard boundary:

- separate process,
- containerized isolation,
- strong provenance,
- explicit capability gating,
- no workflow-context execution.

Anything weaker is wishful thinking.

### Capability registration

Useful, but insufficient.

Declared capability is not enforced capability. Enforcement has to sit at the
actual API and process boundary, not in a registry document.

### Planner extension hooks

High risk. A planner extension can silently reintroduce execution decisions,
warehouse coupling, or non-deterministic plan generation. This is a direct
attack on the core architecture principle.

### Runtime hooks safety

Dangerous. Runtime hooks are where determinism dies if the boundaries are not
absolute.

### UI module injection risk

Medium to high, depending on trust level. The risk is not just XSS-style
surface expansion. It is product-boundary erosion: a UI plugin can quietly
become an execution-adjacent control path unless the contract is closed.

### Can plugins compromise deterministic execution?

Yes. Easily.

Any plugin hook that affects:

- step ordering,
- branching,
- retry behavior,
- signal handling,
- dynamic execution context,

can compromise determinism unless the plugin output is treated as planner-time
material and frozen before execution.

### Is capability-based security sufficient?

No.

Capability-based security is necessary. It is not sufficient.

You still need:

- provenance,
- isolation,
- tenant scoping,
- resource quotas,
- audit,
- deterministic-boundary restrictions.

## 7. What Is Overbuilt?

1. Multi-engine abstraction.
   - Too early. Temporal semantics dominate the real execution model. Conductor
     should not be elevated to equal architectural status yet.

2. Cost attribution ambition.
   - Too deep relative to the current planner and state maturity.

3. Observability layering.
   - Multiple observability and analytics layers are being framed before the
     control plane is fully stabilized.

4. Governance machinery around evolving contracts.
   - The repo has more governance narrative than executable migration mechanics.

## 8. What Is Underbuilt?

1. Planner contract and planner implementation semantics.
2. Contract migration strategy.
3. Rollback guarantees for plan/version/runtime mismatch.
4. Distributed consistency model for `startRun`, signals, retries, and
   projector lag.
5. Backpressure strategy per tenant and globally.
6. Run retention and archival policy as an operational contract, not just a
   roadmap statement.
7. SLA/SLO definitions tied to read freshness, run admission, and recovery.
8. Explicit concurrency model for duplicate submission and operator signals.
9. Clear degraded-mode definition for Conductor.

## 9. Scalability Outlook (3-Year Horizon)

Assume:

- 1000+ tenants,
- thousands of concurrent runs,
- dbt graphs with 1000+ nodes,
- cross-environment diffing,
- heavy cost dashboards.

### Likely bottlenecks

- planner graph generation and diff computation,
- state-store write amplification,
- projector lag under bursty multi-tenant load,
- analytics freshness if Snowflake is abused as a serving layer,
- outbox and lineage delivery fan-out.

### Single points of failure

- append authority / state-store availability,
- planner correctness,
- projector backlog and rebuild path,
- artifact storage immutability guarantees.

### Data growth pressure

- event log,
- snapshot tables,
- outbox / DLQ,
- lineage artifacts,
- cost and audit data.

Without an explicit archival and retention regime, growth pressure will wreck
the control plane.

### Planner computation load

The planner will become a serious compute product of its own if it is expected
to support:

- real dbt graph parsing,
- selection algebra,
- partial execution planning,
- cost estimation,
- cross-environment comparison,
- plugin-extended planning logic.

That is not a lightweight pre-processing step. It needs to be treated as a
first-class subsystem with its own scalability model.

## 10. Architectural Scorecard

- Conceptual clarity: **7/10**
  - The intended boundaries are strong. The problem is enforcement drift and
    missing closure around planner/runtime decisions.

- Separation of concerns: **6/10**
  - Good intent. Incomplete enforcement. Runtime still owns too much semantic
    responsibility.

- Replaceability of engine: **4/10**
  - Temporal is real. Conductor is not a peer. The docs overstate portability.

- Determinism: **7/10**
  - Strong in the Temporal path and event model. Weak wherever gateway
    evaluation, plugins, or Conductor parity enter the picture.

- Extensibility: **6/10**
  - Extensible in concept. Dangerous in practice because extension points are
    not yet constrained tightly enough.

- Operational realism: **5/10**
  - The docs know the hard problems. They do not yet close them with enough
    executable operational design.

- Long-term maintainability: **6/10**
  - Maintainable if the planner, migration, retention, and degraded-mode
    questions are closed early. Fragile if the current ambiguity survives.

## 11. Strategic Recommendations

### 3 structural changes

1. Reframe Conductor as degraded state-equivalent execution, not equal runtime
   parity.
2. Freeze planner ownership of all branching, retry policy, and partial
   execution decisions; runtime may execute only precomputed policy.
3. Split hot control-plane state from long-term analytical/event retention now,
   not later.

### 3 clarifications needed

1. Where exactly does gateway DSL evaluation belong: planner-time, runtime, or
   hybrid?
2. Who owns retry/backoff and logical attempt increments: planner, engine, or
   adapter?
3. What is the real compatibility policy for `ExecutionPlan` versions and
   in-flight runs?

### 3 things to freeze immediately

1. `StateStore is truth` as non-negotiable operational invariant.
2. No untrusted plugin execution inside workflow/runtime deterministic context.
3. No more language implying Conductor execution equivalence with Temporal.

### 3 things to delay

1. Marketplace-style plugin extensibility.
2. Precise cost attribution / chargeback ambition.
3. Rich multi-engine abstraction beyond state-equivalent outcomes.

## Bottom line

The architecture is directionally right and operationally dishonest in a few
critical places.

The core design works only if the planner is elevated from vague prerequisite
to fully specified subsystem, if Conductor is demoted from parity fantasy to
degraded backend, and if state growth / write amplification are treated as
first-class design costs rather than future ops tuning.

If those three corrections are not made, the separation slogan becomes
branding, not architecture.
