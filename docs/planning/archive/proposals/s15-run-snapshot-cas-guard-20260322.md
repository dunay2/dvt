---
title: S15 Run Snapshot CAS Guard
status: Proposed
owner: Execution Runtime / Persistence
last_reviewed: 2026-03-22
planning_type: proposal
---

# S15 Run Snapshot CAS Guard

## Goal

Prevent snapshot regression by enforcing monotonic `last_run_seq` writes on
`run_snapshots` upsert logic.

## Dependency

- None (`S15` is unblocked and independent in the execution workboard).

## Scope

In scope:

- SQL guard on `persistWithClient` upsert path
- regression tests for projector/write-path race
- planning traceability updates
- follow-up task to surface CAS no-op outcome for stale-write visibility

Out of scope:

- snapshot schema redesign
- outbox ordering model refactor

## Work Breakdown

| Item     | Task                                                          | Output                                          |
| -------- | ------------------------------------------------------------- | ----------------------------------------------- |
| `S15-T1` | Add CAS guard in `ON CONFLICT` clause.                        | Upsert only updates when incoming seq is newer. |
| `S15-T2` | Add tests for stale update overwrite attempts.                | Regression proof against snapshot rollback.     |
| `S15-T3` | Validate no behavioral regression in existing snapshot tests. | Existing adapter-postgres suite remains green.  |
| `S15-T4` | Update planning traceability links.                           | Workboard and proposal index are aligned.       |
| `S15-T5` | Surface CAS no-op outcome for stale snapshot writes.          | Repair and archival callers can detect discard. |

## File Plan

| Action | Path                                                                             | Reason                                               |
| ------ | -------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Modify | `packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts`                 | Apply monotonic CAS `WHERE` condition on upsert.     |
| Modify | `packages/@dvt/adapter-postgres/test/PostgresRunSnapshotStore.test.ts`           | Add/adjust assertions for stale sequence protection. |
| Create | `packages/@dvt/adapter-postgres/test/PostgresRunSnapshotStore.cas-guard.test.ts` | Dedicated race regression coverage.                  |
| Modify | `docs/planning/state/execution-workboard.md`                                     | Make this proposal the primary source for `S15`.     |

## Validation Criteria

1. Incoming `last_run_seq` lower than stored value cannot overwrite snapshot.
2. Equal or higher sequence behavior is explicitly defined and tested.
3. Existing adapter-postgres snapshot test suite remains green.

Validation commands:

- `pnpm --filter @dvt/adapter-postgres test`
- `pnpm --filter @dvt/adapter-postgres build`
- `pnpm verify:prepush`

## Exit Criteria

- `S15` status can move from `Queued` to `Review` with CAS regression evidence.
- Follow-up task is captured in the workboard to close the remaining silent no-op visibility gap.
- No hidden debt or temporary bypass.
