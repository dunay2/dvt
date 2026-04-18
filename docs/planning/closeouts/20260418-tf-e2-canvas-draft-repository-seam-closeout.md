---
slice: tf-e2-canvas-draft-repository-seam
date: 2026-04-18
lane: E
task_id: TF-E2-A
mode: Slim
status: Completed
author: AI (Codex)
last_reviewed: 2026-04-18
---

# TF-E2 canvas draft repository seam closeout

## Phase 1. Think-First Analysis

### Problem summary

`useCanvasController` still performed draft read, draft save, and reload-time
snapshot access directly against `IWorkspacePort`.

### Root cause

Earlier `TF-E2` work closed behavior and recovery rules first, but left the
draft persistence seam embedded in the controller hook instead of isolating it
behind one repository-facing boundary.

### Constraints and invariants

- `AGENTS.md`: architecture, docs, tests, and planning evidence must stay
  aligned.
- `docs/guides/ai-work-protocol.md`: Slim-mode refactor still requires docs and
  closeout updates when active architecture wording changes.
- `docs/planning/state/planning-control-tower.md`: active lane truth and
  closeout evidence must be updated in the same slice.
- `docs/architecture/components/web/frontend-data-boundary-architecture.md`:
  route orchestration must not own transport concerns directly.
- `docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-canvas-target-architecture-execution-plan-20260417.md`:
  `E2-ARCH-02` requires one repository seam for draft IO over `IWorkspacePort`.

### Options considered

- keep draft persistence calls in `useCanvasController` and rely on comments
- extract a repository seam that the controller consumes for draft IO

### Selected option and rationale

Extract `canvasDraftRepository` and route draft reads, saves, and reload-time
snapshot reads through it.

This keeps behavior unchanged while moving one concrete infrastructure concern
out of the controller composition facade.

## Phase 2. Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - `apps/web/src/app/views/canvas/canvasDraftRepository.ts`
  - `apps/web/src/app/views/canvas/canvasDraftRepository.test.ts`
  - `apps/web/src/app/views/canvas/useCanvasController.ts`
  - `apps/web/src/app/views/canvas/useCanvasController.architecture.test.ts`
  - `docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md`
  - `docs/planning/state/agent-lane-e.yaml`
  - this closeout
- Expected outcome:
  - controller draft IO is isolated behind one repository seam
  - controller behavior stays unchanged
  - architecture docs and lane evidence match the shipped seam
- Risks and mitigations:
  - risk: reload flow drifts during repository extraction
    mitigation: keep the repository as a thin delegation seam and run focused
    controller tests
  - risk: docs claim more than the code ships
    mitigation: update the controller architecture page and Lane E evidence in
    the same task
- Out of scope:
  - changing the workspace protected draft contract
  - inspector property editing
  - edge lifecycle redesign
  - OpenAPI or Swagger generation work

## Implementation Summary

- added `canvasDraftRepository.ts` as the controller-owned repository seam over
  `IWorkspacePort`
- rewired `useCanvasController` to consume the repository for:
  - draft query reads
  - autosave writes
  - reload-time draft and snapshot fetches
- added:
  - repository unit coverage
  - an architecture guard that forbids direct draft persistence calls from the
    controller source
- updated the controller architecture doc so current/target language now names
  the repository seam explicitly

## Validation

- `pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasDraftRepository.test.ts src/app/views/canvas/useCanvasController.architecture.test.ts src/app/views/canvas/useCanvasController.core.test.tsx src/app/views/canvas/useCanvasController.negative.test.tsx` - PASS
- `pnpm --filter @dvt/web typecheck` - PASS
- `pnpm docs:workboard:generate` - PASS
- `pnpm docs:status:generate` - PASS
- `pnpm docs:sync` - PASS
- `pnpm verify:prepush` - PASS

## Residuals

- `TF-E2-A` remains in progress: the repository seam is now explicit, but the
  wider shared graph-draft contract adoption and capability/read-only posture
  closure still continue under `TF-E2`.
- Swagger/OpenAPI remains a separate discussion. If adopted, it should be a
  derived HTTP description, not the source of truth over `@dvt/contracts`.
