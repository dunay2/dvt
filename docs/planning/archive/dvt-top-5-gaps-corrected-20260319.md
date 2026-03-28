---
title: DVT+ - Top 5 Architectural Gaps (Corrected)
status: Active
owner: Architecture
last_reviewed: 2026-03-20
planning_type: proposal
---

# DVT+ - Top 5 Architectural Gaps

**Repository:** `c:/dvt`
**Primary review source:** [`docs/reviews/DVT+_Architectural_Review_20260319.md`](./DVT+_Architectural_Review_20260319.md)
**Gap register:** [`docs/reviews/prioritized-gaps-20260319.md`](./prioritized-gaps-20260319.md)
**Delivery status:** [`docs/architecture/system-delivery-status.md`](../architecture/system-delivery-status.md)

---

## Summary

These are the 5 most critical currently open gaps based on the current repo state, the architectural review of 2026-03-19, and the gap register.

<!-- markdownlint-disable MD060 -->

| #   | Gap                                                                             | Why it matters                                                                                                                                                   | Fix direction                                                                                                  |
| --- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | API query-side claim is no longer current                                       | `apps/api` already ships `GET /runs`, `GET /runs/:id`, `GET /runs/:id/events`, and `POST /runs/:id/signal`; the real API gap was integration proof and doc drift | Treat the API query slice as delivered, and track residual hardening through status, evidence, and risk docs   |
| 2   | Business-level recovery flow is undefined                                       | Technical retries exist at the Temporal level; operator-grade recovery with lineage and deterministic plan generation does not                                   | Introduce a `RecoverRunUseCase` that generates a new plan from failed steps and creates a derived run          |
| 3   | `planVersion` is a string literal type — version evolution is a breaking change | Any plan version bump requires a contracts package major version bump and big-bang cutover                                                                       | Replace the string literal with a discriminated union, add a runtime compatibility matrix, and write the ADR   |
| 4   | Outbox and event pipeline have no backpressure controls                         | Under burst load, outbox lag grows unboundedly and snapshot staleness is invisible                                                                               | Add backpressure policy and admission control as infrastructure and API-layer concerns — not inside the engine |
| 5   | Event log has no retention, archival, or lifecycle model                        | Append-only state without lifecycle management becomes an operational liability at Phase 3 scale                                                                 | Define hot/warm/cold tiers with archival to S3; do not compact or mutate the event log                         |

<!-- markdownlint-enable MD060 -->

---

## 1. API query-side correction and remaining concern

Update 2026-03-20: the original claim in this section is superseded by shipped
code. `apps/api/src/app.ts` already registers `POST /runs/start`, `GET /runs`,
`GET /runs/:runId`, `GET /runs/:runId/events`, and
`POST /runs/:runId/signal`. Dedicated route tests exist, and the remaining API
hardening item was the executable OIDC plus PostgreSQL lane now provided by
`apps/api/test/integration/protectedRuntime.integration.test.ts` and
`pnpm --filter dvt-api test:integration`. Treat the legacy text below as
historical review context, not current delivery status.

### Accurate problem statement

`POST /runs` exists and is production-grade. `apps/api/src/entrypoints/http/startRunRoute.ts` is implemented with OIDC auth, tenant policy, body parsing, and an authorized facade. G8 is closed with 21 passing tests.

What does not exist:

- `GET /runs` — no run list endpoint
- `GET /runs/:id` — no run status endpoint
- `GET /runs/:id/events` — no event log endpoint
- `POST /runs/:id/signal` — no signal endpoint

The system has the command side. The query side of CQRS is absent. The UI cannot show the status of any run it has started. The operator cannot query what happened to a failed run. There is no signal path.

### Why this matters

The architectural claim is "state-driven UI." That claim is only verifiable if the UI can read state. Without the query endpoints, the engine's event log and snapshot projector are write-only black boxes from the product surface. The system can start runs and never see what happens to them.

### Fix direction

Do not invent a new pattern. The existing `StartRunAuthorizedFacade` defines the correct structure:

```
entrypoint/http/handler → application/facade (authorized) → IWorkflowEngine port → response DTO
```

Apply this pattern to the query slice:

```
apps/api/src/
  entrypoints/http/
    getRunRoute.ts          ← GET /runs/:id → StartRunAuthorizedFacade pattern
    listRunsRoute.ts        ← GET /runs
    getRunEventsRoute.ts    ← GET /runs/:id/events
    signalRunRoute.ts       ← POST /runs/:id/signal
  application/services/
    getRunStatusUseCase.ts  ← calls IWorkflowEngine.getRunStatus()
    listRunsUseCase.ts      ← calls IRunStateStore reader port directly
    signalRunUseCase.ts     ← calls IWorkflowEngine.signal()
  contracts/
    RunStatusDto.v1.ts      ← maps RunStatusSnapshot to API response shape
    RunListItemDto.v1.ts
```

#### Design constraints

- Controllers are thin. No business logic in route handlers.
- `GET /runs/:id` calls `IWorkflowEngine.getRunStatus()` — not the adapter directly. No enrichment on the default path.
- `GET /runs/:id/status?enriched=true` calls `IWorkflowEngine.enrichRunStatus()` — enrichment is explicit and opt-in.
- `tenantId` is mandatory on every query. Not optional. Not inferred from a global.
- DTOs are independent from internal engine types. `RunStatusSnapshot` is never returned raw — it is mapped to a versioned DTO at the HTTP boundary.
- Signal endpoint validates the signal type against a documented vocabulary before passing to the engine.

### Acceptance criteria

- UI can render real run status from a real `GET /runs/:id` response.
- Signal can be sent without knowledge of engine internals.
- All endpoints reject requests with missing or mismatched `tenantId` with 403, not 500.
- DTOs are versioned and stable — internal type changes do not change the HTTP response shape without a DTO version bump.

---

## 2. Business-level recovery flow is undefined

### Accurate problem statement

There are two distinct concepts of retry in this system:

**Technical retry:** Temporal retries a failed activity automatically according to its retry policy. This is infrastructure behavior. It is invisible to the domain and to the operator. It does not create a new `runId` or increment `logicalAttemptId`. It is not a recovery primitive.

**Business recovery:** An operator decides that a run that reached terminal state (`FAILED`, `CANCELLED`) should be re-executed, either fully or partially against the steps that did not complete. This creates a new run with auditable lineage back to the origin run.

The system has the first. It does not have the second.

Additionally, `logicalAttemptId` is hardcoded to `1` and its authority for Phase 2 is unresolved. Who increments it, on what trigger, and via what mechanism is not specified in any normative document. This is the most dangerous deferred decision in the system because the idempotency key formula (ADR-0008) includes `logicalAttemptId`. Wrong authority means silent idempotency key collisions or orphaned attempts.

### Why this matters

Without business-level recovery, when a run fails midway, the operator must either:

- Submit a completely new run from scratch (no lineage, no traceability of what was attempted before)
- Manually reconstruct the set of failed steps and submit them as a new run with no formal recovery semantics

There is no `parentRunId` tracking. There is no recovery lineage. This makes audit and root-cause analysis for production failures manual and unreliable.

### Fix direction

#### Rule: recovery always creates a new run

A terminal run (`FAILED`, `CANCELLED`) is immutable. It is never reopened. A recovery is a new `Run` entity with lineage metadata pointing to the origin.

#### Logical authority for `logicalAttemptId`

The engine is the sole authority for `logicalAttemptId`. The planner does not observe in-flight run state and cannot increment it. The trigger is an explicit `RETRY_RUN` signal or a `RecoverRunCommand`. The engine reads `MAX(logicalAttemptId)` for the run from `IRunStateStore` and increments atomically before dispatching to the adapter.

This must be codified in an ADR before any Phase 2 retry implementation begins. It is a T0 gap.

#### Recovery use case

```typescript
interface RecoverRunCommandV1 {
  tenantId: string;
  sourceRunId: string;
  strategy: 'FULL_RERUN' | 'FROM_FAILED_STEPS' | 'FROM_SELECTED_STEPS';
  selectedStepIds?: readonly string[]; // Required when strategy = FROM_SELECTED_STEPS
  reason?: string;
  requestedBy: string;
}

interface RecoveredRunV1 {
  newRunId: string;
  parentRunId: string; // The immediate source run
  originRunId: string; // The first run in the recovery chain
  recoveryMode: string;
  recoveryReason?: string;
  recoveryRequestedBy: string;
}
```

#### How `FROM_FAILED_STEPS` works

This is not an engine resume operation. The engine cannot resume from a specific step — Temporal's `continueAsNew` boundary is at the layer level, not the step level.

The correct mechanism:

1. `RecoverRunUseCase` queries the snapshot of the source run to identify failed and not-started steps.
2. It calls the **planner** with `PlannerInputEnvelopeV2` containing the original manifest ref and a `selection` of only the failed/downstream steps.
3. The planner generates a new `ExecutionPlanV2` scoped to those steps.
4. `RecoverRunUseCase` calls `IWorkflowEngine.startRun()` with the new plan and a `RunContext` carrying the lineage fields.
5. The new run has a new `runId` and `logicalAttemptId = 1` (first attempt of the new run). The lineage to the source run is in `RunContext` metadata, not in `logicalAttemptId`.

`logicalAttemptId` tracks attempts of the same logical run. Recovery creates a new logical run. Do not conflate them.

#### Lineage fields belong in `RunContext`, not in `ExecutionPlanV2`

```typescript
// RunContext extension for recovery lineage:
interface RunContext {
  // ... existing fields ...
  readonly parentRunId?: RunId; // Immediate source run, if this is a recovery
  readonly originRunId?: RunId; // First run in the chain
  readonly recoveryMode?: string;
  readonly recoveryReason?: string;
}
```

The plan does not carry lineage. The plan is a deterministic execution specification. Lineage is a runtime context concern.

### Acceptance criteria

- A failed run can be recovered without any mutation to its event log or metadata.
- The new run carries explicit lineage back to the source run.
- `RecoverRunUseCase` validates that the source run is in a terminal state before creating a recovery.
- The planner generates a correct sub-graph plan for the selected steps.
- Recovery lineage is queryable: `GET /runs/:id` response includes `parentRunId` and `originRunId` if present.
- `logicalAttemptId` authority is documented in an ADR before any Phase 2 implementation begins.

---

## 3. `planVersion` is a string literal type — version evolution is a breaking change

### Accurate problem statement

`PlanCore.metadata.planVersion` is typed as the string literal `'2.3'` in `@dvt/contracts/src/contracts/planner/ExecutionPlan.v2.ts`. This means:

- A planner that produces `planVersion: '3.0'` fails TypeScript compilation in the planner package.
- The engine validates `schemaVersion` at runtime, but `planVersion` is not in that validation path.
- There is no compatibility matrix defining which engine versions accept which plan versions.
- Rolling deployment of a new plan version (old planner + new engine, or new planner + old engine) cannot be represented in the type system or validated at dispatch.

When `planVersion: '3.0'` is needed, the only available path is:

1. Bump the contracts package major version (breaking change for all consumers).
2. Deploy all planners and engines simultaneously.

This is a big-bang cutover model. It is not viable for a system that will have production runs in flight during upgrades.

### Why this matters

Every `ExecutionPlanV2` produced under the current schema is locked to `planVersion: '2.3'` by the type system. Any schema evolution that requires changing this field is a coordinated breaking change across every package that imports from `@dvt/contracts`. At Phase 3 scale with multiple deployments and potentially hundreds of in-flight runs during an upgrade, this is an operational risk.

### Fix direction

**Do not add another envelope wrapper.** `ExecutionPlanV2` already exists. Adding `ExecutionPlanEnvelopeV1` as a wrapper would create a third layer (`input envelope → plan envelope → plan`) with duplicated metadata fields (`schemaVersion`, `plannerVersion` already exist in `ExecutionPlanV2.metadata`).

The correct fix is minimal:

#### Step 1: Change the type

```typescript
// Before — rigid, breaks on any version bump:
interface PlanCore {
  metadata: {
    planVersion: '2.3';
    inputHashSha256: string;
  };
  steps: readonly ExecutionStepV2[];
}

// After — extensible, backward compatible:
export type SupportedPlanVersion = '2.3' | '3.0';

interface PlanCore {
  metadata: {
    planVersion: SupportedPlanVersion;
    inputHashSha256: string;
  };
  steps: readonly ExecutionStepV2[];
}
```

#### Step 2: Runtime validation in the engine

The engine validates `planVersion` at runtime against a constant set — not against TypeScript types. TypeScript types are erased at runtime. Runtime validation is what actually protects the system.

```typescript
// packages/@dvt/engine/src/contracts/PlanVersionPolicy.ts
export const SUPPORTED_PLAN_VERSIONS = new Set<string>(['2.3']);

export function assertSupportedPlanVersion(planVersion: string): void {
  if (!SUPPORTED_PLAN_VERSIONS.has(planVersion)) {
    throw new UnsupportedPlanVersionError(planVersion, [...SUPPORTED_PLAN_VERSIONS]);
  }
}
```

This constant is what the engine checks before dispatching. When `'3.0'` is added to the set, the engine accepts it without a contracts package version bump.

#### Step 3: Write the ADR

Define the plan version compatibility policy before any `planVersion: '3.0'` work begins:

- Which engine versions accept which plan versions.
- The migration path for in-flight runs when a plan version is deprecated.
- The deprecation window (how long an old plan version remains supported after the new one is released).

#### Non-negotiable rule

The engine must never silently parse an unknown plan version. Unknown plan version = hard rejection with `UNSUPPORTED_PLAN_VERSION` error at dispatch, before any adapter interaction.

### Acceptance criteria

- Adding `planVersion: '3.0'` support requires changing only `SUPPORTED_PLAN_VERSIONS` in the engine — not a contracts package major version bump.
- The engine rejects unknown plan versions at dispatch with a typed error, not a runtime crash.
- Contract tests cover: known version accepted, unknown version rejected, version at boundary of deprecation window accepted with warning.
- An ADR documents the compatibility policy before any new plan version is introduced.

---

## 4. Outbox and event pipeline have no backpressure controls

### Accurate problem statement

The system has no mechanism to:

- Detect that the outbox is growing faster than it is being consumed.
- Throttle new run starts when delivery lag exceeds safe thresholds.
- Alert on snapshot staleness when the projector is falling behind.
- Bound the number of pending events per tenant or per run.

Under burst conditions (scheduled triggers, large tenant batch), the engine continues accepting `startRun` calls and writing events while the outbox worker falls behind. The result is: increasing delivery lag → stale snapshots → UI showing stale state → operator unable to trust what they see. The failure is silent.

The `outboxRateLimiter?` field in engine dependencies is optional, meaning admission control is not enforced. The `RunAccessPolicy.checkRateLimit()` appears in the class diagram but its implementation and enforcement against outbox health are unverified.

### Why this matters

Backpressure is not a performance optimization. It is correctness under load. A system without backpressure gives the operator a false sense of control — they can submit 1000 runs and the system accepts all of them while silently accumulating a delivery backlog that the UI cannot communicate.

### Fix direction

**Backpressure is not an engine concern.** The engine is domain logic. It does not know about outbox buffer depth, delivery worker capacity, or snapshot lag. Embedding backpressure inside `WorkflowEngine` is a separation of concerns violation.

The correct placement:

```
packages/@dvt/delivery/src/backpressure/
  BackpressurePolicy.ts         ← reads outbox metrics, produces admission decision
  BackpressureSnapshot.ts       ← current state: pending count, lag, staleness
  IBackpressureStore.ts         ← port: reads aggregate outbox/snapshot metrics

apps/api/src/application/
  startRunAdmissionGuard.ts     ← calls BackpressurePolicy before invoking the engine
```

The engine receives an admission decision from the API layer. It does not compute it.

#### Metrics required (emitted by outbox and projector workers)

```
dvt.outbox.pending_count          — total pending outbox records
dvt.outbox.pending_count_by_tenant — per-tenant pending count
dvt.outbox.oldest_pending_age_ms  — age of oldest undelivered record
dvt.snapshot.lag_events           — events ahead of latest snapshot, per run
dvt.snapshot.stale_runs_count     — runs with snapshot older than threshold
dvt.lineage.dead_letter_depth     — unrecoverable lineage events in DLQ
```

#### Admission control in the API layer

```typescript
// apps/api/src/application/startRunAdmissionGuard.ts
class StartRunAdmissionGuard {
  async assertAdmissible(tenantId: string): Promise<void> {
    const snapshot = await this.backpressureStore.getTenantSnapshot(tenantId);

    if (snapshot.pendingEventsPerTenant > this.policy.maxPendingEventsPerTenant) {
      throw new TenantBackpressureError(tenantId, snapshot);
    }
    if (snapshot.outboxOldestAgeMs > this.policy.maxOutboxLagMs) {
      throw new SystemBackpressureError(snapshot);
    }
  }
}
```

The engine never sees this guard. The API layer calls it before calling `IWorkflowEngine.startRun()`.

#### Degradation rules (explicit, not implicit)

| Condition                                               | Action                                                           |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| `outbox_oldest_age_ms > 30s`                            | Degrade `enrichRunStatus` — return snapshot-only status          |
| `pending_events_per_tenant > maxPendingEventsPerTenant` | Throttle `startRun` for that tenant — return 429                 |
| `outbox_oldest_age_ms > 120s`                           | Reject all non-critical commands — return 503 with `Retry-After` |
| `snapshot.lag_events > 500 for any run`                 | Emit alert; projector is falling behind                          |

These behaviors must be deterministic and testable. They must not be implicit timeouts or undefined degradation.

### Acceptance criteria

- `dvt.outbox.pending_count` and `dvt.outbox.oldest_pending_age_ms` are emitted and queryable.
- `startRun` returns `429` with a `Retry-After` header when tenant backpressure threshold is exceeded.
- Backpressure policy is configurable per environment and testable with an in-memory backpressure store.
- No backpressure logic exists inside `WorkflowEngine`. The engine remains infrastructure-agnostic.

---

## 5. Event log has no retention, archival, or lifecycle model

### Accurate problem statement

The event log (`run_events` table) is append-only and has no defined lifecycle. At Phase 3 load (500K runs/day, 1000 steps per run), the table accumulates 500M rows/day. At 90-day hot retention, that is 45 billion rows in PostgreSQL with no partitioning schema defined.

What does not exist:

- Partitioning schema for `run_events` (range by `created_at`, subpartitioned by `tenant_id`)
- Cold archival target (S3 + Parquet)
- Archival trigger and schedule
- GDPR erasure strategy for event data
- Outbox record expiration for delivered records
- Dead letter record expiration policy

### Critical constraint: the event log must not be compacted or mutated

Event sourcing requires that events, once persisted, are immutable. Principle #6 of the execution model specification: **"Events are immutable once persisted."**

"Terminal run event consolidation" — merging a run's events into a single snapshot and deleting the event log — violates this principle. It destroys replay capability, historical auditability, and the ability to diagnose failures that occurred months ago. Do not do this.

The correct lifecycle strategy is **archival**, not compaction.

### Fix direction

#### Storage tiers

**Hot (PostgreSQL, partitioned)**

- Active runs and all their events
- Runs terminated within the retention window (default: 90 days)
- All outbox records pending delivery or failed within the retry window
- Active snapshots for all runs

**Warm (PostgreSQL, read-optimized, older partitions)**

- Terminal run snapshots pinned at terminal state
- Aggregate read models for dashboard queries
- Query-optimized projections

**Cold (S3 + Parquet, immutable)**

- Complete event log for runs older than the hot retention window
- Exported as Parquet partitioned by `(tenant_id, year, month)` for Athena/BigQuery
- Queryable for long-term audit and analytics
- Subject to GDPR erasure policy (partition deletion at tenant offboarding)

#### What can be deleted from PostgreSQL (without violating immutability)

These are not domain events. They can be deleted after their purpose is served:

- Outbox records marked `delivered` older than 30 days — delivery is confirmed, the underlying event in `run_events` is preserved
- Dead letter records expired by policy (e.g. 90 days after DLQ entry) — after manual review window closes
- Intermediate snapshots for runs that have been archived to cold storage — the terminal snapshot is preserved; intermediate ones are redundant

#### Archival process

```
1. Partition creation cron: creates next month's run_events partition 7 days in advance
2. Archival job (runs nightly):
   - Identifies partitions older than 90 days
   - Exports partition to S3 as Parquet: s3://dvt-archive/{tenant_id}/{year}/{month}/events.parquet
   - Verifies Parquet row count matches Postgres partition row count
   - Pins terminal snapshot for all runs in the partition (writes to run_snapshots if not present)
   - Drops the partition from Postgres
3. Athena external table over s3://dvt-archive/ for historical audit queries
```

#### GDPR erasure

The event log is append-only during normal operation. Erasure requires a defined strategy:

**Option A — Tombstone event (recommended for granular erasure):**
Define a `RunDataRedacted` event type. When the projector encounters it, it nullifies the specified fields in the projected snapshot. Raw event fields are updated to `[REDACTED]` in `run_events` via `IRunStateStore.redactRunData()` — the only permitted mutation on the event log, gated by a dedicated method with an audit record.

**Option B — Partition-level deletion (for full tenant offboarding):**
Drop all partitions belonging to the offboarded tenant. Valid only when the tenant is fully deprovisioned and no runs are active.

Neither option is currently implemented. Option A must exist before any production tenant data is stored.

#### Postgres partitioning schema (required before Phase 3)

```sql
-- run_events partitioned by month, subpartitioned by tenant
CREATE TABLE run_events (
  tenant_id     TEXT NOT NULL,
  run_id        TEXT NOT NULL,
  run_seq       BIGINT NOT NULL,
  event_type    TEXT NOT NULL,
  emitted_at    TIMESTAMPTZ NOT NULL,
  persisted_at  TIMESTAMPTZ NOT NULL,
  -- ... other fields
  PRIMARY KEY (tenant_id, run_id, run_seq)
) PARTITION BY RANGE (persisted_at);

-- Monthly partition, created in advance by cron:
CREATE TABLE run_events_2026_04 PARTITION OF run_events
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01')
  PARTITION BY HASH (tenant_id);
```

### Acceptance criteria

- `run_events` is partitioned by `(persisted_at_month, tenant_id)` before any production data is written.
- Archival job exports to S3 Parquet, verifies row count, and drops the partition.
- Athena external table queries archived events correctly.
- GDPR erasure strategy is documented in an ADR and implemented as `IRunStateStore.redactRunData()`.
- Outbox delivered records are purged on a defined schedule. The schedule is configurable.
- No compaction or mutation of the domain event log occurs under any circumstance.

---

## Priority order

This is the delivery priority order — the sequence that makes the system usable and safe for production, in dependency order.

1. **Query API endpoints** — unblocks UI, unblocks operator observability, makes Phase 1 demonstrable end-to-end
2. **`logicalAttemptId` authority ADR** — must be resolved before any recovery or retry work begins; changing this later requires re-deriving idempotency keys
3. **Business-level recovery flow** — depends on resolved `logicalAttemptId` authority and working query endpoints (operators must be able to see a failed run before recovering it)
4. **`planVersion` compatibility matrix** — must be in place before any plan schema changes; blocks rolling deployments otherwise
5. **Backpressure controls** — needed before Phase 3 load; metrics must be implemented early so the thresholds can be calibrated on real data
6. **Retention and archival model** — must be designed before Phase 3, but partitioning schema must be implemented before production data is stored

### What does not go first

- Multi-engine parity (Conductor) — paper claim; zero POC; delay until the state-equivalence framing is accepted in ADR-0003
- Cost attribution UI — no data pipeline; do not build the UI until `QUERY_TAG` + `QUERY_HISTORY` prototype works
- Plugin marketplace — sandbox is DRAFT; third-party code in-process with the engine before a sandbox exists is a security liability
- Observability layering beyond what is needed for backpressure metrics — do not build dashboards before the core read API exists
