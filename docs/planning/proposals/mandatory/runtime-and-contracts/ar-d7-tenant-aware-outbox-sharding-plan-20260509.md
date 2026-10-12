---
title: AR-D7 Tenant-Aware Outbox Sharding Plan
status: Active
owner: Architecture / Delivery / State Store
last_reviewed: 2026-05-09
planning_type: mandatory-proposal
task_id: AR-D7
---

# AR-D7 Tenant-Aware Outbox Sharding Plan

## Purpose

`AR-D7` changes outbox shard assignment from run-only distribution to
tenant-aware partitioning so one high-volume tenant cannot spread across every
shared worker shard through many `runId` values.

The slice keeps the existing persisted `shard_id` column and the existing worker
owned-shard claim path. It changes the assignment policy for newly enqueued
outbox rows, aligns in-memory stores and PostgreSQL SQL, and documents rollout
rules for mixed old/new rows.

## Think-First Analysis

### Problem Summary

Current outbox sharding is `stableHash64(runId) % shardCount`. This preserves
per-run ordering but ignores tenant scope. A noisy tenant with many runs can
occupy all shards and compete with unrelated tenants across the whole worker
topology.

### Root Cause

The sharding policy was modeled as a primitive `runId` helper instead of a
Delivery-owned value object. The same run-only decision then spread into
delivery tests, engine in-memory state, PostgreSQL SQL, ADR prose, and
operational docs.

### Constraints And Invariants

- `ADR-0004`: outbox enqueue remains transactional with event persistence.
- `ADR-0031`: adapter paths must preserve tenant isolation.
- `ADR-0033`: workers own explicit shard lists and claim by persisted
  `shard_id`.
- Per-run ordering is really per `(tenantId, runId)` because run identifiers can
  repeat across tenants.
- `shardCount` changes remain an explicit migration.
- Existing outbox rows keep their stored `shard_id`; the rollout only changes
  assignment for rows written after deployment.

### Selected Option

Introduce a Delivery-owned `OutboxShardAssignment` policy with
tenant-affine assignment:

```text
shard_id = stableHash64(length(tenantId) + ":" + tenantId) % shardCount
```

The API carries `{ tenantId, runId }` so the complete owner identity is explicit,
but shard placement is tenant-affine. PostgreSQL implements the same length
prefixed tenant hash expression in enqueue SQL.

### Rejected Alternatives

- `hash(runId)`: leaves the `AR-D7` starvation risk unchanged.
- `hash(tenantId + runId)`: records tenant in the input but still lets one
  tenant distribute across every shard through many runs.
- new `tenant_shard_id` column: stronger long-term topology option, but this
  slice can use the existing persisted `shard_id` without schema widening.
- weighted per-tenant claim scheduling: useful later but a separate scheduler
  policy, not shard assignment.

## Command And Query Rail Impact

This slice changes internal worker/storage behavior, not a user-facing API.

- Rail: `AssignOutboxShard`.
- Type: query.
- Bounded context: Delivery.
- DDD owner: `OutboxShardAssignment` value object / policy.
- Application port: `IOutboxStorage.enqueueTx`.
- Adapter surface: in-memory delivery storage, engine in-memory state store,
  PostgreSQL adapter enqueue SQL.
- Scope and authorization: tenant identity comes from the persisted
  `EventEnvelope`; no new user authorization path is introduced.
- Negative tests: invalid shard count, missing tenant identity, tenant/run
  ordering isolation, noisy-tenant shard containment, and SQL formula drift.

`ClaimOutboxBatch` remains the existing internal command executed by
`OutboxWorker.tick()` through `IOutboxStorage.listPendingForClaim`. Its claim
filter remains `owned shard ids`.

## Fowler Planning Matrix

| Scenario                                                | Opportunity          | Fowler pattern                 | DDD owner                     | Rail                              | Implementation surfaces                                 | Tests                            | Out of scope       |
| ------------------------------------------------------- | -------------------- | ------------------------------ | ----------------------------- | --------------------------------- | ------------------------------------------------------- | -------------------------------- | ------------------ |
| Assign new outbox rows to shards                        | Primitive obsession  | Value Object / Policy          | `OutboxShardAssignment`       | `AssignOutboxShard` query         | `@dvt/delivery`, `@dvt/engine`, `@dvt/adapter-postgres` | delivery, engine, adapter tests  | weighted scheduler |
| Prevent noisy tenant full-topology spread               | Boundary drift       | Domain policy at port boundary | Delivery sharding policy      | `AssignOutboxShard` query         | delivery in-memory and Postgres enqueue                 | noisy-tenant isolation tests     | tenant quotas      |
| Preserve stream ordering across tenants sharing `runId` | Duplicate semantics  | Identity key extraction        | Outbox stream ordering policy | `ClaimOutboxBatch` command        | in-memory stores and Postgres evidence                  | tenant/run ordering tests        | schema change      |
| Keep docs current                                       | Documentation drift  | Component guide / ADR addendum | Outbox worker component       | none - current-state docs         | ADR, runbook, component docs                            | markdown + feature mechanization | new product API    |
| Prevent reversion to run-only hash                      | Test-only confidence | Semantic architecture test     | Architecture guard            | `ValidateOutboxShardPolicy` query | test files and docs                                     | architecture test                | barrel-only checks |

## Public API, Invariants, Transitions, Consumers

Canonical component guide:

- [Tenant-Aware Outbox Sharding Component](../../../architecture/components/outbox-worker/tenant-aware-outbox-sharding-component.md)

User stories:

- [Tenant-Aware Outbox Sharding User Stories](../../../architecture/components/outbox-worker/tenant-aware-outbox-sharding-user-stories.md)

## Implementation Plan

1. Add red behavior and architecture tests for tenant-affine shard assignment,
   tenant/run ordering keys, PostgreSQL SQL formula, and documentation drift.
2. Introduce the Delivery-owned `OutboxShardAssignment` policy.
3. Replace duplicated in-memory run-only helpers with the shared delivery
   policy.
4. Change PostgreSQL enqueue SQL from `md5(run_id)` to the tenant-affine hash
   expression.
5. Update `ADR-0033`, runbook, component docs, and user stories.
6. Add ARC-2 evidence and risk entries if the changed adapter/engine paths
   require them.
7. Run package tests, type checks, governance refresh, feature mechanization,
   ARC evidence check, and `pnpm verify:prepush`.

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: AR-D7-TENANT-AWARE-OUTBOX-SHARDING
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/ar-d7-tenant-aware-outbox-sharding-plan-20260509.md
componentGuides:
  - docs/architecture/components/outbox-worker/tenant-aware-outbox-sharding-component.md
  - docs/architecture/components/outbox-worker/outbox-worker-constraints.md
  - docs/adr/ADR-0033-outbox-worker-sharding-and-fencing-model.md
userStories:
  - docs/architecture/components/outbox-worker/tenant-aware-outbox-sharding-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/state/agent-lane-d.yaml
  - docs/adr/ADR-0004-event-sourcing-strategy.md
  - docs/adr/ADR-0031-adapter-tenant-isolation.md
  - docs/adr/ADR-0033-outbox-worker-sharding-and-fencing-model.md
allowedImplementationSurfaces:
  - buzon/20260509-codex-fowler-ar-d7-tenant-aware-outbox-sharding-analysis.md
  - docs/planning/proposals/mandatory/runtime-and-contracts/ar-d7-tenant-aware-outbox-sharding-plan-20260509.md
  - docs/planning/closeouts/20260509-ar-d7-tenant-aware-outbox-sharding-closeout.md
  - docs/architecture/components/outbox-worker/**
  - docs/architecture/index.md
  - docs/adr/ADR-0033-outbox-worker-sharding-and-fencing-model.md
  - docs/runbooks/outbox-worker-g5.md
  - docs/runbooks/index.md
  - docs/evidence/ed-20260509-tenant-aware-outbox-sharding.md
  - docs/evidence/index.md
  - docs/risk-register/quality/R-20260509-TENANT-AWARE-OUTBOX-SHARDING.yaml
  - docs/risk-register/quality/index.md
  - docs/planning/state/agent-lane-d.yaml
  - docs/planning/state/agent-lane-d.md
  - docs/planning/state/execution-workboard.md
  - docs/planning/state/open-task-route.md
  - docs/planning/index.md
  - docs/planning/proposals/index.md
  - docs/planning/closeouts/index.md
  - docs/planning/status/**
  - docs/.manifest.json
  - packages/@dvt/delivery/package.json
  - packages/@dvt/delivery/src/index.ts
  - packages/@dvt/delivery/src/outboxShardAssignment.ts
  - packages/@dvt/delivery/src/testing.ts
  - packages/@dvt/delivery/src/testing/InMemoryOutboxStorage.ts
  - packages/@dvt/delivery/src/testing/outboxSharding.ts
  - packages/@dvt/delivery/test/OutboxShardAssignment.architecture.test.ts
  - packages/@dvt/delivery/test/OutboxShardAssignment.test.ts
  - packages/@dvt/delivery/test/OutboxWorker.sharding.test.ts
  - packages/@dvt/delivery/test/support/outboxWorkerTestSupport.ts
  - packages/@dvt/engine/src/state/outboxSharding.ts
  - packages/@dvt/engine/src/state/InMemoryOutboxState.ts
  - packages/@dvt/engine/test/state/InMemoryTxStore.outbox.test.ts
  - packages/@dvt/adapter-postgres/src/PostgresOutboxStore.ts
  - packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.sharding.test.ts
  - packages/@dvt/adapter-postgres/test/smoke.test.ts
  - apps/outbox-worker/README.md
  - apps/outbox-worker/test/sharding/concurrentWorkerOrdering.test.ts
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/planner/**
  - packages/@dvt/adapter-temporal/**
  - apps/web/**
  - apps/api/**
  - specs/**
commandQueryRails:
  - name: AssignOutboxShard
    type: query
    dddOwner: OutboxShardAssignment
  - name: ClaimOutboxBatch
    type: command
    dddOwner: OutboxWorkerDeliveryRuntime
  - name: ValidateOutboxShardPolicy
    type: query
    dddOwner: OutboxShardArchitectureGuard
domainObjects:
  - name: OutboxShardAssignment
    type: value object / policy
    owner: packages/@dvt/delivery/src/outboxShardAssignment.ts
  - name: OutboxStreamOrderingKey
    type: value object
    owner: packages/@dvt/delivery/src/outboxShardAssignment.ts
  - name: PostgresOutboxShardSql
    type: adapter SQL policy
    owner: packages/@dvt/adapter-postgres/src/PostgresOutboxStore.ts
fowlerSignals:
  - Primitive obsession removed from shard assignment.
  - Duplicate run-only hash semantics removed.
  - Tenant fairness is encoded before adapter enqueue.
  - Architecture guard validates semantic policy and doc alignment.
architectureGuards:
  - pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - backend delivery worker behavior only
completionGate:
  - pnpm --filter @dvt/delivery test
  - pnpm --filter @dvt/engine test -- test/state/InMemoryTxStore.outbox.test.ts
  - pnpm --filter @dvt/adapter-postgres test -- PostgresStateStoreAdapter.sharding.test.ts
  - pnpm --filter dvt-outbox-worker test -- test/sharding/concurrentWorkerOrdering.test.ts
  - pnpm --filter @dvt/delivery typecheck
  - pnpm --filter @dvt/engine typecheck
  - pnpm --filter @dvt/adapter-postgres typecheck
  - pnpm --filter dvt-outbox-worker typecheck
  - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
  - pnpm governance:refresh
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: tenant-affine-shard-assignment-policy
    redTest: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.test.ts
    expectedFailure: The delivery package has no tenant-aware assignment policy and run-only assignment lets one tenant spread across all shards.
    patchSurfaces:
      - packages/@dvt/delivery/src/outboxShardAssignment.ts
      - packages/@dvt/delivery/src/index.ts
      - packages/@dvt/delivery/src/testing/outboxSharding.ts
      - packages/@dvt/delivery/test/OutboxShardAssignment.test.ts
    greenTest: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.test.ts
  - id: tenant-run-ordering-and-worker-proof
    redTest: pnpm --filter dvt-outbox-worker test -- test/sharding/concurrentWorkerOrdering.test.ts
    expectedFailure: In-memory storage keys dead-letter blocking and head-of-line ordering by runId only and tests still describe run-only sharding.
    patchSurfaces:
      - packages/@dvt/delivery/src/testing/InMemoryOutboxStorage.ts
      - packages/@dvt/engine/src/state/InMemoryOutboxState.ts
      - apps/outbox-worker/test/sharding/concurrentWorkerOrdering.test.ts
      - packages/@dvt/engine/test/state/InMemoryTxStore.outbox.test.ts
    greenTest: pnpm --filter dvt-outbox-worker test -- test/sharding/concurrentWorkerOrdering.test.ts
  - id: postgres-tenant-aware-enqueue-sql
    redTest: pnpm --filter @dvt/adapter-postgres test -- PostgresStateStoreAdapter.sharding.test.ts
    expectedFailure: PostgreSQL enqueue SQL still computes shard_id from md5(run_id) instead of tenant-affine assignment.
    patchSurfaces:
      - packages/@dvt/adapter-postgres/src/PostgresOutboxStore.ts
      - packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.sharding.test.ts
    greenTest: pnpm --filter @dvt/adapter-postgres test -- PostgresStateStoreAdapter.sharding.test.ts
  - id: semantic-architecture-and-doc-alignment
    redTest: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
    expectedFailure: ADR, runbook, component guide, and source modules still allow run-only shard assignment drift.
    patchSurfaces:
      - packages/@dvt/delivery/test/OutboxShardAssignment.architecture.test.ts
      - docs/adr/ADR-0033-outbox-worker-sharding-and-fencing-model.md
      - docs/runbooks/outbox-worker-g5.md
      - docs/architecture/components/outbox-worker/**
    greenTest: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
symbols:
  - name: OutboxShardAssignmentKey
    path: packages/@dvt/delivery/src/outboxShardAssignment.ts
    dddOwner: OutboxShardAssignment
    cqRails:
      - AssignOutboxShard
    fowlerSignals:
      - Primitive obsession removed from shard identity.
    architectureGuard: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
    cypressCoverage: N/A - backend delivery policy
    unitTests:
      - pnpm --filter @dvt/delivery test -- OutboxShardAssignment.test.ts
  - name: buildOutboxShardAssignmentHashInput
    path: packages/@dvt/delivery/src/outboxShardAssignment.ts
    dddOwner: OutboxShardAssignment
    cqRails:
      - AssignOutboxShard
    fowlerSignals:
      - Explicit value-object hash material.
    architectureGuard: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
    cypressCoverage: N/A - backend delivery policy
    unitTests:
      - pnpm --filter @dvt/delivery test -- OutboxShardAssignment.test.ts
  - name: buildOutboxStreamOrderingKey
    path: packages/@dvt/delivery/src/outboxShardAssignment.ts
    dddOwner: OutboxStreamOrderingKey
    cqRails:
      - ClaimOutboxBatch
    fowlerSignals:
      - Tenant/run ordering key centralized outside in-memory stores.
    architectureGuard: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
    cypressCoverage: N/A - backend delivery policy
    unitTests:
      - pnpm --filter @dvt/delivery test -- OutboxShardAssignment.test.ts
  - name: resolveOutboxShardId
    path: packages/@dvt/delivery/src/outboxShardAssignment.ts
    dddOwner: OutboxShardAssignment
    cqRails:
      - AssignOutboxShard
    fowlerSignals:
      - Tenant-aware shard assignment policy.
    architectureGuard: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
    cypressCoverage: N/A - backend delivery policy
    unitTests:
      - pnpm --filter @dvt/delivery test -- OutboxShardAssignment.test.ts
  - name: resolveOutboxShardId
    path: packages/@dvt/delivery/src/testing/outboxSharding.ts
    dddOwner: OutboxShardAssignment compatibility facade
    cqRails:
      - AssignOutboxShard
    fowlerSignals:
      - Duplicate run-only hash semantics removed.
    architectureGuard: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
    cypressCoverage: N/A - backend delivery policy
    unitTests:
      - pnpm --filter @dvt/delivery test -- OutboxShardAssignment.test.ts
  - name: resolveOutboxShardId
    path: packages/@dvt/engine/src/state/outboxSharding.ts
    dddOwner: OutboxShardAssignment compatibility facade
    cqRails:
      - AssignOutboxShard
    fowlerSignals:
      - Engine delegates sharding policy to delivery.
    architectureGuard: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
    cypressCoverage: N/A - backend delivery policy
    unitTests:
      - pnpm --filter @dvt/engine test -- test/state/InMemoryTxStore.outbox.test.ts
  - name: buildOutboxStreamOrderingKey
    path: packages/@dvt/engine/src/state/outboxSharding.ts
    dddOwner: OutboxStreamOrderingKey compatibility facade
    cqRails:
      - ClaimOutboxBatch
    fowlerSignals:
      - Engine exposes semantic facade functions instead of a barrel re-export.
    architectureGuard: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
    cypressCoverage: N/A - backend delivery policy
    unitTests:
      - pnpm --filter @dvt/engine test -- test/state/InMemoryTxStore.outbox.test.ts
  - name: normalizeTenantId
    path: packages/@dvt/delivery/src/outboxShardAssignment.ts
    dddOwner: OutboxShardAssignment
    cqRails:
      - AssignOutboxShard
    fowlerSignals:
      - Fail-closed tenant identity validation.
    architectureGuard: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
    cypressCoverage: N/A - backend delivery policy
    unitTests:
      - pnpm --filter @dvt/delivery test -- OutboxShardAssignment.test.ts
  - name: normalizeRunId
    path: packages/@dvt/delivery/src/outboxShardAssignment.ts
    dddOwner: OutboxShardAssignment
    cqRails:
      - AssignOutboxShard
    fowlerSignals:
      - Fail-closed stream identity validation.
    architectureGuard: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
    cypressCoverage: N/A - backend delivery policy
    unitTests:
      - pnpm --filter @dvt/delivery test -- OutboxShardAssignment.test.ts
  - name: REPO_ROOT
    path: packages/@dvt/delivery/test/OutboxShardAssignment.architecture.test.ts
    dddOwner: OutboxShardArchitectureGuard
    cqRails:
      - ValidateOutboxShardPolicy
    fowlerSignals:
      - Semantic architecture guard.
    architectureGuard: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
    cypressCoverage: N/A - backend delivery policy
    unitTests:
      - pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
  - name: readRepoFile
    path: packages/@dvt/delivery/test/OutboxShardAssignment.architecture.test.ts
    dddOwner: OutboxShardArchitectureGuard
    cqRails:
      - ValidateOutboxShardPolicy
    fowlerSignals:
      - Semantic architecture guard.
    architectureGuard: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
    cypressCoverage: N/A - backend delivery policy
    unitTests:
      - pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
  - name: findTenantIdForShard
    path: packages/@dvt/delivery/test/OutboxShardAssignment.test.ts
    dddOwner: OutboxShardAssignment test support
    cqRails:
      - AssignOutboxShard
    fowlerSignals:
      - Tenant-aware behavior proof.
    architectureGuard: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
    cypressCoverage: N/A - backend delivery policy
    unitTests:
      - pnpm --filter @dvt/delivery test -- OutboxShardAssignment.test.ts
  - name: findTenantIdForShard
    path: packages/@dvt/delivery/test/support/outboxWorkerTestSupport.ts
    dddOwner: OutboxWorker sharding test support
    cqRails:
      - AssignOutboxShard
    fowlerSignals:
      - Tenant-aware behavior proof.
    architectureGuard: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
    cypressCoverage: N/A - backend delivery policy
    unitTests:
      - pnpm --filter @dvt/delivery test -- OutboxWorker.sharding.test.ts
  - name: findTenantIdForShard
    path: packages/@dvt/engine/test/state/InMemoryTxStore.outbox.test.ts
    dddOwner: Engine in-memory outbox test support
    cqRails:
      - AssignOutboxShard
    fowlerSignals:
      - Engine delegates tenant-aware sharding.
    architectureGuard: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
    cypressCoverage: N/A - backend delivery policy
    unitTests:
      - pnpm --filter @dvt/engine test -- test/state/InMemoryTxStore.outbox.test.ts
  - name: findTenantIdForShard
    path: packages/@dvt/adapter-postgres/test/smoke.test.ts
    dddOwner: PostgreSQL outbox integration test support
    cqRails:
      - AssignOutboxShard
    fowlerSignals:
      - Adapter SQL parity with delivery policy.
    architectureGuard: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
    cypressCoverage: N/A - backend delivery policy
    unitTests:
      - pnpm --filter @dvt/adapter-postgres test -- PostgresStateStoreAdapter.sharding.test.ts
  - name: TENANT_ID_CANDIDATES
    path: apps/outbox-worker/test/sharding/concurrentWorkerOrdering.test.ts
    dddOwner: Outbox worker sharding proof fixture
    cqRails:
      - AssignOutboxShard
      - ClaimOutboxBatch
    fowlerSignals:
      - Tenant-aware behavior proof.
    architectureGuard: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
    cypressCoverage: N/A - backend delivery worker proof
    unitTests:
      - pnpm --filter dvt-outbox-worker test -- test/sharding/concurrentWorkerOrdering.test.ts
  - name: discoverShard
    path: apps/outbox-worker/test/sharding/concurrentWorkerOrdering.test.ts
    dddOwner: Outbox worker sharding proof fixture
    cqRails:
      - AssignOutboxShard
    fowlerSignals:
      - Tenant-aware behavior proof.
    architectureGuard: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
    cypressCoverage: N/A - backend delivery worker proof
    unitTests:
      - pnpm --filter dvt-outbox-worker test -- test/sharding/concurrentWorkerOrdering.test.ts
  - name: findTenantIdPerShard
    path: apps/outbox-worker/test/sharding/concurrentWorkerOrdering.test.ts
    dddOwner: Outbox worker sharding proof fixture
    cqRails:
      - AssignOutboxShard
    fowlerSignals:
      - Tenant-aware behavior proof.
    architectureGuard: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
    cypressCoverage: N/A - backend delivery worker proof
    unitTests:
      - pnpm --filter dvt-outbox-worker test -- test/sharding/concurrentWorkerOrdering.test.ts
  - name: makeRunEvents
    path: apps/outbox-worker/test/sharding/concurrentWorkerOrdering.test.ts
    dddOwner: Outbox worker sharding proof fixture
    cqRails:
      - ClaimOutboxBatch
    fowlerSignals:
      - Tenant-aware behavior proof.
    architectureGuard: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
    cypressCoverage: N/A - backend delivery worker proof
    unitTests:
      - pnpm --filter dvt-outbox-worker test -- test/sharding/concurrentWorkerOrdering.test.ts
  - name: requireTenantIdForShard
    path: apps/outbox-worker/test/sharding/concurrentWorkerOrdering.test.ts
    dddOwner: Outbox worker sharding proof fixture
    cqRails:
      - AssignOutboxShard
    fowlerSignals:
      - Tenant-aware behavior proof.
    architectureGuard: pnpm --filter @dvt/delivery test -- OutboxShardAssignment.architecture.test.ts
    cypressCoverage: N/A - backend delivery worker proof
    unitTests:
      - pnpm --filter dvt-outbox-worker test -- test/sharding/concurrentWorkerOrdering.test.ts
```
