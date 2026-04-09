---
title: 'DVT+ Architectural Review — Pass 2'
status: Historical
owner: docs
last_reviewed: 2026-03-04
planning_type: review
---

# DVT+ Architectural Review — Pass 2

**Date:** 2026-03-02 (same session)  
**Delta from Pass 1:** ADR-0020 and ADR-0021 now exist. The architectural direction on lineage output is settled. This review evaluates whether those decisions introduce new risks and where the existing findings still stand.

---

## 1. Conceptual Soundness — Update

### What has improved

- The “replace the core with Marquez” position is now formally rejected in **ADR-0020** with architectural justification.
- **INV-OL-003** (“Planner MUST NOT read from any OL store as input to plan generation”) closes the most dangerous drift vector identified in `marquezopen.txt`. This is the correct decision, documented with the correct rationale.
- The **outbox_lineage** separation (**ADR-0021 §7**) is sound. Isolating OL delivery failure from domain event delivery is the right blast-radius decision. This resolves a risk that would have existed if OL emission were bundled with the domain outbox.

### What is still fragile (unchanged from Pass 1)

- `enrichRunStatus` not on `IWorkflowEngine` interface — **unresolved**.
- `CONTINUE_AS_NEW` in `RunSubstatus` — **unresolved**.
- `logicalAttemptId` Phase 2 has no `RunContext` field — **unresolved**.
- `stepTypeConfig: Record<string, unknown>` — **unresolved**.

### New fragility introduced by ADR-0020 / ADR-0021

#### 1) `compiledCodeRef` sequencing is wrong

**ADR-0021** specifies `dvt_dbt_details.compiledCodeRef` is a URI to the compiled SQL of the step. But:

- `compiled_code` is only available in `run_results.json` — it does **not** exist in `manifest.json`.
- `IPlanContextResolver` reads from `ExecutionPlan` (derived from `manifest.json`).
- Therefore, at **StepStarted** emission time, `compiledCodeRef` **cannot** be populated.

**Options (both valid, but must be specified):**

1. `compiledCodeRef` is only set at **StepCompleted** emission → StepStarted OL event is incomplete by design.
2. The Planner stores compiled SQL in a separate artifact blob during plan compilation, referenced in `ExecutionPlan.steps[].stepTypeConfig`.

**Issue:** ADR emits `dvt_dbt_details` on StepStarted and has a sequencing error it does not acknowledge.

#### 2) `dvt_cost` bypasses the outbox

**ADR-0021 §4** states: “the cost attributor reads from `IRunStateStore` and writes to `ILineageBackend` directly, bypassing the outbox.”

Implications:

- Cost events have **zero delivery guarantee**.
- If Marquez is unavailable when the cost attributor runs (~45 minutes post-execution), the cost event is silently lost.
- “Best-effort” is used without defining retry policy, DLQ policy, or retention window for undelivered cost events.

**Problem statement:** “Best-effort” with no retry definition and no DLQ is fire-and-forget with no observability.

#### 3) `StepSkipped → OL OTHER` produces ambiguous lineage graphs

Marquez renders **OTHER** but does not distinguish skip reasons. A partially executed run (e.g., 500 of 1000 nodes executed; rest skipped due to upstream failure) produces:

- 500 **COMPLETE** events
- 500 **OTHER** events

Without UI customization to understand `dvt_skip_reason`, the lineage graph is misleading — it looks like unclassified termination, not intentional skipping.

#### 4) `RunPaused / RunResumed` creates a temporal gap in OL lineage

A run paused for approval hours leaves START events with no COMPLETE in Marquez. Any OL consumer with a stuck-run detector will false-positive on paused runs.

**Mitigation direction:** Consider a `dvt_pause_state` facet on periodic OTHER heartbeat events (“still paused”), or explicitly signal paused state via an OL extension.

---

## 2. Architectural Risk Map — Updated

New risks added; previous risks from Pass 1 unchanged.

| Risk                                                       |   Severity | Likelihood | Why                                                                                                                          | Mitigation                                                                                                                                                                                 |
| ---------------------------------------------------------- | ---------: | ---------: | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `compiledCodeRef` unavailable at StepStarted emission time |       High |    Certain | `compiled_code` is in `run_results.json`, not `manifest.json`. `IPlanContextResolver` reads the plan, not execution results. | Define ownership: Planner writes compiled SQL to blob store during plan compilation and references it in `ExecutionPlan.steps`; **OR** move `compiledCodeRef` to StepCompleted-only facet. |
| `dvt_cost` fire-and-forget with no retry                   |       High |       High | Cost attributor bypasses outbox; no DLQ. Marquez downtime = silent cost data loss.                                           | Route cost events through `outbox_lineage` table, not direct to `ILineageBackend`. Cost events are delayed anyway (~45 min lag).                                                           |
| `outbox_lineage` worker unspecified                        |       High |    Certain | ADR-0021 creates second outbox table but specifies no worker config: poll interval, shard count, DLQ policy, lag monitoring. | Apply ADR-0009 invariants (INV-OUTBOX-001..005) to `outbox_lineage`. Document ordering + DLQ explicitly.                                                                                   |
| `StepSkipped → OTHER` produces uninterpretable OL graphs   |     Medium |       High | Marquez does not render skip context; partially executed runs appear broken.                                                 | Consider OL ABORT for upstream-failed skips, OTHER for selector-excluded; or accept limitation and document in UI.                                                                         |
| OL spec version not pinned                                 |     Medium |       High | ADR-0021 references facet format but not target OL spec version; breaking changes risk.                                      | Pin `_schemaURL` to a specific OL spec version and add CI validation against that schema.                                                                                                  |
| Namespace URI construction not sanitized                   |     Medium |     Medium | `dvt://{tenantId}/{environmentId}` — invalid characters can produce invalid URI; OL requires valid URI.                      | Sanitize tenantId/environmentId (percent-encode or reject) at `RunContext` validation time.                                                                                                |
| `ILineageBackend` fan-out not addressed                    |     Medium |     Medium | ADR mentions Marquez and Snowflake External Lineage, but port is single interface; dual write likely required.               | Define a CompositeLineageBackend (fan-out) pattern via follow-up ADR.                                                                                                                      |
| `RunPaused/RunResumed` gap causes false OL alerts          | Low–Medium |     Medium | Consumers with SLA monitoring will flag long-open START events as stuck.                                                     | Emit periodic OTHER heartbeat with `dvt_pause_state`, or document pause semantics to operators/consumers.                                                                                  |
| `IPlanContextResolver` plan fetch latency at scale         |     Medium |       High | 1000-node run → 1000+ resolveStep() calls; without caching this is N plan fetches.                                           | Mandate cache keyed by `(planRef.sha256, stepId)`; plan is immutable so TTL can be unbounded.                                                                                              |

---

## 3. Engine Abstraction Critique — No Change

The `IWorkflowEngine` critique from Pass 1 stands unchanged:

- `enrichRunStatus` is still missing from the interface contract.
- `CONTINUE_AS_NEW` is still in `RunSubstatus`.
- The OL integration does not touch the engine contract.

**New observation:** `OpenLineageEventBus` is injected as an `IEventBus`. The current OutboxWorker calls `bus.publish(events: RunEventPersisted[])`. If `OpenLineageEventBus` is registered for `outbox_lineage`, it receives `RunEventPersisted` objects and must resolve plan context to produce OL events.

This keeps OutboxWorker stateless but makes the `IEventBus` implementation stateful/complex.

**Operational decision needed:** If plan context resolution fails, should the worker stop or mark the record failed and continue? ADR does not specify.

---

## 4. Execution Planning Layer — New Finding

**ADR-0020 §3** states: “The Planner is unchanged.” This is correct as a constraint but creates a gap:

- Planner produces `ExecutionPlan` with `stepTypeConfig: Record<string, unknown>`.
- `IPlanContextResolver` must extract inputs/outputs/dbt details from this opaque config.
- Therefore, the resolver must know the internal schema of `stepTypeConfig` (hidden coupling).

This is the same `Record<string, unknown>` issue from Pass 1, now amplified by OL integration.

**Implication:** A **StepTypeRegistry** becomes more critical: it should drive both plan validation and `IPlanContextResolver`.

---

## 5. State & Metadata Layer — New Finding

**ADR-0021** introduces `outbox_lineage`, which implies:

- Two PostgreSQL tables accumulating records per run.
- Two workers polling and delivering.
- Two DLQ strategies to monitor.
- Two sets of operational metrics (consumer lag, DLQ depth, delivery rate).

**Retention gap:** `outbox_lineage` has no defined retention policy. Once OL events are delivered to Marquez, they are redundant in PostgreSQL unless retained for audit.

`THREAT_MODEL.md` indicates “Workflow execution history: 90 days (default)” as retention. It is unclear whether this applies to `outbox_lineage`. It should, but ADR does not reference it.

---

## 6. Plugin System — No Change from Pass 1

The plugin sandbox remains the strongest specification in the codebase. OL integration does not interact with the plugin system directly.

Unresolved issue remains: plugin execution inside Temporal activities breaking replay determinism.

---

## 7. What Is Overbuilt — Updated

**ADR-0021’s `dvt_deps` facet** (package-lock SHA-256 + resolved package versions in Job facet) is premature.

- Marquez job versioning changes when Job facets change.
- If a dbt package is updated but a specific step’s SQL doesn’t change, whether a new job version should be created is debatable.
- Per-step `dvt_deps` forces job version proliferation across all jobs in the project for package updates.

**Recommendation:** Phase 1: `dvt_deps` at **run-level job facet only**, not per-step.

---

## 8. What Is Underbuilt — Updated

### No required tests

ADR-0021 defines a complex translation mapping (11 RunEvent types, 4 custom facets, namespace rules) with zero test requirements, unlike ADR-0009 which specified explicit tests.

### `outbox_lineage` worker configuration absent

ADR-0021 §7 says OL events go to outbox_lineage with an independent worker, but does not specify:

- poll interval
- shard count
- max retries before DLQ
- DLQ policy (strict stream integrity vs fail-open)
- consumer lag monitoring / alerting

**Likely correct policy:** fail-open (lineage failure MUST NOT block execution). This must be explicit.

### `compiledCodeRef` storage ownership not specified

Planner “unchanged” (ADR-0020 §3) conflicts with the implied need for Planner to store compiled SQL for StepStarted. ADR-0020 and ADR-0021 are inconsistent on this point.

---

## 9. Scalability Outlook — Updated

- **Two outbox tables at scale:** `outbox_lineage` doubles outbox-related writes/scans/index updates. Acceptable at current scale; must be monitored at production scale.
- **Plan context resolution:** Without caching, plan fetch operations scale linearly with step count. With caching keyed by `(planRef.sha256, stepId)`, this collapses to one plan fetch per unique plan plus in-memory lookups.
- **Marquez PostgreSQL at scale:** Marquez uses its own Postgres. At 1000 tenants × thousands of runs × 2000+ OL events/run, Marquez sees write volumes similar to DVT+’s event store. This is a scaling risk outside DVT+’s control and may drive a later shift to Snowflake External Lineage or other backends.

---

## 10. Architectural Scorecard — Updated

| Dimension                 | Pass 1 | Pass 2 | Change | Justification                                                                                   |
| ------------------------- | -----: | -----: | -----: | ----------------------------------------------------------------------------------------------- |
| Conceptual clarity        |   7/10 |   7/10 |      = | OL direction is correct; new gaps: `compiledCodeRef` sequencing, `dvt_cost` delivery orphaning. |
| Separation of concerns    |   7/10 |   7/10 |      = | `IPlanContextResolver` adds a dependency but remains acceptable behind contracts.               |
| Replaceability of engine  |   6/10 |   6/10 |      = | OL integration does not affect engine replaceability; coupling issues remain.                   |
| Determinism               |   6/10 |   6/10 |      = | OL emission async via outbox; Temporal replay issues in plugin-in-activity remain.              |
| Extensibility             |   7/10 | 7.5/10 |   +0.5 | Custom OL facets are a clean extension mechanism; `ILineageBackend` port is clean.              |
| Operational realism       |   4/10 | 4.5/10 |   +0.5 | outbox_lineage separation is good; still missing worker config, retention, required tests.      |
| Long-term maintainability |   6/10 |   6/10 |      = | ADR structure is good; `compiledCodeRef` error + `dvt_deps` per-step risk future churn.         |

---

## 11. Strategic Recommendations — Pass 2

### 3 structural changes

1. **Route `dvt_cost` through `outbox_lineage`, not direct to `ILineageBackend`.**  
   Cost attributor writes pending cost events to `outbox_lineage`; worker delivers. Eliminates silent loss during Marquez downtime.

2. **Fix `compiledCodeRef` ownership and timing.**  
   Choose one:
   - **(A)** Planner stores compiled SQL during plan compilation and references it in `ExecutionPlan.steps` (ADR-0020 “Planner unchanged” becomes false → must be amended).
   - **(B)** `compiledCodeRef` only appears on **StepCompleted**; adapter stores compiled SQL post-execution.

3. **Apply ADR-0009 invariants explicitly to `outbox_lineage`, with a fail-open DLQ policy.**  
   `outbox_lineage` inherits INV-OUTBOX-001..005, except DLQ policy is fail-open because lineage failures MUST NOT block subsequent OL events.

### 3 clarifications needed

1. **Pin the OpenLineage spec version.**  
   Set `_schemaURL` to a specific version. Add CI validation against the pinned schema.

2. **Define `outbox_lineage` worker operational parameters.**  
   Poll interval, retries, DLQ semantics, lag SLA, alerting.

3. **Decide scope of `dvt_deps`.**  
   Per-step vs run-level only; avoid job version proliferation.

### 3 things to freeze immediately

1. `ILineageBackend` as the single port for OL output; keep Marquez/Snowflake-specific logic outside core.
2. **INV-OL-003**: Planner MUST NOT read from OL stores.
3. Namespace convention: `dvt://{tenantId}/{environmentId}` plus input sanitization rules.

### 3 things to delay

1. Dual-write to Snowflake External Lineage (until a real enterprise requirement exists).
2. `dvt_deps` facet per step (delay until a concrete use case exists).
3. Cost dashboard UI (validate `dvt_cost` pipeline first).

---

# Prioritized DVT+ Path

> This section translates the findings from Pass 1 and Pass 2 into a build order.

## Prioritization Criteria

Each item is ranked by three questions:

1. Does it block production?
2. Does it block downstream features?
3. Does delaying it increase technical debt?

---

## Phase 0 - Production Safety

**Nothing should ship to production without this phase.**

### P0-A: Ghost-run consistency (ADR-0030)

Problem: there is a gap between `adapter.startRun()` and `bootstrapRunTx()`, which can leave Temporal workflows running without a PostgreSQL record if the process dies.

Mitigation: persist a `RunDispatchIntent` before calling the adapter. The reconciler then cancels workflows that have an intent record but no bootstrap.

### P0-B: Snapshot policy

Without snapshots, each `getRunStatus` call replays the full log in O(N).  
Set `snapshotAfterNEvents = 50` by default and implement snapshot writes inside `appendAndEnqueueTx`.

### P0-C: Run retention policy

Define TTL, archival, and delete behavior. Default to 90 days, aligned with `THREAT_MODEL`, and implement an archival or soft-delete job.

### P0-D: Operational outbox consumer

ADR-0009 defines the pattern, but the real worker configuration is still missing: poll interval, shard count, DLQ policy, and lag alerts.

---

## Phase 1 - Contract Stability

Freeze the engine contracts before integrating OpenLineage.

### P1-A: Add `enrichRunStatus` to `IWorkflowEngine`

The method exists in the implementation but not in the interface. Decide whether it belongs in the main interface or in a sub-interface.

### P1-B: Move `CONTINUE_AS_NEW` out of `RunSubstatus`

Move it into `AdapterScopedSubstatus` with the prefix `temporal:CONTINUE_AS_NEW`. `RunSubstatus` should keep domain-only values.

### P1-C: Minimal `StepTypeRegistry`

Close the `stepTypeConfig: Record<string, unknown>` gap.

Implement a `StepTypeRegistry` with two initial types, `dbt_model` and `dbt_source`, so OpenLineage and semantic validation share one source of truth.

### P1-D: Add `logicalAttemptId` to `RunContext`

Add `logicalAttemptId?: number` to `RunContext`. If it is absent, the engine uses `1`. This unlocks Phase 2 without another interface change.

---

## Phase 2 - OpenLineage Bridge

This phase depends on Phase 1.

### P2-A: Define `compiledCodeRef` ownership

Two valid options exist:

- **Option A:** the planner writes compiled SQL to a blob store during plan compilation and references it in `ExecutionPlan.steps[].stepTypeConfig`.
- **Option B:** `compiledCodeRef` appears only on `StepCompleted`, and the adapter writes the blob after execution.

### P2-B: Add caching to `IPlanContextResolver`

Cache by `(planRef.sha256, stepId)`. The plan is immutable, so the in-memory TTL can stay unbounded.

### P2-C: Build `OpenLineageEventBus` plus `outbox_lineage`

Implement `IEventBus -> OpenLineageEventBus`. Add an `outbox_lineage` table and an independent worker. The DLQ policy should be fail-open.

### P2-D: Require translation tests

Minimum CI coverage:

1. `RunStarted -> OL START` with the correct namespace
2. `StepCompleted -> OL COMPLETE` with inputs and outputs
3. `StepFailed -> OL FAIL` with `errorMessage`
4. `StepSkipped -> OL OTHER` with `dvt_skip_reason`
5. Event validation against the pinned OpenLineage JSON Schema

---

## Phase 3 - Planner Layer

This phase can start in parallel with Phase 2 if there is enough capacity.

### P3-A: Planner contract

Define `IPlanner` or `IExecutionPlanner` plus `PlannerInput` with manifest path, selectors, environment config, and target adapter.

### P3-B: DAG analyzer

Define an analyzer interface that takes `manifest.json` and returns an ordered graph plus cycle detection. The invariant is simple: the generated plan must stay acyclic.

### P3-C: Semantic plan validator

Use `StepTypeRegistry` to validate registered kinds, required fields, and `dependsOn` references to existing `stepId` values.

---

## Phase 4 - Operations At Real Load

- PostgreSQL partitioning by `(tenantId, created_at)`
- `outbox_lineage` retention and archival under the same 90-day policy
- Marquez deployment behind a proxy for tenant isolation
- `dvt_cost` post-hoc attribution from Snowflake `QUERY_HISTORY` into `outbox_lineage`
- Consumer-lag alerts for both outboxes

---

## Delay Indefinitely Until A Real Need Exists

| Item                            | Why                                                                   |
| ------------------------------- | --------------------------------------------------------------------- |
| Snowflake ETL pipeline (CDC)    | There is no write path yet; the analytics layer is still theoretical. |
| Conductor adapter               | Temporal is not production-hardened yet.                              |
| CompositeLineageBackend fan-out | No real enterprise customer needs it yet.                             |
| `dvt_deps` facet per step       | It creates Marquez job-version churn without a proven use case.       |
| Cost dashboard UI               | First validate that `dvt_cost` reaches Marquez correctly.             |

---

## Summary Order

```text
PHASE 0: Ghost-run | Snapshots | Retention | Outbox worker
  ->
PHASE 1: enrichRunStatus | CONTINUE_AS_NEW | StepTypeRegistry | logicalAttemptId
  ->
PHASE 2: compiledCodeRef ownership | IPlanContextResolver cache | outbox_lineage | OL tests
  ->
PHASE 3: IPlanner contract | DAG analyzer | Semantic plan validator
  ->
PHASE 4: PG partitioning | Marquez deploy | dvt_cost attributor
```

Operational note: Phases 0 and 1 can run in parallel across different people. Phase 2 depends on Phase 1. Phase 3 can begin in parallel with Phase 2 if there is enough capacity.

---

## Reference links

- OpenLineage: https://openlineage.io/
- Marquez: https://marquezproject.ai/
- dbt artifacts: https://docs.getdbt.com/reference/artifacts/dbt-artifacts
- Temporal: https://temporal.io/ and https://docs.temporal.io/
- Netflix Conductor / Orkes: https://conductor.netflix.com/ and https://orkes.io/
- C4 Model: https://c4model.com/
