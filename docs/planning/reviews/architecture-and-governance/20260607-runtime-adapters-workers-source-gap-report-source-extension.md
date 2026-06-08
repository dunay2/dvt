---
title: Runtime Adapters And Workers Source Gap Report Extension
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
extends: docs/planning/reviews/architecture-and-governance/20260607-runtime-adapters-workers-source-gap-report.md
---

# Runtime Adapters And Workers Source Gap Report Extension

## Purpose

This extension checks the runtime/adapters/workers report against deeper source
files. The first runtime report correctly identified lifecycle, SLO, and
idempotency gaps. The source confirms those gaps, but it also shows several
important runtime strengths that should be preserved.

## Sources checked

- `packages/@dvt/adapter-temporal/src/index.ts`
- `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
- `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`
- `packages/@dvt/adapter-temporal/src/activities/stepActivityDispatcher.ts`
- `packages/@dvt/adapter-postgres/src/index.ts`
- `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`
- `packages/@dvt/delivery/src/index.ts`
- `packages/@dvt/delivery/src/application/OutboxWorker.ts`
- `packages/@dvt/delivery/src/application/ProjectorWorkerRuntime.ts`
- `packages/@dvt/traceability-service/src/lineage/LineageWorkerRuntime.ts`
- worker app `src/server.ts` files

## Source-backed corrections

### 1. Temporal determinism is explicitly designed, not incidental

`RunPlanWorkflow.ts` documents strict Temporal sandbox determinism: no direct
clock calls, no random calls, no process environment access, and no Node or DOM
APIs in workflow code. It splits workflow work into activities, lifecycle, layers,
cancellation, signals, and state modules.

**Refined gap**

Generate workflow/activity/signal matrices. Do not rewrite the workflow boundary
unless source evidence shows actual drift.

### 2. Empty Temporal step registry is deliberate plugin design

`createDefaultStepActivityRegistry()` returns an empty map and source comments say
core registry starts empty; plugin activities are composed by worker profiles.
Gateway is the built-in core activity.

**Refined gap**

The empty registry is not a bug. The missing part is a runtime capability truth
table proving which step kinds each active worker profile can execute.

### 3. Postgres adapter is a facade over many real stores

`PostgresStateStoreAdapter` extends snapshot queue adapter and implements outbox
storage. The public index exports run event store, run snapshot store, intent
store, lineage outbox, archive store, lease store, delivery buffer purge store,
plan store, schema manager, and relational execution capability.

**Refined gap**

The adapter is not underbuilt. The risk is broad public coupling, unclear
migration authority, and missing generated tenant-isolation coverage matrix.

### 4. Outbox worker has a concrete delivery model

`OutboxWorker` claims batches, publishes to bus, then marks delivered. On failure
it marks failed and classifies retry versus dead-letter by max attempts. It
supports claim selection, observers, retry backlog, and oldest claimed age.

**Refined gap**

Because publish happens before mark-delivered, the implicit guarantee is
at-least-once unless explicitly changed. This needs a contract and idempotency
expectation for consumers.

### 5. Projector and lineage runtimes expose lag but need stronger ops contracts

`ProjectorWorkerRuntime` tracks lag and processed work. `LineageWorkerRuntime`
tracks lag and dead-letter count. Worker apps expose thin admin responses.

**Refined gap**

The runtimes exist. The missing piece is a shared operational response contract
with readiness, lag, last tick, last error, degradation mode, and queue state.

## Refined runtime gaps

### RT-01 — Runtime capability registry must connect planner, verifier, and worker

Create a registry that maps step kind to planner support, contract schema,
verifier support, interpreter behavior, Temporal plugin activity, Postgres
relational capability, worker profile, API readiness, and web blocker text.

### RT-02 — Delivery guarantee must be explicit

Document at-least-once delivery if publish-before-mark-delivered remains. Add
idempotency expectations and tests for publish success followed by mark-delivered
failure.

### RT-03 — Migration authority must be decided

At least projector worker calls `stateStore.migrate()` at startup. Define whether
migrations are owned by bootstrap/API, allowed by workers in dev/test only,
allowed everywhere under lock, or external operational responsibility.

### RT-04 — Worker admin APIs should be normalized

Temporal/outbox use operational server abstractions while projector/lineage use
simple HTTP servers. Define one worker admin contract and apply it consistently.

### RT-05 — State-store package boundary needs clarification

`@dvt/state-store` appears archive-lifecycle-heavy, while hot Postgres state
lives in `@dvt/adapter-postgres`. Add a README or split proposal explaining hot
state ports, Postgres hot implementation, archive lifecycle, and delivery buffer
purge ownership.

## Updated runtime implementation order

1. Runtime step capability registry.
2. Delivery guarantee and idempotency tests.
3. Migration authority rule.
4. Worker admin response contract.
5. Tenant isolation generated test matrix for Postgres stores.
6. State-store boundary README or package split proposal.
7. Runtime SLO catalogue.

## Closeout

Runtime code is real and in several places disciplined. The next work should not
be broad refactor. It should produce explicit runtime contracts from existing
source behavior: capability, delivery guarantee, migration authority, SLOs,
idempotency, and admin API consistency.
