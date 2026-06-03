---
slice: 20260509-ar-d7-tenant-aware-outbox-sharding
date: 2026-05-09
last_reviewed: 2026-05-09
task_id: AR-D7
author: AI (GPT-5)
---

# Closeout: AR-D7 Tenant-Aware Outbox Sharding

## Governing Sources

- `docs/planning/status/governance-document-rule-inventory.md`
- `AGENTS.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/state/agent-lane-d.yaml`
- `docs/adr/ADR-0004-event-sourcing-strategy.md`
- `docs/adr/ADR-0031-adapter-tenant-isolation.md`
- `docs/adr/ADR-0033-outbox-worker-sharding-and-fencing-model.md`
- `docs/runbooks/outbox-worker-g5.md`

## Think-First Summary

AR-D7 addressed a multi-tenant fairness problem in the transactional outbox:
the old run-only shard hash let one noisy tenant spread work across every
shared worker shard by generating many run identifiers.

The selected design introduces a Delivery-owned value object / policy:

```text
shard_id = stableHash64(length(tenantId) + ":" + tenantId) % shardCount
```

`runId` remains part of the public assignment key and ordering key so stream
identity is explicit, but it is not the partition input.

## Changes Made

| Area               | Change                                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Delivery           | Added `OutboxShardAssignmentKey`, `resolveOutboxShardId`, and `buildOutboxStreamOrderingKey`.                                      |
| Delivery storage   | In-memory storage now assigns shards by tenant and scopes ordering/dead-letter blocking to `(tenantId, runId)`.                    |
| Engine state       | In-memory engine outbox state delegates shard and ordering semantics to delivery.                                                  |
| PostgreSQL adapter | Enqueue SQL computes `shard_id` from length-prefixed `tenant_id`, preserving persisted `shard_id` claim behavior.                  |
| Outbox worker      | Sharding tests cover noisy-tenant containment and same-run-id isolation across tenants.                                            |
| Docs               | Fowler analysis, implementation plan, component guide, user stories, ADR-0033, runbook, evidence, risk, and closeout were updated. |

## TDD Evidence

| Cycle                          | Red                                                                                                                               | Green                                                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Tenant-aware assignment        | `pnpm --filter @dvt/delivery test -- OutboxShardAssignment.test.ts` failed before the policy existed.                             | Same command passed after adding the Delivery policy.                                                             |
| Stream ordering key extraction | `pnpm --filter @dvt/delivery test -- OutboxShardAssignment.test.ts` failed with `buildOutboxStreamOrderingKey is not a function`. | Same command passed after centralizing the ordering key.                                                          |
| PostgreSQL SQL parity          | Adapter sharding test failed while enqueue SQL still described run-only hashing.                                                  | `pnpm --filter @dvt/adapter-postgres test -- PostgresStateStoreAdapter.sharding.test.ts` passed after SQL parity. |

## Validation Evidence

| Command                                                                                  | Result                   |
| ---------------------------------------------------------------------------------------- | ------------------------ |
| `pnpm --filter @dvt/delivery typecheck`                                                  | PASS                     |
| `pnpm --filter @dvt/engine typecheck`                                                    | PASS                     |
| `pnpm --filter @dvt/adapter-postgres typecheck`                                          | PASS                     |
| `pnpm --filter dvt-outbox-worker typecheck`                                              | PASS                     |
| `pnpm --filter @dvt/delivery test`                                                       | PASS - 9 files, 53 tests |
| `pnpm --filter @dvt/engine test -- test/state/InMemoryTxStore.outbox.test.ts`            | PASS - 1 file, 9 tests   |
| `pnpm --filter @dvt/adapter-postgres test -- PostgresStateStoreAdapter.sharding.test.ts` | PASS - 1 file, 17 tests  |
| `pnpm --filter dvt-outbox-worker test -- test/sharding/concurrentWorkerOrdering.test.ts` | PASS - 1 file, 6 tests   |
| `pnpm docs:feature-mechanization:implementation`                                         | PASS                     |

## Debt And Stub Evidence

- No stubs, placeholders, fake adapters, or fake success paths were added.
- No lint, type, test, or quality rule was relaxed.
- No hook bypass was used.
- Residual rollout risk is explicitly tracked in
  `docs/risk-register/quality/R-20260509-TENANT-AWARE-OUTBOX-SHARDING.yaml`.
