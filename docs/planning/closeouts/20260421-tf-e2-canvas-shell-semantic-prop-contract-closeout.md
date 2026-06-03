---
slice: tf-e2-canvas-shell-semantic-prop-contract
date: 2026-04-21
lane: E
task_id: TF-E2, TF-E2-G
mode: Slim
status: Accepted
author: AI (Codex)
last_reviewed: 2026-04-21
---

# TF-E2 Canvas shell semantic prop contract closeout

## Phase 1. Think-First Analysis

### Problem summary

`CanvasShellProps` still exposes one large flat prop bag that mixes:

- shell layout flags
- side-panel state
- graph projection state
- toolbar route state
- view commands

The shell is already a dedicated component with its own owned concern, but its
API still looks like a controller dump rather than a semantic component
contract.

### Root cause

Earlier TF-E2 slices separated draft, graph lifecycle, handler contracts, and
route presentation first. `CanvasShell` remained a thin composition seam, but
its prop contract was never hard-cut to match those component boundaries.

That leaves an anemic contract where ownership is implicit and parameters
"dance around" at the call site.

### Constraints and invariants

- `AGENTS.md`
  no hidden debt, no compatibility shim, no fake completion
- `docs/guides/ai-work-protocol.md`
  think-first and pre-implementation brief must exist before implementation
- `docs/architecture/components/web/graph/canvas-component-map-and-modernization-review.md`
  `CanvasShell` owns three-panel workbench layout and local chrome, not
  persistence or aggregate truth
- `docs/architecture/components/web/graph/canvas-route-presentation-component.md`
  route-visible posture already belongs to a dedicated component and should
  arrive to the shell as an explicit contract, not as ad hoc loose fields
- `docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md`
  route and controller seams should converge toward component-owned APIs rather
  than broader local bags

### Options considered

- keep the flat prop bag and only split type aliases locally
- move `CanvasShell` state into a single opaque `viewModel` object
- group the contract into explicit concern-owned objects

### Selected option and rationale

Group the contract into explicit concern-owned objects.

This preserves explicitness while removing the anemic top-level field bag:

- `layout`
- `panels`
- `graph`
- `toolbar`
- command groups

It gives the shell a real local API instead of a disguised controller surface.

### Rejected alternatives

- local alias-only split:
  improves readability in the type file, but the call site remains a flat bag
- opaque `viewModel`:
  hides ownership instead of making it explicit

## Phase 2. Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - `docs/planning/state/agent-lane-e.yaml`
  - `docs/planning/closeouts/20260421-tf-e2-canvas-shell-semantic-prop-contract-closeout.md`
  - `apps/web/src/app/views/canvas/canvasShell.types.ts`
  - `apps/web/src/app/views/canvas/CanvasShell.tsx`
  - `apps/web/src/app/views/canvas/CanvasShell.test.tsx`
  - `apps/web/src/app/views/Canvas.tsx`
  - one structural test for the shell contract
- Expected outcome:
  - `CanvasShell` consumes grouped semantic contract objects
  - `Canvas.tsx` no longer sprays dozens of flat shell props
  - test overrides can target one concern without rebuilding the whole bag
- Risks and mitigations:
  - risk: breaking local shell consumers
    mitigation: refactor the single route consumer and the shell test harness in
    the same slice
  - risk: replacing one bag with one opaque object
    mitigation: use multiple concern-named groups instead of a single
    `viewModel`
- Out of scope:
  - changes to runtime behavior
  - route-presentation semantics
  - `CanvasViewport` API redesign
- Validation plan:
  - targeted structural and shell tests
  - targeted `@dvt/web` typecheck
  - targeted eslint for touched files
  - `pnpm docs:workboard:generate`
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - structural test proving the grouped contract exists
  - shell test ensuring explorer and import behavior remain intact after the API
    refactor
- Libraries evaluated:
  - none evaluated; this is a local component API hard cut

## Phase 3. Implementation Summary

- `canvasShell.types.ts` now exposes a grouped public component contract:
  `layout`, `panels`, `graph`, `toolbar`, `graphCommands`, and
  `chromeCommands`.
- `CanvasShell.tsx` now consumes the grouped contract explicitly instead of one
  flat controller-shaped prop bag.
- `Canvas.tsx` now composes one `shellProps: CanvasShellProps` object and
  passes it as the canonical route-to-shell handoff.
- `CanvasShell.test.tsx` now overrides shell concerns independently, so tests
  no longer rebuild one large flat prop object for every scenario.
- architecture fitness checks now prove both:
  - the shell type contract stays grouped by semantic concern
  - the route composes `CanvasShell` through grouped contract objects
- the graph architecture pack now includes `canvas-shell-component.md`, which
  documents the shell API, invariants, transitions, consumers, and topology.

## Phase 4. Validation Outcome

- `pnpm test -- src/app/views/Canvas.architecture.test.tsx src/app/views/canvas/canvasShell.types.architecture.test.ts src/app/views/canvas/CanvasShell.test.tsx`
  - passed
- `pnpm test -- src/app/views/Canvas.routeStates.test.tsx`
  - passed
- `pnpm --filter @dvt/web typecheck`
  - passed
- `pnpm exec eslint apps/web/src/app/views/Canvas.tsx apps/web/src/app/views/Canvas.architecture.test.tsx apps/web/src/app/views/canvas/canvasShell.types.ts apps/web/src/app/views/canvas/canvasShell.types.architecture.test.ts apps/web/src/app/views/canvas/CanvasShell.tsx apps/web/src/app/views/canvas/CanvasShell.test.tsx --max-warnings 0`
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

The shell API hard cut is complete for the active Canvas route path.

Closed drift:

- flat all-fields-at-top `CanvasShellProps`
- controller-shaped shell handoff in `Canvas.tsx`
- shell tests that had to rebuild unrelated top-level props for each scenario
- missing local component guidance for the shell contract

Residual drift outside this slice:

- `CanvasToolbar` still remains a wide presentational surface and may justify a
  later semantic split if command density grows again
- broader controller decomposition still belongs to the existing
  `useCanvasController` follow-up chain rather than to this shell-contract
  slice
