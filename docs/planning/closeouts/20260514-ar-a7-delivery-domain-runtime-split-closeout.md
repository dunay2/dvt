---
title: AR-A7 Delivery Domain Runtime Split Closeout
status: Accepted
owner: Architecture / Delivery / Engine
last_reviewed: 2026-05-14
planning_type: closeout
task_id: AR-A7
---

# AR-A7 Delivery Domain Runtime Split Closeout

## Outcome

`AR-A7` converged the duplicated in-memory outbox state machine into Delivery.
`InMemoryOutboxStorageCore` now owns claim eligibility, retry backoff,
dead-letter transition, replay, shard assignment, and tenant/run ordering for
local and test adapters.

Engine keeps `InMemoryOutboxState` as an engine-local adapter facade, but no
longer carries local delivery state-machine internals.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/reviews/architecture-and-governance/20260419-post-rc-g1-c-architecture-review.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/ar-a7-delivery-domain-runtime-split-plan-20260514.md`

## Files Changed

- `packages/@dvt/delivery/src/testing/InMemoryOutboxStorageCore.ts`
- `packages/@dvt/delivery/src/testing/InMemoryOutboxStorage.ts`
- `packages/@dvt/delivery/src/testing.ts`
- `packages/@dvt/delivery/package.json`
- `packages/@dvt/delivery/test/OutboxInMemoryStorageOwnership.architecture.test.ts`
- `packages/@dvt/engine/src/state/InMemoryOutboxState.ts`
- `docs/architecture/components/delivery/**`
- `docs/planning/proposals/mandatory/runtime-and-contracts/ar-a7-delivery-domain-runtime-split-plan-20260514.md`
- `docs/evidence/ed-20260514-ar-a7-delivery-in-memory-outbox-ownership.md`
- `docs/risk-register/quality/R-20260514-AR-A7-IN-MEMORY-OUTBOX-OWNERSHIP.yaml`
- `buzon/20260514-codex-fowler-ar-a7-delivery-domain-runtime-split-analysis.md`

## Validation

Initial red:

- `pnpm exec vitest run packages/@dvt/delivery/test/OutboxInMemoryStorageOwnership.architecture.test.ts`
  failed before implementation because `InMemoryOutboxStorageCore` did not
  exist.

Targeted green:

- `pnpm --filter @dvt/delivery build`
- `pnpm exec vitest run packages/@dvt/delivery/test/OutboxInMemoryStorageOwnership.architecture.test.ts packages/@dvt/delivery/test/OutboxWorker.retry.test.ts packages/@dvt/delivery/test/OutboxWorker.deadLetter.test.ts packages/@dvt/engine/test/state/InMemoryTxStore.outbox.test.ts`
- `pnpm docs:feature-mechanization -- --feature AR-A7-DELIVERY-DOMAIN-RUNTIME-SPLIT`

Final validation commands are recorded in the PR/evidence closeout after the
full pre-push baseline runs.

## No-Debt And No-Stub Evidence

- No stub or placeholder implementation was added.
- No validation rule was relaxed.
- No hook was bypassed.
- A residual durable-adapter parity risk is explicitly tracked in
  `R-20260514-AR-A7-IN-MEMORY-OUTBOX-OWNERSHIP`.
