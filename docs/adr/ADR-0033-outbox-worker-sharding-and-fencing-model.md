---
title: ADR-0033 - Outbox Worker Sharding And Fencing Model
status: Accepted
owner: Architecture / Engine / State / Platform
last_reviewed: 2026-03-12
---

# ADR-0033 - Outbox Worker Sharding And Fencing Model

## Status

Accepted.

## Context

`G5` already has a standalone outbox worker runtime and a single-owner rollout
story, but horizontal scale-out remains blocked.

The repository needs one concrete `ADR-0009` enforcement strategy that can:

- preserve same-`runId` ordering;
- prevent ambiguous dual-active publishing;
- remain operationally understandable;
- fit the current PostgreSQL-backed runtime without inventing a new control
  plane.

Without a canonical choice, the repository can drift between incompatible
multi-worker stories and leave claim SQL, rollout policy, and ownership
semantics underspecified.

## Decision

DVT+ will use deterministic sharding keyed by `runId` together with explicit
deployment-owned shard lists and PostgreSQL advisory-lock fencing.

The selected model is:

1. `shard_id = stableHash64(runId) % shardCount`;
2. `shard_id` is persisted with each outbox row at enqueue time;
3. workers receive explicit `ownedShardIds` from deployment configuration;
4. workers claim and publish only for shards they currently own;
5. shard ownership is fenced by advisory locks held on dedicated long-lived
   PostgreSQL sessions;
6. loss of the lock-holding session is treated as ownership loss;
7. changing `shardCount` is an explicit migration, not transparent autoscaling.

## Architectural Consequences

### Query and indexing

Shard ownership becomes part of the persisted claim path, not a runtime-only
filter.

The worker MUST filter pending selection by persisted `shard_id` in SQL, and
the PostgreSQL adapter MUST keep that path index-backed rather than relying on
broad scans followed by in-memory shard filtering.

### Ownership lifecycle

Advisory locks are valid only for the PostgreSQL session that holds them.

The worker therefore needs dedicated lock-holding connections that remain
separate from short-lived pooled query sessions.

### Ownership loss

Losing the lock-holding session is equivalent to losing effective ownership for
the associated shards.

After that point, the worker must stop admitting new claim and publish work for
those shards and surface the degraded state through metrics, logs, and
health/readiness behavior.

### Resharding

Because `shard_id` is persisted, `shardCount` changes remap future work and are
not transparent.

`G5` therefore treats resharding as a controlled topology migration with drain,
config cutover, and explicit restart boundaries.

## Positive Consequences

- same-`runId` routing remains deterministic;
- one shard has one effective owner at a time;
- scale-out can be expressed through explicit shard redistribution;
- failure modes around ownership are easier to observe and test than with
  implicit coordination.

## Negative Consequences

- `shardCount` changes require migration discipline;
- hot shards remain possible;
- the runtime and PostgreSQL adapter both need explicit ownership-aware logic;
- multi-worker support still depends on real implementation and validation work,
  not on this ADR alone.

## Alternatives Rejected

### Global coordination layer

Rejected for `G5` because it widens the repository into a more complex
control-plane design than the current gap requires.

### Transparent live resharding

Rejected for `G5` because persisted `shard_id` and current topology
constraints make mixed old/new `shardCount` processing too ambiguous.

### Advisory locks without persisted shard filtering

Rejected because ownership fencing alone does not make the claim path bounded or
index-supported.

## Follow-up Documents

Use this ADR together with:

- [`G5 - Outbox Worker Consolidated Plan`](../planning/archive/gaps/G5-OUTBOX-WORKER-CONSOLIDATED-PLAN.md)
- [`G5 / US-G5.5 Sharding And Fencing Plan`](../planning/archive/gaps/G5-US-G5.5-SHARDING-AND-FENCING-PLAN.md)
- [`G5 - AI Execution Tracker`](../planning/archive/gaps/G5-AI-EXECUTION-TRACKER.md)
- [`ADR-G5 - Independent Outbox Worker Runtime`](./_drafts/ADR-G5-independent-outbox-worker-runtime.md)
