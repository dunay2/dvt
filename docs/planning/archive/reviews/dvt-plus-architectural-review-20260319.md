---
title: DVT+ Architectural Review � March 2026
status: Active
owner: Architecture
date: 2026-03-19
reviewer_role: Principal / Staff Architect
---

# DVT+ Architectural Review � March 2026

**Reviewer role:** Principal / Staff Architect
**Date:** 2026-03-19
**Sources:** `dvt-execution-model.md`, `reference-architecture.md`, `IWorkflowEngine.v1_1_1.ts`, `ExecutionPlan.v2.ts`, `IRunStateStore.v1.ts` (contracts re-export), `system-delivery-status.md`, `DVT+_Architectural_Review_20260225.md`, 34 contract files, 20 workspaces, G1�G10 closure evidence
**Scope:** Full-system review against stated separation principles

> **Preliminary note:** Three documents cited in the review brief ("DVT_Product_Definition_V0", "dvt_workflow_engine_artifact", "dvt_v2_architecture_explanation") do not exist under those names in the repository. This review is based on the normative documents that do exist. This naming confusion is itself an architectural risk � if source-of-truth documents have inconsistent names across contexts, new engineers cannot locate the authoritative specification.

---

## 1. Conceptual Soundness

### What is solid

**The core separation principle is correctly defined.** "UI does not execute / Engine does not decide / Planner does not persist" is explicitly stated, codified in the bounded context table, and enforced at the contract layer. `IWorkflowEngine` contains zero business decision logic. `IRunStateStore` is write-only from the engine's perspective at bootstrap. The planner types (`ExecutionPlanV2`, `PlannerInputEnvelopeV2`) are distinct from engine-runtime types. This is not accidental � there are 40+ ADRs enforcing it.

**The `IWorkflowEngine` interface is minimal and correct.** Five operations. Each has a single responsibility. The `getRunStatus`/`enrichRunStatus` split (ADR-0015) is the right call for decoupling read availability from provider health. Circuit breaking is appropriately pushed to the infrastructure layer.

**`bootstrapRunTx` atomicity is the right foundation.** The three-table atomic write (metadata + first events + outbox) eliminates the two-phase write gap. The `adapter.startRun()` ? `bootstrapRunTx` ordering with `cancelRun` compensation is the correct solution to the crash window problem. The Feb 2026 review correctly identified these as the strongest parts of the system; they have not regressed.

**ExecutionPlan ownership is cleaner than it was.** `ExecutionPlan.v2.ts` lives in `@dvt/contracts/planner/`. The Feb 2026 review noted that `executionPlan.ts` living in the engine package was an ownership signal that was wrong. This has been corrected.

**The `IRunStateStore` interface fragmentation has been partially resolved.** The contracts package now re-exports from a single source (`packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts`). Whether the three-copies problem from Feb 2026 is fully eliminated requires verifying the engine package's internal `state/IRunStateStore.ts` is gone � that verification was not possible from available evidence. If a local copy remains, the fragmentation risk persists.

**The `PlannerInputEnvelopeV2` graph-source policy is explicit and governed.** The `GRAPH_SOURCE_COMPATIBILITY_POLICY` constant and the "one-active-source rule" are precisely specified with removal criteria. This is good API governance.

**G1�G10 all closed.** The outbox worker, projector runtime, lineage worker, and compiledCodeRef ownership gaps are closed. The system is no longer a shell with a detailed engine and absent infrastructure.

### What is fragile

**The planner layer is documented as "Partial" and its production-hardening status is unquantified.** The delivery status states: "contract and package surfaces are present, but not every product flow is production-hardened." The planner must parse dbt manifests, build a DAG, apply selection logic, detect cycles, assign step kinds via `IStepTypeRegistry`, hash the result, and produce a valid `ExecutionPlanV2`. There is no evidence of golden test fixtures against real `manifest.json` inputs with known-good output plans in any reviewed document.

**`stepTypeConfig: Record<string, unknown>` is an escape hatch with inadequate runtime enforcement.** The field is typed as `Record<string, unknown>` through the entire transport � engine, outbox, Temporal input, activity payload. A plan with a malformed `stepTypeConfig` that passes planner validation but fails adapter validation produces a run that cannot start. There is no pre-dispatch validation gate at the engine layer. The failure mode is a running workflow that fails on first step, not a pre-flight rejection.

**The `observability?: { [k: string]: unknown }` field on `ExecutionPlanV2` has no schema.** An open-ended escape hatch on an immutable plan artifact means any data can be embedded and persisted. Drift across plan versions causes silent inconsistency.

**`enrichRunStatus` circuit breaking is "infrastructure's responsibility" with no specified mechanism.** If `enrichRunStatus` is called during Temporal adapter degradation and no circuit breaker is in place, the caller blocks. There is no fallback contract in `IWorkflowEngine` for when the adapter is unavailable.

**Branded primitives are decorative.** `TenantId`, `RunId`, `StepId` as branded types at the contracts layer are not enforced in implementation call sites. They are TypeScript nominal typing sugar that provides no compile-time or runtime guarantee if implementation code uses plain `string`. The "tenant-scoped queries" guarantee is an assertion, not a type-system constraint.

### What is missing

**No specification for retry identity in Phase 2.** `logicalAttemptId` is hardcoded to `1`. The conceptual inconsistency from the Feb 2026 review is unresolved: ADR-0016 implies the planner increments it on retry, but the planner does not observe in-flight state � that is the engine's domain.

**No reconciliation spec for stuck CANCELLING state.** If `RunCancelRequested` is emitted but `RunCancelled` never arrives, the snapshot shows `cancelling: true` indefinitely. No background job is specified to detect and resolve this condition.

**No SSE/WebSocket contract.** Mentioned in Sprint 4 of the implementation plan. No technology choice, backpressure strategy, or connection lifecycle model exists.

**Web UI has zero automated test coverage.** Stated explicitly in the delivery status. The "state-driven UI" architectural claim cannot be verified without UI tests.

---

## 2. Architectural Risk Map

| Risk                                                             | Severity                           | Likelihood                  | Why                                                                                                              | Mitigation                                                                                                     |
| ---------------------------------------------------------------- | ---------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Planner "partial" with no golden fixtures against real manifests | **Critical**                       | High                        | Planner is the input surface; a semantically wrong plan causes a failed run with no pre-flight signal            | Require golden fixtures for all step kinds with real `manifest.json`; define production-hardened exit criteria |
| `logicalAttemptId` authority unresolved for Phase 2              | **High**                           | Certain (deferred)          | Idempotency key derivation depends on it; wrong authority = duplicate events or orphaned retries                 | Decide before Phase 2 retry implementation starts; document in ADR                                             |
| `stepTypeConfig` validation gap at engine dispatch boundary      | **High**                           | High                        | Engine does not validate step configs before dispatching; first failure is at activity execution inside Temporal | Add pre-dispatch `IStepTypeRegistry.validate(step)` call in engine before `adapter.startRun()`                 |
| Stuck CANCELLING state with no escalation path                   | **High**                           | Medium                      | `RunCancelRequested` emitted, workflow terminated externally, `RunCancelled` never arrives                       | Specify background cancellation timeout job with force-transition to CANCELLED                                 |
| `enrichRunStatus` without circuit breaker spec                   | **High**                           | High                        | Provider degradation causes caller blocking; no fallback behavior documented                                     | Specify timeout + fallback behavior; add circuit breaker as required infrastructure dependency                 |
| PostgreSQL `run_events` without partitioning at 500M events/day  | **High**                           | Certain at Phase 3          | Single-table append causes index bloat, autovacuum contention, query plan degradation                            | Define partitioning schema by `(tenant_id, created_at)` before Phase 3; specify archival trigger               |
| Web UI has no automated tests                                    | **Medium**                         | High                        | State-driven UI claim unverifiable; read-model rendering regressions invisible                                   | Set minimum test coverage threshold for `apps/web` before Phase 2                                              |
| Temporal worker saturation on large parallel layers              | **Medium**                         | High                        | 1000-node plans producing 100+ concurrent activities can saturate worker pool                                    | Document worker scaling model; define max-concurrency-per-layer policy in `ExecutionPlanV2`                    |
| OpenLineage lineage delivery is fail-soft                        | **Medium**                         | High                        | DLQ exists but recovery is manual; no metric for DLQ depth                                                       | Define operational runbook for DLQ recovery; add DLQ depth metric                                              |
| Plugin sandbox is DRAFT with no isolation mechanism              | **High**                           | Medium (Phase 3)            | Plugin in-process with engine can crash worker or exfiltrate credentials                                         | Define sandbox mechanism before any plugin API is exposed                                                      |
| GDPR erasure conflict with append-only event log                 | **Medium**                         | Certain at enterprise scale | Right to erasure requires deletion; append-only semantics prevent it without tombstone/redaction                 | Define redaction strategy before any production tenant data is stored                                          |
| `observability` open field on `ExecutionPlanV2` is unschema'd    | **Medium**                         | High                        | Drift across plan versions; open `[k: string]: unknown` on immutable artifacts is dangerous                      | Close field to concrete schema or remove it                                                                    |
| Connection pool limit too low for Phase 3 throughput             | **Medium**                         | Certain                     | 50-connection limit at 1.5B writes/day is a bottleneck at burst                                                  | Define connection pool scaling policy; add PgBouncer or equivalent                                             |
| Cost attribution has zero implementation hooks                   | **Low** (now) / **High** (Phase 3) | Certain                     | No per-step Snowflake credit capture; cost dashboard requires `QUERY_TAG` + `QUERY_HISTORY` integration          | Do not build cost UI until per-step credit capture prototype exists                                            |

---

## 3. Engine Abstraction Critique

### Is `IWorkflowEngine` minimal and correct?

The interface is correct in scope: five operations, each with a single responsibility. `detectStuckRuns` has been removed from the interface (correct). Two remaining concerns:

`signal(engineRunRef, request: SignalRequest)` uses an opaque `SignalType`. Adding a new signal type requires modifying the contracts package � a breaking change for all consumers. There is no extensibility mechanism for signals above the contracts layer.

`healthCheck()` appears in the `WorkflowEngine` class diagram in the delivery status but is not on `IWorkflowEngine`. If it is a public API that bypasses the contract, it is a separation violation. Clarify.

### Is the Temporal-first strategy wise?

Yes. Temporal's deterministic replay, durable execution, and `continueAsNew` are the right primitives for orchestrating dbt DAGs with hundreds of nodes. Building full engine semantics on Temporal first before abstracting is the correct sequencing.

### Is Conductor parity realistic?

Not as stated. Adapters are **state-equivalent**, not **execution-equivalent**. Temporal's deterministic replay is structural � Conductor does not replay from history; workers re-execute activities. `continueAsNew` is Temporal-specific. Signal-based pause/resume in Temporal has no direct Conductor equivalent.

The ADR language must be reworded: "Given the same `ExecutionPlan` and the same step execution results, the StateStore event log will be semantically equivalent regardless of adapter." Add the explicit caveat that execution semantics (replay, signal handling, history limits) are adapter-specific and are not guaranteed to be equivalent.

### Is the event model robust?

Well-specified: `runSeq` monotonicity, `(runId, idempotencyKey)` uniqueness, `emittedAt`/`persistedAt` split. Two structural problems remain:

1. SnapshotProjector correctness for retry scenarios (multiple `StepStarted` for same `stepId`) is conditional on `logicalAttemptId` authority being resolved � which it is not.

2. `RunCancelRequested` ? stuck state has no projection escape. The projector cannot self-heal a missing `RunCancelled` event.

---

## 4. Execution Planning Layer Analysis

### DAG analysis based on dbt artifacts

Planner package exists with registry/schema hardening (G9 closed). What is not verified in any reviewed document:

- Correctness of cycle detection
- `--select` semantics translation into `PlannerSelection.selectedNodeIds`
- `includeUpstream`/`includeDownstream` with cross-project dependencies
- Behavior against `manifest.json` files with 1000+ nodes

The `manifest` and `nodes` compatibility paths in `PlannerInputEnvelopeV2` have stated removal criteria but no removal date. In practice, compatibility paths retained "for migration" become permanent if migration is not actively driven.

### Partial execution guarantees

Partial execution re-entry is bounded by layer granularity, not step granularity. A `continueAsNew` in a large parallel layer means all incomplete steps in that layer re-dispatch from layer start (minus persisted idempotency keys). For a layer with 50 parallel dbt models, 50 activities are re-dispatched, some of which may have already completed at the provider. The re-dispatch cost is real and unmitigated.

### Retry/backoff policy ownership

Unresolved. `ExecutionPlanV2` has no retry policy fields. The Temporal adapter has native retry configuration. The engine has retry signals deferred to Phase 2. Retry is currently entirely delegated to Temporal infrastructure with no domain-level policy.

### Cost estimator realism

No hooks exist. No Snowflake `QUERY_TAG` integration. No `QUERY_HISTORY` API integration. No per-step credit capture. The Phase 3 cost attribution feature is entirely speculative.

### Plan versioning strategy

`planVersion: '2.3'` is hardcoded as a string literal type in `PlanCore`. Version evolution requires a contracts package major version bump. No discriminated union across versions, no migration function, no compatibility shim. A plan version rollout requires a big-bang cutover with no migration path.

---

## 5. State & Metadata Layer Review

### Is PostgreSQL sufficient?

For Phase 1�2 declared loads: yes. For Phase 3 (500K runs/day, 1000-step plans): no, without structural changes.

`run_events` at 500M events/day reaches 50B rows in 90 days. PostgreSQL requires aggressive partitioning (range by `created_at`, sub-partitioned by `tenant_id`). No partitioning schema is specified in any reviewed document. Autovacuum configuration for append-heavy tables must be tuned. This needs Phase 2 design work before Phase 3 data arrives.

**The 50-connection pool limit is a bottleneck.** At 1.5B writes/day distributed evenly, steady-state is ~17K writes/second. With 50 connections at 5ms average transaction, maximum theoretical throughput is 10K TPS. PgBouncer or equivalent is required at Phase 3 scale.

### Is Snowflake for analytics appropriate?

Appropriate in principle. The constraint: no UI polling path must hit Snowflake. Snowflake query cold start is 2�5 seconds for a suspended warehouse. This constraint must be architecturally enforced, not just documented.

### Is lineage snapshotting scalable?

G10 is closed with `LineageWorkerRuntime`, DLQ, `HttpOpenLineageSink`. Structurally correct. Scale concern: dbt `manifest.json` for 1000+ node projects is 10�50 MB. Full manifests stored per run at 500K runs/day = 5�25 TB/day. The `manifestRef` abstraction (content-addressed, not inline bytes) is the correct mitigation. Whether the artifact store enforces deduplication by SHA-256 is not confirmed.

### Is artifact immutability realistic?

`PlanRef.sha256` for integrity is correct. The artifact store backend is unspecified. If the backing store is not WORM or content-addressed, a plan may fail to replay if the artifact was deleted. Artifact retention policy is not specified.

### Write amplification risk

Three writes per event minimum (metadata, event, outbox) plus two per outbox delivery (mark-delivered or mark-failed). At 500M events/day: ~1.5�2.5B writes/day. This is the binding constraint on PostgreSQL at Phase 3 scale. No mitigation is currently specified.

---

## 6. Plugin System Evaluation

### Isolation strategy

`PluginSandbox.v1.md` is DRAFT. No implementation exists. **vm2 is deprecated and must not be used.** `worker_threads` shares process address space; native modules escape. The only production-viable isolation is a subprocess boundary with restricted syscalls (`seccomp`, `landlock`).

The isolation architecture has not been decided, which means the Phase 3 plugin API surface is being designed without knowing what the sandbox permits. If the sandbox ends up being a subprocess, some APIs (synchronous return values, shared memory) are impossible. Design the API after the isolation model is decided, not before.

### Can plugins compromise deterministic execution?

Yes, if they run inside Temporal workflow code. Any non-deterministic call in workflow context breaks replay. **The constraint that plugin hooks must only execute from activity context, never from workflow context, is not documented in any reviewed normative document.** This must be specified before any plugin hook is designed.

### Capability-based security

`requiresCapabilities` at plan submission time is declaration, not enforcement. Capabilities must be enforced at the sandbox API level. Without this, capability declarations are documentation, not security.

---

## 7. What Is Overbuilt?

### Normative traceability header overhead

`@file`, `@baseline`, `@decision`, `@consequence` headers on governed files with CI gates create maintenance overhead on every file change. At 289 source files across 20 workspaces, the parsing scripts, Neo4j integration, and CI gates consume engineering time without proportional correctness benefit. The goal (ensure code reflects architectural decisions) can be achieved with PR review checklists and per-ADR implementation checklists.

### Evidence document generation at task granularity

EDs applied uniformly to every gap task produce compliance theater rather than genuine architectural records. Evidence docs are most valuable for architectural decisions and production incidents. At task granularity, they become a filing system that must be maintained without commensurate benefit.

### `@dvt/plan-verifier` as a standalone package

Described as "a narrow verification utility, not a broad workflow policy layer." If it is narrow, the overhead of a separate package (its own `package.json`, build config, test setup, version management) is not justified. This may belong in the planner package itself.

### Multi-engine abstraction before Conductor exists

The abstraction cost (extra indirection layer, two interfaces, adapter conformance) is being paid without the benefit (a second working adapter). Reframe: the abstraction is a preparatory investment, not a guarantee. Every design decision that makes Temporal work well but Conductor work differently is not a "violation" of the abstraction � it is a consequence of using Temporal-native primitives, which is the correct approach.

---

## 8. What Is Underbuilt?

### Retry identity and `logicalAttemptId` authority

The most consequential unresolved question for Phase 2. Decision: the engine is the authority; it reads the current maximum `logicalAttemptId` for a run from the state store and increments it atomically when a retry is triggered.

### Schema migration tooling

`planVersion: '2.3'` hardcoded as a string literal type. No discriminated union across versions, no migration function, no compatibility shim. Any production rollout of a new plan version requires a big-bang cutover.

### `getDeadLettered()` operational recovery

Dead-lettered events are not queryable. Operational recovery from the DLQ requires direct database access. No runbook.

### GDPR erasure against append-only events

No tombstone mechanism, no redaction strategy, no specification of what constitutes personal data in a run event. Any enterprise SaaS will receive erasure requests. Design before production tenant data is stored.

### Backpressure at plan submission

Per-tenant startRun rate limiting is optional (`outboxRateLimiter?`). A tenant submitting 1000 runs simultaneously saturates the state store connection pool and the Temporal namespace. No admission control at the engine boundary.

### SSE/WebSocket streaming specification

No contract, no technology choice, no backpressure strategy, no connection lifecycle model.

### Planner test coverage against real manifests

No evidence of golden test fixtures with real `manifest.json` inputs. The planner produces the input for the entire system. A structurally valid plan with incorrect step ordering causes incorrect execution with no engine-level detection.

---

## 9. Scalability Outlook � 3-Year Horizon

**Assumptions:** 1000+ tenants, thousands of concurrent runs, 1000+ node dbt projects, cross-environment diffs, heavy cost dashboards.

### Postgres `run_events` table � primary bottleneck

500M events/day, 90-day hot retention: ~45B rows. Without partitioning, unmaintainable. Range partition by month with subpartitioning by `tenant_id` is the minimum design. No partitioning schema is currently specified. **This is a Phase 3 blocker that requires Phase 2 design work.**

### Planner computation under repeated manifest analysis

The same `manifest.json` re-parsed for every run submission. `inputHashSha256` enables plan caching � if the same hash arrives, return the cached plan. This cache is not specified. Without it, planner CPU scales linearly with run submissions rather than unique manifests.

### Temporal worker saturation

A 1000-node plan with a 200-activity parallel layer saturates workers and creates a queue backlog. Worker autoscaling (based on task queue depth) is not specified.

### Cross-environment diffs

`RunContext` includes `environmentId`. State store queries are scoped to `(tenantId, runId)`. Comparing a run in `env: production` with a run in `env: development` requires either a cross-environment query or a federation layer. Neither is specified.

### Cost dashboard at scale

500K runs/day � 1000 steps = 500M `QUERY_HISTORY` API calls per day at step-level credit resolution � immediately exhausts Snowflake API rate limits. Practical solution is batch aggregation with a time delay. No design exists.

### Single points of failure

- **Temporal cluster:** single namespace; no documented failover strategy
- **PostgreSQL primary:** no read replica strategy; all operational reads hit the primary
- **Lineage worker:** `apps/lineage-worker` is a single process; DLQ growth with no automated recovery on crash

---

## 10. Architectural Scorecard

| Dimension                    | Score | Justification                                                                                                                                                                                                                                           |
| ---------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Conceptual clarity**       | 7/10  | Core separation correctly defined and enforced across 40+ ADRs. Execution model spec is normative. Deducted: document naming inconsistency, planner partial status unquantified, open type fields on immutable artifacts.                               |
| **Separation of concerns**   | 7/10  | Engine/adapter and planner/engine boundaries enforced by contract. `IRunStateStore` fragmentation partially resolved. Deducted: branded primitives not enforced; `stepTypeConfig` validation gap at dispatch; no pre-dispatch DAG validation.           |
| **Replaceability of engine** | 6/10  | `IWorkflowEngine` is minimal and versioned. Temporal adapter is real and complete. Conductor is a paper claim � no POC, no evidence, no compatibility analysis. Replaceability is theoretical until two adapters work simultaneously.                   |
| **Determinism**              | 7/10  | Temporal workflow correctly structured. Idempotency key derivation well-specified with golden vectors. `bootstrapRunTx` atomicity correct. Deducted: `logicalAttemptId` authority unresolved; plugin hooks in workflow context not formally prohibited. |
| **Extensibility**            | 5/10  | Adapter pattern enables engine extensibility. `IStepTypeRegistry` enables step kind extensibility. Signal types require contracts package modification. Plugin system unspecified. Plan version evolution requires major version bump.                  |

---

## 11. Strategic Recommendations

### 3 structural changes

**1. Resolve `logicalAttemptId` authority before Phase 2 begins.**
Write an ADR with a single unambiguous decision: the engine is the authority; it reads the current maximum `logicalAttemptId` for a run from the state store and increments it atomically when a retry is triggered. The planner is not involved. Close this before any Phase 2 retry implementation starts.

**2. Close the `stepTypeConfig` validation gap at the engine dispatch boundary.**
Call `IStepTypeRegistry.validateStepConfig(step.kind, step.stepTypeConfig)` in the engine before `adapter.startRun()`. If validation fails, reject the run with `PLAN_STEP_CONFIG_INVALID` at dispatch time, not at activity execution time inside Temporal.

**3. Define the PostgreSQL partitioning schema before Phase 3 data exists.**
Partition `run_events` by `(created_at_month, tenant_id)` before any production data arrives. Define the archival trigger (age-based), cold archival target (S3 + Parquet), and GDPR erasure mechanism (partition-level deletion for tenant erasure, row-level tombstoning for individual run data).

### 3 clarifications needed

**1. What does "planner production-hardened" mean and what are the exit criteria?**
Define: golden fixtures for each supported step kind with real `manifest.json` inputs, cycle detection tests, selection logic tests, load test against a 1000-node manifest.

**2. What is the sandbox mechanism for Phase 3 plugins?**
Decide before designing the plugin API. The isolation model determines what synchronous APIs are possible, what latency budget plugins have, and how plugin failures are contained.

**3. What is the GDPR erasure strategy?**
Tombstoning (a `RunDataRedacted` event type) or partition-level deletion. Both are viable. Neither is defined. Must be answered before any production tenant data is stored.

### 3 things to freeze immediately

1. **Freeze the idempotency key formula (ADR-0008).** SHA-256 preimage, golden vectors, implemented. Any change requires re-deriving all existing production idempotency keys retroactively.

2. **Freeze the `bootstrapRunTx` atomicity contract.** Any relaxation reintroduces the race condition the ADR was written to prevent.

3. **Freeze the `adapter.startRun()` ? `bootstrapRunTx` ordering.** The compensation pattern only works because the adapter call happened first and we have the `EngineRunRef` to cancel on failure.

### 3 things to delay

1. **Delay cost attribution UI until per-step Snowflake credit capture is prototyped.** Do not build the dashboard until a prototype demonstrates that per-step credits can be reliably extracted from `QUERY_HISTORY` via `QUERY_TAG`.

2. **Delay Conductor adapter development until the "state-equivalent, not execution-equivalent" framing is accepted and documented in ADR-0003.** Correct the language first; then the Conductor adapter is a well-scoped problem.

3. **Delay the plugin marketplace until the sandbox isolation mechanism is specified, implemented, and red-teamed.** Third-party code in-process with the engine before the sandbox exists is a security liability, not a technical debt.

---

**Bottom line:** The execution core (engine + state store + adapters + outbox + projector) is the most mature component and is correctly designed. The planner's correctness is unverifiable in its current state. The operational surface (partitioning, GDPR erasure, worker scaling, DLQ recovery) is underspecified for Phase 3. Three unresolved conceptual questions (`logicalAttemptId` authority, sandbox mechanism, erasure strategy) will each cause a design crisis if left to Phase 2/3 delivery pressure. Address them now while the system has no production data and no external API consumers.
