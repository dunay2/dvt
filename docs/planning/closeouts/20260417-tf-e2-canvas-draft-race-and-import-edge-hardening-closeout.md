---
slice: tf-e2-canvas-draft-race-and-import-edge-hardening
date: 2026-04-17
lane: E
task_id: TF-E2
mode: Slim
status: Completed
author: AI (Codex)
last_reviewed: 2026-04-17
---

# Closeout: TF-E2 canvas draft race and import-edge hardening

## Think-First Analysis

### Problem summary

The current Canvas draft-sync worktree still has two functional gaps in the
runtime path:

- a late `saveGraphDraft()` success can re-baseline the editor after the user
  has already moved into reload or `missing_remote` recovery
- imported nodes promoted into an active draft do not inherit the refreshed
  canonical edges that make the imported subgraph operable for validation and
  planning

The worktree also contains new governed docs that must be indexed before the
slice is considered PR-ready.

### Root cause

The controller correctly fail-closes the `catch` path for stale saves, but the
`then` path still treats any successful response as authoritative even when the
session has already transitioned away from the save attempt that produced it.

Separately, the draft session model currently treats snapshot reconciliation as
node promotion plus edge pruning only. That preserves the remote draft subset,
but it leaves explicit import handoff incomplete because the refreshed snapshot
topology is never merged for the newly promoted nodes.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, no hidden debt, no fake completion,
  mandatory closeout and validation evidence
- `docs/guides/ai-work-protocol.md`: Slim-mode think-first and
  pre-implementation brief before code, negative-path coverage required
- `docs/planning/proposals/mandatory/runtime-and-contracts/tf-a2-workspace-graph-draft-persistence-boundary-plan-20260416.md`:
  compare-and-swap, reject-on-stale, idempotent retry, and no silent overwrite
- `docs/planning/closeouts/20260415-tf-e1-selection-scoped-authoring-mvp-closeout.md`:
  import completion must refresh the canonical graph source of truth and make
  imported nodes usable on the Canvas route
- `docs/planning/state/planning-control-tower.md`: closeout plus relevant lane
  registry must stay aligned for implementation work

### Options considered

- Add another UI boolean to suppress late save success.
  - Rejected because the race is about request lineage, not just local mode.
- Track save lineage explicitly and ignore stale save resolutions once recovery
  or reload invalidates the in-flight request.
  - Accepted because it hardens both success and failure paths without widening
    the contract.
- Auto-merge all canonical edges among visible nodes on every snapshot refresh.
  - Rejected because it would silently widen a persisted remote draft subset.
- Merge canonical edges only when explicit imported nodes are promoted from the
  pending import queue.
  - Accepted because it completes the explicit import handoff without
    reinterpreting unrelated remote draft intent.

### Selected option and rationale

Introduce explicit save-attempt invalidation in the controller and targeted
edge promotion in the draft-session reconciliation logic.

That keeps the CAS semantics strict, prevents stale late save completions from
reopening or rebasing the session, and completes the import handoff by making
promoted nodes inherit the canonical edges that are now part of the refreshed
workspace graph.

### Rejected alternatives

- Treat late successful saves as authoritative and then force another reload.
  - Rejected because it still allows stale state to become the local baseline.
- Add a separate import-only edge cache in the controller.
  - Rejected because edge visibility belongs in the draft session model, not in
    another route-local side channel.

## Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - `apps/web/src/app/views/canvas/useCanvasController.ts`
  - `apps/web/src/app/views/canvas/canvasDraftSession.ts`
  - `apps/web/src/app/views/canvas/useCanvasController.core.test.tsx`
  - `apps/web/src/app/views/canvas/useCanvasController.negative.test.tsx`
  - `apps/web/src/app/views/canvas/canvasDraftSession.test.ts`
  - `docs/planning/state/agent-lane-e.yaml`
  - this closeout
- Expected outcome:
  - stale late save success no longer mutates the session after reload or
    `missing_remote`
  - imported nodes promoted into an active draft also gain the canonical edges
    needed for validation and planning
  - lane registry and generated docs stay aligned with the new closeout
- Risks and mitigations:
  - Risk: save invalidation suppresses a legitimate current save
  - Mitigation: tie invalidation to explicit recovery transitions and request
    lineage rather than generic rerenders
  - Risk: canonical-edge promotion widens remote draft visibility
  - Mitigation: only merge canonical edges that involve nodes promoted from the
    explicit import queue
- Out of scope:
  - widening the planner contract
  - changing backend draft semantics or the workspace port contract
  - new Inspector/property-editing behavior
- Validation plan:
  - `pnpm --filter @dvt/web typecheck`
  - focused ESLint on touched Canvas runtime and tests
  - focused Vitest for draft-session and controller regressions
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - stale in-flight save success after reload is ignored
  - stale in-flight save success after remote disappearance is ignored
  - imported nodes promoted from the pending queue inherit refreshed canonical
    edges
  - unrelated snapshot nodes still do not auto-merge into an active draft
- Libraries evaluated:
  - None evaluated; the fix is within the existing React Query and route-local
    state model

## Implementation Summary

- `apps/web/src/app/views/canvas/useCanvasController.ts`
  - introduced explicit save-attempt lineage tracking so reload, adopt, and
    `missing_remote` recovery invalidate any in-flight autosave attempt
  - hardened both the success and failure resolution paths so late save
    completions are ignored once the session has moved on from the request that
    produced them
- `apps/web/src/app/views/canvas/canvasDraftSession.ts`
  - extended snapshot reconciliation so nodes promoted from the explicit import
    queue also inherit refreshed canonical edges that involve those promoted
    nodes
  - kept the non-merge invariant intact by avoiding blanket edge auto-merge for
    unrelated snapshot topology
- `apps/web/src/app/views/canvas/canvasDraftSession.test.ts`
  - added regression proof that promoted explicit nodes inherit their canonical
    edges on snapshot refresh
- `apps/web/src/app/views/canvas/useCanvasController.core.test.tsx`
  - added regression proof that a late successful autosave is ignored after a
    newer remote draft has been reloaded
  - extended import coverage so active persisted drafts gain the refreshed
    canonical edges required for planning and validation after import
- `apps/web/src/app/views/canvas/useCanvasController.negative.test.tsx`
  - added regression proof that a late successful autosave is ignored after the
    remote draft disappears and the session moves into `missing_remote`
- `docs/planning/state/agent-lane-e.yaml`
  - registered the active `TF-E2` evidence pack for the current Canvas
    draft-persistence worktree and refreshed the parent-task status narrative
- generated governed docs
  - refreshed `docs/planning/status/generated-code-state.md` for the newly
    added Canvas source files already present in the worktree
  - re-ran `docs:sync` and `docs:workboard:generate` to confirm the planning
    views were already aligned after the lane update, with no additional
    persisted drift beyond the lane registry and generated code-state page

## Validation

- `pnpm --filter @dvt/web typecheck` ✅
- `pnpm exec eslint apps/web/src/app/views/canvas/useCanvasController.ts apps/web/src/app/views/canvas/canvasDraftSession.ts apps/web/src/app/views/canvas/canvasDraftSession.test.ts apps/web/src/app/views/canvas/useCanvasController.core.test.tsx apps/web/src/app/views/canvas/useCanvasController.negative.test.tsx --max-warnings 0` ✅
- `pnpm --filter @dvt/web test -- src/app/views/canvas/canvasDraftSession.test.ts src/app/views/canvas/useCanvasController.core.test.tsx src/app/views/canvas/useCanvasController.negative.test.tsx` ✅
- `pnpm docs:status:generate` ✅
- `pnpm docs:sync` ✅
- `pnpm docs:workboard:generate` ✅
- `pnpm verify:prepush` ✅
