---
slice: s15-f1-stale-snapshot-discard
date: 2026-03-24
author: AI (GPT-5)
last_reviewed: 2026-03-24
---

# Closeout: S15-F1 Stale Snapshot Discard Visibility

## Think-First Analysis

### Problem summary

`S15` had already introduced the monotonic CAS guard on
`run_snapshots.last_run_seq`, but the follow-up slice `S15-F1` still needed a
domain-level outcome for stale snapshot writes. The adapter path could reject a
regression, yet callers had no structured signal to distinguish an applied pin
from a discarded stale write.

That meant repair callers, archival orchestration, and telemetry all depended on
implicit behavior rather than an explicit contract.

### Root cause

The `TerminalSnapshotPinStore` port was still modeled as a side-effect-only
operation. The domain/application boundary did not expose the pin outcome, so
the adapter had to infer success from persistence effects instead of returning a
value object that described the decision.

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

- Keep the void-returning port and let callers inspect persistence state.
  - Rejected because it leaks infrastructure detail into the application layer
    and keeps the discard decision implicit.
- Emit only telemetry from the coordinator.
  - Rejected because observability alone does not give repair callers a
    deterministic decision result.
- Return a structured pin result from the port and let the coordinator observe
  it.
  - Selected because it preserves DDD boundaries and makes the stale-write
    outcome explicit.

### Selected option and rationale

Promote `TerminalSnapshotPinResult` as the port contract, keep
`PostgresRunSnapshotStore` focused on persistence and outcome translation, and
let `RunArchiveCoordinator` react to `DISCARDED_STALE_SEQUENCE` with telemetry.

This is the DDD-shaped version of the slice: the application boundary expresses
the outcome, the adapter remains thin, and the caller gets a deterministic
decision object.

### Rejected alternatives

- Returning a boolean from the port. Rejected because it would not distinguish
  applied from discarded outcomes clearly enough.
- Surfacing the discard only through logs. Rejected because logs are not a
  stable contract.

## Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - make stale pin outcomes explicit at the state-store boundary
  - keep the adapter thin and deterministic
  - add positive and negative tests around the new contract
  - close the planning surfaces for `S15-F1`
- Touched files or paths:
  - `packages/@dvt/state-store/src/lifecycle/archiveArtifacts.ts`
  - `packages/@dvt/state-store/src/lifecycle/RunArchiveCoordinator.ts`
  - `packages/@dvt/state-store/test/RunArchiveCoordinator.test.ts`
  - `packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts`
  - `packages/@dvt/adapter-postgres/test/PostgresRunSnapshotStore.test.ts`
  - `packages/@dvt/adapter-postgres/test/PostgresRunSnapshotStore.cas-guard.test.ts`
  - `docs/planning/state/agent-lane-d.yaml`
  - `docs/planning/state/agent-lane-d.md`
  - `docs/planning/state/execution-workboard.md`
  - `docs/planning/state/open-task-route.md`
  - `docs/planning/closeouts/20260324-s15f1-stale-snapshot-discard-closeout.md`
- Expected outcome:
  - the pin port returns a domain outcome, not hidden persistence state
  - stale pin discard is visible to the coordinator and repair callers
  - planning surfaces show `S15-F1` as done
- Risks and mitigations:
  - The contract change could ripple through adapters and tests. Mitigation:
    update the port, adapter, and coordinator together.
  - The added negative path could be missed if only happy-path tests exist.
    Mitigation: add a stale-discard test and a missing-row failure test.
- Out-of-scope items:
  - unrelated archival policy changes
  - additional lifecycle features beyond discard visibility
  - broader roadmap changes
- Validation plan:
  - `pnpm docs:sync`
  - `pnpm --filter @dvt/state-store test`
  - `pnpm --filter @dvt/adapter-postgres test`
  - `pnpm --filter @dvt/state-store build`
  - `pnpm --filter @dvt/adapter-postgres build`
  - `pnpm verify:prepush`
- Test coverage plan:
  - positive path: pinned terminal snapshot returns `APPLIED`
  - negative path: stale pin returns `DISCARDED_STALE_SEQUENCE`
  - negative path: stale pin without a follow-up row throws loudly
  - coordinator path: discard increments telemetry and emits a warning
- Libraries evaluated:
  - None. This slice reuses the existing state-store and adapter-postgres
    boundaries.

## Changes made

| File or path                                                                                                                                                              | Change                                                                 | Why                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [packages/@dvt/state-store/src/lifecycle/archiveArtifacts.ts](../../../packages/@dvt/state-store/src/lifecycle/archiveArtifacts.ts)                                       | Added `TerminalSnapshotPinOutcome` and `TerminalSnapshotPinResult`     | Make the pin outcome an explicit domain/application contract     |
| [packages/@dvt/state-store/src/lifecycle/RunArchiveCoordinator.ts](../../../packages/@dvt/state-store/src/lifecycle/RunArchiveCoordinator.ts)                             | Reacted to stale pin discard with telemetry                            | Keep discard visibility observable at the orchestration boundary |
| [packages/@dvt/state-store/test/RunArchiveCoordinator.test.ts](../../../packages/@dvt/state-store/test/RunArchiveCoordinator.test.ts)                                     | Added discard telemetry test                                           | Cover the negative path at the application boundary              |
| [packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts](../../../packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts)                                 | Returned a structured pin result and handled stale-row lookup failures | Keep persistence thin and expose the decision deterministically  |
| [packages/@dvt/adapter-postgres/test/PostgresRunSnapshotStore.test.ts](../../../packages/@dvt/adapter-postgres/test/PostgresRunSnapshotStore.test.ts)                     | Added applied, discarded, and missing-row tests                        | Cover positive and negative paths for the new contract           |
| [packages/@dvt/adapter-postgres/test/PostgresRunSnapshotStore.cas-guard.test.ts](../../../packages/@dvt/adapter-postgres/test/PostgresRunSnapshotStore.cas-guard.test.ts) | Updated CAS-guard expectations for the explicit result                 | Preserve the monotonic write-path regression guard               |
| [docs/planning/state/agent-lane-d.yaml](../state/agent-lane-d.yaml)                                                                                                       | Marked `S15-F1` as `done`                                              | Keep the lane source of truth synchronized                       |
| [docs/planning/state/agent-lane-d.md](../state/agent-lane-d.md)                                                                                                           | Regenerated via `pnpm docs:sync`                                       | Keep the rendered lane aligned with the YAML source              |
| [docs/planning/state/execution-workboard.md](../state/execution-workboard.md)                                                                                             | Marked `S15-F1` as `Done`                                              | Reflect closure in the operational tracker                       |
| [docs/planning/state/open-task-route.md](../state/open-task-route.md)                                                                                                     | Removed `S15-F1` from actionable routing                               | Prevent closed work from appearing as open                       |

## Docs Synced

- [x] [docs/planning/state/agent-lane-d.md](../state/agent-lane-d.md) via `pnpm docs:sync`

## Validation Evidence

| Command                                     | Result                                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `pnpm docs:sync`                            | Passed; regenerated `docs/planning/state/agent-lane-d.md` from `docs/planning/state/agent-lane-d.yaml` |
| `pnpm --filter @dvt/state-store test`       | Passed (`9` files, `93` tests passed)                                                                  |
| `pnpm --filter @dvt/adapter-postgres test`  | Passed (`7` files, `32` tests passed, `34` skipped)                                                    |
| `pnpm --filter @dvt/state-store build`      | Passed                                                                                                 |
| `pnpm --filter @dvt/adapter-postgres build` | Passed                                                                                                 |
| `pnpm verify:prepush`                       | Passed                                                                                                 |

## Debt Introduced

None. No new debt item was created, no rules were relaxed, and no hooks were
bypassed.

## No-stub Evidence

No stubs, placeholders, fake adapters, or TODO/FIXME markers were introduced.
The work returns a real pin outcome and validates both the stale discard and
the failure case where the stored sequence cannot be re-read.

## Decision Follow-up

Apply this pattern only where a port currently hides a decision of domain or
application significance behind a `void` return.

Use the explicit-result shape when:

- the caller needs to distinguish applied vs discarded vs rejected outcomes
- the adapter is otherwise forcing the caller to infer state from persistence
  effects
- the result belongs to the application boundary and not only to telemetry

Do not apply it mechanically to every `void` method. Keep the boundary
discipline: return structured results when the method represents a domain
decision, and keep pure side-effect ports as `void` when no decision needs to be
observed.
