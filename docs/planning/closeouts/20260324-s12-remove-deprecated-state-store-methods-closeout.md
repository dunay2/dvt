---
title: 20260324 S12 Remove Deprecated State-Store Methods Closeout
status: Review
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-24
planning_type: closeout
---

# 20260324 S12 Remove Deprecated State-Store Methods Closeout

## Summary

Closed `S12` by removing the deprecated `saveRunMetadata` and `appendEventsTx`
methods from the runtime state-store implementations and cleaning the remaining
call-sites/tests so only the canonical write paths remain.

Canonical write surface after this slice:

- `bootstrapRunTx`
- `appendAndEnqueueTx`

## Governing Sources

- [AGENTS.md](../../../AGENTS.md)
- [Governance Document And Rule Inventory](../status/governance-document-rule-inventory.md)
- [20260322 DVT Deep Architectural Review](../archive/reviews/architecture-and-governance/20260322-dvt-deep-architectural-review.md)
- [ADR-0039](../../adr/ADR-0039-hexagonal-port-hardening-and-solid-remediation.md)
- [ADR-0013](../../adr/ADR-0013-run-state-store-bootstrapRunTx.md)

## Scope Closed

Code changes:

- Removed deprecated methods from
  `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`.
- Removed obsolete deprecated-only repository/event-store entry points from
  `packages/@dvt/adapter-postgres/src/PostgresRunMetadataRepository.ts` and
  `packages/@dvt/adapter-postgres/src/PostgresRunEventStore.ts`.
- Removed deprecated methods from
  `packages/@dvt/engine/src/state/InMemoryTxStore.ts`.
- Removed the unused `saveRunMetadata` Temporal activity helper from
  `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`.
- Reworked tests in `@dvt/adapter-postgres`, `@dvt/engine`, and
  `@dvt/adapter-temporal` to use canonical bootstrap/append paths.

Documentation changes:

- Updated the PostgreSQL adapter implementation guide to mark the deprecated
  paths as removed.
- Updated Temporal engine policy docs to point to
  `appendAndEnqueueTx()`/`appendTransitions()` as the canonical event write path.
- Marked `S12` as done in execution planning surfaces.

## Validation

- `pnpm --filter @dvt/adapter-postgres typecheck` — passed
- `pnpm --filter @dvt/adapter-postgres test` — passed
- `pnpm --filter @dvt/engine test` — passed
- `pnpm --filter @dvt/adapter-temporal test` — passed
- `pnpm exec eslint packages/@dvt/adapter-postgres/src/PostgresRunMetadataRepository.ts packages/@dvt/adapter-postgres/src/PostgresRunEventStore.ts packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts packages/@dvt/adapter-postgres/test/PostgresRunMetadataRepository.test.ts packages/@dvt/engine/src/state/InMemoryTxStore.ts packages/@dvt/engine/test/security/authorizer.deny.test.ts packages/@dvt/engine/test/state/InMemoryTxStore.staleSnapshotRuns.test.ts packages/@dvt/engine/test/contracts/engine.test.ts packages/@dvt/adapter-temporal/src/activities/stepActivities.ts packages/@dvt/adapter-temporal/test/activities.test.ts` — passed
- `pnpm exec prettier --check packages/@dvt/adapter-postgres/src/PostgresRunEventStore.ts packages/@dvt/adapter-postgres/src/PostgresRunMetadataRepository.ts packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts packages/@dvt/adapter-postgres/test/PostgresRunMetadataRepository.test.ts packages/@dvt/adapter-temporal/src/activities/stepActivities.ts packages/@dvt/adapter-temporal/test/activities.test.ts packages/@dvt/engine/src/state/InMemoryTxStore.ts packages/@dvt/engine/test/contracts/engine.test.ts packages/@dvt/engine/test/security/authorizer.deny.test.ts packages/@dvt/engine/test/state/InMemoryTxStore.staleSnapshotRuns.test.ts docs/architecture/engine/adapters/state-store/postgres/StateStoreAdapter.md docs/architecture/engine/adapters/temporal/EnginePolicies.md docs/planning/closeouts/20260324-s12-remove-deprecated-state-store-methods-closeout.md docs/planning/closeouts/index.md docs/planning/state/domain-status-board.md docs/planning/state/execution-workboard.md docs/planning/state/open-task-route.md` — passed after `pnpm exec prettier --write ...`
- `pnpm exec markdownlint-cli2 docs/architecture/engine/adapters/state-store/postgres/StateStoreAdapter.md docs/architecture/engine/adapters/temporal/EnginePolicies.md docs/planning/closeouts/20260324-s12-remove-deprecated-state-store-methods-closeout.md docs/planning/closeouts/index.md docs/planning/state/domain-status-board.md docs/planning/state/execution-workboard.md docs/planning/state/open-task-route.md --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc` — passed
- `pnpm docs:sync` — passed
- `pnpm verify:prepush` — passed

## No-Debt / No-Stub Evidence

- No compatibility shim kept in public runtime adapter/store surfaces.
- No rule was disabled or relaxed.
- No hook was bypassed.
- No placeholder, stub, or fake implementation was introduced.
