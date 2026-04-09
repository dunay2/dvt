---
title: ED-20260304 - G3 IntentStore Postgres + Reconciler Worker
status: Final
date: 2026-03-06T00:00:00.000Z
owners: Engine / Data Platform
arc_level: ARC-3
breaking: false
evidence_class: critical
code_refs:
  - packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts
  - packages/@dvt/adapter-postgres/src/StartRunIntentSchemaManager.ts
  - packages/@dvt/adapter-postgres/test/PostgresStartRunIntentStore.test.ts
  - packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts
  - packages/@dvt/engine/test/workers/IntentReconcilerWorker.test.ts
  - apps/api/src/runtime/intentReconcilerRuntime.ts
  - apps/api/src/server.ts
evidence:
  pr:
    - https://github.com/dunay2/dvt/pull/356
    - https://github.com/dunay2/dvt/pull/360
    - https://github.com/dunay2/dvt/pull/363
  tests:
    - packages/@dvt/adapter-postgres/test/PostgresStartRunIntentStore.test.ts
    - packages/@dvt/adapter-postgres/test/smoke.test.ts
    - packages/@dvt/engine/test/workers/IntentReconcilerWorker.test.ts
  code:
    - packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts
    - packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts
    - apps/api/src/runtime/intentReconcilerRuntime.ts
---

# Evidence Doc: G3 IntentStore Postgres + Reconciler Worker

## Scope

G3 is closed with production-oriented behavior for start-run intent durability and reconciliation lifecycle.

- Durable Postgres intent store is implemented.
- Reconciler worker is implemented with lifecycle safeguards.
- Runtime wiring is active in API bootstrap/shutdown paths.
- Unit and integration tests cover core and failure paths.

## Delivered Changes

1. Durable intent persistence (`@dvt/adapter-postgres`).
   - Postgres-backed `IStartRunIntentStore`.
   - Transition guards and typed domain errors.
   - Active uniqueness invariant for `(tenant_id, run_id)` in active states.
2. Scheduler/worker implementation (`@dvt/engine`).
   - Periodic reconciler tick loop.
   - Non-overlap execution behavior.
   - Infrastructure-only retry/backoff strategy.
   - Per-tick timeout guard.
3. Runtime wiring (`apps/api`).
   - Worker startup/shutdown hooks integrated in service lifecycle.
4. Tests.
   - Store tests for transitions, idempotency, and orphan listing behavior.
   - Worker tests for periodic execution, no-overlap, and stop semantics.

## PR Traceability

- [PR #356](https://github.com/dunay2/dvt/pull/356): initial Postgres intent store and docs baseline.
- [PR #360](https://github.com/dunay2/dvt/pull/360): reconciler bootstrap hardening and CI stabilization.
- [PR #363](https://github.com/dunay2/dvt/pull/363): transition simplification/refactor with behavior preserved.

## Acceptance Notes (Load/Resilience)

- Concurrency integrity:
  - Active intent uniqueness is enforced at DB level for `PENDING`/`DISPATCHED`.
  - Transition APIs reject invalid state moves with typed errors.
- Worker resilience:
  - Tick execution is single-flight (no overlapping reconciliation cycles).
  - Infrastructure failures are retried with backoff/jitter.
  - Timeout guard prevents stalled ticks from blocking future cycles.
- Runtime safety:
  - Worker lifecycle is controlled by API boot/shutdown hooks, reducing orphan background processes.

## Residual Risks

- Reconciliation throughput at very high tenant concurrency still requires sustained production telemetry.
- Multi-instance outbox ordering concerns remain tracked in separate gaps (not part of G3 scope).

## Closure Decision

G3 is formally closed as of 2026-03-06.
