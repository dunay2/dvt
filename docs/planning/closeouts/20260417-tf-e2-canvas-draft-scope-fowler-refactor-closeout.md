---
slice: tf-e2-canvas-draft-scope-fowler-refactor
date: 2026-04-17
lane: E
author: AI (Codex)
last_reviewed: 2026-04-17
---

# Closeout: TF-E2 canvas draft scope Fowler refactor

## Think-First Analysis

### Problem summary

The current Canvas draft-session refactor still leaves two structural
inconsistencies:

- `Plan` and `Run` keep deriving validation and execution scope from the full
  canonical workspace graph instead of the visible draft working set
- selection and inspector state can survive a draft bootstrap or remote reload
  even when they point to nodes that are no longer visible in the active draft

### Root cause

The controller still mixes three concepts that should be modeled separately:

- visible draft scope
- execution scope
- UI scope for selection and inspector state

That makes the draft working set authoritative for rendering only, while
planning, validation, and UI state still consult the canonical workspace
snapshot directly.

### Constraints and invariants

- `AGENTS.md`: governed startup, doc-first reasoning, no debt, no stubs,
  mandatory validation, and explicit closeout evidence
- `docs/guides/ai-work-protocol.md`: think-first, pre-implementation brief,
  negative-path coverage, and mandatory closeout artifact
- `docs/planning/proposals/mandatory/runtime-and-contracts/tf-a2-workspace-graph-draft-persistence-boundary-plan-20260416.md`:
  draft persistence uses reject-on-stale CAS with explicit client recovery;
  the visible draft must remain authoritative on the client side

### Current-state diagram

```text
graph snapshot ───────────────┐
                              ├─> graph model / rendering
draft working set ────────────┘

graph snapshot ───────────────┐
selected ids (store) ─────────┼─> validation / Plan / Run
workspace node ids ───────────┘

selected ids (store) ─────────┐
inspector id (store) ─────────┴─> inspector UI
```

### Options considered

- Add more guards inside `useCanvasController.ts`.
  - Rejected because the same implicit coupling would remain.
- Introduce a small scope model that derives visible, execution, and UI scope
  from one place.
  - Accepted because it makes the policy explicit and testable.
- Push all logic into `useCanvasExecutionActions.ts`.
  - Rejected because selection and inspector reconciliation are not execution
    concerns.

### Selected option and rationale

Introduce a pure scope model that owns:

- the visible draft subset used by the canvas
- the execution subset used by validation and planning
- the normalized UI subset used by selection and inspector state

Then make the controller consume that model and reconcile the store whenever
the visible draft changes.

### Rejected alternatives

- Keep the current workspace-wide fallback for `Plan` and `Run` under active
  draft.
  - Rejected because it breaks the mental model of the persisted draft and
    produces execution behavior that does not match what the canvas shows.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `apps/web/src/app/views/canvas/canvasDraftScope.ts`
  - `apps/web/src/app/views/canvas/useCanvasController.ts`
  - `apps/web/src/app/views/canvas/useCanvasExecutionActions.ts`
  - focused Canvas controller, scope-model, and execution tests
- Touched files or paths:
  - draft scope model and its tests
  - Canvas controller orchestration
  - execution hook tests or controller regressions as needed
- Expected outcome:
  - active draft visibility, validation, and execution all use the same scope
  - selection and inspector state are reconciled when the visible draft changes
  - reload/bootstrap/adopt flows stop leaking hidden nodes into execution paths
- Risks and mitigations:
  - Risk: changing execution scope can alter stale-plan detection
  - Mitigation: derive signatures from the same scoped nodes and edges and add
    regression coverage around active draft planning
  - Risk: reconciling selection too aggressively could clear legitimate local
    user state
  - Mitigation: reconcile only against the active visible draft subset and keep
    current selection when it remains valid
- Out-of-scope items:
  - backend contract changes
  - new draft merge semantics
  - runtime multiplayer synchronization
- Validation plan:
  - `pnpm --filter @dvt/web typecheck`
  - focused ESLint on touched Canvas files
  - focused `@dvt/web` tests for scope, controller, and execution paths
  - `pnpm docs:sync`
  - `pnpm verify:prepush`
- Test coverage plan:
  - visible scope derives nodes and edges from the draft working set
  - execution scope defaults to visible draft nodes when no selection exists
  - selection and inspector are pruned on remote draft bootstrap/reload
  - active draft planning passes only the visible subset to execution actions
  - hidden stale selection does not leak into validation
- Libraries evaluated:
  - None evaluated -- this is a local domain-model refactor, not a third-party
    capability gap

## Solution-rationale diagram

```text
canonical snapshot + draft session
              │
              ▼
     canvasDraftScope.ts
      ├─ deriveVisibleScope()
      ├─ deriveExecutionScope()
      └─ reconcileUiScope()
              │
              ▼
     useCanvasController.ts
      ├─ rendering
      ├─ selection / inspector reconciliation
      └─ validation / useCanvasExecutionActions
```

## Implementation Summary

- Added `canvasDraftScope.ts` as the explicit scope model for Canvas drafts,
  separating:
  - visible draft scope for rendering
  - execution scope for validation and planning
  - UI scope for selection and inspector reconciliation
- Updated `useCanvasController.ts` to derive those scopes from the draft
  working set and canonical snapshot, then reconcile store state only after the
  draft is bootstrapped.
- Routed `transformationValidation` and `useCanvasExecutionActions` through the
  visible draft subset instead of the full workspace snapshot.
- Reconciled selection and inspector state against the active draft subset,
  while preserving pending explicit node ids created by import flows until the
  refreshed snapshot materializes them.
- Added pure scope-model tests plus controller regressions for:
  - execution scoping to the active draft
  - pruning hidden selection and inspector ids on draft bootstrap
  - pruning hidden selection and inspector ids on remote reload

## Validation Evidence

- `pnpm --filter @dvt/web typecheck` ✅
- `pnpm exec eslint apps/web/src/app/views/canvas/canvasDraftScope.ts apps/web/src/app/views/canvas/canvasDraftScope.test.ts apps/web/src/app/views/canvas/useCanvasController.ts apps/web/src/app/views/canvas/useCanvasController.core.test.tsx apps/web/src/app/views/canvas/useCanvasController.negative.test.tsx apps/web/src/app/views/canvas/useCanvasExecutionActions.ts apps/web/src/app/views/canvas/useCanvasExecutionActions.test.tsx --max-warnings 0` ✅
- `pnpm --filter @dvt/web test -- src/app/views/canvas/canvasDraftScope.test.ts src/app/views/canvas/canvasDraftSession.test.ts src/app/views/canvas/useCanvasController.core.test.tsx src/app/views/canvas/useCanvasController.negative.test.tsx src/app/views/canvas/useCanvasExecutionActions.test.tsx src/app/views/Canvas.test.tsx src/app/views/canvas/CanvasShell.test.tsx src/app/views/canvas/CanvasToolbar.test.tsx src/app/views/canvas/CanvasViewport.test.tsx` ✅
- `pnpm docs:sync` ✅
- `pnpm verify:prepush` ✅

## No-Debt And No-Stub Evidence

- No debt or stub approval requested.
