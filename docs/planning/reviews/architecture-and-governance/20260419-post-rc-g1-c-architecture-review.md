---
title: Post RC-G1-C Architecture Review
status: Active
date: 2026-04-19
last_reviewed: 2026-04-26
reviewer: Principal / Staff Architect (AI-assisted)
scope: post-merge review of RC-G1-C ownership migration and immediate architecture backlog
review_type: architecture-and-governance
planning_type: review
---

# Post RC-G1-C Architecture Review

This review records what the merged `RC-G1-C` branch improved, where the
implementation still lags the architectural target, and which backlog items now
own the remaining work.

It is not a second migration proposal. It is the post-merge architecture intake
for the next bounded follow-ups.

## Review Basis

Primary governing and status sources:

- [Governance inventory](../../status/governance-document-rule-inventory.md)
- [AI work protocol](../../../guides/ai-work-protocol.md)
- [Reference architecture](../../../architecture/reference-architecture.md)
- [System delivery status](../../../architecture/system-delivery-status.md)
- [RC-G1 ownership migration plan](../../proposals/mandatory/runtime-and-contracts/contracts-domain-ownership-migration-plan-20260327.md)
- [RC-G1-C closeout](../../closeouts/20260419-rc-g1-c-owner-package-migration-closeout.md)

Primary code anchors reviewed:

- [delivery contracts](../../../../packages/@dvt/delivery/src/contracts.ts)
- [traceability lineage contracts](../../../../packages/@dvt/traceability-service/src/lineage/contracts.ts)
- [artifact integrity runtime](../../../../packages/@dvt/artifacts/src/runtime/validateArtifactIntegrity.ts)
- [OutboxWorkerRuntime](../../../../packages/@dvt/delivery/src/application/OutboxWorkerRuntime.ts)
- [OutboxWorkerRuntimeLoopController](../../../../packages/@dvt/delivery/src/application/OutboxWorkerRuntimeLoopController.ts)
- [OutboxWorkerRuntimeHookRunner](../../../../packages/@dvt/delivery/src/application/OutboxWorkerRuntimeHookRunner.ts)
- [OutboxWorkerMonitor](../../../../apps/outbox-worker/src/ops/OutboxWorkerMonitor.ts)
- [OutboxRuntimeHealthTracker](../../../../apps/outbox-worker/src/ops/monitor/OutboxRuntimeHealthTracker.ts)
- [OutboxDeliveryTelemetry](../../../../apps/outbox-worker/src/ops/monitor/OutboxDeliveryTelemetry.ts)
- [renderOutboxWorkerMetrics](../../../../apps/outbox-worker/src/ops/monitor/renderOutboxWorkerMetrics.ts)
- [InMemoryRunStateStore](../../../../packages/@dvt/engine/src/state/InMemoryRunStateStore.ts)
- [InMemoryRunStateCore](../../../../packages/@dvt/engine/src/state/InMemoryRunStateCore.ts)
- [InMemoryOutboxState](../../../../packages/@dvt/engine/src/state/InMemoryOutboxState.ts)
- [InMemoryOutboxStorage](../../../../packages/@dvt/delivery/src/testing/InMemoryOutboxStorage.ts)
- [PostgresStateStoreAdapter](../../../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts)
- [PostgresRunStateStoreAdapter](../../../../packages/@dvt/adapter-postgres/src/PostgresRunStateStoreAdapter.ts)
- [PostgresSnapshotQueueAdapter](../../../../packages/@dvt/adapter-postgres/src/PostgresSnapshotQueueAdapter.ts)
- [PostgresStateStoreAdminAdapter](../../../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdminAdapter.ts)
- [LineageWorkerRuntime](../../../../packages/@dvt/traceability-service/src/lineage/LineageWorkerRuntime.ts)
- [lineageWorkerDeadLetterSupport](../../../../packages/@dvt/traceability-service/src/lineage/runtime/lineageWorkerDeadLetterSupport.ts)
- [contracts barrel](../../../../packages/@dvt/contracts/src/index.ts)

## Executive Verdict

`RC-G1-C` materially improves the architecture.

Compared with a mature event-sourced and bounded-context-driven system, the
branch now behaves more like a disciplined modular platform and less like a
shared-kernel convenience monorepo.

The main residual problems are no longer ownership mistakes. They are:

1. uneven decomposition quality between delivery and lineage runtime seams
2. duplicated in-memory outbox behavior across engine and delivery
3. documentation truth lag after the merge

## What Improved

### 1. Ownership moved in the right direction

Delivery behavior now lives under
[packages/@dvt/delivery/src/contracts.ts](../../../../packages/@dvt/delivery/src/contracts.ts),
lineage behavior now lives under
[packages/@dvt/traceability-service/src/lineage/contracts.ts](../../../../packages/@dvt/traceability-service/src/lineage/contracts.ts),
and artifact integrity validation now lives under
[packages/@dvt/artifacts/src/runtime/validateArtifactIntegrity.ts](../../../../packages/@dvt/artifacts/src/runtime/validateArtifactIntegrity.ts).

That is the mature posture:

- shared kernel keeps serializable transport shapes
- behavior belongs to the bounded context that owns the policy
- composition roots import owner-local ports instead of shared-kernel
  convenience aliases

### 2. Delivery runtime decomposition is materially better

[OutboxWorkerRuntime](../../../../packages/@dvt/delivery/src/application/OutboxWorkerRuntime.ts)
now composes loop and hook collaborators instead of owning the whole runtime
mechanic itself.

[OutboxWorkerMonitor](../../../../apps/outbox-worker/src/ops/OutboxWorkerMonitor.ts)
also now delegates health, delivery telemetry, retention telemetry, and metric
rendering through smaller seams.

This is a real Fowler-style improvement:

- thinner coordinator classes
- fewer mixed responsibilities
- more honest application-service boundaries

### 3. Adapter and store seams are closer to a mature service split

[PostgresStateStoreAdapter](../../../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts)
no longer carries the whole operational surface itself. Runtime, admin, and
snapshot responsibilities have clearer homes.

[InMemoryRunStateStore](../../../../packages/@dvt/engine/src/state/InMemoryRunStateStore.ts)
also moved toward a facade plus focused support modules instead of one store
blob.

## Remaining Structural Risks

### 1. Lineage runtime is still heavier than its delivery counterpart

[LineageWorkerRuntime](../../../../packages/@dvt/traceability-service/src/lineage/LineageWorkerRuntime.ts)
still owns too much in one class:

- lifecycle loop
- per-tick processing
- lag tracking
- dead-letter counting
- auto-replay coordination
- operational logging

The lineage package now has the right ownership. It still needs the next
decomposition pass.

### 2. In-memory outbox behavior is duplicated across bounded contexts

[InMemoryOutboxState](../../../../packages/@dvt/engine/src/state/InMemoryOutboxState.ts)
and
[InMemoryOutboxStorage](../../../../packages/@dvt/delivery/src/testing/InMemoryOutboxStorage.ts)
now share very similar shard, replay, and dead-letter semantics.

That duplication is not yet a correctness bug, but it is maintenance drift
waiting to happen.

### 3. Post-merge documentation truth is not fully aligned

The code truth is ahead of some documentation statements:

- the `RC-G1-C` closeout says the delivery-owned behavioral surface was removed
  from the root `@dvt/contracts` barrel, but
  [packages/@dvt/contracts/src/index.ts](../../../../packages/@dvt/contracts/src/index.ts)
  still re-exports the `IOutboxStorage.v1` module as a DTO-only shared seam
- [system-delivery-status.md](../../../architecture/system-delivery-status.md)
  still reports older workspace/source/test counts than
  [generated-code-state.md](../../status/generated-code-state.md)

This is truth-sync debt, not architecture collapse, but it should be closed
explicitly.

Status update 2026-04-26:

- `RC-G1-C-TRUTH-SYNC` is now closed.
- `system-delivery-status.md` now matches the published
  `generated-code-state.md` counts.
- the `RC-G1-C` closeout now distinguishes the DTO-only root-barrel re-export
  from owner-local delivery contract ownership.

## Routing Notes

This review feeds the following backlog:

1. `RC-G1-C-TRUTH-SYNC`
   - reconcile the active closeout and status surfaces with the code that
     actually shipped
2. `AR-A7`
   - continue the runtime-seam cleanup after the delivery-side split by routing
     the remaining work into explicit shell and duplicate-semantics follow-up
3. `AR-B5`
   - decompose `LineageWorkerRuntime` until its orchestration shape is on par
     with the delivery runtime without collapsing lineage ownership back into a
     shared helper

## Conclusion

`RC-G1-C` should be treated as a successful ownership migration.

The next architectural work is narrower and better defined than before the
merge:

- keep documentation truthful
- keep delivery and lineage decomposition quality converging
- remove duplicated in-memory outbox semantics before they drift
