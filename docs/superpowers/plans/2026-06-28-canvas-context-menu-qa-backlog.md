# Canvas Context Menu QA Backlog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Canvas context-menu family into a DB-first, Fowler-scoped, testable component system with clear ownership, context invariants, executable evidence, and no ad hoc UI logic.

**Architecture:** Planning DB is the source of truth for component identity, files, tests, rails, capabilities, context actions, evidence, and gaps. Runtime code separates presentation templates, presenter/lifecycle logic, context policy, command/query rails, and catalog selection. The root canvas background menu stays small; expandable node-type discovery moves into `CanvasAddNodeCatalog`.

**Tech Stack:** Planning DB SQL migrations, Node migration tests, React/TypeScript, Vitest/React Testing Library, Cypress/browser evidence, command/query rail governance.

---

## Definition Of Done

- [ ] Planning DB can answer whether `CanvasContextMenuPresenter`, `CanvasBackgroundContextMenu`, `CanvasAddNodeCatalog`, `CanvasContextMenuView`, `CanvasSettings`, and edge/selection context concepts exist.
- [ ] Planning DB stores all component files, tests, rails, capability gaps, and evidence as relations or queryable rows, not only JSON arrays.
- [ ] Every source file in the component family has exactly one owning component unless explicitly declared as shared infrastructure.
- [ ] Every context action belongs to exactly one context: `canvas-background`, `node`, `edge`, `selection`, `add-node-catalog`, or `settings`.
- [ ] Root background menu is not a node-type catalog.
- [ ] Root background menu valid actions are limited to spatial canvas actions approved in DB.
- [ ] `Add...` opens `CanvasAddNodeCatalog`; concrete node creation happens only after selecting a catalog item.
- [ ] `CanvasAddNodeCatalog` has searchable, categorized entries with descriptions and i18n keys.
- [ ] No duplicate semantic actions appear in the UI, including repeated `Add output`.
- [ ] `Validate graph` is not exposed as an ambiguous canvas-background action unless it has an explicit scope such as whole-canvas validation.
- [ ] `Delete canvas` and `Templates` are not exposed until their capabilities and rails exist.
- [ ] Tests prove semantics, not just labels.
- [ ] Browser/user evidence proves the demanding-user flow: right-click background, root menu is short, `Add...` opens searchable catalog, catalog item has description, selecting item creates at the clicked canvas position.
- [ ] No hidden stubs, placeholders, TODOs, relaxed rules, or fake success paths are introduced.

## Mathematical Invariants

Use these as hard acceptance criteria in DB tests and unit tests.

```text
Context partition:
A_canvas_background ∩ A_node ∩ A_edge ∩ A_selection ∩ A_add_catalog = ∅

Action rail uniqueness:
∀ action ∈ A_visible, ∃! rail such that rail.implements(action)

File ownership:
∀ file ∈ F_component_family, owner_count(file) = 1 unless file_role = shared-primitive

No phantom UI:
∀ visible_action, exists DB action row and exists enabled predicate

No orphan rail:
∀ rail linked to component, evidence_count(rail) >= 1

Catalog monotonicity:
RootMenu(T ∪ {new_node_type}) = RootMenu(T)
AddCatalog(T ∪ {new_node_type}) = AddCatalog(T) ∪ {new_node_type}

Filter subset:
∀ query, Filter(Catalog, query) ⊆ Catalog

Filter idempotence:
Filter(Filter(Catalog, query), query) = Filter(Catalog, query)

i18n totality:
∀ visible_text, exists copy_key and supported_locale(copy_key)
```

## Current Problems

| Priority | Problem                                                           | Why It Matters                                             | Preferred Fix                                                               | Cost         |
| -------- | ----------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------- | ------------ |
| P0       | `CanvasAddNodeCatalog` is conceptual but not a complete component | The root menu still carries catalog behavior               | Give it DB ownership, files, tests, rails, and UI behavior                  | 1.5-2.5 days |
| P0       | Context actions are not fully normalized by context               | Canvas, edge, catalog, and settings semantics can drift    | Add relational action-context mapping and tests                             | 0.5-1 day    |
| P0       | Tests still risk checking labels instead of semantics             | Fragile tests can pass with wrong UX                       | Replace/reshape tests around invariants and command/query outcomes          | 0.5-1 day    |
| P0       | `Add...` and catalog labels create duplicate-add perception       | User sees two add levels without clear meaning             | Rename sections via i18n and describe action vs catalog                     | 0.25 day     |
| P0       | Catalog is flat and lacks filter/descriptions                     | It will not scale like NiFi/pro tooling                    | Add search, categories, descriptions, and keyboard navigation baseline      | 1-2 days     |
| P0       | UI copy is hardcoded in English                                   | i18n posture is broken                                     | Move menu/catalog copy to locale catalogs                                   | 0.5 day      |
| P1       | `Validate graph` from background is ambiguous                     | Multiple branches make the scope unclear                   | Remove from background or reintroduce as `Validate entire canvas` with rail | 0.25-0.5 day |
| P1       | `CanvasSettings` has concept but weak ownership                   | Settings action opens a surface without clean DB ownership | Assign files/tests or mark explicit external component relation             | 0.5 day      |
| P1       | `CanvasEdgeContextMenu` ownership is unclear                      | Context exists but may not own code                        | Declare context-only relation or extract focused files                      | 0.5-1 day    |
| P1       | `Delete canvas` has no rail/capability                            | Deletion is high-risk and cannot be ad hoc                 | Create separate capability/rail before UI exposure                          | 1-2 days     |
| P2       | Semi-automation is missing                                        | Drift will return manually                                 | Generate/query component family, action matrix, and evidence matrix         | 2-4 days     |

## Executable Backlog

### Task 1: Freeze DB-First Component Family Contract

**Files:**

- Modify: `tools/planning-db/migrations/356_canvas_context_menu_presentation_test_ownership.sql`
- Modify: `tools/planning-db/migrations/361_canvas_context_menu_presenter_report_surface.sql`
- Modify: `scripts/planning-db-migrate.test.cjs`

- [ ] Add migration tests proving each component-family member is queryable by `component_id`.
- [ ] Add migration tests proving files and tests are relation rows for `CanvasContextMenuPresenter`.
- [ ] Add migration tests proving `CanvasAddNodeCatalog` is either a complete component or an explicit P0 gap.
- [ ] Add migration tests proving `CanvasSettings` is either a complete component or an explicit P1 gap.
- [ ] Run:

```bash
node --test --test-name-pattern "Canvas context menu" scripts/planning-db-migrate.test.cjs
```

- [ ] Expected red condition before fix: missing relational rows or incomplete component state.
- [ ] Update migrations with the smallest DB facts needed.
- [ ] Run the same command again and require pass.

### Task 2: Normalize Context Actions As Sets

**Files:**

- Modify: `tools/planning-db/migrations/354_canvas_background_context_menu_contract.sql`
- Modify: `scripts/planning-db-migrate.test.cjs`
- Modify only if needed: `apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts`
- Modify only if needed: `apps/web/src/app/views/canvas/canvasInteractionCommandSurface.test.ts`

- [ ] Add DB rows for context-action membership:
  - `canvas-background`
  - `add-node-catalog`
  - `edge`
  - `node`
  - `selection`
  - `settings`
- [ ] Add tests that reject overlapping actions between background, node, edge, and catalog.
- [ ] Prove `Add source`, `Add model`, `Add transformation`, `Add test`, `Add output`, and `Add macro` are catalog actions, not background root actions.
- [ ] Prove `Canvas settings` is a background action that targets `CanvasSettings`.
- [ ] Prove `Validate graph` is not a background action unless explicitly represented as whole-canvas scope.
- [ ] Run:

```bash
node --test --test-name-pattern "Canvas background context menu" scripts/planning-db-migrate.test.cjs
pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/canvasInteractionCommandSurface.test.ts
```

### Task 3: Extract `CanvasAddNodeCatalog` As A Real Component

**Files:**

- Create or promote: `apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts`
- Create or promote: `apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.test.ts`
- Create or promote: `apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx`
- Create or promote: `apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx`
- Modify: `apps/web/src/app/views/canvas/CanvasContextMenuView.tsx`
- Modify: `apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts`
- Modify: `apps/web/src/app/views/canvas/canvasContextMenuViewModel.test.ts`
- Modify: Planning DB migration for component file/test ownership.

- [ ] Write model tests for categories:
  - source
  - model
  - seed
  - transformation
  - test
  - output
  - macro
- [ ] Write model tests for search subset and idempotence.
- [ ] Write model tests proving duplicate semantic IDs are rejected.
- [ ] Write view tests proving each item renders label, category, and description.
- [ ] Write integration test proving root `Add...` opens the catalog.
- [ ] Implement the model as pure data transformation.
- [ ] Implement view as presentation-only component.
- [ ] Wire final item selection to existing `CreateCanvasAuthoringNode` rail.
- [ ] Run:

```bash
pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/canvasAddNodeCatalogModel.test.ts src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx src/app/views/canvas/canvasContextMenuViewModel.test.ts
```

### Task 4: Move Menu And Catalog Copy To i18n

**Files:**

- Inspect existing locale/copy catalog files before editing.
- Modify the existing canvas copy catalog files identified by `rg "Canvas settings|Add source|Add\\.\\.\\." apps/web/src/app`.
- Modify menu/catalog model tests to assert copy keys, not hardcoded strings.

- [ ] Find existing canvas i18n conventions.
- [ ] Add copy keys for:
  - root add action
  - canvas settings
  - catalog categories
  - item descriptions
  - empty search state
- [ ] Replace hardcoded UI text in model/view with copy keys or translated labels from existing copy infrastructure.
- [ ] Ensure Spanish and English surfaces stay consistent if the app currently owns both.
- [ ] Run affected presentation tests.

### Task 5: Rebuild Tests Around Semantics, Not Fragile Labels

**Files:**

- Modify: `apps/web/src/app/views/canvas/canvasContextMenuViewModel.test.ts`
- Modify: `apps/web/src/app/views/canvas/canvasInteractionCommandSurface.test.ts`
- Modify: `apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx`
- Modify: `apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx`
- Retire only if duplicated: tests that assert the old flat menu semantics.

- [ ] Replace assertions such as "contains Add source at root" with semantic assertions:
  - action ID belongs to context
  - action targets expected component
  - action maps to expected rail
  - item renders through catalog after opening `Add...`
- [ ] Keep user-visible smoke assertions only where they prove real UI behavior.
- [ ] Remove or rewrite tests that lock old flat root menu behavior.
- [ ] Run:

```bash
pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/canvasContextMenuViewModel.test.ts src/app/views/canvas/canvasInteractionCommandSurface.test.ts src/app/views/canvas/CanvasContextMenuView.test.tsx src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx
```

### Task 6: Decide And Encode Ambiguous Actions

**Files:**

- Modify Planning DB migration for action-state/gap rows.
- Modify no UI files unless the DB decision approves runtime behavior.

- [ ] Encode `Validate graph` as one of:
  - removed from background;
  - whole-canvas validation with explicit rail;
  - branch validation requiring node/selection context.
- [ ] Encode `Delete canvas` as one of:
  - not in scope with P1 gap;
  - new capability/rail planned;
  - existing rail if discovered.
- [ ] Encode `Templates` as one of:
  - not in scope with P2 gap;
  - existing route capability;
  - new catalog section after DB approval.
- [ ] Run migration tests proving non-approved actions cannot render.

### Task 7: Browser Evidence For Demanding User

**Files:**

- Prefer existing Cypress support if already owned by this component.
- Add browser evidence only after the component and tests are green.

- [ ] Start app with existing dev command used by the repo.
- [ ] Open `/canvas`.
- [ ] Right-click canvas background.
- [ ] Verify root menu is short.
- [ ] Click `Add...`.
- [ ] Verify searchable/categorized catalog opens.
- [ ] Search for transformation.
- [ ] Verify item description is visible.
- [ ] Select item.
- [ ] Verify node appears at the clicked canvas position.
- [ ] Capture result if manual/report evidence is required.

### Task 8: DB Queries For Final Review

Run these queries and include their output summary in closeout.

```sql
select *
from planning_query_store.frontend_component_summary_query
where component_id in (
  'web.component.canvas.CanvasContextMenuPresenter',
  'web.component.canvas.CanvasBackgroundContextMenu',
  'web.component.canvas.CanvasAddNodeCatalog',
  'web.component.canvas.CanvasContextMenu',
  'web.component.canvas.CanvasSettings',
  'web.component.canvas.CanvasEdgeContextMenu'
)
order by component_id;
```

```sql
select component_id, file_role, file_path, exported_symbol
from planning_query_store.frontend_component_file_query
where component_id like 'web.component.canvas.Canvas%ContextMenu%'
   or component_id = 'web.component.canvas.CanvasAddNodeCatalog'
   or component_id = 'web.component.canvas.CanvasSettings'
order by component_id, file_role, file_path;
```

```sql
select component_id, rail_kind, rail_name, rail_status
from planning_query_store.frontend_component_rail_query
where component_id like 'web.component.canvas.Canvas%ContextMenu%'
   or component_id = 'web.component.canvas.CanvasAddNodeCatalog'
   or component_id = 'web.component.canvas.CanvasSettings'
order by component_id, rail_kind, rail_name;
```

```sql
select rail_name, rail_type, ddd_owner, rail_status, implementation_refs
from planning_query_store.command_query_rail_query
where rail_name in (
  'ResolveCanvasContextMenu',
  'ResolveCanvasBackgroundContextMenu',
  'ResolveCanvasAddNodeCatalog',
  'RenderCanvasContextMenu',
  'CreateCanvasAuthoringNode',
  'OpenCanvasSettings',
  'RemoveCanvasEdgeFromContext'
)
order by rail_name;
```

### Task 9: Final Validation

- [ ] Run Planning DB migration tests:

```bash
node --test --test-name-pattern "Canvas context menu|Canvas background context menu" scripts/planning-db-migrate.test.cjs
```

- [ ] Run affected web presentation tests.
- [ ] Run feature mechanization:

```bash
pnpm docs:feature-mechanization:implementation
```

- [ ] Run docs sync if docs were added/renamed:

```bash
pnpm docs:sync
```

- [ ] Run generated source status if source files were added/removed:

```bash
pnpm docs:status:generate
```

- [ ] Run final gate:

```bash
pnpm verify:prepush
```

## Cost Summary

| Slice                                        | Cost                                              | Risk   | Recommendation       |
| -------------------------------------------- | ------------------------------------------------- | ------ | -------------------- |
| DB contract and context action normalization | 1-2 days                                          | Medium | Do first             |
| `CanvasAddNodeCatalog` extraction            | 1.5-2.5 days                                      | Medium | Do second            |
| i18n copy cleanup                            | 0.5-1 day                                         | Low    | Do with catalog      |
| Semantic test cleanup                        | 0.5-1 day                                         | Medium | Do continuously      |
| Ambiguous action decisions                   | 0.5 day if no new rails; 1-2 days if rails needed | Medium | Gate before UI       |
| Browser evidence                             | 0.5 day                                           | Low    | Do after green tests |
| Semi-automation queries/checks               | 2-4 days                                          | Medium | Separate follow-up   |

## Recommended Execution Order

1. Task 1
2. Task 2
3. Task 6 for action decisions
4. Task 3
5. Task 4
6. Task 5
7. Task 7
8. Task 8
9. Task 9

## Explicit Non-Goals For This Backlog

- Do not implement delete-canvas UI without rail/capability approval.
- Do not implement template insertion without rail/capability approval.
- Do not redesign the full Canvas shell.
- Do not move node properties, source import backend, or run preview into this component.
- Do not create parallel command/query rails for existing product intent.
- Do not preserve alpha behavior as legacy; alpha behavior is either current, superseded, or removed.
