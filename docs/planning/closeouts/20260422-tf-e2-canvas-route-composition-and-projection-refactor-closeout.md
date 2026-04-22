---
slice: tf-e2-canvas-route-composition-and-projection-refactor
date: 2026-04-22
lane: E
task_id: TF-E2
mode: Slim
status: In progress
author: AI (Codex)
last_reviewed: 2026-04-22
---

# TF-E2 Canvas route composition and projection refactor closeout

## Phase 1. Think-First Analysis

### Problem summary

Two Canvas seams currently carry avoidable structural complexity:

- `Canvas.tsx` mixes route presentation derivation, bootstrap publication,
  shell adaptation, and modal mounting inside one route-local component.
- `canvasAuthoringGraphProjection.ts` still solves semantic node and edge merge
  concerns with methods that are correct but denser than the owned concern
  requires.

### Root cause

The TF-E2 hard cut already clarified authority boundaries, but some route-local
adapter code remained flattened into one file after the semantic cut:

- `Canvas.tsx` stayed as the last aggregation point for route-to-shell
  adaptation
- authoring-graph projection helpers stayed in one module but without a
  smaller helper vocabulary around node and edge admission

This leaves the code semantically correct but harder to scan and more likely to
accumulate further branching pressure.

### Constraints and invariants

- `AGENTS.md`: no legacy fallback reintroduction, no hidden debt, validations
  must run before closeout.
- `docs/guides/ai-work-protocol.md`: `Slim` mode is valid because this is a
  maintenance refactor with no intended external behavior change.
- `docs/architecture/components/web/graph/graph-frontend-architecture.md`:
  Canvas route composition must stay explicit, projection must remain
  downstream of semantic authority, and route seams must not reassign truth to
  React Flow state.
- `docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md`:
  route entry and read-side projection seams should stay narrow and
  responsibility-aligned.

### Options considered

- leave both files as-is and accept static-analysis warnings as noise
- apply cosmetic line splitting only
- extract route-local presentation and shell adaptation seams from `Canvas.tsx`
  and introduce smaller projection helpers in
  `canvasAuthoringGraphProjection.ts`

### Selected option and rationale

Refactor toward narrower route and projection seams without changing runtime
behavior.

That reduces accidental complexity where the architecture already expects thin
route composition and explicit read-side ownership.

## Phase 2. Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - `apps/web/src/app/views/Canvas.tsx`
  - `apps/web/src/app/views/Canvas.architecture.test.tsx`
  - `apps/web/src/app/views/canvas/canvasAuthoringGraphProjection.ts`
  - `apps/web/src/app/views/canvas/canvasAuthoringGraphProjection.test.ts`
  - any narrowly-scoped new Canvas helper modules needed for route composition
- Expected outcome:
  - `Canvas.tsx` becomes a thinner route entry with explicit delegated
    presentation composition
  - `canvasAuthoringGraphProjection.ts` keeps semantic authority behavior while
    reducing method complexity and merge ambiguity
- Risks and mitigations:
  - risk: move-only refactor accidentally changes published route presentation
    semantics
    mitigation: keep existing route architecture coverage and focused Canvas
    tests green
  - risk: helper extraction obscures ownership instead of clarifying it
    mitigation: name helpers by owned concern and keep them route-local
- Out of scope:
  - changing Canvas functional behavior
  - changing DVT graph topology rules
  - reintroducing mock-era or snapshot-era fallback semantics
- Validation plan:
  - focused `eslint`, `typecheck`, and `vitest` coverage for touched web files
  - `pnpm verify:prepush`
- Test coverage plan:
  - existing `Canvas.architecture.test.tsx`
  - existing `canvasAuthoringGraphProjection.test.ts`
  - any focused new assertions needed to pin helper-driven behavior
- Libraries evaluated:
  - none; no custom framework or external abstraction is justified for a local
    route refactor
