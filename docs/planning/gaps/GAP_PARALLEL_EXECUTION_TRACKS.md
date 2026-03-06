---
title: DVT+ - Gap Parallel Execution Tracks
status: Review
owner: docs
last_reviewed: 2026-03-06
planning_type: proposal
---

# DVT+ - Gap Parallel Execution Tracks

Operational playbook for executing gaps in parallel by independent teams.

- Base plan: [`GAP_EXECUTION_PLANS.md`](GAP_EXECUTION_PLANS.md)
- Last sync date: 2026-03-06
- Scope: G1 to G10

## Principles

1. Keep one integration lane per dependency chain to avoid merge contention.
2. Run independent tasks in separate tracks with explicit contract boundaries.
3. Merge by dependency order, not by team completion order.

## Parallel Tracks

### Track A - `compiledCodeRef` execution lane (Phase 1)

- Owner focus: planner + adapter-temporal + traceability-service
- Scope:
  - `G4-T1`: fixtures/contracts closure
  - `G4-T3`: propagate `compiledCodeRef` to `StepStarted.payload`
  - `G4-T4`: reader/cache/SqlJobFacet + fail-open
- Dependency notes:
  - `T4-1` and `T4-3` can run in parallel.
  - `T4-4` can start with mocks, but final integration depends on `T4-3`.

### Track B - runtime reliability lane (Phase 1)

- Owner focus: adapter-temporal + operations quality gates
- Scope:
  - `G1`: integration quality gates and operational validation
  - `G3`: documentation/evidence closure (already implemented in code)
- Dependency notes:
  - Independent from `G4` implementation details.
  - Should validate against latest `main` after each `G4` merge touching runtime contracts.

### Track C - Phase 1.5 platform lane

- Owner focus: outbox + lineage CI + read paths + auth
- Scope:
  - `G5` outbox worker
  - `G6` OL mapping tests + schema pin
  - `G7` read models + projector
  - `G8` auth in `apps/api`
- Dependency notes:
  - Start after `G4` is closed.
  - `G5` and `G6` can run in parallel.
  - `G7` and `G8` can run in parallel.

## Recommended PR Sequence

1. `PR-1`: `G4-T1` fixtures/contracts.
2. `PR-2`: `G4-T3` adapter-temporal propagation.
3. `PR-3`: `G4-T4` traceability integration (rebased on `PR-2`).
4. `PR-4`: `G1` integration gates + `G3` evidence closure.
5. `PR-5A`: `G5` outbox worker.
6. `PR-5B`: `G6` OL tests + `_schemaURL` pin.
7. `PR-6A`: `G7` read models/projector.
8. `PR-6B`: `G8` auth runtime.
9. `PR-7`: `G10` outbox_lineage worker + DLQ fail-open.

## Dependency Matrix

| Gap / Task     | Can start now      | Blocks                       |
| -------------- | ------------------ | ---------------------------- |
| G4-T1          | Yes                | None                         |
| G4-T3          | Yes                | None                         |
| G4-T4          | Partial            | Final merge blocked by G4-T3 |
| G1 closure     | Yes                | None                         |
| G3 doc closure | Yes                | None                         |
| G5             | After G4           | G4                           |
| G6             | After G4           | G4                           |
| G7             | After G4           | G4                           |
| G8             | After G4           | G4                           |
| G10            | After G5/G6 stable | G5 + G6                      |

## Team Cadence

1. Each track posts a daily update in its section with:
   - current PR
   - blocker
   - next merge target
2. Rebase all open gap PRs every morning against `main`.
3. Do not merge dependency-sensitive PRs with failing contract tests.

## Related Documents

- Master status: [`GAP_EXECUTION_PLANS.md`](GAP_EXECUTION_PLANS.md)
- G4 detail: [`G4-TASK-SPECIFICATION.md`](G4-TASK-SPECIFICATION.md)
- G3 detail: [`G3-TASK-SPECIFICATION.md`](G3-TASK-SPECIFICATION.md)
