---
title: RC-A1 SimulateError Production Hardening
status: Proposed
owner: Execution Runtime / Architecture
last_reviewed: 2026-03-22
planning_type: proposal
---

# RC-A1 SimulateError Production Hardening

## Goal

Remove production risk from the `simulateError` step hook so runtime behavior
cannot be forced into synthetic failures by plan content.

## Dependency

- None (`RC-A1` is unblocked and independent in the execution workboard).

## Scope

In scope:

- runtime guard in step execution path
- explicit tests for production and non-production behavior
- documentation/workboard source alignment

Out of scope:

- unrelated step schema redesign
- retry policy refactors

## Work Breakdown

| Item    | Task                                                                                    | Output                                         |
| ------- | --------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `A1-T1` | Decide enforcement mode (`NODE_ENV=production` guard only, or guard + field rejection). | Locked implementation strategy for this slice. |
| `A1-T2` | Implement guard in activity runtime path.                                               | `simulateError` no-op in production runtime.   |
| `A1-T3` | Add regression tests for both prod and non-prod paths.                                  | Failing-before/passing-after evidence.         |
| `A1-T4` | Update planning traceability links.                                                     | Workboard and proposal index are aligned.      |

## File Plan

| Action | Path                                                                               | Reason                                                       |
| ------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Modify | `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`                  | Add production guard for `applySimulateErrorIfPresent`.      |
| Create | `packages/@dvt/adapter-temporal/test/activities.simulate-error.production.test.ts` | Regression test for production hard-disable semantics.       |
| Modify | `packages/@dvt/adapter-temporal/test/activities.test.ts`                           | Keep existing behavior coverage for non-production behavior. |
| Modify | `docs/planning/state/execution-workboard.md`                                       | Make this proposal the primary source for `RC-A1`.           |

## Validation Criteria

1. `simulateError` values do not trigger forced failures when `NODE_ENV=production`.
2. Non-production test paths can still validate transient/permanent error handling.
3. No regression in temporal adapter activity tests.

Validation commands:

- `pnpm --filter @dvt/adapter-temporal test`
- `pnpm --filter @dvt/adapter-temporal build`
- `pnpm verify:prepush`

## Exit Criteria

- `RC-A1` status can move from `Queued` to `Review` with test evidence.
- No bypass of hooks or governance checks.
