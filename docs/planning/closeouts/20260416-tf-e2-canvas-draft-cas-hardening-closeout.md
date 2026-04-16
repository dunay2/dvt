---
slice: tf-e2-canvas-draft-cas-hardening
date: 2026-04-16
lane: E
author: AI (Codex)
last_reviewed: 2026-04-16
---

# Closeout: TF-E2 canvas draft CAS hardening

## Think-First Analysis

### Problem summary

The first Canvas draft persistence slice added compare-and-swap save semantics
and stale-version UX, but QA found that the client-side sync loop still had
three correctness gaps:

- autosave could stop persisting after the first local edit when a remote draft
  already existed
- hydrated remote positions could override later local node moves
- graph snapshot load failures could still leave autosave armed against an
  invalid local payload

### Root cause

The controller was mixing three concerns into one reactive comparison loop:

- authoritative remote baseline tracking
- one-shot remote hydration into the local graph model
- ongoing local editing and autosave

That made stale query cache state behave like a new remote hydration request,
and it kept the hydrated remote draft shape active as a permanent precedence
source inside the graph model instead of as a single synchronization event.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, no hidden debt, no stub completion,
  mandatory closeout evidence, touched-scope validation plus
  `pnpm verify:prepush`
- `docs/guides/ai-work-protocol.md`: think-first, implementation brief,
  negative-path coverage, and final validation evidence
- `docs/planning/proposals/mandatory/runtime-and-contracts/tf-a2-workspace-graph-draft-persistence-boundary-plan-20260416.md`:
  reject-on-stale compare-and-swap semantics, explicit revision ownership,
  idempotent retries, and caller-visible stale handling
- `docs/architecture/reference-architecture.md`: backend remains persistence
  authority; the UI must not infer canonical state from local heuristics

### Options considered

- Keep the current `pendingRemoteDraftSignature` loop and only add more guards.
  - Rejected because it still treats stale cache and explicit hydration as the
    same event source.
- Refactor to baseline-tracking plus one-shot hydration.
  - Accepted because it matches mature conditional-write patterns and separates
    cache coherence from local graph editing.
- Jump to CRDT or server-push multiplayer semantics.
  - Rejected because `TF-A2` explicitly freezes first-merge posture as
    reject-on-stale, not auto-merge.

### Selected option and rationale

Split the sync model into:

- an authoritative remote baseline updated from save outcomes
- explicit remote hydration events for first load and reload
- local graph state that continues editing after hydration without the old
  remote draft reapplying on every rerender

This closes the concrete QA defects while staying within the governed CAS
boundary.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `apps/web/src/app/views/canvas/useCanvasController.ts`
  - `apps/web/src/app/views/canvas/useCanvasGraphModel.ts`
  - `apps/web/src/app/views/canvas/useCanvasController.core.test.tsx`
  - `apps/web/src/app/views/canvas/useCanvasController.negative.test.tsx`
  - `apps/web/src/app/views/canvas/useCanvasController.test.fixtures.ts`
  - `apps/web/src/app/views/canvas/useCanvasController.test.harness.tsx`
- Expected outcome:
  - autosave continues to work after hydrating an existing remote draft
  - local node moves are not reset by stale hydrated draft positions
  - graph query errors block draft autosave fail-closed
  - empty persisted drafts still hydrate as empty canvases
- Risks and mitigations:
  - Risk: remote draft cache updates re-trigger unwanted hydration
  - Mitigation: restrict hydration to initial load and explicit reload
  - Risk: preserving draft mode could leak orphan edges
  - Mitigation: filter draft-mode edges against the currently visible node set
  - Risk: tests hide sync bugs behind harness limitations
  - Mitigation: add focused regressions for existing-draft autosave, stale
    reload, node snap-back, graph-error blocking, and empty-draft hydration
- Out of scope:
  - multiplayer merge logic
  - background cross-tab synchronization
  - contract or API path renames
- Validation plan:
  - `pnpm --filter @dvt/web typecheck`
  - focused ESLint on touched Canvas files
  - focused `@dvt/web` Vitest slice
  - `pnpm docs:sync`
  - `pnpm verify:prepush`
- Test coverage plan:
  - existing-draft autosave still fires after a local edit
  - conflict reload does not overwrite remote state
  - empty draft hydrates as empty
  - graph query error prevents autosave
  - hydrated remote positions do not snap back over local changes
- Libraries evaluated:
  - None evaluated -- existing React Query and React Flow seams already cover
    the required boundary behavior

## Implementation Summary

- `useCanvasController` now tracks remote draft baseline separately from local
  graph edits, updates React Query cache directly from successful save results,
  and only requests remote hydration on initial load or explicit reload.
- `useCanvasGraphModel` now treats remote draft data as a hydration event rather
  than a permanent precedence source, preserving local node and edge edits after
  hydration while still supporting empty-draft round-trips.
- Negative-path guards now block autosave when graph or draft queries are in an
  error state.
- Focused regression tests were added for the three QA findings and the related
  reload path.

## Validation Evidence

- `pnpm --filter @dvt/web typecheck` ✅
- `pnpm exec eslint apps/web/src/app/views/canvas/useCanvasController.ts apps/web/src/app/views/canvas/useCanvasGraphModel.ts apps/web/src/app/views/canvas/useCanvasController.core.test.tsx apps/web/src/app/views/canvas/useCanvasController.negative.test.tsx apps/web/src/app/views/canvas/useCanvasController.test.fixtures.ts apps/web/src/app/views/canvas/useCanvasController.test.harness.tsx --max-warnings 0` ✅
- `pnpm --filter @dvt/web test -- src/app/views/canvas/useCanvasController.core.test.tsx src/app/views/canvas/useCanvasController.negative.test.tsx src/app/views/canvas/CanvasToolbar.test.tsx src/app/views/Canvas.test.tsx src/app/services/workspace/workspaceService.test.ts` ✅

## No-Debt And No-Stub Evidence

- No lint, type, or test rules were relaxed.
- No hooks were bypassed.
- No stub, placeholder, fake adapter, or TODO marker was introduced.
