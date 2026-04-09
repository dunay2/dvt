---
slice: s15-run-snapshot-cas-guard
date: 2026-03-24
author: AI (GPT-5)
last_reviewed: 2026-03-24
---

# Closeout: S15 Run Snapshot CAS Guard

## Think-First Analysis

### Problem summary

`S15` already existed in code: `PostgresRunSnapshotStore` applied a monotonic
`WHERE run_snapshots.last_run_seq <= EXCLUDED.last_run_seq` guard, and the
adapter-postgres tests covered stale-sequence rejection. The planning surfaces,
however, still described `S15` as open in review, and the open-task route still
presented it as actionable work.

That left the repository with implementation/state drift rather than a code
defect.

### Root cause

The implementation landed before the operational planning surfaces were
reconciled. The lane source of truth, workboard, and domain/task navigation were
not updated to reflect that the CAS guard slice had already been delivered.

### Constraints and invariants

- `AGENTS.md`: read governance first, keep evidence, do not create hidden debt,
  and finish with the required validation baseline.
- `docs/guides/ai-work-protocol.md`: planning-affecting work must keep the
  workboard and related status surfaces synchronized.
- `ADR-0004`: snapshot writes must remain monotonic and replay-safe.
- `ADR-0031`: tenant isolation must remain explicit in adapter and state-store
  paths.
- `ADR-0037`: archival and terminal snapshot handling must stay aligned with
  snapshot lifecycle semantics.

### Options considered

- Leave the planning drift in place and only note the implementation in a
  comment.
  - Rejected because the repo treats status surfaces as part of the contract.
- Update only the workboard.
  - Rejected because the lane source of truth and open-task navigation would
    still disagree.
- Synchronize the lane YAML, workboard, and open-task surfaces, then record the
  closeout with validation evidence.
  - Selected because it closes the drift without changing code unnecessarily.

### Selected option and rationale

Mark `S15` as `Done` in the lane source of truth, update the execution
workboard, remove `S15` from the open-task route and domain active list, and
keep `S15-F1` open as the explicit follow-up.

That keeps the planning graph truthful while preserving the remaining work item
that still needs implementation.

### Rejected alternatives

- Changing the snapshot store implementation again when the existing guard and
  tests already satisfy the slice.
- Closing `S15-F1` at the same time. It remains a separate queued follow-up.

## Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - reconcile the `S15` status surfaces with the already-implemented CAS guard
  - preserve `S15-F1` as the open follow-up
  - document the closure with validation evidence
- Touched files or paths:
  - `docs/planning/state/agent-lane-d.yaml`
  - `docs/planning/state/agent-lane-d.md`
  - `docs/planning/state/execution-workboard.md`
  - `docs/planning/state/open-task-route.md`
  - `docs/planning/state/domain-status-board.md`
  - `docs/planning/closeouts/20260324-s15-run-snapshot-cas-guard-closeout.md`
- Expected outcome:
  - `S15` is no longer shown as open work
  - `S15-F1` remains queued and discoverable
  - the lane and workboard sources stay synchronized
- Risks and mitigations:
  - Route counts or dependency graphs can drift if one surface is updated alone.
    Mitigation: update all affected planning views in the same change.
  - Generated lane markdown could diverge from the YAML source of truth.
    Mitigation: run `pnpm docs:sync` after updating the YAML.
- Out-of-scope items:
  - any additional implementation for `S15-F1`
  - code changes to the snapshot store
  - changes to unrelated planning lanes
- Validation plan:
  - `pnpm docs:sync`
  - `pnpm --filter @dvt/adapter-postgres test`
  - `pnpm --filter @dvt/adapter-postgres build`
  - `pnpm verify:prepush`
- Test coverage plan:
  - positive path: current snapshot write-through and archive pinning behavior
    remains covered by the adapter-postgres suite
  - negative path: stale snapshot writes are rejected by the CAS guard test
  - equal-sequence archive updates remain covered by the dedicated CAS guard
    test
- Libraries evaluated:
  - None evaluated. This slice reuses the existing adapter, tests, and planning
    workflow.

## Changes made

| File or path                                                                                                                 | Change                                                                        | Why                                                              |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [docs/planning/state/agent-lane-d.yaml](../state/agent-lane-d.yaml)                                                          | Marked `S15` as `done`                                                        | Make the lane source of truth match the delivered implementation |
| [docs/planning/state/agent-lane-d.md](../state/agent-lane-d.md)                                                              | Regenerated via `pnpm docs:sync`                                              | Keep the lane markdown synchronized with the YAML source         |
| [docs/planning/state/execution-workboard.md](../state/execution-workboard.md)                                                | Updated `S15` status to `Done` and adjusted the next slice                    | Reflect the closure in the operational tracker                   |
| [docs/planning/state/open-task-route.md](../state/open-task-route.md)                                                        | Removed `S15` from open-task navigation and corrected the open snapshot count | Prevent the closed item from still appearing as actionable       |
| [docs/planning/state/domain-status-board.md](../state/domain-status-board.md)                                                | Removed `S15` from the active execution-runtime set                           | Keep the domain board aligned with the closed status             |
| [docs/planning/closeouts/20260324-s15-run-snapshot-cas-guard-closeout.md](./20260324-s15-run-snapshot-cas-guard-closeout.md) | Recorded the closeout and validation evidence                                 | Required closeout artifact for the slice                         |

## Docs Synced

- [x] [docs/planning/state/agent-lane-d.md](../state/agent-lane-d.md) via `pnpm docs:sync`

## Validation Evidence

| Command                                     | Result                                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `pnpm docs:sync`                            | Passed; regenerated `docs/planning/state/agent-lane-d.md` from `docs/planning/state/agent-lane-d.yaml` |
| `pnpm --filter @dvt/adapter-postgres test`  | Passed (`7` files, `30` tests passed, `34` skipped)                                                    |
| `pnpm --filter @dvt/adapter-postgres build` | Passed                                                                                                 |
| `pnpm verify:prepush`                       | Passed                                                                                                 |

## Debt Introduced

None. No new debt item was created, no rules were relaxed, and no hooks were
bypassed.

## No-stub Evidence

No stubs, placeholders, fake adapters, or TODO/FIXME markers were introduced.
The closure only updated planning state to match the already-implemented CAS
guard and its existing tests.

## Residual Follow-up

- `S15-F1` remains queued by design. It is the separate visibility follow-up
  for stale snapshot write discards and is not closed by this slice.
