---
slice: tf-e2-canvas-route-composition-semantic-component
date: 2026-04-21
lane: E
task_id: TF-E2, TF-E2-J
mode: Slim
status: Accepted
author: AI (Codex)
last_reviewed: 2026-04-21
---

# TF-E2 Canvas route composition semantic component closeout

## Phase 1. Think-First Analysis

### Problem summary

`Canvas.tsx` was already thinner after the previous route-composer slice, but
two semantic drifts remained:

- `CanvasModalHost.tsx` still depended on
  `Pick<ReturnType<typeof useCanvasController>>`
- shell subbuilders still accepted one broad route-composer args bag

That meant route composition looked decomposed in file structure, but its
component boundaries were still partly implicit.

### Root cause

The earlier hard cuts optimized in the right order:

1. move route-visible posture under one presentation component
2. group the shell API by semantic concern
3. extract route-local seams and shell subbuilders

After those steps, the residual issue was not missing files. It was missing
semantic contracts:

- the modal host was still controller-shaped
- the shell subbuilders were still route-composer-shaped

### Constraints and invariants

- `AGENTS.md`
  no fake seams, no hidden debt, no compatibility shims
- `docs/guides/ai-work-protocol.md`
  docs-first analysis, explicit pre-implementation brief, and proof-backed
  validation are mandatory
- `docs/architecture/components/web/graph/canvas-route-presentation-component.md`
  route-visible posture remains canonical and separate from route composition
- `docs/architecture/components/web/graph/canvas-shell-component.md`
  shell concerns remain grouped and must not regress into a flat or broad bag
- `docs/architecture/components/web/graph/canvas-component-map-and-modernization-review.md`
  route composition should stay explicit while deeper semantics remain outside
  the route JSX seam

### Options considered

- stop after the previous decomposition slice
- hard-cut only the modal host and leave shell builder inputs broad
- treat route composition as one local semantic component and hard-cut both
  seams together

### Selected option and rationale

Treat route composition as one local semantic component and hard-cut both seams
together.

This closes the real drift instead of only renaming it:

- `CanvasModalHost.tsx` becomes a passive view over semantic modal contracts
- shell subbuilders accept concern-scoped contracts instead of one broad bag
- the route architecture pack can now describe one explicit route-composition
  component with API, invariants, transitions, and consumers

### Rejected alternatives

- stopping after the earlier slice:
  leaves semantic ownership dependent on discipline rather than contracts
- modal-host-only hard cut:
  fixes one view seam but leaves the shell-builder component half-implicit

## Phase 2. Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - `apps/web/src/app/views/Canvas.tsx`
  - `apps/web/src/app/views/canvas/CanvasModalHost.tsx`
  - new modal-host contract and builder files
  - `apps/web/src/app/views/canvas/canvasShellBuilder.types.ts`
  - `apps/web/src/app/views/canvas/canvasShellPropsBuilder.tsx`
  - shell subbuilder files
  - route-composition architecture tests
  - local graph architecture docs, review mailbox, and Lane E
- Expected outcome:
  - `CanvasModalHost.tsx` no longer depends on `useCanvasController`
  - route composition owns the modal-host adaptation seam explicitly
  - shell subbuilders consume concern-scoped input contracts
  - route composition is documented as a named local component with a semantic
    fitness surface
- Risks and mitigations:
  - risk: cosmetic extraction without meaningful encapsulation
    mitigation: introduce explicit type vocabularies and source-code fitness
    tests for them
  - risk: modal behavior regression
    mitigation: keep runtime behavior unchanged and limit the slice to
    adaptation plus documentation
- Out of scope:
  - new modal behavior
  - controller decomposition
  - shell-local visual redesign
- Validation plan:
  - targeted route and architecture tests
  - targeted `@dvt/web` typecheck
  - targeted eslint and markdownlint
  - `pnpm docs:workboard:generate`
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`

## Phase 3. Implementation Summary

- added `canvasModalHost.types.ts` as the explicit modal-host contract
- added `canvasModalHostPropsBuilder.ts` so controller adaptation is route-owned
- changed `CanvasModalHost.tsx` to consume semantic `planPreview` and
  `edgeConfirmation` props instead of a controller-shaped bag
- changed `Canvas.tsx` to build modal-host props through a dedicated builder
- replaced the single `CanvasShellBuilderArgs` bag with concern-scoped builder
  input types in `canvasShellBuilder.types.ts`
- changed shell subbuilders to consume only their owned concern inputs
- changed `canvasShellPropsBuilder.tsx` to own the one route-composer-level
  adaptation from route state into concern-scoped shell-builder contracts
- added semantic architecture tests for `CanvasModalHost` and shell builder
  input vocabulary
- published a new route-composition component guide and a dedicated Fowler
  review mailbox for this slice

## Phase 4. Validation Outcome

- `pnpm test -- src/app/views/Canvas.architecture.test.tsx src/app/views/Canvas.routeStates.test.tsx src/app/views/canvas/CanvasModalHost.architecture.test.tsx src/app/views/canvas/CanvasCenterSurface.architecture.test.ts src/app/views/canvas/CanvasRecoveryBanner.architecture.test.tsx src/app/views/canvas/CanvasShell.architecture.test.tsx src/app/views/canvas/CanvasShell.test.tsx src/app/views/canvas/CanvasToolbar.test.tsx src/app/views/canvas/canvasRouteViewState.architecture.test.ts src/app/views/canvas/canvasShell.types.architecture.test.ts src/app/views/canvas/canvasShellBuilder.types.architecture.test.ts src/app/views/canvas/canvasShellPropsBuilder.architecture.test.ts`
  - passed
- `pnpm --filter @dvt/web typecheck`
  - passed
- targeted eslint for touched Canvas route and builder files
  - passed
- targeted markdownlint for touched graph architecture docs, review, and
  closeout docs
  - passed
- `pnpm docs:workboard:generate`
  - passed
- `pnpm docs:sync`
  - passed
- `pnpm docs:status:generate`
  - passed
- `pnpm verify:prepush`
  - passed

## Phase 5. Outcome And Drift

Closed drift:

- controller-shaped modal-host props
- broad shell subbuilder input inheritance
- missing local component guide for route composition
- thinness-only route architecture checks with no semantic guard for the
  modal-host or shell-builder contracts

Residual drift outside this slice:

- `CanvasShell.tsx` is still above the local 200-line comfort target, although
  the remaining content is now decomposed behind explicit local seams
- `useCanvasAuthoringRuntime.ts` remains the heaviest remaining controller-side
  orchestration seam
- selection and Inspector semantics remain a separate follow-up under `TF-E2-D`
