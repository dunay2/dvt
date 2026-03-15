---
title: G7 - AI Execution Tracker
status: Active
owner: Delivery / Engineering
last_reviewed: 2026-03-14
planning_type: execution-plan
---

# G7 - AI Execution Tracker

Operational tracker for AI-assisted execution of the remaining `G7` work.

## Authority Rule

`G7` does not yet have a dedicated gap spec file. Until one exists, use these
sources in this precedence order:

- Normative drivers:
  - [ADR-0004 - Event Sourcing Strategy](../../adr/ADR-0004-event-sourcing-strategy.md)
  - [ADR-0015 - getRunStatus Read Model Separation](../../adr/ADR-0015-getRunStatus-read-model-separation.md)
  - [Execution Semantics Contract v2.0.0](../../architecture/engine/contracts/engine/ExecutionSemantics.v2.0.md)
  - [State Store Overview](../../architecture/engine/contracts/state-store/overview.md)
- Architectural context:
  - [DVT+ Execution Model Specification](../execution-model/dvt-execution-model.md)
  - [Engine C4 / Maturity Notes](../../architecture/engine/c4-engine.md)
- Active status docs:
  - [DVT+ - Gap Execution Plans](GAP_EXECUTION_PLANS.md)
  - [Current Status](../../architecture/system-delivery-status.md)

This file is not a second source of truth.

Its job is narrower:

- record the current execution pointer for AI work;
- pin the design constraints already fixed by accepted ADRs/contracts;
- isolate the open scope questions that still need sign-off before code;
- define the first implementation slice and validation lane once scope is fixed.

If `G7` needs a dedicated canonical spec after this planning pass, create that
spec before the first substantial implementation slice and then sync this
tracker to it.

## Current Pointer

Update this section before any substantial implementation turn.

- `as_of`: `2026-03-14`
- `gap`: `G7`
- `epic`: `G7`
- `current_focus`: `G7.2 — standalone projector runtime (catch-up worker)`
- `state`: `Active`
- `currently_working_on`: `G7.2 design and implementation — ProjectorWorkerRuntime in @dvt/delivery, apps/projector-worker composition root, listStaleSnapshotRunIds query`
- `next_after_current`: `G7.3 provider run-id reconciliation (updateProviderRunRef after adapter.startRun)`
- `blocking_dependencies`: `none — G7.1 closed; G7.2 design fixed in stage detail below`
- `last_completed`: `G7.1 closed 2026-03-14 — migration 004, rebuildSnapshot on IRunStateStore (contracts + engine-internal), PostgresStateStoreAdapter, InMemoryRunStateStore, InMemoryTxStore, snapshot_status generated column + index, listRuns query updated, DVT_ADMIN_ROUTES_ENABLED flag, POST /admin/runs/:runId/rebuild-snapshot; 165/165 engine tests + 35/35 dvt-api tests pass`

## Remaining G7 Roadmap

- `Slice 0 / planning` — **Done** 2026-03-13
  scope: write the think-first baseline, identify governing invariants, and
  reduce `G7` from a broad label into implementation-sized slices
  exit signal: tracker committed; sources, options, and open questions explicit
- `Slice 1 / run_snapshots formalization + rebuildSnapshot API` — **Done** 2026-03-14
  scope: promote `run_snapshots` DDL to a numbered migration, add
  `rebuildSnapshot` to `IRunStateStore`, implement it in the Postgres adapter,
  add a generated-column index on status, and wire an admin rebuild endpoint
  exit signal: `pnpm --filter @dvt/engine test` 165/165 PASS;
  `pnpm --filter dvt-api test` 35/35 PASS;
  `@dvt/engine build`, `@dvt/adapter-postgres build`, `dvt-api build` all clean
- `Slice 2 / standalone projector runtime`
  scope: implement a catch-up projector worker in `apps/projector-worker` that
  polls for runs with stale snapshots and calls `rebuildSnapshot`; expose a
  lag signal and basic health check
  exit signal: worker starts, processes a backlog, and resumes after restart
- `Slice 3 / provider run-id reconciliation + closeout prep`
  scope: address the `providerRunId` approximation residual from the
  `estimateRunRef` path; update `run_metadata.provider_run_id` after
  `adapter.startRun()` returns the real `firstExecutionRunId`
  exit signal: `run_metadata.provider_run_id` reflects the actual Temporal
  execution id for all new runs
- `Slice 4 / evidence + closeout`
  scope: Evidence Doc, sync all status docs, mark `G7` Closed
  exit signal: `G7` row is Closed in all status docs; Evidence Doc committed

## Execution Protocol For AI

1. Before code changes, update [Current Pointer](#current-pointer).
2. If scope or acceptance changes, update the governing spec first if one
   exists; otherwise update this tracker and then sync
   [GAP_EXECUTION_PLANS.md](GAP_EXECUTION_PLANS.md).
3. Keep each implementation turn tied to one slice at a time.
4. Do not treat the outbox as the trigger source for projector read models
   unless the governing docs are changed first.
5. Record the touched-files plan before the first code edit of each slice.
6. After each validation batch, append an execution-log entry with exact
   commands and pass/fail state.
7. When a slice closes, create `docs/planning/closeouts/<slice>-closeout.md`
   first, then sync this tracker, [GAP_EXECUTION_PLANS.md](GAP_EXECUTION_PLANS.md),
   and any affected architecture/runbook docs in the same change. The closeout
   file is the gate — a slice is not done until the file exists and its
   "Docs synced" checklist is fully checked.

## Stage Detail

### G7.0 - Think-first baseline

Think-first analysis:

- problem summary:
  - `SnapshotProjector` exists only as in-process projection logic inside
    `@dvt/engine`, while `G7` requires a standalone projector/read-model path
    for production reads
  - the current repo has no standalone projector host, no persisted projector
    checkpoint/watermark owner, and no denormalized read-model tables/indexes
    explicitly serving production query paths
- root cause:
  - projection semantics exist, but they are still embedded in the engine/state
    path rather than owned by a dedicated operational worker and read-model
    persistence boundary
- constraints and invariants:
  - default `getRunStatus` MUST remain projected-state only and MUST NOT call
    the provider (`ADR-0015`)
  - projectors MUST order by `runSeq`, not timestamps, and MUST advance
    progress by persisted event sequence (`ExecutionSemantics.v2.0`)
  - snapshots are derived from persisted events and may lag, but must remain
    consistent with a prefix of the event log (`State Store Overview`)
  - the state store is not the business read-model service by itself (`State Store Overview`)
  - the outbox is for atomic delivery intent and MUST NOT be treated as a
    general projector trigger bus (`State Store Overview`)
  - operational worker loops belong at the app/runtime boundary, not inside the
    engine core (`dvt-execution-model.md`)
  - the first slice must target one concrete production read path, not a vague
    "dashboard/read model" umbrella
- options considered:
  - keep projection in-process and only add more snapshot APIs to the state store
  - drive the standalone projector from outbox-delivered events
  - build a standalone projector that polls/replays persisted ordered events
    from the state store and writes denormalized read models in adapter-backed
    storage
- selected baseline and rationale:
  - standalone projector host consumes persisted ordered events from the state
    store, not the outbox
  - rationale: persisted events plus `runSeq` are already the normative
    projection authority; this preserves deterministic replay, keeps provider
    status out of the default read path, and avoids abusing the outbox as a
    business read-model bus
- rejected alternatives:
  - "state-store only" was rejected because `G7` explicitly requires standalone
    projector/read-model ownership and the state store docs say the store is not
    the business read-model service by itself
  - "outbox-driven projector" was rejected because outbox exists for delivery
    intent, while projector ordering/replay authority belongs to persisted run
    events and `runSeq`
- first open questions requiring sign-off:
  - which read path lands first: single-run status only, run listing/indexes, or
    step-level views
  - where the operational worker lives: `apps/projector-worker`,
    `apps/read-model-worker`, or another dedicated service name
  - whether a dedicated read-model/checkpoint port must be formalized in
    `@dvt/contracts` before implementation
  - what rebuild surface is required for closure: CLI only, admin HTTP, or both

Current pre-implementation brief:

- scope:
  - reduce `G7` to a first vertical slice centered on one read path
  - define the standalone projector host boundary and its checkpoint model
  - define the first denormalized read-model table/index set
  - keep projection reduction logic in reusable pure functions; do not move
    event semantics out of the engine core unless governance changes
- touched files or paths for the first code slice if approved:
  - `docs/planning/gaps/G7-STANDALONE-PROJECTOR-SPEC.md` (new, if needed)
  - `apps/**` for the standalone projector host/runtime
  - `packages/@dvt/adapter-postgres/src/**` for checkpoint/read-model storage
  - `packages/@dvt/contracts/src/**` for any formal read-model/checkpoint ports
  - `packages/@dvt/engine/src/core/SnapshotProjector.ts` only if pure reduction
    helpers need extraction/reuse
  - `docs/architecture/system-delivery-status.md`
  - `docs/planning/gaps/GAP_EXECUTION_PLANS.md`
- expected outcome of the first implementation slice:
  - one dedicated process can resume from a persisted checkpoint/watermark and
    project persisted events deterministically
  - at least one production read path is explicitly assigned to a denormalized
    read model instead of implicit in-process replay
  - replay/rebuild semantics are explicit enough to validate and document
- validation plan for the planning slice:
  - `pnpm lint:md`
  - `pnpm docs:quality:check`
  - `pnpm docs:canonical:check`

### G7.1 — run_snapshots formalization + rebuildSnapshot API

**Open question resolutions (fixed in this session):**

- which read path first: recovery/rebuild for `run_snapshots` — the happy-path
  inline maintenance already works; the missing capability is the ability to
  repair or rebuild a snapshot when inline maintenance fails
- where the worker lives: `apps/projector-worker` for Slice 2; Slice 1 stays
  inside existing packages with no new app
- whether a port must be formalized in `@dvt/contracts`: no — `rebuildSnapshot`
  belongs on `IRunStateStore` in `@dvt/engine`; a separate contracts port is
  not justified for this scope
- rebuild surface for Slice 1: admin HTTP endpoint on `dvt-api`; CLI in Slice 4
- provider run-id residual: documented, not fixed in Slice 1 (own Slice 3)

**Codebase findings that drive design:**

- `run_snapshots` table (`run_id TEXT PK`, `snapshot JSONB`, `last_run_seq
INTEGER`, `updated_at TIMESTAMPTZ`) exists but is created by
  `ensureRunSnapshotsTable()` called inside `migrate()` — it is not a numbered
  SQL migration file; this means schema managers outside `PostgresStateStoreAdapter`
  cannot track or replay it
- `appendEventsTxWithClient` updates `run_snapshots` inline in the same Postgres
  transaction as the event append — so `last_run_seq` in the snapshot row equals
  the max `run_seq` in `run_events` for that run under normal operation
- `getSnapshot(tenantId, runId)` exists on `IRunStateStore` and is used by
  `WorkflowEngine.getRunStatus()` and `enrichRunStatus()` — the O(1) read path
  is already in production
- `listRuns()` already joins `run_snapshots` for status-filtered listing via
  `s.snapshot->>'status' = $1` — a JSONB expression query, not an index-backed
  lookup; under high volume this becomes a sequential scan
- `listEvents()` has `afterSeq` keyset cursor and `limit` — the interface
  supports incremental pagination, which `rebuildSnapshot` will use
- `SnapshotProjector.applyRunEvent` is already exported as a pure function from
  `@dvt/engine/src/core/SnapshotProjector.ts` and now throws
  `InvalidStateTransitionError` on terminal-state rewrites; `rebuildSnapshot`
  must replay from `runSeq=0` to avoid triggering those guards on valid history
- `appendAndEnqueueTx` (not `appendEventsTxWithClient`) is the public interface
  that triggers inline snapshot update; `bootstrapRunTx` also triggers it at
  run creation

Think-first analysis:

- problem summary:
  - `run_snapshots` DDL lives in runtime code, not in a numbered migration, so
    external tooling (e.g., `psql` migration runners, schema diff tools) does
    not track it; this blocks formal schema governance for G7 closeout
  - there is no recovery API: if a snapshot row is corrupted or `ensureRunSnapshotsTable`
    was never called for a legacy deployment, `getSnapshot` returns `null` and
    `getRunStatus` falls back to full replay indefinitely
  - `listRuns` with status filter is a JSONB expression scan that will not
    scale to tens of thousands of runs without an index on the status field
- root cause:
  - `run_snapshots` was introduced as an internal incremental optimization
    rather than as a first-class schema-tracked read model; no API or migration
    was defined for recovery
- constraints and invariants:
  - rebuild MUST replay from `runSeq=1` and apply events in `run_seq ASC`
    order; it MUST NOT use `emittedAt` timestamps for ordering (ADR-0004)
  - `applyRunEvent` terminal guards must be bypassed during full rebuild — use
    the raw `applyEventToSnapshot` pattern in `PostgresStateStoreAdapter` (no
    terminal guard) rather than the engine's `applyRunEvent` with guards
  - rebuild MUST be idempotent: calling it twice for the same run produces the
    same snapshot
  - `rebuildSnapshot` must not hold a long transaction; use keyset pagination
    via `listEvents(afterSeq)` inside a single-client read-then-write cycle
  - the new status index must be a generated column (`STORED`) so it stays in
    sync with the JSONB without application-level maintenance
  - migration numbering: `004_run_snapshots_and_status_index.sql`
- options considered:
  - option A: keep inline DDL, just add `rebuildSnapshot` as a method
    — does not fix schema tracking; rejected for governance reasons
  - option B: move DDL to numbered migration, add `rebuildSnapshot` on
    `IRunStateStore`, add generated column index — fixes all three problems
    in one coherent slice
  - option C: extract a separate `IReadModelStore` port in `@dvt/contracts`
    — premature abstraction; the store port already exists; rejected for
    this scope
- selected option and rationale:
  - option B; the `run_snapshots` table and its status index must be first-class
    schema citizens before the standalone projector can rely on them
- rejected alternatives:
  - option A rejected: governance gap not closed; index missing
  - option C rejected: `@dvt/contracts` port adds complexity without benefit
    at this scale

Pre-implementation brief:

- scope:
  - add `004_run_snapshots_and_status_index.sql` that `CREATE TABLE IF NOT
EXISTS run_snapshots` and adds a `snapshot_status TEXT GENERATED ALWAYS AS
(snapshot->>'status') STORED` column plus an index on `(snapshot_status,
run_id)` with a partial filter for non-null status
  - update `ensureRunSnapshotsTable` in `PostgresStateStoreAdapter` to add the
    generated column if it does not exist (compatibility with existing tables)
  - add `rebuildSnapshot(tenantId: string, runId: string): Promise<WorkflowSnapshot>`
    to `IRunStateStore` in `packages/@dvt/engine/src/ports/IRunStateStore.ts`
  - implement `rebuildSnapshot` in `PostgresStateStoreAdapter`: read all events
    via `listEvents` (paginated by `afterSeq`), apply each with the local
    `applyEventToSnapshot` handler map (no terminal guards), write via
    `persistSnapshot`, return the rebuilt snapshot
  - add `InMemoryRunStateStore.rebuildSnapshot` for test completeness: reads
    in-memory events, applies them, updates the in-memory snapshot map
  - add a `POST /admin/runs/:runId/rebuild-snapshot` route in `dvt-api` behind
    a new `DVT_ADMIN_ROUTES_ENABLED` env flag; calls `rebuildSnapshot` via the
    engine state store; returns `{ runId, status, lastRunSeq }`
  - update `listRuns` query in `PostgresStateStoreAdapter` to use
    `snapshot_status = $1` instead of `snapshot->>'status' = $1` when the
    generated column is available (guarded by a schema version check or
    consistent migration order)
- touched files or paths:
  - `packages/@dvt/adapter-postgres/migrations/004_run_snapshots_and_status_index.sql`
    (new)
  - `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts` —
    `ensureRunSnapshotsTable`, `listRuns` query update, new `rebuildSnapshot`
    public method
  - `packages/@dvt/engine/src/ports/IRunStateStore.ts` — add
    `rebuildSnapshot` method signature
  - `packages/@dvt/engine/src/state/InMemoryRunStateStore.ts` — implement
    `rebuildSnapshot`
  - `apps/api/src/plugins/env.ts` — add `DVT_ADMIN_ROUTES_ENABLED`
  - `apps/api/src/entrypoints/http/routes/adminRoutes.ts` (new)
  - `apps/api/src/app.ts` — register admin routes if flag is set
  - test files for the new Postgres `rebuildSnapshot` method and admin route
- expected outcome:
  - `pnpm --filter @dvt/adapter-postgres test` green with `rebuildSnapshot`
    tested for: clean run, corrupted snapshot (overwrite), idempotent call,
    run with no events (returns `PENDING`)
  - `pnpm --filter dvt-api test` green with admin route tested
  - `listRuns` with status filter uses the generated column index (verified by
    `EXPLAIN` in a Postgres integration test)
- validation plan:
  - `pnpm --filter @dvt/engine typecheck`
  - `pnpm --filter @dvt/engine test`
  - `pnpm --filter @dvt/adapter-postgres typecheck`
  - `pnpm --filter @dvt/adapter-postgres test`
  - `pnpm --filter dvt-api typecheck`
  - `pnpm --filter dvt-api test`

---

### G7.2 — Standalone projector runtime

Think-first analysis:

- problem summary:
  - after Slice 1, snapshot repair is on-demand (admin call or fallback replay);
    there is no autonomous process that detects stale or missing snapshots and
    heals them without human intervention
  - a long-running deployment may accumulate runs whose snapshots are `null`
    (if the inline update crashed between event commit and snapshot upsert) with
    no self-healing path
- constraints and invariants:
  - the standalone projector must NOT consume the outbox (ADR rule in this
    tracker); it reads from `run_events` directly via `listEvents` or a new
    polling query
  - the worker must resume from a durable watermark after restart; it must not
    replay all events from scratch on every boot
  - stale-snapshot detection query: `SELECT m.run_id FROM run_metadata m LEFT
JOIN run_snapshots s ON s.run_id = m.run_id WHERE s.run_id IS NULL OR
s.last_run_seq < (SELECT MAX(run_seq) FROM run_events WHERE run_id =
m.run_id) LIMIT $batchSize` — or an approximation using `updated_at` lag
  - the worker must expose a `lag` metric (number of runs with stale snapshots)
    for operational observability
  - it MUST NOT acquire the per-run advisory lock used by `appendEventsTxWithClient`;
    it reads and writes in its own transaction
- options considered:
  - option A: embed a projection catch-up loop inside the existing
    `dvt-outbox-worker` — reuses runtime, but couples delivery and projection
    concerns; rejected
  - option B: a new `apps/projector-worker` app, thin composition root,
    runtime loop in `packages/@dvt/delivery` alongside `OutboxWorkerRuntime`
  - option C: add a projection loop to `dvt-api` as a background task —
    couples the API to projection; rejected
- selected option and rationale:
  - option B; follows the established G5 pattern (`dvt-outbox-worker` /
    `OutboxWorkerRuntime`); delivery package owns operational loop abstractions
- rejected alternatives:
  - option A rejected: mixed concerns; delivery outbox is not a projector bus
  - option C rejected: API and projection have separate scalability profiles

Pre-implementation brief:

- scope:
  - add `ProjectorWorkerRuntime` to `packages/@dvt/delivery/src/application/`
    with a `runOnce(stateStore, batchSize, maxIdleMs)` method; calls
    `rebuildSnapshot` for each stale run found; emits a `lag` count log entry
  - add `apps/projector-worker/` composition root: reads env, creates
    `PostgresStateStoreAdapter`, instantiates `ProjectorWorkerRuntime`, starts
    poll loop
  - add `DVT_PROJECTOR_WORKER_ENABLED`, `DVT_PROJECTOR_BATCH_SIZE`, and
    `DVT_PROJECTOR_POLL_INTERVAL_MS` env vars to `apps/api/src/plugins/env.ts`
    (or a dedicated `apps/projector-worker/src/env.ts`)
  - add a `GET /healthz` endpoint to `apps/projector-worker` exposing lag count
- touched files or paths:
  - `packages/@dvt/delivery/src/application/ProjectorWorkerRuntime.ts` (new)
  - `packages/@dvt/delivery/src/index.ts` — export new runtime
  - `apps/projector-worker/` (new app: `package.json`, `src/server.ts`,
    `src/env.ts`, `tsconfig.json`)
  - `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts` — add
    `listStaleSnapshotRunIds(batchSize: number): Promise<string[]>` query
  - `packages/@dvt/engine/src/ports/IRunStateStore.ts` — add
    `listStaleSnapshotRunIds?(batchSize: number): Promise<string[]>` optional
    method
  - `docs/architecture/system-delivery-status.md`
  - test files for `ProjectorWorkerRuntime`
- expected outcome:
  - worker starts, queries for stale runs, calls `rebuildSnapshot` for each,
    logs lag, and sleeps between polls
  - worker resumes correctly after process restart (no double-rebuild of already
    current runs)
- validation plan:
  - `pnpm --filter @dvt/delivery test`
  - `pnpm --filter projector-worker typecheck`
  - manual smoke test: corrupt a snapshot row directly in Postgres, start
    worker, verify snapshot is repaired within one poll cycle

---

### G7.3 — Provider run-id reconciliation

Think-first analysis:

- problem summary:
  - `WorkflowEngine.startRun()` now calls `bootstrapRunTx` before
    `adapter.startRun()` when `adapter.estimateRunRef` is available; the
    estimated `providerRunId` used for bootstrapping is `ctx.runId`, which is
    the DVT run id — not Temporal's `firstExecutionRunId` (a UUID assigned by
    Temporal at workflow start time)
  - `run_metadata.provider_run_id` therefore stores an approximation for all
    runs using the pre-bootstrap path; any consumer that depends on the real
    Temporal execution id (e.g., a link to Temporal UI by execution id) will
    get the wrong value
  - `run_metadata.provider_workflow_id` (`ctx.runId`) is correct because
    `toTemporalWorkflowId(runId) = runId` (identity function); routing always
    uses `workflowId`, not `runId`, so no functional impact
- constraints and invariants:
  - updating `provider_run_id` after `startRun()` must be idempotent; a retry
    of `startRun()` that reaches `adapter.startRun()` again must not create a
    second bootstrap attempt (the idempotency guard in `bootstrapRunTx` already
    prevents this for the bootstrap itself)
  - the update must happen in the engine's `_startRunCore` path, after
    `adapter.startRun()` returns the real ref, only if the adapter used the
    pre-bootstrap path and the returned `runRef.runId` differs from the
    estimated `runId`
  - no new DB migration is needed — `provider_run_id` column already exists
- options considered:
  - option A: add `updateProviderRunId(runId, realProviderRunId)` to
    `IRunStateStore`; call it in `_startRunCore` after `adapter.startRun()`
    when using the pre-bootstrap path and when the ids differ
  - option B: accept the approximation as a known residual and document it;
    the column exists for correlation/observability, not for routing
  - option C: require the real `providerRunId` to match the estimated
    `runId` by design — change `TemporalAdapter.startRun()` to use
    `ctx.runId` as `firstExecutionRunId` hint (not possible with Temporal SDK)
- selected option and rationale:
  - option A; the residual is a real data quality gap when users inspect
    `run_metadata` and compare with the Temporal UI by execution id; option A
    is a targeted, minimal fix with no schema changes
- rejected alternatives:
  - option B rejected: acceptable as a short-term residual but not for closure
  - option C rejected: Temporal SDK does not support caller-supplied execution ids

Pre-implementation brief:

- scope:
  - add `updateProviderRunRef?(runId: string, providerRunId: string):
Promise<void>` (optional) to `IRunStateStore`
  - implement in `PostgresStateStoreAdapter`: `UPDATE run_metadata SET
provider_run_id = $2 WHERE run_id = $1`
  - in `WorkflowEngine._startRunCore`, after `adapter.startRun()` returns
    `runRef` in the pre-bootstrap branch, call `stateStore.updateProviderRunRef`
    if `runRef.runId !== estimatedRef.runId`
  - implement `InMemoryRunStateStore.updateProviderRunRef` as a no-op or
    in-memory update for test compatibility
- touched files or paths:
  - `packages/@dvt/engine/src/ports/IRunStateStore.ts` — add optional method
  - `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts` —
    implement `updateProviderRunRef`
  - `packages/@dvt/engine/src/state/InMemoryRunStateStore.ts` — implement
  - `packages/@dvt/engine/src/core/WorkflowEngine.ts` — call update in the
    pre-bootstrap branch of `_startRunCore`
  - `packages/@dvt/engine/test/core/WorkflowEngine.test.ts` — assert that
    `updateProviderRunRef` is called when adapter returns a different `runId`
- expected outcome:
  - `run_metadata.provider_run_id` stores the actual Temporal
    `firstExecutionRunId` for all new runs; existing runs retain their
    approximation (acceptable — no backfill)
  - `pnpm --filter @dvt/engine test` green with new assertion
- validation plan:
  - `pnpm --filter @dvt/engine typecheck`
  - `pnpm --filter @dvt/engine test`
  - `pnpm --filter @dvt/adapter-postgres typecheck`
  - `pnpm --filter @dvt/adapter-postgres test`

---

### G7.4 — Evidence + closeout

Pre-implementation brief:

- scope:
  - write `docs/evidence/ED-2026XXXX-g7-standalone-projector-readmodels.md`
  - update `docs/architecture/system-delivery-status.md`:
    - Read models row: Partial → Closed
    - Executive Summary G7 row: Partial → Closed
  - update `docs/planning/gaps/GAP_EXECUTION_PLANS.md`:
    - G7 row: Partial → Closed; add Delivered, test_paths, verification_cmd
  - update this tracker: state → Closed, update Execution Log
- touched files or paths:
  - `docs/evidence/ED-2026XXXX-g7-standalone-projector-readmodels.md` (new)
  - `docs/architecture/system-delivery-status.md`
  - `docs/planning/gaps/GAP_EXECUTION_PLANS.md`
  - `docs/planning/gaps/G7-AI-EXECUTION-TRACKER.md`
- expected outcome:
  - `G7` row is Closed in all status docs
  - Evidence Doc satisfies the minimum tuple: `canonical_spec`,
    `code_paths`, `test_paths`, `verification_cmd`
- validation plan:
  - `pnpm lint:md`
  - `pnpm docs:quality:check`
  - `pnpm docs:canonical:check`

---

## Execution Log

- `2026-03-13` `G7` `planning`
  summary: created `G7-AI-EXECUTION-TRACKER.md`; confirmed that `G7` has no
  dedicated spec file yet, but it is not zero-context; normalized the governing
  drivers around `ADR-0004`, `ADR-0015`, `ExecutionSemantics.v2.0`, the state
  store overview, and current architecture/status docs; selected the baseline
  direction that the standalone projector must consume persisted ordered events
  from the state store rather than the outbox
  validation: repo inspection of `GAP_EXECUTION_PLANS.md`,
  `system-delivery-status.md`, `SnapshotProjector.ts`,
  `WorkflowEngine.getRunStatus`, `ExecutionSemantics.v2.0.md`,
  `ADR-0004`, `ADR-0015`, `State Store Overview`, and `c4-engine.md`
- `2026-03-14` `G7` `hardening`
  summary: hardened the in-process projection baseline while keeping `G7`
  partial; `SnapshotProjector` now rejects terminal-state rewrites with
  `InvalidStateTransitionError`; `WorkflowEngine.startRun()` now supports a
  pre-bootstrap path for adapters that provide `estimateRunRef`; synced active
  status docs and recorded the remaining residual around provider run-id
  reconciliation for providers that only know the execution-level id after
  start
  validation: `pnpm --filter dvt-api typecheck` PASS;
  `pnpm --filter @dvt/planner build` PASS;
  `pnpm --filter @dvt/adapter-temporal build` PASS;
  `pnpm --filter dvt-api test` PASS (`34/34`);
  `pnpm --filter @dvt/engine test` PASS (`225/225`);
  `pnpm --filter @dvt/adapter-temporal test` PASS (`87/87`);
  `pnpm exec eslint apps/api/src/app.ts apps/api/src/application/services/WorkflowEngineFactory.ts apps/api/test/application/services/WorkflowEngineFactory.test.ts packages/@dvt/adapter-temporal/src/TemporalAdapter.ts packages/@dvt/engine/test/core/WorkflowEngine.test.ts packages/@dvt/engine/test/core/SnapshotProjector.transitions.test.ts packages/@dvt/planner/src/domain/types.ts` PASS;
  `pnpm exec prettier --check apps/api/src/app.ts apps/api/src/application/services/WorkflowEngineFactory.ts apps/api/test/application/services/WorkflowEngineFactory.test.ts packages/@dvt/adapter-temporal/src/TemporalAdapter.ts packages/@dvt/engine/test/core/WorkflowEngine.test.ts packages/@dvt/engine/test/core/SnapshotProjector.transitions.test.ts packages/@dvt/planner/src/domain/types.ts docs/architecture/system-delivery-status.md docs/planning/gaps/GAP_EXECUTION_PLANS.md docs/planning/status/canonical-doc-code-matrix.md docs/planning/gaps/G7-AI-EXECUTION-TRACKER.md "docs/planning/reviews/20260314 review.md"` PASS;
  `pnpm exec markdownlint-cli2 docs/architecture/system-delivery-status.md docs/planning/gaps/GAP_EXECUTION_PLANS.md docs/planning/status/canonical-doc-code-matrix.md docs/planning/gaps/G7-AI-EXECUTION-TRACKER.md "docs/planning/reviews/20260314 review.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc` PASS;
  `pnpm docs:quality:check` PASS with pre-existing non-English warnings in
  `docs/archive/**`, `docs/planning/gaps/GAP_EXECUTION_PLANS.md`,
  `docs/planning/reviews/**`, and
  `docs/planning/status/canonical-doc-code-matrix.md`;
  `pnpm docs:canonical:check` PASS

- `2026-03-14` `G7.1` `implementation — run_snapshots formalization + rebuildSnapshot API`
  summary: G7.1 fully delivered; migration `004_run_snapshots_and_status_index.sql` added
  with `snapshot_status TEXT GENERATED ALWAYS AS (snapshot->>'status') STORED` column and
  B-tree index; `rebuildSnapshot(tenantId, runId)` added to `IRunStateStore` in both the
  public contracts interface (`@dvt/contracts`) and the engine-internal port; implemented in
  `PostgresStateStoreAdapter` (advisory lock + runSeq ASC replay + `persistSnapshot`),
  `InMemoryRunStateStore`, and `InMemoryTxStore`; `ensureRunSnapshotsTable` updated with
  generated column for fresh databases; `ensureCompatibilityColumns` adds `snapshot_status`
  for existing tables; `ensureIndexes` adds `run_snapshots_snapshot_status_idx`; `listRuns`
  status filter updated from `snapshot->>'status'` to `snapshot_status` (now index-backed);
  `DVT_ADMIN_ROUTES_ENABLED` env flag added; `POST /admin/runs/:runId/rebuild-snapshot` route
  wired in `app.ts`; direct HTTP coverage added for the admin rebuild endpoint
  validation: `pnpm --filter @dvt/engine build` PASS; `pnpm --filter @dvt/adapter-postgres build` PASS;
  `pnpm --filter dvt-api build` PASS; `pnpm --filter dvt-api test` PASS (35/35);
  `pnpm --filter @dvt/engine test` PASS (165/165)

- `2026-03-14` `G7` `planning — Slices 1-4 detailed`
  summary: resolved all open questions from G7.0; inspected codebase to
  validate design assumptions; key findings: `run_snapshots` exists and is
  maintained inline per transaction but is not in a numbered migration and has
  no generated-column index; `IRunStateStore` has no `rebuildSnapshot` method;
  `listRuns` status filter is a JSONB expression scan; `SnapshotProjector.applyRunEvent`
  is already exported and pure; provider run-id residual confirmed (`providerRunId
= ctx.runId` approximation for estimateRunRef path); detailed think-first
  analysis and pre-implementation briefs written for G7.1 (run_snapshots
  formalization + rebuildSnapshot API), G7.2 (standalone projector runtime),
  G7.3 (provider run-id reconciliation), G7.4 (evidence + closeout); tracker
  Current Pointer and Roadmap updated; G7.0 marked Done
  validation: repo inspection of `PostgresStateStoreAdapter.ts`,
  `IRunStateStore.ts`, `SnapshotProjector.ts`, `001_init.sql`,
  `003_outbox_shard_retry_and_ordering.sql`, `system-delivery-status.md`,
  `GAP_EXECUTION_PLANS.md`; no code changes in this session
