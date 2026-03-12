---
title: G5 - Outbox Worker Consolidated Plan
status: Proposed
owner: architecture
last_reviewed: 2026-03-12
planning_type: execution-plan
---

# G5 - Outbox Worker Consolidated Plan

Canonical implementation plan for closing `G5` without widening the scope beyond
what the current repository can realistically absorb.

## Related documents

- [Gap Execution Plans](GAP_EXECUTION_PLANS.md)
- [G5 - AI Execution Tracker](G5-AI-EXECUTION-TRACKER.md)
- [G5 / US-G5.4 Operability And Ownership Hardening Plan](G5-US-G5.4-OPERABILITY-AND-OWNERSHIP-HARDENING-PLAN.md)
- [G5 / US-G5.5 Sharding And Fencing Plan](G5-US-G5.5-SHARDING-AND-FENCING-PLAN.md)
- [Canonical Doc Code Matrix](../status/canonical-doc-code-matrix.md)
- [System Delivery Status](../../architecture/system-delivery-status.md)
- [ADR-0009: Outbox Publication Ordering Guarantees](../../adr/ADR-0009_Outbox_Ordering.md)
- [ADR-0033 - Outbox Worker Sharding And Fencing Model](../../adr/ADR-0033-outbox-worker-sharding-and-fencing-model.md)
- Reference material only: [archived gap5 review packs](../../archive/planning/gaps/gap5/)

## Traceability tuple

- `canonical_spec`: [G5 - Outbox Worker Consolidated Plan](G5-OUTBOX-WORKER-CONSOLIDATED-PLAN.md)
- `status_doc`: [Gap Execution Plans](GAP_EXECUTION_PLANS.md)
- `code_paths`: `apps/outbox-worker/src/server.ts`, `apps/outbox-worker/src/runtime/createOutboxWorkerRuntime.ts`, `apps/outbox-worker/src/ownership/PgShardOwnershipGate.ts`, `apps/outbox-worker/src/ops/OutboxWorkerMonitor.ts`, `apps/outbox-worker/src/ops/OperationalServer.ts`, `apps/outbox-worker/src/bus/HttpEventBus.ts`, `packages/@dvt/engine/src/outbox/OutboxWorker.ts`, `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`
- `test_paths`: `apps/outbox-worker/test/runtime/OutboxWorkerRuntime.test.ts`, `apps/outbox-worker/test/plugins/env.test.ts`, `apps/outbox-worker/test/ownership/PgShardOwnershipGate.test.ts`, `apps/outbox-worker/test/bus/HttpEventBus.test.ts`, `apps/outbox-worker/test/ops/OutboxWorkerMonitor.test.ts`, `apps/outbox-worker/test/ops/OperationalServer.test.ts`, `packages/@dvt/engine/test/outbox/OutboxWorker.test.ts`, `packages/@dvt/adapter-postgres/test/smoke.test.ts`
- `verification_cmd`: `pnpm --filter dvt-outbox-worker typecheck`, `pnpm --filter dvt-outbox-worker build`, `pnpm --filter dvt-outbox-worker test`, `pnpm test:engine`, `pnpm test:adapter-postgres`
- `evidence_or_risk`: standalone host, bounded HTTP publisher, health/readiness endpoints, metrics, and runbook now exist in code; keep canary and scale-out risk explicit until PR-4/PR-5 land

## 1. Executive decision

`G5` will be delivered in two layers, not as one oversized rewrite.

### Layer A - close the real missing gap now

Deliver an **independent polling process** around the existing outbox contracts
and storage model already implemented in the repository.

This layer includes:

- standalone worker runtime/process,
- explicit runtime ownership outside the API lifecycle,
- graceful start/stop behavior,
- operational metrics and health endpoints,
- explicit delivery wiring to the current event publication target,
- canary cutover and removal of ambiguous inline ownership.

### Layer B - harden for scale only after Layer A is real

Add **multi-worker safe ordering and scale-out** only after the standalone worker
exists and is observable.

This layer includes:

- one chosen ADR-0009 enforcement strategy for concurrent workers,
- deterministic shard routing and explicit shard ownership,
- dedicated fencing semantics for effective ownership loss,
- tests that prove no reordering for the same `runId`,
- deployment rules for safe horizontal ownership.

## 2. What this plan rejects

This plan does **not** accept the broadest possible interpretation of the
`gap5` proposal for the current implementation slice.

For the current repository state, `G5` is **not**:

- a rewrite of the outbox data model around `topic`, `deliveryChannel`, and `sideEffectKind`,
- a generic subscriber routing platform,
- an unordered-by-default worker,
- a CDC/polling coexistence framework,
- or a drop-in import of the `gap5` repo-ready package.

The archived material in [`docs/archive/planning/gaps/gap5/`](../../archive/planning/gaps/gap5/)
remains useful as reference, but it is **reference design**, not an
implementation source of truth.

## 3. Why the scope is cut this way

The current repository already has the following real baseline:

- standalone host scaffold in [`apps/outbox-worker/`](../../../apps/outbox-worker/),
- reusable worker logic in [`packages/@dvt/engine/src/outbox/OutboxWorker.ts`](../../../packages/@dvt/engine/src/outbox/OutboxWorker.ts),
- PostgreSQL claiming, retries, and DLQ support in [`packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`](../../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts),
- outbox payloads shaped as current run event envelopes, not generic side-effect records,
- operational status that now marks the standalone host and initial operational boundary as partial in [System Delivery Status](../../architecture/system-delivery-status.md).

The broad `gap5` package changes all of these at once:

- store contract,
- record schema,
- naming model,
- subscriber model,
- delivery semantics,
- and runtime layering.

That is not extraction. That is a platform redesign. The repo does not need that
to close the actual missing production gap.

## 4. Non-negotiable invariants

The standalone worker must preserve the invariants already claimed by the repo.

### 4.1 Ordering

For the current run-event outbox, ADR-0009 remains normative:

- ordering key is `runId`,
- ordering attribute is `runSeq`,
- events for the same `runId` must publish in strictly increasing `runSeq`,
- subsequent events for the same `runId` must not publish before a prior failed
  one is resolved or dead-lettered.

### 4.2 Delivery semantics

- delivery is at-least-once,
- retries use backoff,
- DLQ preserves original identifiers needed for replay,
- crash-window duplicates are possible and must be acknowledged explicitly.

### 4.3 Runtime ownership

- the worker must run as an independent process,
- ownership of polling delivery must be explicit per environment,
- dual-active ownership for the same production responsibility is not allowed.

## 5. Scope for the first executable slice

The first executable slice for `G5` is intentionally narrow.

### In scope

- `apps/outbox-worker` or equivalent standalone executable package
- composition of current `OutboxWorker` + `PostgresStateStoreAdapter`
- explicit event bus / projector publication wiring for current outbox payloads
- runtime loop with `AbortSignal` and deterministic shutdown
- liveness/readiness
- metrics and structured logs
- deployment profile for a single active owner
- canary rollout plan

### Out of scope for this slice

- new outbox table shape
- lane leases
- `topic` / `deliveryChannel` / `sideEffectKind` schema migration
- generic subscriber registry platform
- CDC runtime family
- horizontal scaling before ADR-0009 enforcement is implemented

## 6. Executable work plan

The plan is intentionally PR-shaped so the team can move without reopening
architecture on every step.

### PR-1 - Standalone host and runtime

Deliver:

- create `apps/outbox-worker`,
- wire configuration, logger, adapter bootstrap, and bus wiring,
- implement runtime loop around the current worker core,
- add `AbortSignal` shutdown and startup failure behavior,
- keep deployment mode **single active owner only**.

Primary code targets:

- `apps/outbox-worker/*` new package or app
- `packages/@dvt/engine/src/outbox/OutboxWorker.ts`
- `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`

Acceptance:

- worker can start independently from `apps/api`,
- worker drains pending outbox records in a controlled local environment,
- worker exits cleanly on shutdown signal,
- initial package-level typecheck/build/tests pass,
- worker supports at least one real downstream publisher mode with bounded timeout,
- no production configuration suggests multi-instance safety yet.

### PR-2 - Operational boundary

Deliver:

- readiness and liveness endpoints,
- counters and lag metrics,
- structured logs for claim, delivery, retry, and DLQ transitions,
- deployment docs and a minimal runbook.

Acceptance:

- health endpoints exist and reflect runtime state,
- lag and retry metrics are emitted,
- operators can distinguish idle, draining, failing, and stopped states.

### PR-3 - Correctness hardening

Deliver:

- tests for standalone runtime behavior,
- tests for failure ordering and replay,
- deterministic crash-window validation at the worker boundary or fixture layer,
- explicit proof of at-least-once behavior.

Mandatory test themes:

- publish success plus ack failure causes redelivery,
- DLQ replay preserves original ordering identifiers,
- subsequent events for the same `runId` do not bypass a prior failed event,
- single-owner runtime keeps behavior identical to current in-process semantics.

Acceptance:

- regression suite passes in CI,
- the team can explain the failure model without hand-waving.

### PR-4 - Canary cutover

Deliver:

- environment-scoped worker enablement,
- explicit standalone worker ownership mode for the canary environment,
- deployment/runtime wiring that proves the standalone worker is the sole active owner in that environment,
- canary rollout guide,
- rollback instructions.

Acceptance:

- one environment runs the standalone worker as sole active owner,
- no ambiguous dual-active delivery path remains,
- rollback is documented and testable.

### PR-5 - Multi-worker strategy

Deliver exactly one ADR-0009 enforcement mechanism for concurrent workers:

- **Option A**: shard by `runId`, or
- **Option B**: locking/coordination that really preserves per-`runId` order.

Selected planning direction for `G5`:

- `Option A` is the active design direction.
- `runId` maps deterministically to `shard_id`.
- workers own explicit shard lists from deployment configuration.
- shard ownership is fenced with PostgreSQL advisory locks held on dedicated
  ownership sessions.
- `shardCount` changes are treated as explicit topology migrations.

The first two executable `G5.5` slices are now:

- persisted `shard_id` plus shard-aware claim path
- startup advisory-lock ownership sessions held on a dedicated PostgreSQL
  connection

Lock-loss runtime behavior and concurrent-worker proof remain open follow-up
work inside the same stage.

Design detail for this stage lives in:

- [`G5 / US-G5.5 Sharding And Fencing Plan`](G5-US-G5.5-SHARDING-AND-FENCING-PLAN.md)
- [`ADR-0033 - Outbox Worker Sharding And Fencing Model`](../../adr/ADR-0033-outbox-worker-sharding-and-fencing-model.md)

Acceptance:

- concurrent workers cannot reorder events for the same `runId`,
- the chosen strategy is implemented in code and documented in deployment config,
- required concurrency tests exist before horizontal scaling is allowed.

Release rule:

Horizontal scale-out is blocked until PR-5 is complete.

## 7. Closure criteria

`G5` should be considered closed only when all items below are true.

### For the independent worker gap

- [ ] standalone outbox worker process exists
- [ ] current outbox contracts remain the production baseline
- [ ] runtime start/stop is explicit and testable
- [ ] health and lag observability exist
- [ ] canary cutover has been executed with one active owner

### For the scale-out hardening gap

- [ ] one ADR-0009 concurrent-worker strategy is selected
- [ ] same-`runId` ordering is proven under concurrent workers
- [ ] deployment docs forbid unsafe mixed ownership

If the first list is done but the second is not, the repository has closed the
**standalone runtime gap** but still carries an explicit **scale-out risk**.

## 8. Deferred design material from `gap5`

The following ideas may still be valid later, but they are deferred because they
change the platform shape rather than closing the immediate gap:

- generalized outbox records with side-effect taxonomy,
- lane lease tables,
- subscriber registry keyed by `(topic, deliveryChannel, sideEffectKind)`,
- CDC/polling coexistence matrix,
- dedicated `@dvt/outbox-worker` core package extracted from a proven runtime.

These are future architecture candidates, not entry criteria for the next
implementation slice.

## 9. Working rule for the team

When a change proposal for `G5` conflicts with this plan, apply this rule:

1. preserve ADR-0009 invariants,
2. prefer extraction over redesign,
3. prefer observable runtime ownership over abstraction density,
4. defer schema generalization until after the standalone worker is real.

## 10. Final position

The correct implementation path is disciplined, not maximalist.

Build the independent worker the repository actually needs first.
Only after that exists in code, in CI, and in operations should the team decide
whether the broader `gap5` abstraction set is worth adopting.
