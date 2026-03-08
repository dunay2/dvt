# DVT+ Architectural Review — February 2026

**Reviewer role:** Principal/Staff Architect  
**Sources:** Codebase (`feat/ddd-cqrs-structure`), 17 ADRs, normative contracts (**IWorkflowEngine v2.0**, **ExecutionSemantics v2.0**, **RunEvents v2.0.1**), roadmap, Temporal workflow implementation, all TypeScript source  
**Scope:** Full-system review against stated separation principles

---

## 1. Conceptual Soundness

### What is solid

- **Adapter-first startRun ordering (ADR-0013/0014)** is the right call. Calling `adapter.startRun()` before `bootstrapRunTx` and compensating with `adapter.cancelRun()` on failure is the correct solution to the two-phase write gap. The reasoning is sound, the invariant is enforced in code, and the compensation path exists.
- **ADR-0008 idempotency key derivation** is well-specified. The SHA-256 formula is documented, golden vectors exist, and the exclusion of `tenantId` from the preimage is correctly justified (tenant is a routing concern, not an execution identity). This is one of the best-specified decisions in the system.
- **ADR-0015 getRunStatus/enrichRunStatus split** is correct. Decoupling read availability from provider health is not optional at scale — it's required. The implementation follows through.
- **ADR-0012 plan integrity ownership** is a clean boundary. The engine not touching plan bytes is the right architectural separation. It keeps the engine testable without real plan content and prevents the engine from becoming coupled to storage backends.
- **RunEvents envelope design (v2.0.1)** is well-formed. The `emittedAt`/`persistedAt` split, monotonic `runSeq`, and `(runId, idempotencyKey)` uniqueness constraint are correctly specified.
- **Error hierarchy** (`DvtError`, domain-specific subtypes, stable error codes) is production-grade. Error codes as constants rather than message strings is the right call.

### What is fragile

- The **"UI does not execute / engine does not decide / planner does not persist"** principle is only **two-thirds enforced**.
- The **planner package** (`packages/@dvt/planner/src/`) has `contracts/`, `domain/`, `runtime/` directories with **zero visible specification or implementation** in any reviewed file. The entire top layer of the system — the component that consumes dbt artifacts, builds the DAG, generates `ExecutionPlan`, assigns costs, and manages partial execution — is **unspecified**. You have a detailed engine with no specified fuel supply. This is not a detail; it is the most architecturally complex layer and it is absent.
- **IRunStateStore exists in three places with different interfaces:**
  - `packages/@dvt/engine/src/state/IRunStateStore.ts`: `bootstrapRunTx`, `appendAndEnqueueTx`, `listEvents`, `listRuns`, `getSnapshot`
  - `packages/@dvt/contracts/src/types/state-store.ts`: `appendEvent`, `fetchEvents`, `getSnapshot`, `projectSnapshot`
  - `packages/@dvt/contracts/src/contracts/engine/IRunStateStore.v1.ts`: third variant  
    These are not the same interface. They have different method names, different parameter types, and different semantics. The engine uses the internal one. The contracts package exposes a different one. Any consumer that imports from `@dvt/contracts` sees a different contract than what the engine actually implements. This is a correctness split, not a style issue.
- `executionPlan.ts` lives in the **engine** package but the engine never uses it at runtime. The adapter fetches and validates the plan. The engine only passes `PlanRef`. Yet `ExecutionPlan` is defined under `packages/@dvt/engine/src/contracts/`. This is an ownership signal that is already wrong. The execution plan schema belongs to the planner or a shared contracts package, not the engine that never reads it.
- **Type duplication** between `packages/@dvt/contracts/src/types/contracts.ts` and `packages/@dvt/engine/src/contracts/types.ts`. Both define `RunStatus`, `RunSubstatus`, `Provider`, `PlanRef`, `RunContext`, `EngineRunRef`, `SignalRequest`, `SignalType`. The `adapter-temporal`'s `engine-types.ts` re-exports from `@dvt/contracts`. The engine itself has its own local copy. If these diverge by one field, you have a runtime type mismatch with no compile-time error because both are plain TypeScript interfaces, not Zod schemas at the boundary.
- The **branded primitives are decorative**. `TenantId`, `RunId`, `StepId` are defined as branded types in contracts. In `WorkflowEngine.ts`, all method signatures use `string`. In `RunMetadata`, all fields are `string`. The brands are never asserted. This means the entire type safety argument for "tenant-scoped queries" is not compile-time enforced anywhere in the implementation.

### What is missing

- **No specification of the gateway DSL evaluator.** `ExecutionPlan.steps` supports `gateway: { dslVersion: '1.0', expression: string }`. `RunPlanWorkflow.ts` evaluates this expression inside the Temporal deterministic sandbox. What evaluator? How is it sandboxed against plan content that could be attacker-controlled? How is it verified as deterministic? "Pure functions, no Node.js APIs" is an assertion about `@dvt/plan-interpreter`, not a specification. The security and determinism properties of the expression evaluator are undocumented.
- **No rollback or plan versioning migration specification.** Plan `contractVersion` is validated by the engine, and new versions require a code change. There is no version compatibility matrix, no automatic version negotiation, and no migration tooling. The 4-phase migration strategy described in the Blueprint has no executable artifacts.
- **No concurrency model.** Multiple engine instances can call `bootstrapRunTx` concurrently for the same `runId`. The uniqueness constraint exists in the state store, but the engine's behavior when `RUN_ALREADY_EXISTS` is returned from a race is a pass-through error. There is no idempotent `startRun` from the caller's perspective — a duplicate call returns an error rather than the existing `EngineRunRef`.
- **No `getDeadLettered()` on `IOutboxStorage`.** Dead letters are written but never queryable. Operational recovery from dead-lettered events has no defined path.

---

## 2. Architectural Risk Map

| Risk                                                            | Severity |                    Likelihood | Why                                                                                                                                                                     | Mitigation                                                                             |
| --------------------------------------------------------------- | -------: | ----------------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| IRunStateStore interface split causes consumer mismatch         |     High |                          High | Three versions of the same interface in the codebase, different method names and semantics                                                                              | Delete two, pick one, enforce through the contracts package                            |
| Planner layer absent → engine is a shell                        | Critical | Certain (it's already absent) | Zero specification for DAG building, partial execution, cost estimation                                                                                                 | Treat planner as P0 work for Phase 1                                                   |
| Gateway DSL expression execution in Temporal workflow           |     High |                        Medium | Expression evaluation in deterministic sandbox — any non-deterministic call or external dependency breaks replay                                                        | Formalize the DSL evaluator; add determinism gate for plan files containing gateways   |
| gatewayDecisions lost on continueAsNew                          |     High |                        Medium | Gateway decisions from layer N used to filter steps in layer N+1 are not serialized into the continueAsNew input                                                        | Add `gatewayDecisions` to `RunPlanWorkflowInput`; pass forward explicitly              |
| Pause latency SLA breach on large parallel layers               |   Medium |                          High | `state.paused = true` is only checked between layers, not within `Promise.all`                                                                                          | Implement per-step cancellation tokens or insert pause checkpoints within large layers |
| listRuns without required tenantId returns multi-tenant data    |     High |                        Medium | The parameter is optional (`tenantId?: string`) — a caller that omits it gets all tenants' data                                                                         | Make tenantId required on all list operations                                          |
| Type drift between @dvt/contracts and engine-local types        |   Medium |                          High | Two parallel type hierarchies; no shared Zod schema validation at boundaries; silent drift                                                                              | Eliminate engine-local type duplicates; single source of truth in `@dvt/contracts`     |
| Conductor parity is an anchor decision with zero implementation |   Medium |                          High | Anchor Decision A is normative but `ConductorAdapter.spec` is DRAFT; no POC exists; Temporal-specific concepts (`continueAsNew`, signals) have no Conductor equivalents | Start Conductor POC in Phase 1 as claimed; do not allow it to slip to Phase 2 start    |
| Event schema migration path is paper-only                       |   Medium |                        Medium | v1.x exists as DRAFT; v2.0.1 is ACTIVE; no migration tooling, no Zod discriminated unions                                                                               | Implement schema migration before any v1 event data exists in production               |
| detectStuckRuns emits bulk events without backpressure          |   Medium |                          High | `limit?` is optional; uncontrolled caller can emit O(N) RunFailed events in one call; state store receives unbounded batch                                              | Enforce maximum batch size; require `limit` parameter                                  |
| Audit log compliance claim is unsubstantiated                   |     High |                       Certain | 7-year retention, SOC2/HIPAA/GDPR compliance are documented requirements with zero implementation artifacts (no schema, no WORM storage, no backup policy)              | Remove compliance claims from ACTIVE contracts until implementation exists             |
| logicalAttemptId hardcoded to 1 in Phase 1                      |      Low |                           Low | Phase 1 limitation is explicitly documented; idempotency keys work; only risk is if Phase 2 retry logic is built without incrementing it                                | Acceptable for Phase 1; build Phase 2 retry with atomic counter                        |
| Outbox worker unspecified                                       |   Medium |                          High | `IOutboxStorage` exists; `IEventBus` exists; no background worker spec, no retry schedule, no dead letter recovery path                                                 | Specify outbox delivery worker before any production deployment                        |
| Plugin sandbox unspecified at implementation level              |     High |                        Medium | `PluginSandbox.v1.md` is DRAFT; no runtime isolation mechanism documented; vm2 is deprecated; worker_threads sandboxing is not specified                                | Define sandbox mechanism before Phase 3                                                |
| StateStore projector rebuild SLA of 10 min for 100K events      |   Medium |                        Medium | This requires ~167 events/second projection throughput. With PostgreSQL row reads, network, and projection logic this is achievable but fragile under concurrent load   | Load test before Phase 1.5 gate                                                        |

---

## 3. Engine Abstraction Critique

### Is IWorkflowEngine minimal and correct?

The interface is small: `startRun`, `cancelRun`, `getRunStatus`, `enrichRunStatus`, `signal`, `detectStuckRuns`. This is correct in scope. The problem is not the interface — it is the boundary enforcement.

`detectStuckRuns` does not belong on `IWorkflowEngine`. It is a maintenance operation, not a lifecycle operation. The interface conflates the run-level API (consumer-facing) with operational maintenance. This bleeds through to the implementation — `WorkflowEngine.ts` has direct access to `listRuns` and emits `RunFailed` events as a scheduler side-effect. A consumer calling `getRunStatus` on a run should never race with a background `detectStuckRuns` emitting `RunFailed` for the same run. There is no lock or exclusive access semantic here.

### Is the Temporal-first strategy wise?

Yes. Temporal's deterministic replay, durable execution, and `continueAsNew` for long-running workflows are the right primitives for orchestrating dbt DAGs with hundreds of nodes. The decision to build the full engine semantics on Temporal first before abstracting is the correct sequencing. Building against two adapters simultaneously would have produced a lowest-common-denominator abstraction.

### Is Conductor parity realistic?

Not as specified. Anchor Decision A guarantees "same allowed state transitions and final snapshot" across adapters. This is achievable because it's defined at the StateStore level — final event log determines state, not workflow execution semantics. That is a correct and defensible position.

What is **NOT** achievable is the implicit claim in ADR-0003 that adapters are "substitutable." They are substitutable at the domain state level. They are not substitutable at the execution level:

- Temporal's deterministic replay is structural. Conductor has no equivalent — activity results in Conductor are not replayed from history; the worker polls and executes again.
- `continueAsNew` is Temporal-specific. In Conductor, long-running workflows use a different model (sub-workflows, conditional terminators).
- Pause/resume in Temporal is implemented via in-workflow signal handlers blocking `condition()`. In Conductor it would require external state checks on each task pickup.
- The current `RunPlanWorkflow.ts` is 446 lines of Temporal-specific workflow code. The equivalent Conductor workflow is not a translation; it requires a fundamentally different execution model.

The claim should be reworded: adapters are **state-equivalent**, not execution-equivalent. The current ADR language overpromises.

### Is the event model robust?

The event model is well-specified. The concern is correctness of the SnapshotProjector. The `WorkflowSnapshot.steps` record tracks per-step state, but the projection logic must be correct across:

- Multiple `StepStarted` events for the same `stepId` (retries in Phase 2)
- Deduplication via `(runId, idempotencyKey)` — deduplicated events are never seen by the projector, so retry detection requires tracking `logicalAttemptId` per step, not just presence of `StepStarted`
- The cancelling flag (`true` between `RunCancelRequested` and `RunCancelled`) has no persistence guarantee — if the projector is rebuilt from events, and `RunCancelled` was never emitted (stuck cancellation), the snapshot shows `cancelling: true` indefinitely with no escalation path

---

## 4. Execution Planning Layer Analysis

This section is largely a gap analysis, because the planner package is unspecified.

### DAG analysis based on dbt artifacts

The system references "dbt artifacts as canonical graph source" and LogicalGraph/GCM schema (v0.1, DRAFT). There is no visible implementation of:

- Parsing `manifest.json` from dbt
- Building a dependency graph from `nodes.depends_on.nodes`
- Detecting cycles or unreachable nodes
- Handling partial graphs (model subsets, `--select` semantics equivalent)
- Mapping dbt node metadata to `ExecutionPlan.steps[].stepId`

The `planId`, `planVersion`, and `inputHashSha256` fields in `ExecutionPlan.metadata` indicate the planner is expected to version its output. But there is no planner-to-engine compatibility matrix. If a planner at version 2.0 produces a plan with `contractVersion: "2.0.0"` and the engine only knows `"1.0.0"`, the run fails. Who triggers a planner upgrade? Who validates compatibility before a run?

### Partial execution guarantees

The `RunPlanWorkflow` resumes from `resumeFromLayerIndex` on `continueAsNew`. This means partial execution is bounded by layer granularity, not step granularity. A layer with 50 parallel steps either executes completely or retries from the start of that layer (minus already-persisted step events). This is acceptable if layers are small. For a dbt DAG with large fan-out, a single layer could have dozens of parallel models. The granularity of partial execution re-entry is too coarse.

### Retry/backoff policy ownership

Completely unspecified. The engine has `RETRY_STEP`/`RETRY_RUN` signals in the interface but they are Phase 2. Who defines max retries? Who defines backoff? Is it in the `ExecutionPlan` (planner-authored), the adapter (runtime-specific), or the engine (domain policy)? This decision has downstream consequences for idempotency key structure (`logicalAttemptId` must increment per retry, so the retry trigger must be authoritative over `logicalAttemptId`). The answer implied by ADR-0016 is "planner increments on retry" but the planner cannot increment `logicalAttemptId` because it does not observe the current state of a running workflow — that is the engine's responsibility. This is a conceptual inconsistency.

### Cost estimator realism

The Phase 3 roadmap targets $0.01/run cost attribution and a "chargeback dashboard." The engine has zero hooks for cost capture. There is no mechanism to record:

- Snowflake warehouse credits consumed per step
- Execution duration per step (only `startedAt`/`completedAt` timestamps, no credit cost)
- Credits vs execution time mapping (varies by warehouse size, query complexity)

Snowflake credit cost cannot be derived from execution time alone — it requires the Snowflake query metadata API (`QUERY_HISTORY`) with `credits_used_compute`. This requires an integration that is completely absent. Cost attribution at the accuracy level implied by the roadmap requires per-step Snowflake query tagging (`QUERY_TAG` session parameter set before each dbt step) and post-execution credit aggregation. None of this is in scope or specified.

### Plan versioning strategy

`contractVersion` in `ExecutionPlan.metadata` is validated by the engine. Supported versions are `["1.0.0"]` (hardcoded). When `contractVersion: "1.1.0"` plans need to be supported, this requires a code change to the engine. There is no version negotiation, no backward-compatibility shim, and no migration tooling. The `VERSIONING.md` document is referenced in the architecture index but was not found in the reviewed content.

---

## 5. State & Metadata Layer Review

### Is PostgreSQL sufficient?

For the declared Phase 1–2 load (50K runs/day, 500 tenants), PostgreSQL is sufficient. For Phase 3 (500K runs/day, 500 tenants, 1000+ node dbt projects), the critical path is:

- `bootstrapRunTx` write: single atomic transaction, no contention issue
- `appendAndEnqueueTx` write: single atomic transaction per event batch, no contention issue per run
- `getSnapshot` read: index lookup by `runId`, O(1), fine
- `listRuns` read: tenant-scoped scan, fine with `tenantId + createdAt` composite index
- `listEvents` read: only used on rebuild path (snapshot unavailable), not hot path

The concern is the `run_events` table. At 500K runs/day with 1000 steps each, that is 500M events/day. With 90-day retention, that is 45B rows in the hot store. This is not manageable in a single PostgreSQL table without aggressive partitioning by (`tenantId`, `runId`) or `createdAt`. The roadmap references "Postgres partitioning" in the lore document but there is no partitioning schema defined. At this scale, a cold archival path (S3 + Parquet + Athena) is necessary, and the trigger for archival is not just age — it must also handle tenant deletion (GDPR right to erasure) and run retention policy.

### Is Snowflake for analytics appropriate?

Appropriate in principle. Snowflake's separation of compute and storage, automatic clustering, and SQL interface suit the read patterns for cost dashboards and historical analysis. The concern is latency: Snowflake query cold start is 2–5 seconds for a suspended warehouse. For a "live" run status dashboard, this is unacceptable. The CQRS model correctly separates this — read models from projectors write to a fast read store (PostgreSQL or Redis), Snowflake is for analytics queries only. This needs to be explicitly enforced. If any UI polling path hits Snowflake, it will have intolerable latency.

### Is lineage snapshotting scalable?

Not specified. "Lineage snapshotting" appears in high-level architecture descriptions but has no concrete data model. dbt lineage graphs for large projects (1000+ nodes) produce `manifest.json` files of 10–50 MB. Storing raw lineage per run at 500K runs/day is 5–25 TB/day of lineage data before compression. This requires a separate strategy (reference to immutable plan artifact + delta, not full snapshot per run).

### Is artifact immutability realistic?

`PlanRef.sha256` enforces content addressing. The `uri` in `PlanRef` is validated against an allowlist. This is correct and realistic. The artifact store (wherever `uri` points) must be WORM or content-addressed (S3 versioned bucket or an artifact registry). This is not specified. If the URI resolves to a mutable location (e.g., `latest` tag in a registry), the SHA-256 check prevents execution with wrong content, but the URI is still misleading.

### Write amplification risk

`bootstrapRunTx` atomically writes to three tables: `run_metadata`, `run_events`, `outbox`. Every event append also writes to outbox. Every outbox delivery marks delivered. This is three writes per event at minimum. With `appendAndEnqueueTx` used for step events from the Temporal adapter, a 1000-step run generates ~3000 atomic writes just for the run. At 500K runs/day, that is 1.5B writes/day minimum. This is the real throughput constraint on PostgreSQL, not read performance.

---

## 6. Plugin System Evaluation

`PluginSandbox.v1.md` is DRAFT. This section is largely a gap analysis with risk assessment.

### Isolation strategy

The document `PluginSandbox.v1.md` is listed as a DRAFT contract. No implementation artifacts exist in the reviewed codebase. The lore document references "vm2 / workers / process boundary" but:

- **vm2 is deprecated and has known sandbox escapes. It must not be used.**
- Node.js `worker_threads` with `--experimental-vm-modules` provides isolation from the main thread but shares the same process address space. A plugin with a native module can escape.
- A separate process boundary (child process or container) is the only production-viable isolation for untrusted plugin code.

The Phase 3 plugin marketplace implies plugins from third parties executing inside the DVT+ runtime. If those plugins execute in the same process as the engine or the Temporal worker, a buggy or malicious plugin can:

- Crash the worker process (affecting all running workflows on that worker)
- Access environment variables (credentials, Temporal namespace tokens)
- Make arbitrary network calls (data exfiltration, command and control)

This is the highest-severity risk in the entire system that has a Phase 3 timeline. Sandboxing strategy must be decided before any plugin concept is marketed to customers.

### Can plugins compromise deterministic execution?

Yes, if they run inside Temporal workflow code. Any non-deterministic function call (network, clock, random) inside a Temporal workflow breaks replay. If a plugin hook is invoked from workflow context, one non-deterministic call in a plugin corrupts the entire run history.

The system must enforce that plugin hooks only execute from activity context (outside the deterministic sandbox), never from workflow context. This constraint is not documented.

### Capability-based security

The `requiresCapabilities` field on `PlanRef` and the `capabilities.schema.json` registry is a start. But capability validation at run start does not prevent a plugin from bypassing declared capabilities at runtime. Capabilities must be enforced at the API level of the sandbox, not declared at plan submission time.

---

## 7. What Is Overbuilt?

### Neo4j knowledge graph (ADR-0002)

ADR-0002 mandates a Neo4j graph database as a "queryable source of truth for architecture" with Cypher generation from repo metadata and CI sync gates. This is not a product feature — it is a documentation tooling choice. The investment in maintaining a graph database for architecture navigation is disproportionate to the benefit at the current team size (5 engineers in Phase 1). A well-structured monorepo with ADR headers and consistent naming is sufficient. Neo4j adds operational complexity (local Community Edition, AuraDB, Cypher generation scripts, CI gates) for a benefit that can be achieved with grep and good documentation. Delay this entirely.

### Normative traceability enforcement (ADR-0000)

Every governed file requires `@file`, `@baseline`, `@decision`, `@consequence` headers. CI fails if an accepted ADR has zero implementations. The intent is correct; the execution is over-specified. Header parsing scripts, Neo4j integration, manifest generation, and ADR coverage checking is a significant tooling surface to maintain. The actual goal (ensure code reflects architectural decisions) can be achieved with PR review checklists and a simpler linting rule. The current system creates header-maintenance overhead without proportional correctness benefit.

### Roadmap staffing numbers

The roadmap allocates 5 engineers + 2 SREs + 1 PM for Phase 1 at $1.5M for 8 weeks. This implies $187K/week or approximately 8 staff at $183K/year blended. These numbers appear in a planning document but have no basis in the reviewed technical artifacts. They inflate the apparent scope of what is currently a codebase with 78 tests and one operational adapter stub. Remove budget estimates from architecture documents.

### D&D narrative lore (Annex 20)

The `lore.md` document as an onboarding mechanism is non-standard and adds maintenance overhead. Technical onboarding works through runbooks, architecture decision records, and standard module templates. A narrative metaphor adds ambiguity about what is binding specification versus flavor text.

---

## 8. What Is Underbuilt?

### Planner package

The most critical missing component. Without the planner:

- There are no valid `ExecutionPlan` documents
- There is no dbt artifact parsing
- There is no DAG construction
- There is no partial execution strategy
- There is no plan versioning
- The engine has nothing to execute

The planner is not described in any normative document with implementation depth. It has `contracts/`, `domain/`, `runtime/` directories with no visible content. This is not a Phase 2 problem — it is a Phase 1 blocker.

### Contract migration tooling

v1.x specs are DRAFT, v2.0.x is ACTIVE, but there are no Zod discriminated unions across versions, no migration scripts, and no compatibility shims. When v3 contracts are needed, there is no path for v2 consumers to migrate safely. This needs to exist before any external SDK is published.

### Outbox delivery worker

`IOutboxStorage` defines `enqueueTx`, `listPending`, `markDelivered`, `markFailed`. There is no specification or implementation of the background worker that reads pending records and delivers them. Without this, the outbox pattern is incomplete — events are queued but never delivered. The `IEventBus.publish()` interface exists but nothing calls it in the reviewed implementation.

### Distributed concurrency model for startRun

`startRun` can be called concurrently from multiple API server instances. The race condition is:

- Instance A calls `adapter.startRun()` → succeeds
- Instance B calls `adapter.startRun()` → succeeds (different `runId`, no conflict)
- Instance A calls `bootstrapRunTx` → succeeds
- Instance B calls `bootstrapRunTx` → `RUN_ALREADY_EXISTS` (should not happen with unique runIds, but it can if the caller sends the same `runId` twice)

For the same `runId`, the system relies on `RUN_ALREADY_EXISTS` from the state store. But both instances will have called `adapter.startRun()` before that failure is known. This means two Temporal workflows are now running for the same `runId`. The compensation logic only calls `adapter.cancelRun()` for the instance that fails `bootstrapRunTx`, but the first instance's workflow is now orphaned if its `bootstrapRunTx` also fails for a different reason. This race is narrow but not zero.

### Run retention policy

The roadmap mentions 90-day hot, 7-year cold. But:

- Who triggers archival? (Cron job, mentioned but not specified)
- What is the archival unit? (Per-run event log? Per-tenant?)
- What happens when a tenant is deleted? (GDPR erasure requires event deletion, which conflicts with append-only semantics)
- What happens to in-progress runs when hot retention expires? (They must never expire before terminal state)

None of these questions have answers in the reviewed documents.

### SLA definitions that bind the engine

The roadmap defines target SLAs (control-plane p99 < 300ms, state update p99 < 10ms). But there are no SLA assertions in the engine code, no SLO breaker behavior, and no documented degradation mode. The SLA document is in the architecture index (`SLOs.md`) but was not found in reviewed content.

### Backpressure for large tenant bursts

A tenant submitting 10K runs simultaneously will saturate the state store. The `IOutboxRateLimiter` interface exists but is optional (`outboxRateLimiter?: IOutboxRateLimiter`) in `WorkflowEngineDeps`. Per-tenant startRun rate limiting is not enforced. The outbox rate limiter only applies to outbox operations, not to plan submission itself.

### Error recovery for RunCancelled never arriving

ADR-0007 specifies that if `RunCancelRequested` is sent but `RunCancelled` never arrives within SLA, emit an "operational alert." But:

- What detects this condition? (No background job is specified)
- What triggers the alert? (No alerting hook exists in the reviewed code)
- What is the recovery path? (Manual intervention? Force-transition to CANCELLED?)

The `detectStuckRuns` method handles PENDING timeout but there is no equivalent for stuck CANCELLING state.

---

## 9. Scalability Outlook — 3-Year Horizon

Assumption: 1000+ tenants, thousands of concurrent runs, 1000+ node dbt projects, cross-environment diffs, heavy cost dashboards.

### State store bottleneck

The `run_events` table is the primary bottleneck. At 500K runs/day with 1000 steps average:

- 500M events/day
- ~18TB/year at 100 bytes/event average (compressed) in PostgreSQL
- 90-day hot tier: ~4.5TB

Connection pool exhaustion: at 50 connections (Anchor Decision B constraint), peak throughput is ~500 TPS assuming 100ms average transaction time. For 500K runs/day at uniform distribution that is 5.7 TPS steady state. Peak bursts (start of business hours, scheduled triggers) easily exceed 10x. The 50-connection limit is too low for production at this scale.

### Single PostgreSQL node

There is no read replica strategy specified. The cold archival to S3/Athena handles analytics queries, but operational read queries (dashboard, run list) all hit the primary. At 1000 tenants, dashboard polling alone can saturate read capacity.

### Planner computation

A 1000-node dbt `manifest.json` is 10–50 MB of JSON. Parsing and DAG analysis for 10K runs/day means potentially parsing the same manifest thousands of times. The system needs a plan caching layer — if the same `planId`/`planVersion` is submitted repeatedly, the planner should not re-analyze the manifest. The `PlanRef.sha256` content-addresses the plan, which enables caching, but no cache layer is specified.

### Temporal worker scaling

Temporal scales horizontally by adding workers to a task queue. Each worker picks up activities and executes them. For 1000-node plans executing in parallel layers, a single layer can dispatch 100+ activities simultaneously. Worker saturation is a real concern. The task queue is per-namespace and the scaling model (number of workers, activity semaphore limits) is not documented.

### Cross-environment diffs

Cross-environment run comparison (comparing production run state to development run state) requires joining across tenant/environment dimensions in the read model. This query pattern is not in the current state store contract. If this becomes a product feature, it requires either a shared read model across environments or a federation query layer. The current architecture has no provision for this.

### Cost dashboard query performance

Snowflake queries on aggregated run+step data at 500M events/day will require aggressive materialized views or pre-aggregation. Snowflake handles this well with clustering on (`tenantId`, `runId`, `executedAt`) and micro-partition pruning. The concern is that the cost data (Snowflake credits per step) does not exist in the event stream — it must be populated from an external source (Snowflake query history API). There is no specified integration.

### Gateway DSL at scale

If 1000-node plans routinely contain gateway steps with complex expressions, the DSL evaluator runs inside Temporal workflows. A slow or expensive expression evaluation blocks that workflow thread. There is no timeout enforcement on the gateway evaluator in the reviewed workflow code.

---

## 10. Architectural Scorecard

| Dimension                 | Score | Justification                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------- | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conceptual clarity        |  7/10 | The core separation (Planner/Engine/Adapter/StateStore) is clearly articulated and enforced in the engine. The ADR chain gives good reasoning for each decision. Deducted: IRunStateStore fragmentation, type duplication, and planner layer absence undermine the conceptual model in practice.                                                                                                                                             |
| Separation of concerns    |  6/10 | Engine/Adapter boundary is well-enforced. StateStore boundary is partially enforced. Planner boundary is undefined. `detectStuckRuns` on `IWorkflowEngine` is a separation violation. Outbox delivery belongs to infrastructure, not the engine constructor dependencies.                                                                                                                                                                    |
| Replaceability of engine  |  7/10 | `IWorkflowEngine` is minimal; contracts are versioned. The Temporal adapter is the only real implementation. Conductor is a paper claim. Until there are two working adapters, replaceability is theoretical.                                                                                                                                                                                                                                |
| Determinism               |  8/10 | The Temporal workflow is correctly structured (no `Date.now()`, no random, no env vars). Idempotency keys are well-specified with golden vectors. Deducted: gateway DSL evaluator is unverified for determinism; `gatewayDecisions` loss on `continueAsNew` is a correctness gap.                                                                                                                                                            |
| Extensibility             |  5/10 | The adapter pattern enables engine extensibility. But signal types are hardcoded in `SignalType`, plan schema versions are hardcoded in the engine, and the plugin system is entirely unspecified. Adding a new signal type requires engine code changes.                                                                                                                                                                                    |
| Operational realism       |  4/10 | SLOs are defined in documents but not enforced in code. Audit log compliance is claimed but unimplemented. Outbox delivery worker is unspecified. Run retention has no implementation. The system cannot be put into production in its current state without significant operational infrastructure that does not exist.                                                                                                                     |
| Long-term maintainability |  6/10 | ADR governance is genuinely useful. Contract versioning is in place. The error hierarchy is clean. Deducted: three copies of `IRunStateStore`, two copies of core types, no schema migration tooling, documentation-heavy architecture with thin implementation in the planning layer. The normative traceability overhead (Neo4j, ADR headers, CI gates) adds maintenance burden without proportional correctness benefit at current scale. |

---

## 11. Strategic Recommendations

### 3 structural changes

1. **Consolidate `IRunStateStore` to a single interface in `@dvt/contracts`.**  
   Delete `packages/@dvt/contracts/src/types/state-store.ts`, `packages/@dvt/contracts/src/contracts/engine/IRunStateStore.v1.ts`, and make `packages/@dvt/engine/src/state/IRunStateStore.ts` the single source. Export it from `@dvt/contracts` as the canonical interface. Any method that exists in one version but not another must be reconciled now, before production data requires backward compatibility.

2. **Specify the planner layer before declaring Phase 1 complete.**  
   The planner is not a Phase 2 concern — it is the component that generates the `ExecutionPlan` that the engine executes. Without a working planner that produces valid plans from dbt artifacts, the engine has no real inputs. Write the planner specification with the same rigor applied to the engine: a normative contract (`IPlanner`), an execution plan generation algorithm, a dbt manifest parsing specification, and golden test fixtures with real `manifest.json` inputs.

3. **Serialize `gatewayDecisions` into `continueAsNew` input.**  
   `RunPlanWorkflow` loses all gateway decisions on `continueAsNew`. A gateway at layer 3 whose decision affects step execution at layer 40 will produce incorrect behavior after a `continueAsNew` at layer 20. Modify `RunPlanWorkflowInput` to include `gatewayDecisions?: Record<string, boolean>` and pass the accumulated map forward in every `continueAsNew` call.

### 3 clarifications needed

1. **What is `logicalAttemptId` semantics in Phase 2?**  
   ADR-0016 says "planner increments on retry" but the planner does not observe in-flight run state. The engine does. Who is the authority for incrementing `logicalAttemptId`, and what is the trigger? This must be resolved before any retry implementation begins, because the idempotency key formula depends on it.

2. **What does "adapter substitutability" mean precisely?**  
   ADR-0003 and Anchor Decision A must be reworded. Temporal and Conductor will produce the same final event log (same state transitions, same snapshot) but will NOT produce the same execution trace. The current language implies behavioral equivalence. It should say: "Given the same `ExecutionPlan` and the same step execution results, the StateStore event log will be semantically equivalent regardless of adapter." Add the explicit caveat that execution semantics (replay, signal handling, history limits) are adapter-specific.

3. **What is the gateway DSL specification?**  
   Define: the grammar of expression, the evaluator library, the sandboxing guarantees, the determinism proof, the security constraints on expression content, and the error behavior when an expression fails to evaluate. This is not optional documentation — it affects Temporal workflow correctness, plan security, and the determinism CI gate.

### 3 things to freeze immediately

1. **Freeze the idempotency key formula (ADR-0008).**  
   The SHA-256 preimage formula is specified, has golden vectors, and is implemented. Any change to this formula requires re-deriving all existing idempotency keys in production data. Do not change it. The golden test vectors are the protection.

2. **Freeze the `bootstrapRunTx` atomicity contract (ADR-0013).**  
   The atomic write (metadata + first events + outbox) is the correct solution to the two-phase write gap. Any relaxation of this (e.g., "metadata can be written separately for performance") reintroduces the race condition the ADR was written to prevent. Do not relax it.

3. **Freeze the `adapter.startRun()` before `bootstrapRunTx` ordering (ADR-0014).**  
   This is the compensation pattern's foundation. Reversing this order means you cannot detect an orphaned adapter workflow. The compensation logic (`cancelRun()` on `bootstrapRunTx` failure) only works because the adapter call happened first and we have the `EngineRunRef` to cancel.

### 3 things to delay

1. **Delay Neo4j knowledge graph (ADR-0002) until post-Phase 2.**  
   The operational cost of maintaining a graph database for architecture navigation is not proportionate to the benefit at current team size. A static ADR registry with good cross-references achieves 90% of the value. Revisit when the team exceeds 20 engineers and cross-cutting impact analysis becomes genuinely difficult.

2. **Delay the cost attribution system (Phase 3) until Snowflake query tagging is proven.**  
   Do not build the cost attribution UI until a prototype demonstrates that per-step Snowflake credits can be reliably extracted from `QUERY_HISTORY`. This requires the `QUERY_TAG` session parameter to be set by the dbt adapter before each step, and credits aggregated post-execution. Until this prototype exists, the Phase 3 cost features are speculative.

3. **Delay the plugin marketplace until a sandbox with provable isolation properties is defined.**  
   The current sandbox specification is `PluginSandbox.v1.md` (DRAFT). Phase 3 targets a plugin marketplace with third-party code. Do not expose a plugin API to external developers until the isolation mechanism (separate process, restricted syscalls, network egress control) is specified, implemented, and red-teamed. Building the marketplace before the sandbox is a security liability, not just a technical debt.
