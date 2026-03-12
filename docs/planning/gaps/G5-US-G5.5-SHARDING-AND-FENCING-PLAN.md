---
title: G5 / US-G5.5 Sharding And Fencing Plan
status: Review
owner: Architecture / Engine / Platform / Adapter Postgres
last_reviewed: 2026-03-12
planning_type: proposal
---

# G5 / US-G5.5 Sharding And Fencing Plan

Execution plan for the multi-worker strategy that remains after the standalone
runtime and single-owner rollout work.

- Gap: `G5 - Outbox worker independiente`
- Current status source: [`GAP_EXECUTION_PLANS.md`](GAP_EXECUTION_PLANS.md)
- Canonical gap plan: [`G5-OUTBOX-WORKER-CONSOLIDATED-PLAN.md`](G5-OUTBOX-WORKER-CONSOLIDATED-PLAN.md)
- Predecessor slice: [`G5 / US-G5.4 Operability And Ownership Hardening Plan`](G5-US-G5.4-OPERABILITY-AND-OWNERSHIP-HARDENING-PLAN.md)
- ADR: [`ADR-0033 - Outbox Worker Sharding And Fencing Model`](../../adr/ADR-0033-outbox-worker-sharding-and-fencing-model.md)
- Ordering baseline: [`ADR-0009_Outbox_Ordering.md`](../../adr/ADR-0009_Outbox_Ordering.md)

## Working Rule

This document is the active planning surface for `PR-5 / G5.5`.

While this slice is open:

1. no document may present multi-worker safety as implemented unless code,
   tests, and deployment wiring actually exist;
2. the selected strategy remains `runId` sharding plus explicit shard fencing,
   not a generic coordination platform;
3. `shardCount` stays deployment-stable in `G5`;
4. horizontal scaling remains blocked until the chosen strategy is implemented
   and validated end to end.

## Objective

Choose and document one concrete `ADR-0009` enforcement path for concurrent
workers so that implementation can preserve same-`runId` ordering, exclusive
shard ownership, and operationally understandable rollout behavior.

This plan began as the decision surface for `G5.5`. Code now implements the
first two executable slices: persisted `shard_id` claim filtering and dedicated
startup advisory-lock ownership sessions. Lock-loss runtime behavior and
concurrent-worker proof still remain open follow-up work inside the same stage.

## Root Problem

`G5` already has a standalone worker and a single-owner rollout story, but the
repository still lacks a canonical multi-worker model.

Without that model:

- scale-out remains blocked by design;
- docs can drift between "shard later" and "lock later" stories;
- runtime and persistence work can move in incompatible directions;
- operational assumptions about ownership loss and resharding stay ambiguous.

## Selected Architecture

The selected direction for `G5.5` is:

1. deterministic sharding keyed by `runId`;
2. persisted shard identity on each outbox row;
3. explicit shard ownership declared in deployment configuration;
4. PostgreSQL advisory-lock fencing held on dedicated ownership sessions;
5. resharding treated as an explicit migration, not as ordinary autoscaling.

This is the narrowest design that keeps `ADR-0009` ordering guarantees
compatible with horizontal scaling without widening `G5` into a generalized
control plane.

## Governing Invariants

Implementation and validation for this slice MUST preserve the following:

1. the same `runId` always resolves to the same shard for one active topology;
2. one shard has at most one effective owner at a time;
3. a worker only claims and publishes for shards it currently owns;
4. shard filtering happens in SQL, not in memory after broad selection;
5. ownership is a continuously valid runtime condition, not a startup-only fact;
6. `shardCount` changes are topology migrations, not routine scale events.

## Query / Index Strategy

### Goal

Shard ownership must be enforceable without turning `listPending()` into an
expensive full-table scan.

### Rule

Outbox selection MUST be restricted by shard before claim selection is
performed.

The runtime MUST NOT:

- fetch all pending rows and filter in memory by shard;
- rely on advisory locks alone while scanning the full pending outbox;
- perform broad claim queries that are later discarded by the worker.

### Required data model

Outbox records MUST carry a deterministic shard identifier derived from the
same partitioning rule used by the worker runtime.

Example:

```text
shard_id = stableHash64(run_id) % shard_count
```

This value must be persisted with each outbox row at enqueue time so the claim
path can filter directly by shard.

### Query shape

`listPending()` or its shard-aware equivalent MUST filter by:

- `shard_id IN (...)` for the shards owned by the worker;
- delivery eligibility;
- retry and backoff eligibility;
- strict head-of-line ordering rules for `run_id`;
- dead-letter blocking for the same `run_id`.

The claim path MUST remain bounded and index-supported.

### Index requirements

At minimum, the PostgreSQL adapter SHOULD provide an index shaped for pending
selection by shard and run ordering.

Example target shape:

```sql
(shard_id, run_id, run_seq)
WHERE delivered_at IS NULL
```

The final index strategy may be tuned, but shard filtering must be index-backed.

### Topology note

Persisting `shard_id` means pending rows are tied to one active topology.
Changing `shardCount` therefore requires a controlled migration path rather
than transparent mixed-topology processing.

### Consequence

Shard ownership is not only a runtime concern; it becomes part of the
persisted claim-path design.

## Lock Lifecycle

### Goal

Shard ownership must be tied to a well-defined PostgreSQL session lifecycle.

### Rule

Advisory locks for shard ownership MUST be held by a dedicated long-lived
connection owned by the worker runtime.

They MUST NOT be acquired on short-lived pooled query connections.

### Required behavior

For each configured shard:

1. the worker starts with its validated `ownedShardIds`;
2. the worker opens or reserves a dedicated lock-holding connection;
3. the worker attempts to acquire an advisory lock for each configured shard;
4. only shards whose locks were successfully acquired become active for
   claim-and-publish work.

### Session model

The lock-holding connection is the ownership authority.

If the connection is closed, reset, or lost, PostgreSQL releases the advisory
locks automatically.

### Startup contract

A worker MAY start with only a subset of configured shards successfully locked,
but that behavior must be governed by explicit deployment policy.

The default posture for `G5` SHOULD be fail-fast if the deployment expects the
full configured shard set to be owned.

Whenever partial ownership is permitted:

- the runtime MUST expose which shards are configured;
- the runtime MUST expose which shards are actually owned;
- the runtime MUST process only the owned subset.

### Observability

The runtime MUST emit:

- worker id;
- configured shard ids;
- acquired shard ids;
- failed shard acquisitions;
- ownership changes during runtime.

## Lock-Loss Semantics

### Goal

The system must define what happens when a worker loses shard ownership after
startup.

### Rule

Loss of the PostgreSQL session holding advisory locks is treated as loss of
effective ownership for all shards bound to that session.

### Required behavior

When lock loss is detected:

1. the worker MUST immediately stop claiming new outbox rows for the affected
   shards;
2. the worker MUST stop admitting new publish work for shards it no longer
   owns;
3. the runtime MUST transition the affected shards to a degraded or unowned
   state;
4. the runtime MUST surface the condition via logs, metrics, and
   health/readiness signals.

### In-flight work boundary

For `G5`, the implementation SHOULD use one explicit rule for in-flight publish
operations and keep that rule consistent across tests, runtime behavior, and
documentation.

The preferred baseline is:

- work already admitted before verified lock loss MAY complete;
- no new work may be admitted after ownership loss is detected.

### Detection

Lock loss is detected through connection loss, connection reset, or explicit
ownership verification failure.

The runtime MUST NOT assume ownership is still valid after a broken session.

### Readiness semantics

A worker that loses all required shard locks SHOULD become unready.

A worker that loses only some shard locks MAY remain ready only when partial
ownership is allowed by deployment policy, and it must expose the reduced owned
set explicitly.

### Direct consequence

Ownership is not a one-time startup event; it is a continuously valid runtime
condition.

## Resharding Procedure

### Goal

Changing `shardCount` must be treated as an explicit operational migration, not
as a routine scale event.

### Rule

Changing `shardCount` remaps `runId -> shardId` and therefore changes routing
for all future work. It MUST NOT be performed implicitly.

### G5 policy

In `G5`:

- `shardCount` is deployment-stable;
- scale-out is achieved by redistributing shard ownership across workers;
- changing `shardCount` requires an explicit resharding procedure.

### Allowed procedure

A resharding event MUST follow a controlled maintenance procedure:

1. stop or drain workers that own the old shard topology;
2. ensure no pending ownership ambiguity remains;
3. migrate runtime and deployment configuration to the new `shardCount`;
4. ensure newly enqueued rows use the new shard mapping;
5. only resume multi-worker processing once the new topology is fully active.

### Prohibition

`G5` does NOT support transparent live resharding with mixed old and new
`shardCount` workers operating concurrently on the same outbox stream.

Pending rows derived from different topologies MUST NOT be treated as one
implicitly compatible routing set without an explicit migration procedure.

### Operational consequence

`shardCount` changes are treated as topology migrations, not as ordinary
autoscaling.

## Definition Of Done

This plan is only complete when all of the following are true:

- [x] one canonical `ADR-0009` enforcement strategy is selected in active docs
      and the accepted ADR catalog
- [x] the PostgreSQL adapter design includes persisted shard filtering and an
      index-backed claim path
- [x] the runtime design defines the dedicated lock-session lifecycle
- [ ] lock-loss behavior is pinned in runtime semantics and tests
- [x] resharding is documented as an explicit migration procedure
- [x] `G5-OUTBOX-WORKER-CONSOLIDATED-PLAN.md`, `GAP_EXECUTION_PLANS.md`, and
      the `G5` tracker all tell the same story

## Validation Matrix

- `pnpm lint:md`
- `pnpm docs:sync`
- `pnpm docs:canonical:check`
- `pnpm docs:quality:check`
- `pnpm exec markdownlint-cli2 "docs/planning/gaps/G5-US-G5.5-SHARDING-AND-FENCING-PLAN.md" "docs/planning/gaps/G5-OUTBOX-WORKER-CONSOLIDATED-PLAN.md" "docs/planning/gaps/G5-AI-EXECUTION-TRACKER.md" "docs/planning/gaps/GAP_EXECUTION_PLANS.md" "docs/adr/ADR-0033-outbox-worker-sharding-and-fencing-model.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc`
