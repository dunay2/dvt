---
slice: tf-e2-canvas-draft-reload-recovery-hardening
date: 2026-04-17
lane: E
task_id: TF-E2
mode: Slim
status: Completed
author: AI (Codex)
last_reviewed: 2026-04-17
---

# Closeout: TF-E2 canvas draft reload recovery hardening

## Think-First Analysis

### Problem summary

QA found three recovery defects still open in the Canvas draft sync path:

- `conflict` still allowed edit, `Plan`, and `Run` actions against a draft that
  the client could no longer persist
- `Reload latest draft` could rehydrate stale cached data and reconcile it
  against a stale local snapshot, truncating valid remote nodes or edges
- once the client entered `missing_remote`, recovery still depended on an
  uncoordinated reload path instead of one fresh boundary fetch sequence

### Root cause

The controller still treated `conflict` as mostly a banner state instead of a
blocked recovery posture, so edit and execution affordances were left active.

Reload also diverged from the live React Query cache and from the authoritative
graph snapshot. That left recovery exposed to stale cache data and stale local
canonical reconciliation, which could truncate a valid remote draft before the
next autosave cycle.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, no hidden debt, no fake completion,
  mandatory closeout evidence, mandatory validation
- `docs/guides/ai-work-protocol.md`: Slim-mode think-first and
  pre-implementation brief before code, then focused validation
- `docs/planning/proposals/mandatory/runtime-and-contracts/tf-a2-workspace-graph-draft-persistence-boundary-plan-20260416.md`:
  reload and stale handling must remain explicit; no silent overwrite or
  heuristic merge
- `docs/planning/state/planning-control-tower.md`: active `TF-E2` lane evidence
  must stay aligned with the implementation

### Selected option and rationale

Move reload onto coordinated React Query ownership with
`cancelQueries(...)` plus `fetchQuery(...)` for both `graphDraft` and `graph`,
then reconcile the reloaded draft against the freshly fetched canonical
snapshot instead of the possibly stale local projection. At the same time,
treat `conflict` as a blocked recovery state so graph mutation and
`Plan`/`Run` follow the same governed posture as `missing_remote`.

That keeps reload and the live query on one authority path, prevents
remote-draft truncation during recovery, and makes stale CAS conflicts behave
as explicit operator recovery states instead of writable canvas sessions.

## Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - `apps/web/src/app/views/canvas/useCanvasController.ts`
  - `apps/web/src/app/views/Canvas.tsx`
  - `apps/web/src/app/views/canvas/useCanvasController.test.fixtures.ts`
  - `apps/web/src/app/views/canvas/useCanvasController.test.harness.tsx`
  - `apps/web/src/app/views/canvas/useCanvasController.core.test.tsx`
  - `apps/web/src/app/views/Canvas.test.tsx`
  - this closeout
- Expected outcome:
  - stale CAS conflicts block edit and execution affordances until recovery
  - reload applies only fresh remote draft data reconciled against a fresh
    workspace snapshot
  - late save or reload completions do not overwrite newer recovery actions
- Risks and mitigations:
  - Risk: a late save or reload response could still clobber adoption or a
    later reload
  - Mitigation: keep the generation-based stale-result suppression and route
    reload through the query client instead of a parallel service-only path
  - Risk: test harness drift around React Query fetch and cancel semantics
  - Mitigation: model `cancelQueries(...)`, `fetchQuery(...)`, and cache writes
    explicitly in the harness and prove them through controller regressions
- Validation plan:
  - `pnpm --filter @dvt/web typecheck`
  - focused ESLint on touched Canvas runtime/tests
  - focused Vitest for controller and route regressions
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm verify:prepush`

## Implementation Summary

- `apps/web/src/app/views/canvas/useCanvasController.ts`
  - promoted `conflict` into the same blocked-recovery posture as
    `missing_remote` for graph mutation, draft persistence, `Plan`, and `Run`
  - moved `reloadLatestDraft()` onto coordinated
    `queryClient.cancelQueries(...)` plus `queryClient.fetchQuery(...)` calls
    for both `graphDraft` and `graph`
  - now rebuilds the canonical snapshot from the freshly fetched workspace
    graph before reconciling the remote draft, preventing stale-snapshot
    truncation
  - kept the generation-based stale-result suppression so late save or reload
    completions cannot overwrite newer recovery actions
- `apps/web/src/app/views/Canvas.tsx`
  - now disables Layout, `Plan`, and `Run` while the route is in stale-draft
    conflict, without hiding the visible recovery banner
- harness and regressions
  - `apps/web/src/app/views/canvas/useCanvasController.test.fixtures.ts` and
    `apps/web/src/app/views/canvas/useCanvasController.test.harness.tsx` now
    model `cancelQueries(...)`, `fetchQuery(...)`, and query-cache updates for
    both draft and graph keys
  - `apps/web/src/app/views/canvas/useCanvasController.core.test.tsx` now
    proves conflict blocks editing and execution, reload coordinates through
    the query client, and stale local canon no longer truncates reloaded remote
    nodes
  - `apps/web/src/app/views/Canvas.test.tsx` now proves the stale-draft banner
    disables canvas actions until reload recovers the route

## Validation

- `pnpm --filter @dvt/web typecheck` ✅
- `pnpm exec eslint apps/web/src/app/views/canvas/useCanvasController.ts apps/web/src/app/views/Canvas.tsx apps/web/src/app/views/canvas/useCanvasController.test.fixtures.ts apps/web/src/app/views/canvas/useCanvasController.test.harness.tsx apps/web/src/app/views/canvas/useCanvasController.core.test.tsx apps/web/src/app/views/Canvas.test.tsx --max-warnings 0` ✅
- `pnpm --filter @dvt/web test -- src/app/views/canvas/useCanvasController.core.test.tsx src/app/views/canvas/useCanvasController.negative.test.tsx src/app/views/Canvas.test.tsx` ✅
- `pnpm docs:sync` ✅
- `pnpm docs:workboard:generate` ✅
- `pnpm verify:prepush` ✅
