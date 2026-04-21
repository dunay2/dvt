---
slice: tf-e2-canvas-modal-host-semantic-contract
date: 2026-04-21
lane: E
task_id: TF-E2, TF-E2-J
mode: Slim
status: Draft
author: AI (Codex)
last_reviewed: 2026-04-21
---

# TF-E2 Canvas modal host semantic contract closeout

## Phase 1. Think-First Analysis

### Problem summary

`CanvasModalHost.tsx` now has a narrower owned concern, but it still depends on
`ReturnType<typeof useCanvasController>` through a local `Pick<>`.

That means the component boundary is still controller-shaped instead of
consuming its own semantic modal contract.

### Root cause

The previous slice correctly extracted modal hosting out of `Canvas.tsx`, but
it optimized for extraction first and semantic contract hardening second.

The residual smell is:

- route composition is cleaner
- modal hosting still depends on the controller facade type

### Constraints and invariants

- `AGENTS.md`
  no fake seams, no compatibility shims, no hidden debt
- `docs/guides/ai-work-protocol.md`
  docs-first and proof-backed execution remain mandatory
- `docs/architecture/components/web/graph/canvas-component-map-and-modernization-review.md`
  route composition seams should not drift back into controller-shaped bags
- `docs/architecture/components/web/graph/canvas-shell-component.md`
  adjacent route seams should keep explicit owned concerns and stable APIs

### Options considered

- keep the controller-shaped prop and accept the coupling
- define modal host props inline inside `CanvasModalHost.tsx`
- define a dedicated modal host contract plus a route-owned builder

### Selected option and rationale

Define a dedicated modal host contract plus a route-owned builder.

That keeps the same runtime behavior while making the boundary explicit:

- `CanvasModalHost.tsx` consumes its own semantic modal props
- route composition remains the place where controller state is adapted

### Rejected alternatives

- accept the coupling:
  leaves the component contract tied to the controller facade
- define props inline in the host file only:
  improves naming slightly, but still misses a route-owned adaptation seam

## Phase 2. Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - `apps/web/src/app/views/canvas/CanvasModalHost.tsx`
  - new modal host contract and builder files
  - `apps/web/src/app/views/Canvas.tsx`
  - route and modal host architecture tests
  - local graph architecture docs and lane state
- Expected outcome:
  - `CanvasModalHost.tsx` no longer imports `useCanvasController`
  - `Canvas.tsx` adapts controller state through a dedicated modal host builder
  - architecture tests guard the semantic contract
- Risks and mitigations:
  - risk: cosmetic extraction without contract value
    mitigation: enforce a host-local props file and a route-owned builder seam
  - risk: modal behavior regression
    mitigation: keep route tests and modal host render behavior unchanged
- Out of scope:
  - new modal behavior
  - shell contract changes
  - controller decomposition
- Validation plan:
  - targeted architecture tests
  - targeted route tests
  - targeted `@dvt/web` typecheck
  - targeted eslint and markdownlint
  - `pnpm docs:workboard:generate`
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`
