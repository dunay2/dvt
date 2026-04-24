---
title: TF-E2-K-B host tab restoration closeout
status: Done
owner: web
last_reviewed: 2026-04-23
planning_type: closeout
---

# TF-E2-K-B host tab restoration closeout

## Think-First Analysis

- Problem summary:
  `TF-E2-K-A` created a truthful host posture for `needs_canvas`, but the shell
  still dropped back into a route that visually behaved like one unnamed canvas
  was the whole surface. That left the playground model under-expressed.
- Root cause:
  The route had persisted `canvas.kind` and `canvas.title`, but no semantic
  host tab state. The shell therefore had no local boundary that said "this is
  the authoritative workspace-draft canvas tab" and no stable place to render
  that truth.
- Constraints and invariants:
  - one persisted workspace draft record remains authoritative
  - no fake multi-canvas persistence or browser-only tab registry
  - host tab state must derive from canonical draft identity, not local shell
    memory
  - plugin-owned canvas kinds may label the host tab, but they must not own
    host navigation
- Options considered:
  1. Add a local array of tabs in the shell and let it drift from draft truth.
     Rejected: dishonest multi-canvas implication.
  2. Keep the host model implicit until backend multi-canvas exists.
     Rejected: leaves the product model under-specified and brittle.
  3. Derive one authoritative host tab from the persisted draft identity and
     render it through a dedicated host tab seam.
     Selected: honest today and extensible later.
- Selected option and rationale:
  Introduce `CanvasPlaygroundTabState` as a semantic seam over
  `WorkspaceGraphAuthoringDraft.canvas`, render it through
  `CanvasPlaygroundTabStrip`, and keep the shell explicit about one active
  authoritative tab only.

## Pre-Implementation Brief

- Mode: `Full`
- Scope:
  `apps/web/src/app/views/canvas/**`,
  `docs/architecture/components/web/graph/**`,
  `docs/planning/state/agent-lane-e.yaml`,
  `docs/planning/closeouts/**`,
  `docs/planning/status/generated-code-state.md`,
  and `docs/.manifest.json`
- Expected outcome:
  the Canvas shell exposes an explicit host tab strip derived from the
  authoritative draft-backed canvas identity, and route/browser tests prove it
  without implying wider persistence truth
- Risks and mitigations:
  - Risk: the shell contract widens into another generic prop bag
    Mitigation: add a dedicated semantic state module and fitness function
  - Risk: tab rendering gets mixed into controller or center-surface logic
    Mitigation: keep derivation in route state and rendering in a host tab
    component
  - Risk: docs keep saying tabs are future-only
    Mitigation: update the local host component guide in the same slice
- Out-of-scope items:
  multiple persisted canvases, tab switching across more than one draft-backed
  canvas, and selected-closure browser proof
- Validation plan:
  `pnpm --filter @dvt/web typecheck`,
  `pnpm --filter @dvt/web test -- src/app/views/canvas/canvasPlaygroundTabState.test.ts src/app/views/canvas/canvasPlaygroundTabState.architecture.test.ts src/app/views/canvas/CanvasShell.architecture.test.tsx src/app/views/canvas/CanvasShell.test.tsx src/app/views/Canvas.routeStates.test.tsx`,
  `pnpm --filter @dvt/web test`,
  `pnpm docs:status:generate`,
  `pnpm docs:sync`,
  `pnpm docs:workboard:generate`,
  `pnpm docs:gov:manifest`,
  `pnpm verify:prepush`

## Real Work Performed

- Added a semantic host-tab derivation seam:
  - `apps/web/src/app/views/canvas/canvasPlaygroundTabState.ts`
  - `apps/web/src/app/views/canvas/canvasPlaygroundTabState.test.ts`
  - `apps/web/src/app/views/canvas/canvasPlaygroundTabState.architecture.test.ts`
- Added a host-owned tab-strip renderer:
  - `apps/web/src/app/views/canvas/CanvasPlaygroundTabStrip.tsx`
- Routed tab state through the canonical route and shell contracts:
  - `apps/web/src/app/views/canvas/canvasRouteInteractionState.ts`
  - `apps/web/src/app/views/canvas/canvasRouteViewState.ts`
  - `apps/web/src/app/views/canvas/canvasShellBuilder.types.ts`
  - `apps/web/src/app/views/canvas/canvasShell.types.ts`
  - `apps/web/src/app/views/canvas/canvasShellPropsBuilder.tsx`
  - `apps/web/src/app/views/canvas/canvasShellLayoutBuilder.tsx`
  - `apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx`
- Extended route and shell tests so host tabs stay governed:
  - `apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx`
  - `apps/web/src/app/views/canvas/CanvasShell.test.tsx`
  - `apps/web/src/app/views/Canvas.routeStates.test.tsx`
- Updated the host component documentation and planning surfaces:
  - `docs/architecture/components/web/graph/canvas-playground-host-component.md`
  - `docs/planning/state/agent-lane-e.yaml`
  - `docs/planning/closeouts/index.md`

## Governing Sources Used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/guides/testing-and-ci-capabilities.md`
- `docs/planning/state/agent-lane-e.yaml`
- `docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-project-playground-and-multi-canvas-host-plan-20260423.md`
- `docs/architecture/reference-architecture.md`
- `docs/architecture/components/web/graph/canvas-playground-host-component.md`

## Validation Evidence

- Passed:
  `pnpm --filter @dvt/web typecheck`
- Passed:
  `pnpm --filter @dvt/web test -- src/app/views/canvas/canvasPlaygroundTabState.test.ts src/app/views/canvas/canvasPlaygroundTabState.architecture.test.ts src/app/views/canvas/CanvasShell.architecture.test.tsx src/app/views/canvas/CanvasShell.test.tsx src/app/views/Canvas.routeStates.test.tsx`
- Passed:
  `pnpm --filter @dvt/web test`
- Passed:
  `pnpm docs:status:generate`
- Passed:
  `pnpm docs:sync`
- Passed:
  `pnpm docs:workboard:generate`
- Passed:
  `pnpm docs:gov:manifest`
- Passed:
  `pnpm verify:prepush`

## No-Debt Evidence

- No fake multi-canvas persistence was introduced.
- No local-only tab memory was added.
- No hooks, checks, or runtime rules were relaxed.

## No-Stub Evidence

- `CanvasPlaygroundTabState` is a real semantic seam derived from the
  authoritative workspace draft, not a placeholder transport type.
- `CanvasPlaygroundTabStrip` is a real shell surface wired through the route
  composition path.
