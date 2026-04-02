---
title: F03 shell health banner hard QA review
status: Review
owner: Product / Architecture / Frontend / QA
last_reviewed: 2026-04-02
planning_type: review
---

# F03 shell health banner hard QA review

## Purpose

Persist the hard QA assessment for the active `F-03` shell-health slice and
translate the findings into executable remediation work without relaxing the
existing acceptance target.

## Scope

This review evaluates the current `F-03` implementation in `apps/web` against:

- the Lane E target for real shell health visibility
- the `F-02` closeout statement that left retry/backoff open
- the frontend capability-boundary pattern already established for
  `platform-health`

The review is code-grounded. It does not claim task closure.

## Findings

### P1 - `F-03` is still not acceptance-complete because backoff was replaced by a fixed polling countdown

Evidence:

- `docs/planning/state/agent-lane-e.yaml`
- `docs/planning/closeouts/F-02-closeout.md`
- `apps/web/src/app/Root.tsx`
- `apps/web/src/app/components/ShellHealthBanner.tsx`
- `apps/web/src/app/platformHealthStatus.ts`

Problem:

The active lane target still requires a persistent degraded/offline banner with
retry and backoff. The current implementation renders a countdown based on the
query `refetchInterval` and manual `refetch()`, but it no longer drives a real
progressive retry schedule.

Required correction:

- restore explicit shell-level retry/backoff semantics
- reset the schedule on success and manual retry
- prove the schedule with tests

### P2 - The shell still carries a false initial `ok` connectivity state before the first settled health check

Evidence:

- `docs/planning/state/agent-lane-e.yaml`
- `apps/web/src/app/stores/appStore.ts`
- `apps/web/src/app/Root.tsx`
- `apps/web/src/app/components/TopAppBar.tsx`

Problem:

`TopAppBar` suppresses the initial false positive by showing `Checking`, but the
shared shell store still initializes `connectionStatus` as `ok/connected` and
keeps that value until the first query settles. That means the false
connectivity state still exists in the shell even if one consumer now hides it.

Required correction:

- remove the false initial `ok` from shared shell state and consumers
- keep backend contract states unchanged (`ok | degraded | offline`)
- model pre-settle truth as shell metadata, not as a new backend status

### P2 - The shell now reimplements capability projection logic in `Root`, creating boundary drift

Evidence:

- `docs/architecture/frontend/planning/frontend-planning-capability-architecture.md`
- `apps/web/src/app/Root.tsx`
- `apps/web/src/app/platformHealthStatus.ts`
- `apps/web/src/capabilities/platform-health/**`

Problem:

`Root` now inspects the raw platform-health snapshot directly to derive
connection detail and shell messaging. That leaks probe semantics outside the
capability boundary and duplicates logic that already has a dedicated helper in
`platformHealthStatus.ts`.

Required correction:

- move shell-facing health projection back behind the capability boundary
- expose one derived shell model for `Root`, `TopAppBar`, and the banner
- remove or consolidate duplicate mapping logic

### P3 - The new tests protect render behavior but not the acceptance invariants that actually drifted

Evidence:

- `apps/web/src/app/Root.test.tsx`
- `apps/web/src/app/platformHealthStatus.test.ts`

Problem:

The current test slice proves banner rendering and the fixed polling countdown,
but it does not prove:

- progressive retry/backoff behavior
- absence of false initial `ok` in shared shell state
- one-source-of-truth projection shared by banner and top bar

Required correction:

- add acceptance-oriented shell tests for the remaining invariants
- stop leaving active tests attached only to helpers no longer driving the shell

## Remediation plan

The correction should execute as flat subtasks under `F-03`:

1. `F-03-A`
   Introduce a capability-owned shell projection model for platform health so
   the shell consumes one derived source of truth instead of probing the raw
   snapshot in `Root`.
2. `F-03-B`
   Restore real retry/backoff semantics for degraded/offline shell health and
   cover reset behavior on success and manual retry.
3. `F-03-C`
   Remove the false initial `ok` connectivity state from shared shell behavior
   before the first settled health check, without inventing a new backend
   contract state.

## Validation context

Commands executed during review:

- `pnpm --filter @dvt/web exec vitest run src/app/Root.test.tsx src/capabilities/platform-health/domain/platformHealthSelectors.test.ts src/capabilities/platform-health/presentation/usePlatformHealthSnapshotQuery.test.ts`
- `pnpm --filter @dvt/web exec eslint src/app/Root.tsx src/app/components/TopAppBar.tsx src/app/components/ShellHealthBanner.tsx src/app/Root.test.tsx src/app/platformHealthStatus.ts src/app/platformHealthStatus.test.ts`
- `pnpm --filter @dvt/web typecheck`
- `pnpm verify:prepush`

Observed result:

- the slice is green on its focused validation path
- the open gaps are acceptance, architectural-boundary, and shell-invariant
  issues rather than immediate red tests

## Conclusion

`F-03` is materially advanced but not yet closure-ready. The visible banner and
top-bar work should be retained, but the task must remain open until backoff,
pre-settle shell truth, and capability-boundary consolidation are corrected.

## References

- `docs/planning/proposals/frontend-roadmap-20260219.md`
- `docs/planning/state/lane-e-shell-baseline-target-guide.md`
- `docs/planning/state/agent-lane-e.yaml`
- `docs/planning/closeouts/F-02-closeout.md`
- `docs/architecture/frontend/planning/frontend-planning-capability-architecture.md`
