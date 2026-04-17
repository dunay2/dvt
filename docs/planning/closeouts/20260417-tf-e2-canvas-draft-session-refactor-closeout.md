---
slice: tf-e2-canvas-draft-session-refactor
date: 2026-04-17
lane: E
author: AI (Codex)
last_reviewed: 2026-04-17
---

# Closeout: TF-E2 canvas draft session refactor

## Think-First Analysis

### Problem summary

The previous Canvas draft hardening closed the first compare-and-swap defects,
but QA still found two structural regressions in the client sync loop:

- imported or newly available snapshot nodes could not enter an already-drafted
  canvas
- if the backend draft disappeared after an earlier load, the client stayed in
  a stale pseudo-draft mode instead of blocking and requiring an explicit
  recovery path

### Root cause

The slice still depended on implicit state spread across `useEffect`s:

- remote draft baseline tracking
- visibility rules for the editable subset of the graph
- local editing state
- reload and conflict transitions

That made the graph model responsible for visibility decisions that belong to
the draft session, and it left the controller without an explicit model for
`editing`, `conflict`, and `missing_remote`.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, no hidden debt, no stub completion,
  doc-driven implementation, mandatory validation, mandatory closeout evidence
- `docs/guides/ai-work-protocol.md`: think-first, pre-implementation brief,
  focused implementation, negative-path coverage, and final validation evidence
- `docs/planning/proposals/mandatory/runtime-and-contracts/tf-a2-workspace-graph-draft-persistence-boundary-plan-20260416.md`:
  reject-on-stale CAS semantics, explicit stale handling, and no silent merge
- `docs/architecture/reference-architecture.md`: backend remains persistence
  authority; the web client must not infer canonical draft state from local
  heuristics

### Options considered

- Keep extending the current controller effects with more conditions.
  - Rejected because the same temporal coupling would remain in place.
- Extract an explicit draft session model and reduce the controller to
  orchestration.
  - Accepted because it makes visibility, reload, conflict, and
    missing-remote transitions explicit and testable.
- Move directly to multiplayer-grade merge semantics.
  - Rejected because the governed `TF-A2` scope is still CAS plus explicit
    stale recovery, not OT/CRDT.

### Selected option and rationale

Introduce a small draft-session model that owns:

- the authoritative remote baseline
- the visible working set
- the sync state machine for `bootstrapping`, `editing`, `saving`,
  `conflict`, and `missing_remote`

Then make `useCanvasController` translate query results and UI events into that
model, while `useCanvasGraphModel` only projects the currently visible subset
of the canonical snapshot.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `apps/web/src/app/views/canvas/canvasDraftSession.ts`
  - `apps/web/src/app/views/canvas/useCanvasController.ts`
  - `apps/web/src/app/views/canvas/useCanvasGraphModel.ts`
  - `apps/web/src/app/views/canvas/useCanvasGraphHandlers.ts`
  - `apps/web/src/app/views/canvas/useCanvasGraphHandlers.types.ts`
  - `apps/web/src/app/views/Canvas.tsx`
  - `apps/web/src/app/views/canvas/CanvasToolbar.tsx`
  - `apps/web/src/app/views/canvas/canvasShell.types.ts`
  - `apps/web/src/app/views/canvas/CanvasShell.tsx`
  - focused Canvas controller, model, and UI tests
- Expected outcome:
  - draft visibility is driven by an explicit working set, not by ad hoc graph
    state
  - imported and dropped nodes can enter an active draft only through explicit
    user actions
  - missing remote drafts block editing and autosave until the user adopts the
    current snapshot
  - stale conflict handling continues to use the existing reload flow
- Risks and mitigations:
  - Risk: refactoring the controller could break autosave and reload behavior
  - Mitigation: move transitions into a pure model and add controller
    regressions for import, conflict reload, and missing-remote handling
  - Risk: graph projection could regress node positioning
  - Mitigation: keep node positions in the persisted layout store and apply
    remote draft positions only on explicit hydration events
  - Risk: keyboard edge or node removal could desynchronize the working set
  - Mitigation: reconcile the working set against live graph structure after
    structural edits and snapshot refreshes
- Out of scope:
  - backend contract changes
  - automatic merge of remote and local drafts
  - realtime cross-tab synchronization
- Validation plan:
  - `pnpm --filter @dvt/web typecheck`
  - focused ESLint on touched Canvas files
  - focused `@dvt/web` Vitest slice including the new session model tests
  - `pnpm docs:sync`
  - `pnpm verify:prepush`
- Test coverage plan:
  - pure transitions for the new draft session model
  - imports and drops under an active persisted draft
  - no silent auto-merge of unrelated snapshot nodes
  - missing-remote blocking and adopt-current-snapshot recovery
  - stale conflict reload remains non-destructive
- Libraries evaluated:
  - None evaluated -- the slice stays on the existing React Query and React
    Flow boundaries

## Implementation Summary

- Added `canvasDraftSession.ts` as the explicit session model for Canvas draft
  sync, including the working set, remote baseline, CAS conflict state, and
  `missing_remote` recovery path.
- Refactored `useCanvasController.ts` to orchestrate query results and UI
  events through the session model instead of mixing remote hydration and local
  editing rules inside reactive signature comparisons.
- Converted `useCanvasGraphModel.ts` into a pure projection of the canonical
  snapshot over the current working set, while leaving node positions in the
  persisted layout store.
- Extended `useCanvasGraphHandlers.ts` with explicit callbacks so `drop`,
  remove, and confirmed edge creation update the draft working set as part of
  the same user event.
- Added `missing_remote` UX in `Canvas.tsx` and the copy layer, keeping the
  viewport inspectable while disabling mutations and exposing the explicit
  `Adopt current workspace snapshot` recovery action.
- Added pure model tests and controller/UI regressions for stale conflict
  reload, import under active draft, explicit node drop, no auto-merge of
  unrelated snapshot nodes, and missing-remote recovery.

## Validation Evidence

- `pnpm --filter @dvt/web typecheck` ✅
- `pnpm exec eslint apps/web/src/app/views/canvas/canvasDraftSession.ts apps/web/src/app/views/canvas/canvasDraftSession.test.ts apps/web/src/app/views/canvas/useCanvasController.ts apps/web/src/app/views/canvas/useCanvasGraphModel.ts apps/web/src/app/views/canvas/useCanvasGraphHandlers.ts apps/web/src/app/views/canvas/useCanvasGraphHandlers.types.ts apps/web/src/app/views/canvas/useCanvasController.core.test.tsx apps/web/src/app/views/canvas/useCanvasController.negative.test.tsx apps/web/src/app/views/canvas/useCanvasController.test.harness.tsx apps/web/src/app/views/Canvas.tsx apps/web/src/app/views/Canvas.test.tsx --max-warnings 0` ✅
- `pnpm --filter @dvt/web test -- src/app/views/canvas/canvasDraftSession.test.ts src/app/views/canvas/useCanvasGraphHandlers.test.tsx src/app/views/canvas/useCanvasController.core.test.tsx src/app/views/canvas/useCanvasController.negative.test.tsx src/app/views/Canvas.test.tsx src/app/views/canvas/CanvasShell.test.tsx src/app/views/canvas/CanvasToolbar.test.tsx` ✅
- `pnpm docs:sync` ✅
- `pnpm verify:prepush` ✅

## No-Debt And No-Stub Evidence

- No lint, type, test, or hook rules were bypassed or relaxed.
- No stub, placeholder, fake adapter, or TODO/FIXME marker was introduced.
- No backend contract or port shape was changed for this slice.
