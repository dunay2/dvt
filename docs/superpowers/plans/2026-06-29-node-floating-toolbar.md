# Node Floating Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a DB-first, tested `NodeFloatingToolbar` that appears on left-clicked Canvas nodes with `Codigo`, `Congelar`, green play, and overflow affordances.

**Architecture:** `NodeFloatingToolbar` is a presentation/query component, not a node mutation owner. It derives a small view model from the clicked node, delegates existing node actions through callbacks, and stays related to `GraphNodeCard` and `CanvasNodeContextMenu` instead of duplicating their responsibilities. The visible toolbar is rendered by a template component while viewport state owns opening, positioning, and dismissal.

**Tech Stack:** React, TypeScript, Vitest/jsdom, React Flow test harness, Planning DB migration SQL.

---

## Definition Of Done

- `web.component.canvas.NodeFloatingToolbar` exists in Planning DB with owned files, contexts, rail, relations, validation evidence, and no ad hoc Markdown as source of truth.
- Left-clicking a graph node renders one floating toolbar near the node/click position.
- The toolbar shows `Codigo`, `Congelar`, a green play button, and `...`.
- Right-click node behavior remains owned by `CanvasNodeContextMenu`; the floating toolbar does not replace or duplicate that context menu.
- Play uses existing execution-selection semantics and never starts a run through an uncataloged command.
- The toolbar closes on pane click, node drag, edge context menu, and background context menu.
- Unit and presentation tests prove the model and view; viewport integration test proves user-visible behavior.
- New styling is encapsulated in the toolbar component/template and does not add broad ad hoc page chrome.

## Component And Rail Boundaries

- Component: `web.component.canvas.NodeFloatingToolbar`
- Related components:
  - `web.component.canvas.GraphNodeCard` because left-click originates from node card interaction and shares the local play affordance.
  - `web.component.canvas.CanvasNodeContextMenu` because right-click node commands stay in that component.
  - `web.component.canvas.CanvasViewport` because it hosts spatial overlay state.
- Query rail: `RenderCanvasNodeFloatingToolbar`
- Existing command reused: `ToggleCanvasExecutionSelection` through node data callback.
- No new run command is introduced.

## Files

- Create: `apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts`
- Create: `apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts`
- Create: `apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.tsx`
- Create: `apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx`
- Modify: `apps/web/src/app/views/canvas/CanvasViewport.tsx`
- Modify: `apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx`
- Modify/Test: `apps/web/src/app/views/canvas/CanvasViewport.test.tsx`
- Create: `tools/planning-db/migrations/371_canvas_node_floating_toolbar.sql`

## Task 1: Model

- [ ] Write a failing unit test proving the model emits exactly `code`, `freeze`, `play`, and `more`.
- [ ] Run the test and confirm it fails because the model does not exist.
- [ ] Implement the model with explicit action IDs, labels, descriptions, availability, and green play tone.
- [ ] Re-run the model test and confirm it passes.

## Task 2: View

- [ ] Write a failing presentation test proving the toolbar renders the four actions with semantic labels and a green play button.
- [ ] Run the test and confirm it fails because the view does not exist.
- [ ] Implement the passive toolbar view with no business branching beyond action availability.
- [ ] Re-run the view test and confirm it passes.

## Task 3: Viewport Integration

- [ ] Write a failing viewport test proving left-click on a node opens the toolbar and pane click closes it.
- [ ] Write a failing viewport test proving right-click/background context menu closes the toolbar instead of mixing surfaces.
- [ ] Run both tests and confirm they fail because the viewport does not host the toolbar.
- [ ] Implement viewport-owned toolbar state and overlay positioning.
- [ ] Re-run viewport tests and confirm they pass.

## Task 4: DB-First Registration

- [ ] Add migration `371_canvas_node_floating_toolbar.sql`.
- [ ] Register the component, files, `RenderCanvasNodeFloatingToolbar`, relations, context actions, and validation evidence.
- [ ] Run Planning DB migration validation.
- [ ] Query component/file/rail/evidence rows for `web.component.canvas.NodeFloatingToolbar`.

## Task 5: Validation And Integration

- [ ] Run focused web tests for the new model, view, and viewport behavior.
- [ ] Run `pnpm --filter @dvt/web typecheck`.
- [ ] Run `pnpm --filter @dvt/web lint`.
- [ ] Run generated docs commands required by new source/doc files.
- [ ] Run `pnpm docs:feature-mechanization:implementation`.
- [ ] Run `pnpm verify:prepush`.
- [ ] Commit with `pnpm commit feat web "Add Canvas node floating toolbar"`.
