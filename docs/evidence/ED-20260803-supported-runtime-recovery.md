---
title: Supported runtime capacity and bounded recovery proof
status: Accepted
date: 2026-08-03
owners:
  - apps/api
  - apps/temporal-worker
  - apps/outbox-worker
  - apps/projector-worker
  - packages/@dvt/adapter-postgres
arc_level: ARC-2
breaking: false
code_refs:
  - scripts/run-supported-runtime-proof.cjs
  - scripts/supported-runtime-proof/runtime-proof-scenarios.cjs
  - scripts/supported-runtime-proof/runtime-proof-snapshot.cjs
  - scripts/supported-runtime-proof/runtime-proof-profile.cjs
  - packages/@dvt/adapter-postgres/src/PostgresPoolErrorPolicy.ts
  - apps/outbox-worker/src/ownership/PgShardOwnershipGate.ts
evidence:
  tests:
    - pnpm test:supported-runtime-proof
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm --filter @dvt/adapter-postgres typecheck
    - pnpm --filter dvt-outbox-worker test
    - pnpm --filter dvt-outbox-worker typecheck
    - pnpm proof:supported-runtime -- --output .dvt/proofs/mvp18-final.json
    - pnpm verify:prepush
---

## Decision

The supported runtime proof reuses the production protected `StartRun`,
persisted-plan, workflow-engine, Temporal, PostgreSQL state/outbox, standalone
outbox, and projector boundaries. It does not add a parallel event API, runtime
adapter, or chaos framework. One versioned profile owns workload topology,
repetition count, and measured budgets.

PostgreSQL pools install an idle-client error observer at their composition
boundary. Query failures continue to reject normally. Dedicated outbox
ownership clients convert asynchronous connection loss into ownership loss so
the existing supervisor can restart the worker after connectivity returns.
The proof lifecycle applies the same bounded restart policy to the standalone
projector.

## Evidence

Three controlled baseline repetitions completed the steady-state,
worker-interruption, and PostgreSQL-interruption scenarios without accepted run
loss, duplicate state effects, event-order violations, unrecovered backlog, or
snapshot divergence. The proof derives the authoritative expected snapshot by
replaying the complete event journal through the canonical run-domain
projector, then compares both the live materialization and a rebuilt snapshot.

Measured throughput, projection freshness, start latency, completion duration,
worker recovery, and PostgreSQL recovery are checked against the single budget
source. The result artifact is bounded, contains no user secrets, and reports
the first failed invariant when a scenario cannot meet the contract.
