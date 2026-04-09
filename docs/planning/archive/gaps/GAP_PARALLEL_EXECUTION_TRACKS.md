---
title: DVT+ - Gap Parallel Execution Tracks
status: Review
owner: docs
last_reviewed: 2026-03-14
planning_type: proposal
---

# DVT+ - Gap Parallel Execution Tracks

Operational playbook for executing gaps in parallel by independent teams.

- Base plan: [`GAP_EXECUTION_PLANS.md`](./GAP_EXECUTION_PLANS.md)
- Last sync date: 2026-03-14
- Scope: G1 to G10

## Principles

1. Keep one integration lane per dependency chain to avoid merge contention.
2. Run independent tasks in separate tracks with explicit contract boundaries.
3. Merge by dependency order, not by team completion order.

## Parallel Tracks

## Closed Baseline

- `G3` is closed in code and evidence.
- `G4` is closed in code and evidence.
- Remaining Phase 1 work is `G1` close-out only.

## Active Tracks

### Track A - runtime close-out lane (Phase 1 tail)

- Owner focus: adapter-temporal + operations quality gates
- Scope:
  - `G1`: operational validation and final close-out of the real Temporal adapter
- Dependency notes:
  - Independent from Phase 1.5 work.
  - Focus is no longer feature implementation; it is runtime confidence and closure criteria.

### Track B - Phase 1.5 delivery lane

- Owner focus: outbox + lineage CI + read paths + auth
- Scope:
  - `G5` outbox worker
  - `G6` OL mapping tests + schema pin
- Dependency notes:
  - `G4` is already closed, so both can start now.
  - `G5` and `G6` can run in parallel.
  - `G10` depends on the runtime/delivery decisions taken here.

### Track C - Phase 1.5 productization lane

- Owner focus: read paths + auth
- Scope:
  - `G7` read models + projector
  - `G8` auth in `apps/api`
- Dependency notes:
  - Both can start now.
  - Prefer rebasing on latest `main` after any `G5/G6` merge that touches runtime surfaces.

## Recommended PR Sequence

1. `PR-1`: `G1` close-out (ops/runtime confidence only).
2. `PR-2A`: `G5` standalone outbox worker runtime.
3. `PR-2B`: `G6` OL tests + `_schemaURL` pin.
4. `PR-3A`: `G7` read models/projector.
5. `PR-3B`: `G8` auth runtime.
6. `PR-4`: `G10` outbox_lineage worker + DLQ fail-open.

## Dependency Matrix

| Gap / Task | Can start now      | Blocks  |
| ---------- | ------------------ | ------- |
| G1 closure | Yes                | None    |
| G5         | Yes                | None    |
| G6         | Yes                | None    |
| G7         | Yes                | None    |
| G8         | Yes                | None    |
| G9         | Closed             | None    |
| G10        | After G5/G6 stable | G5 + G6 |

## Team Cadence

1. Each track posts a daily update in its section with:
   - current PR
   - blocker
   - next merge target
2. Rebase all open gap PRs every morning against `main`.
3. Do not merge dependency-sensitive PRs with failing contract tests.

## Related Documents

- Master status: [`GAP_EXECUTION_PLANS.md`](./GAP_EXECUTION_PLANS.md)
- G4 detail: [`G4-TASK-SPECIFICATION.md`](./G4-TASK-SPECIFICATION.md)
- G3 detail: [`G3-TASK-SPECIFICATION.md`](./G3-TASK-SPECIFICATION.md)
