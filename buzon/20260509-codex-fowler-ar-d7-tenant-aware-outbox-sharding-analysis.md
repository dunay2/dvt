---
title: AR-D7 Fowler Analysis - Tenant-Aware Outbox Sharding
status: Draft
owner: Codex / Architecture
last_reviewed: 2026-05-09
planning_type: review
---

# AR-D7 Fowler Analysis - Tenant-Aware Outbox Sharding

## Scope

This note records the Fowler-style architecture analysis for `AR-D7`: tenant-aware
outbox shard assignment for the delivery outbox path.

Governing sources:

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/state/agent-lane-d.yaml`
- `docs/adr/ADR-0004-event-sourcing-strategy.md`
- `docs/adr/ADR-0031-adapter-tenant-isolation.md`
- `docs/adr/ADR-0033-outbox-worker-sharding-and-fencing-model.md`
- `docs/runbooks/outbox-worker-g5.md`

## Current-State Finding

Outbox records already persist `tenant_id`, `run_id`, and `shard_id`, and the
PostgreSQL claim query already enforces per-tenant/per-run ordering with
`prior.tenant_id = o.tenant_id`.

The weak point is shard assignment:

- `@dvt/delivery` test storage hashes only `runId`.
- `@dvt/engine` in-memory storage duplicates the same run-only policy.
- `@dvt/adapter-postgres` computes `shard_id` in SQL from `md5(run_id)`.
- `ADR-0033` documents `stableHash64(runId) % shardCount`.
- tests and generated inventories still name the run-only policy as current.

This means a tenant with many high-volume runs can distribute across all worker
shards. That does not only create a hot tenant; it allows one tenant to compete
with unrelated tenants across the full shared outbox worker topology.

## Mature-System Comparison

Mature multi-tenant outbox systems normally distinguish three concerns:

1. Event ordering: preserve ordering for one aggregate stream.
2. Worker ownership: let workers claim bounded partitions.
3. Tenant fairness: keep one tenant from consuming all shared worker partitions.

DVT currently handles the first two concerns but folds tenant fairness into
`runId` distribution. The mature-system posture is a named sharding policy value
object, shared by in-memory stores, PostgreSQL adapters, tests, and docs. The
policy should be explicit enough that operational runbooks can discuss migration
and rebalance without reading SQL fragments.

## Fowler Opportunities

| Scenario                                            | Opportunity          | Fowler pattern                                  | DDD owner                          | Rail                              | Fix                                                                       |
| --------------------------------------------------- | -------------------- | ----------------------------------------------- | ---------------------------------- | --------------------------------- | ------------------------------------------------------------------------- |
| Compute persisted `shard_id`                        | Primitive obsession  | Value Object / Policy                           | `OutboxShardAssignment`            | `AssignOutboxShard` query         | Introduce tenant-aware shard assignment key                               |
| Same policy in delivery, engine, and Postgres       | Duplicate semantics  | Replace duplicated algorithm with shared policy | Delivery domain policy             | `AssignOutboxShard` query         | Keep JS stores on one shared function and SQL under an architecture guard |
| Tests prove shard ownership but not tenant fairness | Test-only confidence | Semantic architecture test                      | Outbox sharding architecture guard | `ValidateOutboxShardPolicy` query | Add behavior and semantic guards                                          |
| Docs still say run-only hash                        | Documentation drift  | Current-truth component guide                   | Outbox worker component            | None - docs current-state         | Update ADR, runbook, component guide, and user stories                    |
| In-memory ordering keys use runId only              | Boundary drift       | Encapsulate identity key                        | Outbox stream ordering policy      | `ClaimOutboxBatch` command        | Key blocked/head streams by tenantId and runId                            |

## Antipatterns Detected

- **Run-only partitioning in a multi-tenant queue.** Tenant isolation exists in
  row data, but the partitioning policy ignores it.
- **Duplicated hashing semantics.** The same product intent is represented in
  delivery testing code, engine testing code, PostgreSQL SQL, ADR prose, and
  tests.
- **Implicit value object.** `(tenantId, runId, shardCount)` is a domain object
  but is currently passed as loose strings and numbers.
- **Documentation as target state.** The outbox component docs still describe
  aggregate names that are not the real runtime API and omit shard migration
  details.

## Selected Design

Use tenant-affine outbox shard assignment:

```text
shard_id = stableHash64(length(tenantId) + ":" + tenantId) % shardCount
```

The length prefix keeps the hash input unambiguous. `runId` remains part of the
assignment key and API so tests and docs can assert the complete owned concern,
but the shard partition is tenant-affine to stop a noisy tenant from spreading
over every shared shard through many `runId` values.

Ordering remains per `(tenantId, runId)`:

- the PostgreSQL claim query already uses both columns;
- in-memory stores must be corrected to use a tenant/run stream key;
- dead-letter blocking must also be tenant/run scoped.

## Rejected Alternatives

- Keep `hash(runId)`: preserves current distribution but does not address
  `AR-D7`.
- Hash `tenantId + runId`: tenant-aware by input, but a large tenant with many
  runs can still occupy all shards.
- Add a new `tenant_shard_id` column: useful later for richer migration, but it
  widens schema and migration scope beyond `AR-D7` while persisted `shard_id`
  already supports the required claim path.
- Implement per-tenant weighted scheduling in the claim query: stronger fairness,
  but it is a separate scheduler policy and should not be hidden inside the shard
  assignment slice.

## Grouping Opportunities

The code should be grouped around a Delivery-owned sharding policy:

- `@dvt/delivery`: owns `OutboxShardAssignment` and in-memory test store routing.
- `@dvt/engine`: delegates in-memory state-store routing to delivery policy.
- `@dvt/adapter-postgres`: implements the same policy in SQL at enqueue time.
- `apps/outbox-worker`: owns process and shard-lock operations, not assignment
  semantics.

## Drift To Remove

- `ADR-0033` run-only formula.
- `outbox-worker` tests that describe run-only shard assignment.
- `system-operations-inventory` row naming `resolveOutboxShardId(runId, ...)`.
- component docs with generic aggregate names instead of actual public API.
- in-memory stream keys based only on `runId`.

## Future Lessons

- Multi-tenant infrastructure policies should name tenant scope at the value
  object boundary, not only in adapter SQL.
- Architecture tests need semantic checks for policy inputs and doc alignment,
  not only dependency or barrel thinness.
- Operational rollout belongs with the policy change because persisted
  `shard_id` makes old and new assignments coexist during migration.
