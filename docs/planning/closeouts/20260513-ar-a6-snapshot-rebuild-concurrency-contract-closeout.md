---
title: AR-A6 Snapshot Rebuild Concurrency Contract Closeout
status: Accepted
owner: Architecture / Engine / State Store
last_reviewed: 2026-05-13
planning_type: closeout
---

# AR-A6 Snapshot Rebuild Concurrency Contract Closeout

## Scope

AR-A6 clarifies that `IRunStateStoreMaintenance.rebuildSnapshot` owns a
portable per-run concurrency invariant. PostgreSQL keeps its advisory-lock
implementation, while the contract now requires equivalent mutual exclusion for
all adapters.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/adr/ADR-0004-event-sourcing-strategy.md`
- `docs/adr/ADR-0013-run-state-store-bootstrapRunTx.md`
- `docs/adr/ADR-0015-getRunStatus-read-model-separation.md`
- `docs/adr/ADR-0018_Shared_Kernel_Ownership_Governance.md`
- `docs/adr/ADR-0031-adapter-tenant-isolation.md`

## Work Performed

- Added Fowler analysis in `buzon/`.
- Added AR-A6 proposal with command rail, diagrams, feature mechanization, and
  red/green cycle.
- Added state-store snapshot rebuild concurrency component guide and user
  stories.
- Updated state-store overview, README, and adapter docs.
- Added semantic architecture guard under `@dvt/contracts`.
- Added short owned-concern docblocks to touched source/test modules.

## TDD Evidence

RED:

```bash
pnpm --filter @dvt/contracts test -- test/run-state-store-maintenance-concurrency.architecture.test.ts
```

Expected failure observed after fixing the test harness: live ports lacked
portable `rebuildSnapshot` mutual-exclusion wording and the overview lacked the
per-run concurrency invariant.

GREEN:

```bash
pnpm --filter @dvt/contracts test -- test/run-state-store-maintenance-concurrency.architecture.test.ts
```

Passed after adding the contract invariant and aligned docs.

## Validation

- `pnpm --filter @dvt/contracts test -- test/run-state-store-maintenance-concurrency.architecture.test.ts`
  - Passed.
- `pnpm --filter @dvt/engine test -- test/state/InMemoryRunStateStore.rebuildSnapshot.test.ts`
  - Passed.
- `pnpm --filter @dvt/adapter-postgres test -- test/PostgresRunSnapshotStore.test.ts`
  - Passed.
- `pnpm --filter @dvt/contracts typecheck`
  - Passed.
- `pnpm --filter @dvt/engine typecheck`
  - Passed.
- `pnpm --filter @dvt/adapter-postgres typecheck`
  - Passed.
- `pnpm docs:feature-mechanization --feature AR-A6-SNAPSHOT-REBUILD-CONCURRENCY-CONTRACT`
  - Passed.
- `pnpm docs:feature-mechanization:implementation`
  - Passed.
- `pnpm docs:sync`
  - Passed.
- `pnpm docs:status:generate`
  - Passed.
- `pnpm governance:refresh`
  - Passed after stopping timed-out duplicate governance processes and reimporting
    staged governance state.
- `pnpm verify:prepush`
  - Passed.

## No-Debt / No-Stub Evidence

- No stubs, placeholders, fake adapters, or TODO/FIXME markers added.
- No hooks bypassed.
- No lint/type/test rules relaxed.
- No runtime lock implementation replaced; this slice clarifies the portable
  contract around existing behavior.
