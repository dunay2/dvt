---
slice: tf-e2-canvas-draft-followup-qa-hardening
date: 2026-04-17
lane: E
author: AI (Codex)
last_reviewed: 2026-04-17
---

# Closeout: TF-E2 canvas draft follow-up QA hardening

## Think-First Analysis

### Problem summary

The follow-up QA pass after the draft-session refactor found three remaining
runtime integrity gaps:

- deleting nodes through the keyboard-driven `onNodesChange` path left stale
  selection and inspector state behind
- a rejected autosave promise could reopen `editing` after the controller had
  already moved into `missing_remote`
- an already-open source-import wizard could stay usable after the canvas had
  been blocked for `missing_remote`

### Root cause

The remaining issues were all recovery-path gaps rather than model-design
gaps:

- the delete path only reconciled nodes, edges, and the draft working set, but
  not the UI state that still referenced removed nodes
- the autosave `catch` treated every failure as a generic return to `editing`
  instead of checking whether the session was still in `saving`
- the shell only blocked new import affordances, not an import modal that had
  already been opened before permissions changed

### Constraints and invariants

- `AGENTS.md`: governed startup, no debt, no stubs, mandatory validation, and
  explicit evidence in closeout
- `docs/guides/ai-work-protocol.md`: root-cause first, negative-path coverage,
  focused implementation, and validation evidence
- `docs/planning/proposals/mandatory/runtime-and-contracts/tf-a2-workspace-graph-draft-persistence-boundary-plan-20260416.md`:
  stale and missing-remote recovery must stay explicit and fail-closed

### Selected option and rationale

Apply a narrow hardening pass instead of another refactor:

- align the delete path with the explicit remove action path
- make autosave failure restore `editing` only when the session still owns the
  `saving` state
- close and ignore import flows once mutation permissions are revoked

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `apps/web/src/app/views/canvas/useCanvasController.ts`
  - `apps/web/src/app/views/canvas/CanvasShell.tsx`
  - `apps/web/src/app/views/canvas/useCanvasController.test.fixtures.ts`
  - `apps/web/src/app/views/canvas/useCanvasController.test.harness.tsx`
  - focused Canvas controller and shell tests
- Expected outcome:
  - delete-driven node removal clears stale selection and inspector state
  - autosave failure cannot reopen `editing` over `missing_remote`
  - import cannot complete once the canvas is blocked for missing remote draft
- Validation plan:
  - `pnpm --filter @dvt/web typecheck`
  - focused ESLint on touched Canvas files
  - focused `@dvt/web` tests for controller and shell regressions
  - `pnpm docs:sync`
  - `pnpm verify:prepush`

## Implementation Summary

- Hardened `useCanvasController.ts` so the autosave `catch` only restores
  `editing` when the current session is still `saving`.
- Updated the keyboard delete path in `handleNodesChange()` to clear selected
  node ids and the inspector target when removed nodes were still referenced by
  UI state.
- Added a defensive `canMutateGraph` guard to `handleSourceImportComplete()` so
  blocked canvases ignore stale import completions.
- Updated `CanvasShell.tsx` to close the import wizard if edit permissions are
  revoked while it is open.
- Tightened the controller test fixtures and harness so store mutators update
  harness state and node/edge removal can be exercised through the real
  `onNodesChange` path.
- Added regressions for delete-driven removal cleanup, autosave failure during
  `missing_remote`, ignored import completion while blocked, and shell-side
  auto-close of the import wizard.

## Validation Evidence

- `pnpm --filter @dvt/web typecheck` ✅
- `pnpm exec eslint apps/web/src/app/views/canvas/useCanvasController.ts apps/web/src/app/views/canvas/CanvasShell.tsx apps/web/src/app/views/canvas/useCanvasController.core.test.tsx apps/web/src/app/views/canvas/useCanvasController.negative.test.tsx apps/web/src/app/views/canvas/useCanvasController.test.fixtures.ts apps/web/src/app/views/canvas/useCanvasController.test.harness.tsx apps/web/src/app/views/canvas/CanvasShell.test.tsx --max-warnings 0` ✅
- `pnpm --filter @dvt/web test -- src/app/views/canvas/useCanvasController.core.test.tsx src/app/views/canvas/useCanvasController.negative.test.tsx src/app/views/canvas/CanvasShell.test.tsx src/app/views/Canvas.test.tsx src/app/views/canvas/CanvasToolbar.test.tsx src/app/views/canvas/CanvasViewport.test.tsx` ✅
- `pnpm docs:sync` ✅
- `pnpm verify:prepush` ✅

## No-Debt And No-Stub Evidence

- No lint, type, test, or hook rules were bypassed or relaxed.
- No stub, placeholder, fake adapter, or TODO/FIXME marker was introduced.
- No backend contract or port shape changed in this follow-up slice.
