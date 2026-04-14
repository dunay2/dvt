---
slice: TF-D1-proof-environment-lifecycle
date: 2026-04-13
lane: D
author: AI (Codex)
last_reviewed: 2026-04-13
---

# Closeout: TF-D1 proof-environment lifecycle

## Think-First Analysis

### Problem summary

`TF-C2` is now accepted as the first PostgreSQL-backed execution-first runtime
vertical, but the local Docker PostgreSQL proof environment still behaves more
like a one-shot acceptance wrapper than a governed lifecycle.

The current proof path already starts, resets, and tears down Docker, but it
does not explicitly define:

1. what the seeded local baseline is;
2. what counts as proof-only transient state;
3. how to clean that state without always deleting the Docker volume; and
4. how to prove the environment is rerunnable rather than merely restartable.

### Root cause

`TF-C2-A` intentionally focused on landing the first real executor seam and the
canonical local wrapper, not on fully governing proof-environment retention and
cleanup semantics.

That left the wrapper with one main responsibility done well, but two lifecycle
concerns still implicit:

1. reset currently means "destroy and recreate the Docker volume", not "restore
   the governed seeded baseline and verify it";
2. cleanup is only available as `down`, which is too coarse when an operator
   wants to keep the container warm but remove transient proof schemas and sink
   artifacts.

The result is operable but not fully disciplined: repeated runs can be made to
work, yet the reset and retention model is not explicit enough to be trusted as
the canonical acceptance baseline.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, doc-driven closure, no hidden debt, no
  stubs, and mandatory validation evidence including `pnpm verify:prepush`.
- `docs/guides/ai-work-protocol.md`: this is `Full` mode because the slice adds
  a new governed lifecycle capability and updates canonical operational docs.
- `docs/planning/state/planning-control-tower.md`: a planning-affecting slice
  must update the lane registry plus the status and roadmap surfaces whose
  posture changes.
- `docs/planning/state/agent-lane-d.yaml`: `TF-D1` owns Docker PostgreSQL
  reset, cleanup, and retention discipline for the transformation proof
  environment.
- `docs/planning/proposals/mandatory/runtime-and-contracts/transformation-flow-delivery-plan-20260405.md`:
  phase 3 and phase 5 explicitly require seed, reset, cleanup, and rerun
  discipline for the PostgreSQL proof environment.
- `docs/adr/ADR-0003-execution-model.md`: this slice must not move runtime
  authority out of DVT or blur environment operations with executor semantics.
- `docs/adr/ADR-0014-run-driven-adapter-model.md`: adapter behavior remains
  capability-owned; proof-environment lifecycle is an operational wrapper
  concern, not a capability concern.

### Options considered

1. Leave the wrapper mostly unchanged and close `TF-D1` through documentation
   only.
2. Keep reset as volume destruction only, but document that operators must use
   `down` for cleanup and tolerate retained proof schemas when reusing the
   container.
3. Add explicit proof-lifecycle semantics to the wrapper: seeded-baseline
   verification, transient-schema cleanup, and an operator-facing distinction
   between destructive reset and in-place cleanup.

### Selected option and rationale

Choose option 3.

`TF-D1` is not satisfied by documentation alone because the required outcome is
both documented and testable. The smallest honest slice is:

1. define the seeded baseline explicitly;
2. add an in-place cleanup command for transient proof schemas;
3. make reset verify the seeded baseline after recreation; and
4. prove the environment can run twice consecutively from that governed
   lifecycle.

This keeps responsibilities separate:

- Docker compose lifecycle stays in the wrapper;
- transient proof-state cleanup stays in the wrapper;
- relational execution semantics stay inside `@dvt/adapter-postgres`;
- test execution stays inside the existing package integration lane.

### Rejected alternatives

- Option 1 was rejected because it would claim lifecycle closure without adding
  a testable lifecycle capability.
- Option 2 was rejected because it keeps "cleanup" coupled to destructive volume
  deletion and does not give operators a governed warm-environment path.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - `docs/planning/closeouts/20260413-tf-d1-proof-environment-lifecycle-closeout.md`
  - `docs/planning/state/agent-lane-d.yaml`
  - `docs/planning/state/domain-status-board.md`
  - `docs/planning/roadmap/roadmap-by-domain.md`
  - `docs/architecture/system-delivery-status.md`
  - `docs/runbooks/temporal-postgres-proof-environment.md`
  - `scripts/README.md`
  - `scripts/run-temporal-postgres-proof.cjs`
  - `scripts/run-temporal-postgres-proof.test.cjs`
  - `package.json`
- Expected outcome:
  - the proof wrapper exposes separate reset and cleanup semantics
  - reset restores and verifies the seeded PostgreSQL baseline
  - cleanup removes transient proof schemas without dropping the Docker volume
  - canonical docs explain seed, reset, cleanup, retention, and rerun policy
  - `TF-D1` can close in Lane D with validation evidence
- Risks and mitigations:
  - Risk: overreach into adapter runtime semantics
  - Mitigation: keep all cleanup logic inside the wrapper and restrict it to
    proof-schema policy only
  - Risk: cleanup deletes non-proof local schemas
  - Mitigation: scope cleanup to explicit transient schema patterns owned by
    the proof lanes
  - Risk: docs overclaim retention guarantees
  - Mitigation: define the baseline as disposable proof-state discipline, not
    as product retention policy
- Out of scope:
  - dbt phase-2 executor work under `TF-C3`
  - default retention health alerts under `AR-D8`
  - changes to relational execution semantics in `@dvt/adapter-postgres`
  - broader runtime read-surface or API contract changes
- Validation plan:
  - `node --test scripts/run-temporal-postgres-proof.test.cjs`
  - `pnpm exec eslint --max-warnings 0 scripts/run-temporal-postgres-proof.cjs scripts/run-temporal-postgres-proof.test.cjs`
  - `pnpm exec markdownlint-cli2 docs/planning/closeouts/20260413-tf-d1-proof-environment-lifecycle-closeout.md docs/runbooks/temporal-postgres-proof-environment.md docs/planning/state/domain-status-board.md docs/planning/roadmap/roadmap-by-domain.md docs/architecture/system-delivery-status.md --config .markdownlint-cli2.jsonc`
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm proof:temporal:postgres:reset`
  - `pnpm test:adapter-temporal:integration:postgres:docker`
  - `pnpm proof:temporal:postgres:cleanup`
  - `pnpm proof:temporal:postgres:test`
  - `pnpm proof:temporal:postgres:down`
  - `pnpm verify:prepush`
- Test coverage plan:
  - unit-level coverage for transient-schema classification and cleanup policy
  - end-to-end proof run after destructive reset
  - second proof run after in-place cleanup to prove rerunnability without
    dropping the volume

## Implementation Summary

- Refactored `scripts/run-temporal-postgres-proof.cjs` so compose lifecycle,
  seeded-baseline verification, transient-schema cleanup, and proof execution
  are explicit responsibilities instead of one implicit restart path.
- Added a non-destructive `cleanup` action that removes proof-owned transient
  schemas (`it_runtime_*`, `dvt_transform_it_*`) while keeping the Docker
  container and volume available for warm reruns.
- Added seeded-baseline verification after destructive reset so `reset` now
  means "recreate and verify the canonical local baseline", not merely
  "restart Docker".
- Restricted the wrapper and its cleanup path to the canonical local Docker DSN
  so proof lifecycle commands cannot target an external database through shell
  overrides.
- Changed `down` to fail on Docker Compose teardown errors instead of returning
  a false-clean exit status.
- Added `proof:temporal:postgres:test` in `package.json` so the repo exposes a
  warm-proof command distinct from the existing cold-proof
  `test:adapter-temporal:integration:postgres:docker` command.
- Added `scripts/run-temporal-postgres-proof.test.cjs` to lock the transient
  schema policy, the canonical proof DSN, and teardown-failure propagation so
  cleanup scope stays narrowly owned by the proof lanes.
- Updated the canonical runbook and script README so operators can distinguish
  `up`, `reset`, `cleanup`, `test`, and `down`, and so the rerun policy is
  explicit.
- Closed `TF-D1` in Lane D and updated the domain and status surfaces so the
  repo no longer describes proof repeatability as an open gap after `TF-C2`.

## Validation Run

- `pnpm docs:sync` - PASS
- `pnpm docs:workboard:generate` - PASS
- `node --test scripts/run-temporal-postgres-proof.test.cjs` - PASS
- `pnpm exec eslint --max-warnings 0 scripts/run-temporal-postgres-proof.cjs scripts/run-temporal-postgres-proof.test.cjs` - PASS
- `pnpm exec markdownlint-cli2 docs/planning/closeouts/20260413-tf-d1-proof-environment-lifecycle-closeout.md docs/runbooks/temporal-postgres-proof-environment.md docs/planning/state/domain-status-board.md docs/planning/roadmap/roadmap-by-domain.md docs/architecture/system-delivery-status.md docs/planning/domains/event-lifecycle-and-retention.md scripts/README.md --config .markdownlint-cli2.jsonc` - PASS
- `pnpm proof:temporal:postgres:reset` - PASS
- `pnpm test:adapter-temporal:integration:postgres:docker` - PASS
- `pnpm proof:temporal:postgres:cleanup` - PASS
- `pnpm proof:temporal:postgres:test` - PASS
- `pnpm proof:temporal:postgres:down` - PASS
- `pnpm docs:gov:links:changed` - PASS
- `pnpm docs:workboard:check` - PASS
- `pnpm verify:prepush` - PASS, with the known repo limitation that
  changed-only diff helpers compare `origin/main...HEAD` and therefore do not
  see an uncommitted worktree. Direct slice validations above were run on the
  actual edited files.
