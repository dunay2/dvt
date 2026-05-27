---
title: DVT+ Prioritized Gap Register ï¿½ March 2026
status: Active
owner: Architecture
date: 2026-03-19
source: Architectural Review 2026-03-19
---

# DVT+ Prioritized Gap Register

**Date:** 2026-03-19
**Source:** [Architectural Review 2026-03-19](./DVT+_Architectural_Review_20260319.md)
**Scope:** Gaps identified post G1ï¿½G10 closure. These are not delivery gaps in the sense of G1ï¿½G10 ï¿½ they are architectural and operational gaps that will produce correctness failures, security incidents, or operational crises if not addressed before the phases that depend on them.

Each gap is assigned a tier:

- **T0 ï¿½ Blocking:** Must be resolved before any dependent implementation begins. Proceeding without resolution produces irreversible damage (duplicate events, security incidents, data loss).
- **T1 ï¿½ Pre-Phase-2:** Must be resolved before Phase 2 begins. Proceeding without resolution creates a design crisis under delivery pressure.
- **T2 ï¿½ Pre-Phase-3:** Must be resolved before Phase 3 data or load arrives. Retroactive resolution at Phase 3 scale is an operational incident.
- **T3 ï¿½ Deferred-OK:** Can be deferred without blocking correctness or security, but has a defined trigger for re-evaluation.

---

## T0 ï¿½ Blocking Gaps

### T0-1: `logicalAttemptId` authority is undefined

**Problem:** The idempotency key formula (ADR-0008) includes `logicalAttemptId`. ADR-0016 implies the planner increments it on retry, but the planner does not observe in-flight run state ï¿½ the engine does. This is a conceptual inconsistency. If Phase 2 retry logic is built without resolving this, either:

- The planner sends a new plan with `logicalAttemptId=2` and the engine treats it as a distinct run (wrong ï¿½ it is a retry of the same business run).
- The engine increments `logicalAttemptId` without updating the plan (wrong ï¿½ idempotency keys derived from plan fields become incorrect).

**Impact:** Duplicate events, orphaned attempts, corrupted audit log, silent idempotency key collision.

**Resolution approach:**

1. Write ADR with single unambiguous decision: **the engine is the sole authority for incrementing `logicalAttemptId`**.
2. The trigger is an explicit `RETRY_RUN` signal received by the engine.
3. The engine reads `MAX(logicalAttemptId)` for the run from the state store, increments atomically, and persists the new value before dispatching to the adapter.
4. The planner is not involved in retry identity. The planner produces a plan; the engine decides when and how many times to attempt it.
5. `IRunStateStore` must expose `incrementLogicalAttemptId(runId): Promise<number>` as an atomic operation.
6. Golden idempotency key vectors must include retry scenarios.

**Who decides:** Architecture + Engine team.
**Output:** ADR, updated `IRunStateStore` contract, updated idempotency key spec, test vectors.

---

### T0-2: `stepTypeConfig` validation gap at engine dispatch boundary

**Problem:** The engine dispatches to `adapter.startRun()` without validating `step.stepTypeConfig` against the registered step kind schema. A plan that passes planner-side validation (at build time) but contains a malformed `stepTypeConfig` for the target environment produces a Temporal workflow that fails at the first activity ï¿½ inside the deterministic sandbox, with a Temporal-level error, not a domain-level pre-flight rejection.

**Impact:** Undetectable at plan submission, only manifests at runtime. Produces confusing Temporal workflow failures. Wastes Temporal history quota. Cannot be pre-flight rejected by the API.

**Resolution approach:**

1. Add `validateStepConfigs(steps: ExecutionStepV2[]): ValidationResult` to `IStepTypeRegistry`.
2. Call this method in `WorkflowEngine.startRun()` after `planRef` validation and before `adapter.startRun()`.
3. If any step fails validation, reject with `PLAN_STEP_CONFIG_INVALID` and return to caller without touching the adapter.
4. The adapter never sees an invalid step config.
5. Add contract tests: valid plan passes dispatch, invalid `stepTypeConfig` is rejected before dispatch.

**Who decides:** Engine team + Planner team.
**Output:** Updated `IStepTypeRegistry`, updated `WorkflowEngine.startRun()`, contract tests.

---

### T0-3: GDPR erasure strategy undefined

**Problem:** The event log is append-only. GDPR Article 17 right to erasure requires deletion of personal data on request. `tenantId`, `requestedBy`, step payloads, and run context fields may contain personal data. No tombstone mechanism, no redaction strategy, and no specification of what constitutes personal data in a run event exists. Any enterprise tenant can issue an erasure request at any time.

**Impact:** Regulatory non-compliance on first enterprise customer erasure request. Retroactive design with production data in place is significantly more expensive and error-prone.

**Resolution approach:**

**Option A ï¿½ Tombstone event (recommended):**

1. Define a new event type `RunDataRedacted` with fields: `runId`, `redactedFields: string[]`, `redactedAt`, `regulatoryBasis`.
2. The SnapshotProjector, when it encounters `RunDataRedacted`, nullifies the specified fields in the projected snapshot.
3. Raw event rows for the specified fields are updated to `[REDACTED]` in the `run_events` table (this is the only mutation permitted on the event log, gated by a dedicated `IRunStateStore.redactRunData()` method).
4. The method requires an audit record in a separate `data_erasure_requests` table.
5. Lineage records that reference the redacted run must be handled separately via `ILineageSink.redact()`.

**Option B ï¿½ Partition-level deletion:**
Only viable if the tenant has been fully offboarded and all of their partitions can be dropped. Does not support granular per-run erasure.

**Who decides:** Architecture + Legal/Compliance.
**Output:** ADR, `RunDataRedacted` event type in contracts, `IRunStateStore.redactRunData()` method, SnapshotProjector update, erasure request audit table migration.

---

## T1 ï¿½ Pre-Phase-2 Gaps

### T1-1: Stuck CANCELLING state has no escalation path

**Problem:** The state machine defines `CANCEL_REQUESTED` as non-terminal. If the Temporal workflow is externally terminated after `RunCancelRequested` is emitted but before `RunCancelled` is written, the run is permanently stuck in `CANCEL_REQUESTED`. The SnapshotProjector shows `cancelling: true` indefinitely. No background job detects or resolves this condition.

**Impact:** Run appears stuck in UI forever. Tenant cannot retry, cannot see terminal state, cannot understand what happened.

**Resolution approach:**

1. Define a `CancellationTimeoutPolicy` in the engine: if `CANCEL_REQUESTED ? CANCELLED` transition does not complete within `N` minutes (configurable per tenant or globally), the engine force-transitions to `CANCELLED`.
2. Implement this as a background job in `ProjectorWorkerRuntime` or a dedicated scheduler, scanning for runs in `CANCEL_REQUESTED` state older than the timeout.
3. The force-transition emits `RunCancelled` with `reason: 'CANCELLATION_TIMEOUT'` in the payload.
4. Add metric: `dvt.run.cancellation_timeout_total` labeled by `tenantId`.
5. Add `listRunsByStatus(status: RunStatus, olderThanMs: number): Promise<RunMetadata[]>` to `IRunStateStore` if not already present.

**Who decides:** Engine team.
**Output:** ADR or ADR update, background job spec, `IRunStateStore` extension, metric definition.

---

### T1-2: `enrichRunStatus` has no circuit breaker contract

**Problem:** `enrichRunStatus` calls the provider adapter for real-time substatus. If the Temporal cluster is degraded, this call blocks until timeout. No timeout, no fallback return value, and no degradation behavior is specified in `IWorkflowEngine` or `IProviderAdapter`. The comment "circuit breaking is the infrastructure layer's responsibility" is not an architectural specification.

**Impact:** A degraded Temporal cluster causes `enrichRunStatus` to cascade latency to the API, blocking UI polling requests, making the dashboard appear degraded even when the event log (the authoritative source) is healthy.

**Resolution approach:**

1. Add `enrichmentTimeoutMs?: number` to `RunContext` or as an adapter configuration parameter.
2. Specify the fallback behavior in `IWorkflowEngine` documentation: if `enrichRunStatus` fails (timeout or adapter error), return the latest snapshot-based status with `enrichmentStatus: 'UNAVAILABLE'` and `enrichedAt: null` in `RunStatusSnapshot`.
3. Introduce `enrichmentStatus: 'OK' | 'UNAVAILABLE' | 'PARTIAL'` to `RunStatusSnapshot` so callers can distinguish enriched vs. stale status.
4. The adapter must implement a timeout on its `getRunStatus` call and throw a typed `AdapterEnrichmentError` (not `Error`).
5. Add contract test: adapter throws `AdapterEnrichmentError` ? `enrichRunStatus` returns snapshot-based status with `enrichmentStatus: 'UNAVAILABLE'`.

**Who decides:** Engine team + API team.
**Output:** Updated `RunStatusSnapshot` type, updated `IWorkflowEngine` docs, adapter contract test.

---

### T1-3: Planner production-hardened exit criteria undefined

**Problem:** The delivery status says the planner is "Partial" with "not every product flow production-hardened." There are no defined exit criteria. Without them, the planner is in a permanent "partial" state.

**Impact:** The planner is the input surface for the entire system. A structurally valid plan with incorrect step ordering or incorrect dependency edges causes incorrect execution. The engine does not re-validate the DAG; it trusts the plan.

**Resolution approach:**

1. Define "production-hardened" for the planner as a checklist:
   - [ ] Golden fixture: `manifest.json` with 50 nodes -> known-good `ExecutionPlanV2` (all step kinds)
   - [ ] Golden fixture: `manifest.json` with 500 nodes -> known-good plan with correct layer ordering
   - [ ] Golden fixture: `manifest.json` with 1000 nodes -> plan generated in <2 seconds
   - [ ] Cycle detection test: manifest with a circular dependency -> planner rejects with `GRAPH_CYCLE`
   - [ ] Selection test: `includeUpstream: true` selects correct ancestor set
   - [ ] Selection test: `includeDownstream: true` selects correct descendant set
   - [ ] Cross-project dependency test: selected node depends on a node in a different dbt project
   - [ ] One-active-source enforcement: envelope with both `manifest` and `manifestRef` -> rejected
   - [ ] Invalid step kind: `stepTypeConfig` that fails `IStepTypeRegistry.validate()` -> rejected at planner boundary
2. These fixtures must be committed as `specs/fixtures/planner/` and run in CI.
3. The planner is not "production-hardened" until all of the above pass.

**Who decides:** Planner team.
**Output:** Fixture set, CI test suite, updated `system-delivery-status.md`.

---

### T1-4: Signal type extensibility requires contracts package modification

**Problem:** `SignalType` is an enum or union in the contracts package. Adding a new signal type (e.g., `PAUSE_STEP`, `FORCE_COMPLETE_STEP`) requires a contracts package version bump, which is a breaking change for all consumers. There is no extension mechanism above the contracts layer.

**Impact:** Every new signal type requires coordinated deployment of contracts package, engine, adapters, and API. As the signal vocabulary grows in Phase 2, this becomes a deployment coordination tax.

**Resolution approach:**

1. Change `SignalType` from a closed enum/union to a branded string: `type SignalType = string & { readonly __brand: 'SignalType' }`.
2. Define well-known signal types as exported constants: `const SIGNAL_CANCEL: SignalType = 'CANCEL' as SignalType`.
3. Adapters validate unknown signal types and reject with `UNSUPPORTED_SIGNAL` rather than throwing.
4. Engine passes through the signal without needing to know the full vocabulary.
5. New signal types are additive ï¿½ no contracts package major version bump required.

**Who decides:** Engine team + Planner team.
**Output:** Updated `SignalType` type, updated adapter signal handling, contract tests for unknown signal type behavior.

---

### T1-5: `planVersion` as string literal type blocks version evolution

**Problem:** `PlanCore.metadata.planVersion` was historically treated as an inline string literal. During active development the only admitted value is `1.0`; any future line needs an explicit governance change rather than an ad hoc literal.

**Impact:** Plan version rollouts require big-bang cutover. No rolling deployment is possible. A multi-version system (old planner + new engine, or vice versa) cannot be represented in the type system.

**Resolution approach:**

1. Keep `planVersion: '1.0'` as the single active development line.
2. Or use a branded string type with runtime validation.
3. The engine validates `planVersion` at runtime through the plan admission boundary, not via scattered TypeScript literals.
4. Introduce and maintain an admission matrix that declares which plan/schema pairs are executable.
5. Write an ADR update before any new plan-version line is introduced.

**Who decides:** Architecture + Planner team + Engine team.
**Output:** ADR, updated `PlanCore` type, engine version compatibility check, migration guide.

---

## T2 ï¿½ Pre-Phase-3 Gaps

### T2-1: PostgreSQL `run_events` table has no partitioning schema

**Problem:** At Phase 3 load (500K runs/day, 1000 steps), `run_events` reaches 500M rows/day. A single unpartitioned table at this volume produces: index bloat, autovacuum contention, query plan degradation, and unmanageable archival operations.

**Impact:** Phase 3 scale makes the state store unmaintainable without partitioning. Retrofitting partitioning on a live table with 50B rows is an operational incident.

**Resolution approach:**

1. Define partition key: range on `created_at_month` with hash subpartition on `tenant_id`.
2. Automate partition creation: a cron job creates the next month's partition 7 days in advance.
3. Define archival trigger: partitions older than 90 days are exported to S3 as Parquet (columnar, Snappy-compressed) and dropped from Postgres.
4. Define Athena or BigQuery external table over the S3 archive for historical queries.
5. Cold archive query path must be documented ï¿½ no UI path hits the archive directly.
6. For GDPR erasure (T0-3), the archival strategy must support partition-level deletion.
7. Implement in the migration scripts before any production data arrives.

**Who decides:** Infrastructure team + Persistence team.
**Output:** Migration script, partition creation cron spec, archival job spec, S3 bucket policy.

---

### T2-2: No PostgreSQL read replica strategy

**Problem:** All operational reads (run list, run status dashboard, snapshot queries) hit the Postgres primary. At 1000 tenants with dashboard polling, read saturation on the primary is a real risk. No read replica strategy is specified.

**Resolution approach:**

1. Deploy at least one read replica.
2. Route `listRuns`, `getSnapshot`, and `listEvents` (rebuild path only) to the read replica.
3. All writes and `bootstrapRunTx` remain on the primary.
4. `IRunStateStore` must expose a `readReplica()` method that returns a read-only port, or the state store adapter must be initialized with two connection pools (primary + replica).
5. Replica lag monitoring: add metric `dvt.db.replica_lag_seconds`. Alert if lag exceeds 5 seconds.

**Who decides:** Infrastructure team.
**Output:** Deployment spec, `IRunStateStore` adapter update, replica lag metric.

---

### T2-3: Temporal worker scaling policy undefined

**Problem:** A 1000-node plan with a 200-activity parallel layer can saturate the registered worker pool. No worker scaling model (number of workers, activity concurrency limits, task queue depth-based autoscaling) is documented.

**Resolution approach:**

1. Define `maxConcurrentActivities` per worker in the Temporal adapter configuration.
2. Define `targetTaskQueueLatencyMs` as the autoscaling trigger (scale out when task queue depth causes estimated wait > target).
3. Define `maxWorkersPerNamespace` as an upper bound.
4. For large-plan deployments, consider per-step-kind task queues (e.g., `dvt-dbt-models`, `dvt-dbt-tests`) to prevent test steps from starving model steps.
5. Add metric `dvt.temporal.task_queue_depth` and `dvt.temporal.worker_count` for autoscaling signal.

**Who decides:** Infrastructure team + Temporal adapter team.
**Output:** Worker configuration spec, autoscaling policy, task queue metric definitions.

---

### T2-4: Planner manifest caching not specified

**Problem:** A 1000-node `manifest.json` is 10ï¿½50 MB. At 10K runs/day against the same manifest (e.g., scheduled triggers), the planner re-parses and re-analyzes the same bytes thousands of times. `inputHashSha256` enables plan caching, but no cache layer is specified.

**Impact:** Planner CPU scales linearly with run submissions rather than unique manifests. At Phase 3 load, planner becomes a bottleneck.

**Resolution approach:**

1. Add `IPlanCache` port to the planner: `get(inputHash: string): Promise<ExecutionPlanV2 | null>`, `set(inputHash: string, plan: ExecutionPlanV2): Promise<void>`.
2. Implement with Redis as the backing store, keyed by `inputHashSha256`.
3. TTL: 24 hours (configurable). A manifest that changes invalidates the cache because the hash changes.
4. Cache hit rate metric: `dvt.planner.cache_hit_ratio`.
5. The cache is not the source of truth ï¿½ it accelerates, it does not replace.

**Who decides:** Planner team.
**Output:** `IPlanCache` port, Redis adapter, cache hit metric.

---

### T2-5: DLQ operational recovery has no runbook

**Problem:** G10 is closed with `lineage_dead_letter` table and `LineageWorkerRuntime` DLQ handling. But dead-lettered events are not queryable through the domain API, and the operational recovery procedure is not documented. Recovery requires direct database access.

**Impact:** An engineer on call at 2 AM with a DLQ depth spike has no documented procedure. Direct database access to `lineage_dead_letter` without a defined procedure risks further data corruption.

**Resolution approach:**

1. Add `ILineageOutboxStore.listDeadLettered(tenantId: string, limit: number): Promise<DeadLetterRecord[]>`.
2. Add `ILineageOutboxStore.requeueDeadLettered(ids: string[]): Promise<void>`.
3. Expose both via an internal admin API (authenticated with admin scope, not tenant scope).
4. Write a runbook: when DLQ depth exceeds threshold ? inspect records ? fix downstream ? requeue.
5. Add metric `dvt.lineage.dead_letter_depth` labeled by `tenantId`. Alert when depth > 0.

**Who decides:** Delivery team + Operations team.
**Output:** `ILineageOutboxStore` extension, admin API endpoints, runbook, metric definition.

---

### T2-6: Web UI has zero automated test coverage

**Problem:** `apps/web` has no automated test coverage. This is stated explicitly in the delivery status. The "state-driven UI" architectural claim cannot be verified without UI tests. Read-model rendering regressions are invisible.

**Resolution approach:**

1. Define minimum coverage threshold: 70% line coverage for all components that render run state.
2. Use Vitest + Testing Library for unit/integration tests of state-to-UI rendering.
3. Add Playwright E2E tests for the critical path: submit run ? polling status ? terminal state display.
4. Priority test targets:
   - Run status badge rendering for all `RunStatus` values
   - Step-level status rendering
   - Error state display (FAILED, CANCELLED)
   - `enrichmentStatus: 'UNAVAILABLE'` graceful degradation display
5. Block `apps/web` deployments without test coverage gate.

**Who decides:** UI team.
**Output:** Test suite, coverage threshold in CI, E2E test for critical path.

---

## T3 ï¿½ Deferred-OK Gaps

### T3-1: Conductor adapter development

**Deferred until:** ADR-0003 is reworded to "state-equivalent, not execution-equivalent" and accepted.
**Review trigger:** Phase 3 or when a second enterprise customer requires Conductor as their workflow engine.
**Risk if delayed:** Overstated in current ADRs. Temporal is correct for the current use case. The abstraction is preparatory, not blocking.

---

### T3-2: Plugin marketplace

**Deferred until:** Sandbox isolation mechanism is specified, implemented, and red-teamed.
**Review trigger:** Phase 3 go-to-market for third-party extensions.
**Risk if delayed:** Zero. Building the marketplace before the sandbox is a security liability.

---

### T3-3: Cost attribution UI

**Deferred until:** A prototype demonstrates reliable per-step Snowflake credit extraction via `QUERY_TAG` + `QUERY_HISTORY`.
**Review trigger:** Phase 3 planning session.
**Risk if delayed:** Low. Do not commit to customers until the data pipeline works.

---

### T3-4: SSE/WebSocket streaming contract

**Deferred until:** Phase 2 Sprint 4 (per implementation plan).
**Review trigger:** Live run monitoring becomes a product requirement.
**Risk if delayed:** Medium. Dashboard polling scales poorly at 1000+ concurrent runs. But it works for Phase 2 load.
**Pre-work required before implementation:** Technology choice (SSE vs WebSocket), backpressure strategy for slow consumers, connection lifecycle model, reconnect semantics.

---

### T3-5: `observability` open field on `ExecutionPlanV2`

**Deferred until:** Any plan version bump.
**Review trigger:** First production run where `observability` field content diverges between plan versions.
**Action:** Close the field to a concrete schema or remove it. `[k: string]: unknown` on an immutable artifact is permanently dangerous.

---

## Priority Summary Table

| Gap                                        | Tier | Phase Dependency                        | Owner                     | Estimated Effort                                  |
| ------------------------------------------ | ---- | --------------------------------------- | ------------------------- | ------------------------------------------------- |
| T0-1: `logicalAttemptId` authority         | T0   | Blocks Phase 2 retries                  | Architecture + Engine     | 1 ADR + contract change + tests (1ï¿½2 days)      |
| T0-2: `stepTypeConfig` dispatch validation | T0   | Blocks correctness of all runs          | Engine                    | `IStepTypeRegistry` call + tests (1 day)          |
| T0-3: GDPR erasure strategy                | T0   | Blocks first enterprise customer        | Architecture + Legal      | ADR + contract + migration (3ï¿½5 days)           |
| T1-1: Stuck CANCELLING escalation          | T1   | Blocks production operations            | Engine                    | Background job spec + implementation (2 days)     |
| T1-2: `enrichRunStatus` circuit breaker    | T1   | Blocks API reliability at degradation   | Engine + API              | Contract update + fallback implementation (1 day) |
| T1-3: Planner hardened exit criteria       | T1   | Blocks Phase 2 planning confidence      | Planner                   | Fixture set + CI suite (3 days)                   |
| T1-4: Signal type extensibility            | T1   | Blocks Phase 2 signal vocabulary growth | Engine                    | Type change + adapter update (1 day)              |
| T1-5: `planVersion` string literal         | T1   | Blocks governed plan-version admission  | Architecture              | Type change + ADR + admission matrix (1 day)      |
| T2-1: Postgres partitioning schema         | T2   | Blocks Phase 3 state store              | Infrastructure            | Migration + cron + archival job (1 week)          |
| T2-2: Postgres read replica                | T2   | Blocks Phase 3 read performance         | Infrastructure            | Deployment + adapter update (3 days)              |
| T2-3: Temporal worker scaling              | T2   | Blocks Phase 3 throughput               | Infrastructure + Temporal | Configuration + autoscaling + metrics (3 days)    |
| T2-4: Planner manifest cache               | T2   | Blocks Phase 3 planner CPU              | Planner                   | `IPlanCache` port + Redis adapter (2 days)        |
| T2-5: DLQ runbook + API                    | T2   | Blocks Phase 3 operations               | Delivery + Ops            | API endpoints + runbook + metric (2 days)         |
| T2-6: Web UI test coverage                 | T2   | Blocks Phase 2 UI confidence            | UI                        | Test suite + coverage gate (1 week)               |
