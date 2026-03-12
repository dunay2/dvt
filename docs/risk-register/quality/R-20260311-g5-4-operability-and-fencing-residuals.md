---
id: R-20260311-G5-4-QA-01
title: G5 worker operability can regress without stale-readiness, ownership fencing, and downstream dedupe proof
status: Open
date: 2026-03-11
owners:
  - engine
  - adapter-postgres
  - platform
  - ci
severity: High
probability: Medium
---

# R-20260311-G5-4-QA-01 - G5 worker operability can regress without stale-readiness, ownership fencing, and downstream dedupe proof

## Context

`G5.3` materially improved ordered at-least-once delivery and shutdown behavior,
but the next QA pass still found five operational gaps that can produce real
runtime regressions even when the current unit and package-level suites are
green:

- readiness is derived from runtime state only, so a worker can stay
  `ready=true` after its loop stops making progress if the last completed tick
  left the state as `idle` or `draining`;
- shutdown now interrupts bootstrap correctly, but the runtime still lacks an
  explicit `stopping` state and a freshness rule that withdraws readiness as
  soon as shutdown begins;
- the new bootstrap-abort path still leaves a narrow race for direct
  `createOutboxWorkerRuntime(..., { shutdownSignal })` callers: an abort that
  lands just after startup resolves can still trigger
  `abortPendingOperations()`, leaving the adapter poisoned while returning a
  runtime handle;
- startup ownership is now fenced by advisory locks on a dedicated PostgreSQL
  session, and post-start lock loss now forces the host to withdraw ownership
  and stop, but the multi-worker proof and real PostgreSQL evidence for that
  fencing model are still incomplete;
- the worker proves at-least-once delivery at its own boundary, but the
  downstream duplicate-handling contract is still implicit and reclaim/backlog
  behavior is not yet closed with real PostgreSQL evidence.

Those gaps match the failure classes repeatedly seen in comparable distributed
worker systems: heartbeat-stale health, queue daemons that hang while still
looking alive, graceful shutdown without timely readiness withdrawal, and
duplicate or replay behavior that is only partially defended by the consumer.

## Risk

If those gaps remain undocumented or are treated as "non-blocking ops details",
`G5` can regress in ways that are painful in production:

- orchestration can continue routing traffic to a worker whose process is alive
  but whose tick loop is stale;
- a node that is already shutting down can remain externally `ready` long
  enough to absorb work it should no longer own;
- a direct runtime caller can receive a successfully created runtime handle
  whose first database access fails immediately with `AbortError` if shutdown
  lands inside the bootstrap race window;
- a broken or reset ownership session now stops the current host, but
  `ADR-0009` multi-worker enforcement still lacks concurrent-worker proof and
  real PostgreSQL evidence for the selected shard/fencing model;
- duplicate publication can be technically correct at the worker boundary while
  still causing downstream side effects if the consumer contract does not prove
  idempotent handling;
- reclaim and backlog pressure can preserve ordering while still hiding a
  production bottleneck or starvation mode that the current local evidence does
  not yet expose.

## Mitigation

- Keep `G5` rollout language explicit: startup ownership is fenced and
  post-start lock loss now forces host shutdown, but concurrent-worker proof
  and real PostgreSQL evidence are still incomplete.
- Add a freshness-aware readiness invariant, an explicit `stopping` runtime
  state, and tests that prove readiness is withdrawn immediately on shutdown and
  after stale ticks.
- Harden `waitForStartupOrAbort()` so a late abort after successful startup does
  not mutate adapter state, and pin that path with a regression test for direct
  runtime callers.
- Define the downstream duplicate-handling contract explicitly around
  `eventId` and `idempotencyKey`, and prove it with a canary or contract test.
- Execute reclaim/orphan recovery and backlog sanity against a real PostgreSQL
  lane before claiming operability closure.
- Track the implementation work through
  [G5 / US-G5.4 Operability And Ownership Hardening Plan](../../planning/gaps/G5-US-G5.4-OPERABILITY-AND-OWNERSHIP-HARDENING-PLAN.md).

## Evidence

- `apps/outbox-worker/src/host/runOutboxWorkerHost.ts`
- `apps/outbox-worker/src/ownership/PgShardOwnershipGate.ts`
- `apps/outbox-worker/src/runtime/createOutboxWorkerRuntime.ts`
- `apps/outbox-worker/src/runtime/OutboxWorkerRuntime.ts`
- `apps/outbox-worker/src/ops/OutboxWorkerMonitor.ts`
- `apps/outbox-worker/src/ops/OperationalServer.ts`
- `apps/outbox-worker/test/host/runOutboxWorkerHost.test.ts`
- `apps/outbox-worker/test/ownership/PgShardOwnershipGate.test.ts`
- `apps/outbox-worker/test/runtime/createOutboxWorkerRuntime.test.ts`
- `apps/outbox-worker/test/runtime/OutboxWorkerRuntime.test.ts`
- `apps/outbox-worker/test/canary/standaloneCanaryAcceptance.test.ts`
- `packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.sharding.test.ts`
- `packages/@dvt/adapter-postgres/test/smoke.test.ts`
- `docs/planning/gaps/G5-OUTBOX-WORKER-CONSOLIDATED-PLAN.md`
- `docs/risk-register/quality/R-20260311-g5-3-correctness-closeout-residuals.md`

## Reference-Only Comparative Signals

These references informed the QA assessment, but they are not canonical repo
requirements:

- [Airflow scheduler health checks and heartbeat freshness](https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/logging-monitoring/check-health.html)
- [Airflow scheduler HA and DB locking constraints](https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/scheduler.html)
- [Dagster queued daemon hangs while heartbeats stop advancing](https://github.com/dagster-io/dagster/issues/28910)
- [Dagster duplicate run keys not de-duplicated within one evaluation](https://github.com/dagster-io/dagster/issues/26753)
- [Celery staged shutdown and soft-shutdown window](https://docs.celeryq.dev/en/stable/userguide/workers.html)
- [Temporal workers still receiving work during graceful shutdown](https://github.com/temporalio/sdk-python/issues/783)
