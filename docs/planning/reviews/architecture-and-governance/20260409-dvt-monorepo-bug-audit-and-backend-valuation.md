---
title: DVT+ Monorepo Bug Audit And Backend Valuation
status: Active
date: 2026-04-09
owner: Architecture
planning_type: review
---

# DVT+ Monorepo Bug Audit And Backend Valuation

Full-codebase audit performed 2026-04-09 covering all `@dvt/*` packages, `apps/api`, `apps/web`, and `adapter-temporal`. Each finding includes severity, root cause, ADR alignment, and a concrete proposal.

---

## Part 1 — Bug And Problem Inventory

### 1.1 Engine (`packages/@dvt/engine`)

#### E-01 Dispatched intent reconciliation returns wrong outcome classification

| Field    | Value                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------ |
| Severity | **Medium**                                                                                       |
| File     | `packages/@dvt/engine/src/services/runMaintenance/DispatchedIntentReconciliationPolicy.ts:31-39` |
| ADR      | ADR-0030 (Pre-Dispatch Intent Log)                                                               |

**Problem:** When a DISPATCHED intent already has bootstrapped run metadata, the code marks the intent as resolved (correct) but returns `{ cancelled: intent.intentId }` (incorrect). Nothing was cancelled; the intent is simply cleaning up because the run succeeded.

**Impact:** Inflates `dvt.intent.reconcile.cancelled_total` metrics. Operational dashboards misreport cancellation activity. Alert thresholds for orphaned intent cancellation become unreliable.

**Proposal:** Return `{ expired: intent.intentId }` instead. The intent's lifecycle ended naturally, not through active cancellation of a provider workflow.

---

#### E-02 SignalTransitionGuard asymmetry between PAUSE and RESUME idempotency check

| Field    | Value                                                                     |
| -------- | ------------------------------------------------------------------------- |
| Severity | **Medium**                                                                |
| File     | `packages/@dvt/engine/src/services/signal/SignalTransitionGuard.ts:75-93` |
| ADR      | ADR-0008 (Signal Idempotency)                                             |

**Problem:** RESUME checks both snapshot state AND event history (`lastPauseResumeEventType`), making it robust against stale snapshots. PAUSE only checks `snapshot.status === 'PAUSED' || snapshot.paused`, ignoring event history. Under asynchronous snapshot projection (future Postgres store), a stale snapshot could allow a duplicate PAUSE to reach the adapter.

**Impact:** Low today (in-memory stores are always synchronized). Will surface when AR-D1 (incremental snapshot projection) or the Postgres store is production-active.

**Proposal:** Align PAUSE check to also verify `lastPauseResumeEventType(events) === 'RunPaused'` when the snapshot status is ambiguous (e.g. RUNNING but events show a recent RunPaused).

---

#### E-03 `saveProviderRef` uses truthy check instead of `!== undefined`

| Field    | Value                                                                                         |
| -------- | --------------------------------------------------------------------------------------------- |
| Severity | **Low**                                                                                       |
| Files    | `packages/@dvt/engine/src/state/InMemoryRunStateStore.ts:71-73`, `InMemoryTxStore.ts:101-109` |

**Problem:** `if (runRef.providerNamespace)` silently discards empty string values (`""`). Should be `if (runRef.providerNamespace !== undefined)`.

**Impact:** Theoretical only. Temporal namespaces are never empty in practice.

**Proposal:** Change to `!== undefined` checks in both stores for correctness.

---

#### E-04 Dead type `'local'` in trace context adapter union

| Field    | Value                                                     |
| -------- | --------------------------------------------------------- |
| Severity | **Low**                                                   |
| File     | `packages/@dvt/engine/src/core/WorkflowEngine.ts:290-294` |

**Problem:** The `adapter` field type includes `'local'` but the function can only produce `'temporal' | 'conductor' | undefined`. Also present in `IStartRunApplicationService` interface (line 53).

**Proposal:** Remove `'local'` from the union or add it to `TRACEABLE_ADAPTERS`.

---

### 1.2 Adapter Temporal (`packages/@dvt/adapter-temporal`)

#### T-01 `cancelRun` uses signal instead of native Temporal cancellation

| Field    | Value                                                       |
| -------- | ----------------------------------------------------------- |
| Severity | **High**                                                    |
| File     | `packages/@dvt/adapter-temporal/src/TemporalAdapter.ts:143` |
| ADR      | ADR-0007 (Run Cancellation Semantics)                       |

**Problem:** `cancelRun()` sends `WorkflowSignals.CANCEL` via signal, not `handle.cancel()`. The `WorkflowHandleLike` interface defines `cancel()` (line 45) but it's never called. If the workflow is stuck in a non-interruptible activity or the signal handler has a bug, cancellation never takes effect. There is no fallback or timeout escalation.

**Impact:** Liveness risk. A deadlocked or signal-deaf workflow becomes uncancellable. The engine has no way to force-terminate it.

**Proposal:** Implement a two-phase cancellation: (1) signal-based cooperative cancel with a configurable timeout, (2) escalate to `handle.cancel()` if the signal is not acknowledged within the timeout window. Log the escalation for operational visibility.

---

#### T-02 `cancelRun` missing error handling for non-existent workflows

| Field    | Value                                                           |
| -------- | --------------------------------------------------------------- |
| Severity | **Medium**                                                      |
| File     | `packages/@dvt/adapter-temporal/src/TemporalAdapter.ts:140-144` |

**Problem:** Unlike `lookupRunRef` which catches `WorkflowNotFoundError`, `cancelRun` propagates raw Temporal SDK errors when the workflow doesn't exist or is already completed. The engine caller receives an opaque SDK error instead of a domain-specific response.

**Proposal:** Catch `WorkflowNotFoundError` and either return silently (cancel of a non-existent workflow is a no-op) or throw a domain-typed `RunNotFoundError`.

---

#### T-03 Core adapter operations have zero observability instrumentation

| Field    | Value                                                                 |
| -------- | --------------------------------------------------------------------- |
| Severity | **Medium**                                                            |
| File     | `packages/@dvt/adapter-temporal/src/ObservedTemporalAdapter.ts:44-58` |

**Problem:** `lookupRunRef` and `ping` are fully instrumented with spans, counters, and duration metrics. The four core operations (`startRun`, `cancelRun`, `getRunStatus`, `signal`) are bare pass-throughs with no observability.

**Impact:** Production monitoring blindspot. Cannot measure adapter latency or error rates for the most critical operations.

**Proposal:** Wrap all four core operations with the same span/counter/histogram pattern used for `lookupRunRef`.

---

#### T-04 Cancel signal handler skips idempotency deduplication

| Field    | Value                                                                 |
| -------- | --------------------------------------------------------------------- |
| Severity | **Medium**                                                            |
| File     | `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts:349` |
| ADR      | ADR-0008 (Signal Idempotency)                                         |

**Problem:** `pauseSignal` and `resumeSignal` handlers call `isDuplicateControlSignal()` for idempotency. The `cancelSignal` handler skips this check. A duplicate cancel signal with a different `reason` field overwrites `cancelReason`.

**Proposal:** Add `isDuplicateControlSignal()` check to the cancel signal handler.

---

#### T-05 `condition()` with no timeout creates infinite hang risk

| Field    | Value                                                                 |
| -------- | --------------------------------------------------------------------- |
| Severity | **Medium**                                                            |
| File     | `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts:581` |

**Problem:** `await condition(() => !args.state.paused || args.state.cancelRequested)` blocks indefinitely if RESUME is never delivered and no CANCEL arrives. No application-level timeout is configured.

**Impact:** The workflow relies entirely on Temporal's workflow-level timeout, which may be very long or unconfigured.

**Proposal:** Add a configurable pause timeout (e.g. 24h) to `condition()`. If exceeded, emit a `RunFailed` with reason `PAUSE_TIMEOUT` instead of hanging forever.

---

#### T-06 DbtStepActivity is a no-op stub

| Field    | Value                                                                     |
| -------- | ------------------------------------------------------------------------- |
| Severity | **Low**                                                                   |
| File     | `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts:143-148` |

**Problem:** `DbtStepActivity.execute()` returns `{ status: 'COMPLETED' }` unconditionally. Known Phase-1 scaffold, but violates AGENTS.md no-stub policy unless explicitly approved.

**Proposal:** Track as `MW-C1` prerequisite. Mark with an explicit ADR-backed exception until real dbt execution is wired.

---

### 1.3 API (`apps/api`)

#### A-01 Singleton PG pool with module-global state

| Field    | Value                          |
| -------- | ------------------------------ |
| Severity | **Medium**                     |
| File     | `apps/api/src/db/pool.ts:9-10` |

**Problem:** `let pool: Pool | null = null` is module-global state. `getPgPool()` silently swaps the pool when connection config changes, using `void pool.end().catch(() => {})` to fire-and-forget the old pool. This means:

- In-flight queries on the old pool may fail with connection reset errors
- There's a race window between `pool.end()` and new pool creation
- Tests that call `getPgPool()` with different configs mutate shared state

**Proposal:** Use explicit pool lifecycle management in the app composition root. Remove the singleton pattern. Inject the pool through the dependency tree.

---

#### A-02 No request-level timeout on engine operations

| Field    | Value                                                            |
| -------- | ---------------------------------------------------------------- |
| Severity | **Medium**                                                       |
| File     | `apps/api/src/entrypoints/http/runCommandRouteExecutor.ts:58-69` |

**Problem:** The `execute()` call to the engine has no HTTP-level timeout. If the engine hangs (e.g. adapter timeout at 30s + stateStore timeout), the HTTP request hangs until Fastify's global timeout.

**Proposal:** Add a per-route timeout using Fastify's `connectionTimeout` or an `AbortSignal` pattern.

---

#### A-03 `cancelRunUseCase` delegates entirely to `signalRunUseCase` with CANCEL type

| Field    | Value                                                   |
| -------- | ------------------------------------------------------- |
| Severity | **Low (design smell)**                                  |
| File     | `apps/api/src/application/services/cancelRunUseCase.ts` |

**Problem:** `CancelRunUseCase.execute()` is a pure pass-through to `SignalRunUseCase.execute()`. This adds an unnecessary indirection layer with no behavioral difference.

**Proposal:** Either remove `CancelRunUseCase` and route cancel directly through `SignalRunUseCase`, or add cancel-specific behavior (audit logging, different authorization scope, force-cancel escalation) to justify the separate class.

---

### 1.4 Web (`apps/web`)

#### W-01 `dangerouslySetInnerHTML` in chart component

| Field    | Value                                         |
| -------- | --------------------------------------------- |
| Severity | **Low**                                       |
| File     | `apps/web/src/app/components/ui/chart.tsx:78` |

**Problem:** Uses `dangerouslySetInnerHTML` to inject CSS styles. This is from the shadcn/ui chart component and injects only computed style strings, not user input.

**Impact:** Minimal — the injected content is derived from chart config, not from user input. Standard shadcn/ui pattern.

**Proposal:** No action needed unless user-provided data flows into the chart config labels/colors. Add a comment documenting this.

---

#### W-02 API client infers base URL from browser location without validation

| Field    | Value                                                    |
| -------- | -------------------------------------------------------- |
| Severity | **Low**                                                  |
| File     | `apps/web/src/app/services/api/createApiClient.ts:56-67` |

**Problem:** `inferLocalApiBaseUrl()` constructs API URLs from `window.location` properties. In a reverse-proxy or CDN deployment, the inferred URL may not match the actual API endpoint.

**Impact:** Only affects deployments without `VITE_API_BASE_URL`. The env variable takes precedence when configured.

**Proposal:** Document the requirement to set `VITE_API_BASE_URL` in production deployments. Add a console warning when falling back to inferred URL in non-development environments.

---

### 1.5 Adapter Postgres (`packages/@dvt/adapter-postgres`)

#### P-01 Schema validation allows only simple identifiers

| Field    | Value                                               |
| -------- | --------------------------------------------------- |
| Severity | **Low**                                             |
| File     | `packages/@dvt/adapter-postgres/src/sqlUtils.ts:11` |

**Problem:** `normalizeSchema()` regex `/^[a-zA-Z_]\w*$/` rejects valid PostgreSQL schemas containing dots (for cross-schema references) or hyphens.

**Impact:** Low — DVT controls its own schema names.

**Proposal:** Document this as an intentional restriction. No change needed unless multi-schema deployment is required.

---

### 1.6 Run Domain (`packages/@dvt/run-domain`)

#### D-01 `RunQueued` event is a deliberate no-op in projection

| Field    | Value                                                 |
| -------- | ----------------------------------------------------- |
| Severity | **Informational**                                     |
| File     | `packages/@dvt/run-domain/src/applyRunEvent.ts:26-28` |

**Observation:** `RunQueued` does not mutate the snapshot. The comment explains it's intentional (queue admission is represented by bootstrap state). This is correct per ADR-0004 but creates a subtle invariant: the first mutation is `RunStarted`, not `RunQueued`. Worth documenting explicitly for adapter implementors.

---

### 1.7 Delivery (`packages/@dvt/delivery`)

#### DL-01 OutboxWorker processes records sequentially within a batch

| Field    | Value                                                            |
| -------- | ---------------------------------------------------------------- |
| Severity | **Low (design)**                                                 |
| File     | `packages/@dvt/delivery/src/application/OutboxWorker.ts:117-119` |

**Problem:** `processBatch()` uses a sequential `for...of` loop. Each record is published and marked delivered one at a time. For high-throughput scenarios, this limits outbox drain rate.

**Impact:** Low at current scale. Will become a bottleneck with 1000+ tenants (see AR-D3).

**Proposal:** Implement batched `bus.publish()` for records targeting the same event bus topic, then batch `markDelivered()`. Gated on AR-D3 scaling work.

---

## Part 2 — Backend Valuation And Comparative Analysis

### 2.1 Architecture Quality Scorecard

| Dimension                 | Score (1-10) | Rationale                                                                                                                                                                                                                                                                                                                                |
| ------------------------- | :----------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Domain Modeling**       |     8.5      | Strong DDD: bounded contexts (`engine`, `contracts`, `delivery`, `run-domain`, `adapter-*`), explicit ports/adapters, value objects (`PlanRef`, `RunContext`, `EngineRunRef`). Event-sourced lifecycle with formal state machines. Minor gap: some engine types still re-exported through `contracts` instead of owned locally.          |
| **Contract Discipline**   |     9.0      | Exceptional. 38+ ADRs governing decisions. Versioned contracts (`IWorkflowEngine.v1_1_1`, `RunEvents.v2`, `SignalSemantics.v1`). Zod schemas at system boundaries. Idempotency keys are formally derived (SHA-256 preimage). Golden path hash validation. This is well above industry standard.                                          |
| **Event Sourcing**        |     8.0      | Append-only log, `runSeq` ordering, idempotency key deduplication, snapshot projection, state machine transition guards. In-memory and Postgres implementations are structurally aligned. Gap: no incremental projection yet (AR-D1), full replay is O(n).                                                                               |
| **Security**              |     7.5      | Tenant isolation at every read/write boundary. Formal RBAC with hierarchical authorization policy. Plan URI allowlisting. Host risk classification. `AllowAllAuthorizer` rejects production mode. Gap: `AllowAllAuthorizer` is the only authorizer implementation; no real JWT-to-tenant mapping in the engine layer (delegated to API). |
| **Observability**         |     7.0      | Structured logging, span-based tracing, metric counters/histograms at engine and application layers. Observability is injected through ports (`IObservability`). Gap: adapter-temporal core operations lack instrumentation (T-03). stderr fallback throttling is a nice production safety net.                                          |
| **Error Handling**        |     8.0      | Typed error hierarchy (`DvtError` base, domain-specific subclasses with stable codes). Compensation flows in startRun (`cancelRun` if `bootstrapRunTx` fails). Best-effort observability reporting never fails the domain operation. Gap: some raw SDK errors leak through adapter boundaries (T-02).                                    |
| **Testing**               |     7.5      | Vitest throughout. Contract tests, golden path hashes, idempotency vector tests, state machine transition tests. In-memory stores enable fast unit testing. Gap: no integration tests for the Postgres store in CI (test:integration is separate).                                                                                       |
| **Code Organization**     |     8.0      | Clean package boundaries. Engine internals decomposed into services (`startRun`, `signal`, `runMaintenance`), domain policies, and lifecycle runtime. Gap: some files are very long (WorkflowEngine facade could be leaner).                                                                                                             |
| **Operational Readiness** |     6.5      | Intent reconciler worker with backoff/jitter. Health check endpoint. Reconciler health watchdog. Gap: no circuit breaker between engine and state store (AR-C4), no incremental snapshot projection (AR-D1), no worker scaling strategy (AR-D3), `DbtStepActivity` is a stub.                                                            |
| **Documentation**         |     9.0      | Extraordinary documentation discipline. Governance inventory, ADRs, versioned contracts, execution model spec, review boards, risk register, evidence docs. Far exceeds typical projects.                                                                                                                                                |

**Overall Backend Score: 7.9 / 10**

---

### 2.2 Comparative Analysis

| Dimension             |  DVT+   | Temporal Server | Windmill | Prefect 2 | Dagster |
| --------------------- | :-----: | :-------------: | :------: | :-------: | :-----: |
| Domain Modeling       |   8.5   |       9.0       |   6.5    |    7.0    |   8.0   |
| Contract Discipline   |   9.0   |       8.5       |   5.0    |    6.0    |   7.0   |
| Event Sourcing        |   8.0   |       9.5       |   N/A    |    6.0    |   6.5   |
| Security Model        |   7.5   |       7.0       |   7.0    |    6.5    |   6.5   |
| Observability         |   7.0   |       8.5       |   7.5    |    7.0    |   7.5   |
| Error Handling        |   8.0   |       8.5       |   6.5    |    6.5    |   7.0   |
| Testing               |   7.5   |       8.0       |   6.0    |    7.0    |   7.5   |
| Operational Readiness |   6.5   |       9.0       |   8.0    |    8.0    |   8.5   |
| Documentation         |   9.0   |       8.0       |   6.0    |    7.5    |   8.0   |
| **Average**           | **7.9** |     **8.4**     | **6.6**  |  **6.8**  | **7.4** |

### 2.3 Interpretation

**DVT+ strengths relative to comparable tools:**

- Contract and documentation discipline is best-in-class. The ADR-backed governance model, versioned contracts, and formal idempotency derivation exceed what Temporal Server, Dagster, or Prefect maintain at the application layer.
- The multi-adapter architecture (Temporal/Conductor/mock) with engine-owned lifecycle sovereignty is a unique differentiator. Most orchestrators are bound to a single runtime.
- Security modeling (tenant hierarchy, plan URI allowlisting, host risk classification) is more mature than typical workflow engines at this stage.

**DVT+ gaps relative to comparable tools:**

- **Operational readiness** is the primary gap. Temporal Server and Dagster have production-hardened worker scaling, circuit breakers, and incremental state projection. DVT+ has these as tracked tasks (AR-C4, AR-D1, AR-D3) but they're not yet implemented.
- **Step execution is a stub.** The `DbtStepActivity` no-op means the system can orchestrate but not execute. This is the single largest gap to production utility. MW-C1 (step dispatcher) is the critical path.
- **Adapter observability** has a coverage hole (T-03) that would be critical in production.

**Trajectory assessment:** DVT+ is architecturally mature for its development stage. The governance and contract infrastructure would typically only appear in organizations with 10+ engineers and multi-year codebases. The primary risk is the gap between architectural sophistication and operational readiness — the system is well-designed but not yet hardened for production workloads.

---

### 2.4 Summary Scores

| Category                     |  Score  |
| ---------------------------- | :-----: |
| Architecture and Design      | **8.3** |
| Implementation Quality       | **7.7** |
| Operational Readiness        | **6.5** |
| Documentation and Governance | **9.0** |
| Security Posture             | **7.5** |
| **Weighted Overall**         | **7.9** |

### 2.5 Priority Ranking Of Findings

| Priority | ID    | Severity | Fix Effort |
| :------: | ----- | :------: | :--------: |
|    1     | T-01  |   High   |     M      |
|    2     | T-03  |  Medium  |     S      |
|    3     | E-01  |  Medium  |     S      |
|    4     | T-04  |  Medium  |     S      |
|    5     | T-05  |  Medium  |     S      |
|    6     | T-02  |  Medium  |     S      |
|    7     | E-02  |  Medium  |     S      |
|    8     | A-01  |  Medium  |     M      |
|    9     | A-02  |  Medium  |     S      |
|    10    | E-03  |   Low    |     S      |
|    11    | E-04  |   Low    |     S      |
|    12    | T-06  |   Low    |     -      |
|    13    | A-03  |   Low    |     S      |
|    14    | W-01  |   Low    |     -      |
|    15    | W-02  |   Low    |     S      |
|    16    | P-01  |   Low    |     -      |
|    17    | DL-01 |   Low    |     L      |
