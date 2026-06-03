---
slice: tf-e2-canvas-route-composer-and-shell-subbuilders
date: 2026-04-21
lane: E
task_id: TF-E2, TF-E2-I
mode: Slim
status: Accepted
author: AI (Codex)
last_reviewed: 2026-04-21
---

# TF-E2 Canvas route composer and shell subbuilders closeout

## Phase 1. Think-First Analysis

### Problem summary

`Canvas.tsx` still mixes three concerns:

- route-presentation synchronization into bootstrap and draft-publication seams
- shell composition
- modal hosting

At the same time, `canvasShellPropsBuilder.tsx` is still one broad assembler
that directly builds all grouped shell concerns inline.

### Root cause

Earlier slices improved the public contract and removed flat prop spray first.

That was the right order, but it left one follow-up seam unfinished:

- the route composer is still wider than its owned concern
- the shell contract assembler still groups semantics at the type level but not
  yet at the builder level

### Constraints and invariants

- `AGENTS.md`
  no debt markers, no compatibility shims, no fake decomposition
- `docs/guides/ai-work-protocol.md`
  docs-first and proof-backed execution are mandatory
- `docs/architecture/components/web/graph/canvas-shell-component.md`
  `Canvas.tsx` remains the route composition site, the shell contract remains
  grouped by semantic concern, and local seams must stay explicit
- `docs/architecture/components/web/graph/canvas-route-presentation-component.md`
  route-visible posture and bootstrap publication remain canonical route
  concerns, not shell-local branching
- `docs/architecture/components/web/graph/canvas-component-map-and-modernization-review.md`
  route composition should stay explicit while deeper policy remains outside the
  view seam

### Options considered

- keep `Canvas.tsx` as the mixed route seam and stop after the shell slimming
- move the mixed logic into a single larger helper
- extract one route-presentation sync hook, one modal host, and shell
  subbuilders aligned to the grouped contract

### Selected option and rationale

Extract one route-presentation sync hook, one modal host, and shell
subbuilders aligned to the grouped contract.

This closes the real drift instead of hiding it:

- `Canvas.tsx` becomes a thinner route composer
- modal mounting becomes an explicit owned concern
- `canvasShellPropsBuilder.tsx` becomes an orchestrator over semantically named
  subbuilders instead of a large inline object factory

### Rejected alternatives

- stopping after the previous slice:
  leaves route composition and builder seams wider than their owned concerns
- one bigger helper:
  renames the problem instead of decomposing it semantically

## Phase 2. Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - `apps/web/src/app/views/Canvas.tsx`
  - `apps/web/src/app/views/Canvas.architecture.test.tsx`
  - new route-owned `canvas/` seams for presentation sync and modal hosting
  - `apps/web/src/app/views/canvas/canvasShellPropsBuilder.tsx`
  - new shell subbuilder files
  - shell and route architecture docs
  - `docs/planning/state/agent-lane-e.yaml`
  - this closeout
- Expected outcome:
  - `Canvas.tsx` delegates route-presentation sync to a dedicated hook
  - `Canvas.tsx` delegates modal mounting to a dedicated modal host
  - `canvasShellPropsBuilder.tsx` delegates grouped concern construction to
    dedicated subbuilders
- Risks and mitigations:
  - risk: extraction without semantic gain
    mitigation: every new file must declare one owned concern and one stable
    API
  - risk: behavior regression in bootstrap publication or modals
    mitigation: preserve existing tests and add architecture fitness checks
- Out of scope:
  - controller decomposition
  - new runtime behavior
  - toolbar redesign
- Validation plan:
  - targeted architecture tests for route composition and shell subbuilders
  - targeted route and shell tests
  - targeted `@dvt/web` typecheck
  - targeted eslint and markdownlint
  - `pnpm docs:workboard:generate`
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`

## Phase 3. Implementation Summary

- extracted `useCanvasRoutePresentationSync.ts`, so `Canvas.tsx` no longer owns
  bootstrap publication and draft-presentation publication inline
- extracted `CanvasModalHost.tsx`, so `Canvas.tsx` no longer mounts plan and
  edge modals inline
- split `canvasShellPropsBuilder.tsx` into concern-owned subbuilders for
  layout, panels, graph, toolbar, graph commands, and chrome commands
- reduced `canvasShellPropsBuilder.tsx` to a semantic orchestrator over those
  subbuilders
- added architecture tests that now guard:
  - route composer delegation to sync hook and modal host
  - shell builder delegation to subbuilders instead of inline object assembly
- updated the local component docs and the component map so the new seams are
  described as explicit owned concerns

## Phase 4. Validation Outcome

- `pnpm test -- src/app/views/Canvas.architecture.test.tsx src/app/views/canvas/canvasShellPropsBuilder.architecture.test.ts src/app/views/canvas/CanvasShell.architecture.test.tsx src/app/views/canvas/CanvasShell.test.tsx src/app/views/Canvas.routeStates.test.tsx`
  - passed
- `pnpm --filter @dvt/web typecheck`
  - passed
- targeted eslint for touched route and builder files
  - passed
- targeted markdownlint for touched shell and closeout docs
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
  heuristics again detected no staged files in this workspace state, so the
  closeout includes explicit targeted eslint, markdownlint, tests, and
  typecheck evidence above.

## Phase 5. Outcome And Drift

The route composer no longer mixes route publication, shell assembly, and modal
mounting in one method body.

Closed drift:

- inline route-presentation publication in `Canvas.tsx`
- inline modal mounting in `Canvas.tsx`
- one broad `canvasShellPropsBuilder.tsx` assembling all grouped concerns inline

Residual drift outside this slice:

- `CanvasModalHost.tsx` still hosts two modal surfaces inside one local
  component; that is acceptable now because the owned concern is explicitly
  “route-owned modal hosting”, but it should not grow into a broader command
  policy layer
- `CanvasContent` still remains the route composition seam over the controller
  facade, which is acceptable as long as it stays limited to orchestration
