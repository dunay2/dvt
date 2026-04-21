---
slice: tf-e2-canvas-shell-composition-slimming
date: 2026-04-21
lane: E
task_id: TF-E2, TF-E2-H
mode: Slim
status: Accepted
author: AI (Codex)
last_reviewed: 2026-04-21
---

# TF-E2 Canvas shell composition slimming closeout

## Phase 1. Think-First Analysis

### Problem summary

The grouped `CanvasShell` contract now exists, but two composition seams remain
too large:

- `Canvas.tsx` still builds the full `CanvasShellProps` object inline
- `CanvasShell.tsx` still composes all three rails and the main surface inside
  one large function body

That means semantic ownership improved at the type boundary, but the route and
shell composition seams are still too dense.

### Root cause

The previous slice correctly hard-cut the public shell API first.

That left a natural follow-up: the route and shell implementation bodies still
reflect the older all-in-one composition style even after the contract became
semantic.

### Constraints and invariants

- `AGENTS.md`
  no hidden debt, no fake decomposition, no legacy compatibility path
- `docs/guides/ai-work-protocol.md`
  docs-first and proof-backed execution remain mandatory
- `docs/architecture/components/web/graph/canvas-shell-component.md`
  shell layout, chrome composition, and grouped API ownership stay explicit
- `docs/architecture/components/web/graph/canvas-component-map-and-modernization-review.md`
  route composition and shell seams should stay explicit and not drift back
  into controller-shaped blobs
- `docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md`
  route and shell composition should narrow toward dedicated seams rather than
  grow as broad methods

### Options considered

- keep the new grouped contract and ignore the method-size drift
- split code cosmetically without naming owned concerns
- extract explicit composition helpers that match the shell contract boundaries

### Selected option and rationale

Extract explicit composition helpers that match the shell contract boundaries.

This reduces method size while keeping the same semantic API:

- a route-owned builder for `CanvasShellProps`
- shell-local helpers for panel sizing and rail composition

### Rejected alternatives

- ignore the warnings:
  leaves a still-dense composition seam in the hot path
- cosmetic line moves:
  reduces warnings without improving semantic ownership

## Phase 2. Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - `apps/web/src/app/views/Canvas.tsx`
  - `apps/web/src/app/views/Canvas.architecture.test.tsx`
  - `apps/web/src/app/views/canvas/CanvasShell.tsx`
  - `apps/web/src/app/views/canvas/CanvasShell.test.tsx`
  - one or more new shell composition helpers
  - `docs/architecture/components/web/graph/canvas-shell-component.md`
  - `docs/planning/state/agent-lane-e.yaml`
  - this closeout
- Expected outcome:
  - `Canvas.tsx` delegates shell contract creation to a named builder seam
  - `CanvasShell.tsx` delegates sizing and rail composition to explicit helpers
  - shell architecture docs name the new composition files and responsibilities
- Risks and mitigations:
  - risk: extracting helpers that only shuffle lines
    mitigation: extract only named seams with one owned concern each
  - risk: wider route regression
    mitigation: keep runtime behavior unchanged and prove route/shell tests
- Out of scope:
  - toolbar redesign
  - route-presentation semantics
  - controller decomposition beyond shell composition
- Validation plan:
  - targeted architecture tests
  - targeted shell and route tests
  - targeted web typecheck
  - targeted eslint for touched files
  - `pnpm docs:workboard:generate`
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`

## Phase 3. Implementation Summary

- extracted `buildCanvasShellProps(...)` into
  `canvasShellPropsBuilder.tsx`, so `Canvas.tsx` no longer assembles the full
  shell contract inline
- extracted named shell-local seams in `CanvasShell.tsx`:
  `resolveCanvasShellMainPanelDefaultSize`,
  `CanvasShellExplorerRail`,
  `CanvasShellMainPanel`, and
  `CanvasShellInspectorRail`
- added architecture fitness checks for both route-builder usage and shell
  layout decomposition
- expanded the local shell component guide so API, file responsibilities,
  invariants, topology, and drift rules describe the new seams directly

## Phase 4. Validation Outcome

- `pnpm test -- src/app/views/Canvas.architecture.test.tsx src/app/views/canvas/CanvasShell.architecture.test.tsx src/app/views/canvas/canvasShell.types.architecture.test.ts src/app/views/canvas/CanvasShell.test.tsx src/app/views/Canvas.routeStates.test.tsx`
  - passed
- `pnpm --filter @dvt/web typecheck`
  - passed
- targeted eslint for touched route and shell files
  - passed
- targeted markdownlint for touched shell docs
  - passed
- `pnpm docs:workboard:generate`
  - passed
- `pnpm docs:sync`
  - passed
- `pnpm docs:status:generate`
  - passed
- `pnpm verify:prepush`
  - passed

Note:

- `pnpm verify:prepush` completed successfully, but its `--changed-only`
  heuristics detected no staged files in this local workspace state, so the
  closeout also includes explicit targeted eslint, markdownlint, and typecheck
  evidence above.

## Phase 5. Outcome And Drift

The route and shell composition seams are now narrower and more explicit.

Closed drift:

- route-local inline assembly of the entire shell contract
- shell-local nested sizing ternary in the main render body
- missing architectural guardrails for shell seam decomposition

Residual drift outside this slice:

- `CanvasContent` still owns route bootstrap publication and modal mounting, so
  future decomposition may still split route bootstrap from modal composition
- `CanvasShellMainPanel` remains the densest local sub-seam and should stay
  under watch if toolbar or viewport responsibilities expand again
