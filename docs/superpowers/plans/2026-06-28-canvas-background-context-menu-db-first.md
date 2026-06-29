# Canvas Background Context Menu DB-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the `CanvasBackgroundContextMenu` component contract so the canvas background menu is DB-first, Fowler-scoped, short, non-ambiguous, and backed by focused tests and user-visible evidence.

**Architecture:** The Planning DB is the source of truth for component family, files, tests, rails, context actions, capabilities, gaps, and drift. The web implementation separates the background context-menu view model, command surface, and template; `Add...` opens a categorized add-node catalog instead of directly listing or creating node kinds. Validation/run preview, project/code actions, node actions, edge actions, and selection actions remain outside the background menu.

**Tech Stack:** Planning DB migrations and query-store views, Node test runner for migration/query tests, Vitest/React Testing Library for web presentation tests, Cypress or browser verification for demanding-user evidence, React/TypeScript for Canvas UI.

---

## DoD

- [ ] `CanvasBackgroundContextMenu` exists in Planning DB with explicit family relations, owned files, tests, rails, context actions, capabilities, and gaps.
- [ ] DB can list the component family: host `CanvasContextMenu`, background root `CanvasBackgroundContextMenu`, sibling contexts `CanvasNodeContextMenu`, `CanvasEdgeContextMenu`, `CanvasSelectionContextMenu`, destination `CanvasAddNodeCatalog`, and external relation `CanvasSettings`.
- [ ] DB can list component files and tests without relying on JSON arrays.
- [ ] DB can list context actions and rails for the background context.
- [ ] Root menu valid actions are only `Add...` and `Canvas settings` for `canvas-background`.
- [ ] `Add source`, concrete node kinds, `Validate graph`, `Preview execution plan`, project/code actions, node actions, edge actions, and selection actions are not valid background root actions.
- [ ] `Add...` opens `CanvasAddNodeCatalog`; it does not directly invoke `CreateCanvasAuthoringNode`.
- [ ] `CanvasAddNodeCatalog` owns categorized/searchable node component selection; final creation goes through `CreateCanvasAuthoringNode` after item selection.
- [ ] Unit tests prove view-model sections and command dispatch for the background context.
- [ ] Integration tests prove right-click on the canvas background opens the short root menu and `Add...` opens the catalog.
- [ ] User evidence covers the demanding-user path: open canvas, right-click background, see only root actions, open `Add...`, search/browse categorized transformations.
- [ ] Drift, overengineering, repetitions, ambiguous rails, and stale tests are identified and either fixed, moved, retired, or recorded as explicit gaps.
- [ ] No superseded alpha ownership remains active; retired facts name their replacement when needed for traceability.

## Current Drift Inventory

| Area              | Current fact                                                                      | Problem                                       | Target                                                              |
| ----------------- | --------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------- |
| Background action | `Add source` is valid root action                                                 | Concrete source/import action in root menu    | Move to `CanvasAddNodeCatalog`                                      |
| Background action | `Add...` maps to `CreateCanvasAuthoringNode`                                      | Root menu bypasses catalog                    | Map to `OpenCanvasAddNodeCatalog` or equivalent                     |
| Background action | `Validate graph` is valid root action                                             | Ambiguous when multiple branches exist        | Move out; future explicit `Validate entire canvas` only if approved |
| Background action | `Preview execution plan` remains in action query as `moved-to-run-preview`        | Fine as retired/history, must not render      | Filter render to valid actions only                                 |
| Rail owner        | `ResolveCanvasContextMenu` canonical owner appears as `CanvasNodeContextMenuView` | Background action depends on node-named owner | Reconcile owner or split background resolver                        |
| Tests             | `canvasContextMenuViewModel.test.ts` expects concrete add items and preview       | Test locks old semantics                      | Replace with specific background root and catalog tests             |
| UI                | menu root lists all create node actions                                           | Flat expanding menu                           | Root opens catalog                                                  |
| Query ergonomics  | CLI lacks a single family/files/tests/rails command                               | Hard to audit component                       | Add or plan query rail if needed                                    |

## Component Boundaries

### `CanvasContextMenu` host

Owns:

- `apps/web/src/app/views/canvas/CanvasContextMenuLayer.tsx`
- `apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx`
- `apps/web/src/app/views/canvas/CanvasContextMenuView.tsx`
- `apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx`

Rail:

- `RenderCanvasContextMenu`

### `CanvasBackgroundContextMenu`

Owns:

- `apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts`
- `apps/web/src/app/views/canvas/canvasContextMenuViewModel.test.ts`
- `apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts`
- `apps/web/src/app/views/canvas/canvasInteractionCommandSurface.test.ts`
- `apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts`

Rails:

- `ResolveCanvasBackgroundContextMenu` or equivalent approved existing query
- `OpenCanvasAddNodeCatalog`
- `OpenCanvasSettings` or equivalent approved existing command/query

### `CanvasAddNodeCatalog`

Owns add-node search, categories, and choosing a node component. It does not own graph mutation persistence. The selected catalog item invokes `CreateCanvasAuthoringNode`.

## Task 1: DB-First Component Contract

**Files:**

- Modify: `tools/planning-db/migrations/354_canvas_background_context_menu_contract.sql`
- Modify: `scripts/planning-db-migrate.test.cjs`

- [ ] **Step 1: Write failing migration tests**

Add tests proving:

- background valid actions are exactly `Add...` and `Canvas settings`;
- `Add source`, `Validate graph`, and `Preview execution plan` are not valid background actions;
- `OpenCanvasAddNodeCatalog` is registered or an existing equivalent is explicitly linked;
- component family and file/test relations are queryable.

- [ ] **Step 2: Run the migration tests red**

Run: `node --test --test-name-pattern "Canvas background context menu" scripts/planning-db-migrate.test.cjs`

Expected: fail because migration 354 does not exist yet and old actions remain valid.

- [ ] **Step 3: Add migration 354**

Create DB facts that:

- retire/move invalid root actions;
- add `OpenCanvasAddNodeCatalog`;
- connect `CanvasAddNodeCatalog` as destination component;
- connect `CanvasSettings` as external destination;
- record drift/gaps relationally.

- [ ] **Step 4: Run migration tests green**

Run: `node --test --test-name-pattern "Canvas background context menu" scripts/planning-db-migrate.test.cjs`

Expected: pass.

## Task 2: View Model And Command Surface

**Files:**

- Modify: `apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts`
- Modify: `apps/web/src/app/views/canvas/canvasInteractionCommandSurface.test.ts`
- Modify: `apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts`
- Modify: `apps/web/src/app/views/canvas/canvasContextMenuViewModel.test.ts`

- [ ] **Step 1: Write failing unit tests**

Expected behavior:

- pane/background model exposes one add-catalog action and one settings action;
- no concrete create-node actions are rendered at root;
- no source import, validate graph, or preview action is rendered at root;
- edge context remains edge-only.

- [ ] **Step 2: Run unit tests red**

Run: `pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/canvasContextMenuViewModel.test.ts src/app/views/canvas/canvasInteractionCommandSurface.test.ts`

Expected: fail against old flat action behavior.

- [ ] **Step 3: Implement minimal model changes**

Add a background canvas action for `open-add-node-catalog`. Keep graph mutation behind catalog selection.

- [ ] **Step 4: Run unit tests green**

Run the same command.

Expected: pass.

## Task 3: Integration And User Evidence

**Files:**

- Modify: `apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx`
- Modify: existing Cypress/browser evidence only if DB ownership identifies it as part of this component.

- [ ] **Step 1: Write failing integration test**

Test right-click on background:

- root menu shows `Add...` and `Canvas settings`;
- root menu does not show concrete node types or preview;
- selecting `Add...` opens the add-node catalog.

- [ ] **Step 2: Run red**

Run targeted web presentation test.

- [ ] **Step 3: Implement minimal UI bridge**

Wire `open-add-node-catalog` through the command surface to the existing add-node palette/catalog or create the smallest owned catalog shell if DB says it is missing and approved by the migration.

- [ ] **Step 4: Run green and perform browser evidence**

Run targeted tests and open the app to verify the demanding-user path manually/browser-driven.

## Task 4: Cleanup And Closeout

**Files:**

- Only files identified by DB ownership in Tasks 1-3.

- [ ] Retire or update tests that encode old flat menu semantics.
- [ ] Run Planning DB migrate/integrity.
- [ ] Run affected web tests.
- [ ] Run docs sync/status generation if file structure requires it.
- [ ] Run `pnpm verify:prepush`.
- [ ] Commit with `pnpm commit`.
- [ ] Open PR and resolve comments before integration.

## Out Of Scope

- Delete canvas lifecycle.
- Node workbench redesign.
- Edge context menu dedicated source-file extraction.
- Selection context menu implementation.
- Full source import backend.
- Run/Preview redesign.
