---
title: Runtime Adapters And Workers Source Gap Report
status: Draft
owner: Architecture / Runtime Adapters
workspace_group:
  - '@dvt/adapter-temporal'
  - '@dvt/adapter-postgres'
  - '@dvt/delivery'
  - '@dvt/state-store'
  - '@dvt/traceability-service'
  - dvt-temporal-worker
  - dvt-outbox-worker
  - dvt-projector-worker
  - dvt-lineage-worker
date: 2026-06-07
last_reviewed: 2026-06-07
planning_type: review
---

# Runtime Adapters And Workers Source Gap Report

## Scope

This report covers the runtime execution infrastructure around DVT's execution
core:

```text
Engine -> Temporal adapter / Postgres adapter -> workers -> delivery/projector/lineage -> state-store/artifacts
```

The assessment is source-grounded. It focuses on whether runtime infrastructure
is explicit, observable, retry-safe, tenant-safe, and still replaceable.

## Sources inspected

- `packages/@dvt/adapter-temporal/package.json`
- `packages/@dvt/adapter-temporal/src/index.ts`
- `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
- `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`
- `packages/@dvt/adapter-temporal/src/activities/stepActivityDispatcher.ts`
- `packages/@dvt/adapter-postgres/package.json`
- `packages/@dvt/adapter-postgres/src/index.ts`
- `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`
- `packages/@dvt/delivery/package.json`
- `packages/@dvt/delivery/src/index.ts`
- `packages/@dvt/delivery/src/application/OutboxWorker.ts`
- `packages/@dvt/delivery/src/application/ProjectorWorkerRuntime.ts`
- `packages/@dvt/state-store/package.json`
- `packages/@dvt/state-store/src/index.ts`
- `packages/@dvt/traceability-service/package.json`
- `packages/@dvt/traceability-service/src/lineage/LineageWorkerRuntime.ts`
- `apps/temporal-worker/src/server.ts`
- `apps/outbox-worker/src/server.ts`
- `apps/projector-worker/src/server.ts`
- `apps/lineage-worker/src/server.ts`

## Current source facts

### Temporal adapter

`@dvt/adapter-temporal` publishes a large but purposeful public surface:
configuration, capacity SLA policy, client manager, adapter, observed adapter,
workflow mapper, worker host, policy mapper, activities, plugin profiles, circuit
breaker, and workflow input/result types.

`RunPlanWorkflow` is explicitly designed as deterministic Temporal workflow code.
It documents zero `Date.now()`, zero `new Date()`, zero `Math.random()`, zero
`process.env`, and zero Node.js/DOM APIs. It delegates side effects to activities,
registers control signals, resolves execution segments, bootstraps first
execution, executes plan layers, resolves continuation/outcome, and handles
native cancellation/failure finalization.

`StepActivityDispatcher` starts with an empty core registry, treats gateway as a
core activity, dispatches plugin activities by step kind, supports test override
executors, and throws permanent failure for unsupported or missing step kinds.

### Postgres adapter

`@dvt/adapter-postgres` publishes a broad transactional state-store surface:
run event types, outbox storage, run state store read/write/maintenance,
snapshot staleness query, run metadata, terminal snapshot pinning, plan store,
start-run intent store, schema manager, backpressure reader, run event repository,
relational execution capability, lineage outbox, archive store, lease store, and
delivery buffer purge store.

`PostgresStateStoreAdapter` extends `PostgresSnapshotQueueAdapter` and implements
`IOutboxStorage`. It delegates delivery-facing operations such as `enqueueTx`,
`listPending`, `listPendingForClaim`, `markDelivered`, `markFailed`, retry
backlog, dead-letter listing, lineage outbox access, and dead-letter replay.

### Delivery package

`@dvt/delivery` explicitly owns runtime delivery API for outbox movement,
projection refresh, sharding, and start-run backpressure admission.

`OutboxWorker` performs batched claiming, publishes records to an event bus,
marks delivered after publish, marks failed on publish failure, classifies retry
vs dead-letter using max attempts, tracks claimed/delivered/retried/dead-lettered
counts, computes oldest claimed age, respects claim selection, and prevents
telemetry failures from breaking delivery.

`ProjectorWorkerRuntime` supports queue claims, stale snapshot fallback polling,
claim-token completion/failure, ownership-lost handling, lag reporting,
processed count, configurable batch/poll/backoff, and graceful stop.

### Traceability / lineage runtime

`LineageWorkerRuntime` lives in `@dvt/traceability-service`, not in the app. It
owns lineage outbox polling, delivery, dead-letter, replay loops outside domain
outbox authority. It tracks lag and dead-letter count, supports dead-letter alert
thresholds and optional auto replay.

### Worker apps

The worker apps are composition roots:

- `dvt-temporal-worker` loads env, creates `TemporalWorkerMonitor`, creates an
  operational server, and calls `runTemporalWorkerHost`.
- `dvt-outbox-worker` loads env, creates `OutboxWorkerMonitor`, creates an
  operational server, optionally creates a Postgres shard ownership gate, and
  calls `runOutboxWorkerHost`.
- `dvt-projector-worker` creates `PostgresStateStoreAdapter`, calls `migrate()`,
  creates `ProjectorWorkerRuntime`, exposes admin lag JSON, and closes store on
  shutdown.
- `dvt-lineage-worker` builds lineage bootstrap, creates mapper/runtime, exposes
  admin lag/deadLetterLag JSON, and closes bootstrap on shutdown.

## Gaps by runtime surface

## 1. Temporal execution adapter

### T-01 — Workflow/activity matrix is missing

The public surface exports many Temporal concerns and `RunPlanWorkflow` is split
into lifecycle/signals/layers/cancellation/state modules. But there is no one
matrix that maps:

- workflow function;
- signal/query names;
- activities;
- step kinds;
- plugin activity registries;
- retry/timeout/heartbeat policy;
- emitted run events;
- failure classification;
- tests.

**Risk**

Temporal can become the real execution authority by accumulation of behavior
inside workflow/activity modules rather than by explicit DVT contracts.

**Action**

Generate `temporal-workflow-activity-matrix.md` from adapter exports and source
files. Include all control signals and activity boundaries.

### T-02 — Empty core step registry requires plugin capability truth

`createDefaultStepActivityRegistry()` returns an empty map. That is a good design
if plugin profiles own step kinds. But the system needs a runtime capability
truth table proving which step kinds are executable in each worker profile.

**Risk**

Planner/verifier may accept a step kind that the active worker cannot execute.
The failure then appears late in Temporal activity dispatch.

**Action**

Create executable step-kind capability registry per worker profile and expose it
to API admission and web readiness.

### T-03 — Circuit breaker boundary needs operational evidence

The adapter exports `CircuitBreakingRunStateCommandPort`, and API docs mention a
state-store write breaker. But runtime readiness must show breaker state,
tripped/open/half-open semantics, and user-facing consequences.

**Action**

Add operational server endpoint or metric for circuit state and document failure
propagation to API/web.

## 2. Postgres state/persistence adapter

### PG-01 — Public surface is too broad without ownership matrix

The Postgres adapter index exports state store, outbox, plan store, intent store,
backpressure, run event repository, lineage outbox, archive store, lease store,
delivery buffer purge, and relational execution capability.

**Risk**

Consumers can couple directly to storage internals. Postgres can accidentally
own domain semantics.

**Action**

Generate `postgres-adapter-public-surface.md` with categories:

- state-store core;
- event store;
- outbox;
- plan/artifact references;
- intent store;
- backpressure;
- archive lifecycle;
- lineage;
- relational execution;
- schema/migration.

### PG-02 — Startup migration policy is inconsistent across workers

`dvt-projector-worker` calls `stateStore.migrate()` at startup. API and other
workers may have different migration paths.

**Risk**

Multiple runtime processes may perform migrations unexpectedly or at different
privilege levels.

**Action**

Define migration authority:

- which process may migrate;
- which environments allow startup migration;
- how advisory locks/permissions work;
- rollback plan;
- read-only worker behavior.

### PG-03 — Tenant isolation needs generated negative test index

The adapter declares ADR-0031 tenant isolation in headers, and exports invalid
tenant errors. But the workspace needs a generated index of tenant isolation
negative tests per store/repository.

**Action**

Create tenant-isolation test matrix:

- run events;
- snapshots;
- outbox;
- lineage outbox;
- archives;
- plan store;
- start-run intents;
- backpressure snapshots.

## 3. Delivery / outbox

### DLV-01 — Outbox lifecycle needs state diagram and contract

`OutboxWorker` implements claim, publish, delivered, failed, retry, dead-letter,
oldest age, retry backlog, and claim selection. But the lifecycle is implicit in
code.

**Action**

Create outbox lifecycle contract with states:

```text
pending -> claimed -> delivered
pending/claimed -> failed -> retry pending
failed max attempts -> dead-letter
```

Include counters, observer events, and retry backlog semantics.

### DLV-02 — Publish-markDelivered ordering needs explicit failure story

`publishRecord()` publishes then marks delivered. If publish succeeds and
markDelivered fails, duplicate publication is possible on retry.

**Risk**

This may be acceptable with idempotent downstream consumers, but it must be a
contracted at-least-once delivery model, not an implicit behavior.

**Action**

Document delivery guarantee:

- at-most-once vs at-least-once;
- idempotency key;
- downstream dedupe requirement;
- retry behavior when markDelivered fails.

### DLV-03 — Observer failures are swallowed by design

Telemetry failures intentionally do not break delivery. This is correct, but
needs operational metric/log for suppressed observer errors if observability is
important.

**Action**

Add best-effort observer failure counter or debug log policy.

## 4. Projector runtime

### PRJ-01 — Claim/fallback semantics need contract

`ProjectorWorkerRuntime` supports both queue claims and fallback polling. It can
complete or fail claimed work and handles claim ownership loss.

**Risk**

Without a written contract, operators cannot reason about duplicate rebuilds,
missed rebuilds, and fallback scanning.

**Action**

Create projector work acquisition contract covering:

- claimSnapshotWork;
- listStaleSnapshotRuns;
- fallback enablement;
- claim tokens;
- complete/fail behavior;
- ownership-lost handling;
- lag semantics.

### PRJ-02 — Admin endpoint is too thin

The app admin server returns `{ ok, lag, service }`. That is insufficient for
operational diagnosis.

**Action**

Expose processed count, last tick time, last error, fallback enabled, queue mode,
claim failures, and DB readiness.

## 5. Lineage runtime

### LIN-01 — Lineage publication semantics need lifecycle contract

`LineageWorkerRuntime` supports polling, sink publication, dead-letter, alert
thresholds, and auto replay. This needs explicit lifecycle documentation and
fixtures.

**Action**

Create lineage lifecycle contract:

```text
lineage outbox pending -> mapped -> published
mapping/sink failure -> failed/retry
max attempts -> dead-letter
auto replay -> pending/replayed
```

### LIN-02 — Dead-letter tenant handling needs safety review

Runtime supports optional `deadLetterTenantId` and alert threshold. This is a
sensitive cross-tenant area.

**Action**

Add tests proving dead-letter listing, alerting, and replay are tenant-scoped.

## 6. State-store package

### SS-01 — Package owns archive lifecycle but not hot store implementation

`@dvt/state-store/src/index.ts` exposes archive lifecycle, archive manifests,
terminal snapshots, object-store export, restore, delete, delivery buffer purge,
and an in-memory run state command port. This differs from the Postgres adapter
hot-state implementation.

**Risk**

The name `state-store` may imply ownership of all run-state persistence, while
actual hot persistence is in `adapter-postgres`.

**Action**

Rename or document boundary:

- hot state store port ownership;
- Postgres hot adapter;
- archive lifecycle package;
- object storage adapters;
- delivery buffer purge.

### SS-02 — Archive lifecycle tests need corruption/restore/delete fixtures

The public surface implies serious lifecycle operations. The test script uses
`--passWithNoTests`, so coverage posture must be proven.

**Action**

Create archive fixture suite:

- valid archive manifest;
- checksum mismatch;
- missing terminal snapshot;
- restore already exists;
- delete not eligible;
- tenant override retention;
- delivery buffer purge.

## Cross-runtime gaps

### X-01 — Runtime SLO catalogue missing

Every runtime process exposes some operational posture, but there is no unified
SLO/SLA/SLO-like catalogue.

**Action**

Create `runtime-slo-catalog.md`:

| Runtime | Signal | Endpoint/metric | Healthy | Degraded | Failed | UI consequence |
| --- | --- | --- | --- | --- | --- | --- |

### X-02 — Idempotency model is fragmented

Outbox, Temporal signals, state-store writes, lineage replay, projector rebuild,
and API start-run intent all need a single idempotency map.

**Action**

Create cross-runtime idempotency matrix:

- operation;
- key;
- owner;
- storage;
- duplicate behavior;
- tests.

### X-03 — Worker admin APIs are inconsistent

Projector and lineage hand-roll simple HTTP servers. Temporal/outbox use
operational server abstractions. The response contracts are not obviously shared.

**Action**

Create shared worker operational endpoint contract and apply it consistently.

## Recommended order

1. Temporal workflow/activity matrix.
2. Postgres adapter public surface and migration authority report.
3. Outbox lifecycle and delivery guarantee contract.
4. Projector claim/fallback contract.
5. Lineage lifecycle/dead-letter tenant report.
6. State-store archive lifecycle report.
7. Cross-runtime SLO and idempotency matrices.
8. Worker admin API normalization.

## Validation baseline for future code changes

```bash
pnpm --filter @dvt/adapter-temporal typecheck
pnpm --filter @dvt/adapter-temporal test
pnpm --filter @dvt/adapter-temporal run test:integration:local
pnpm --filter @dvt/adapter-postgres typecheck
pnpm --filter @dvt/adapter-postgres test
pnpm --filter @dvt/adapter-postgres test:integration
pnpm --filter @dvt/delivery typecheck
pnpm --filter @dvt/delivery test
pnpm --filter @dvt/state-store typecheck
pnpm --filter @dvt/state-store test
pnpm --filter @dvt/traceability-service typecheck
pnpm --filter @dvt/traceability-service test
pnpm --filter dvt-temporal-worker typecheck
pnpm --filter dvt-temporal-worker test
pnpm --filter dvt-outbox-worker typecheck
pnpm --filter dvt-outbox-worker test
pnpm --filter dvt-projector-worker typecheck
pnpm --filter dvt-projector-worker test
pnpm --filter dvt-lineage-worker typecheck
pnpm --filter dvt-lineage-worker test
pnpm verify:prepush
```

## Closeout

The runtime stack is materially real: Temporal workflow determinism is explicit,
outbox/projector/lineage loops exist, and Postgres exposes serious state-store
surfaces. The gaps are mostly governance and proof gaps: lifecycle contracts,
capability registries, delivery guarantees, tenant negative tests, migration
authority, SLOs, idempotency, and admin API consistency.
