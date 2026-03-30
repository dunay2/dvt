---
title: Canvas UX Refactor Execution Plan
status: Proposed
owner: web-ui
last_reviewed: 2026-03-29
planning_type: proposal
---

# Canvas UX Refactor Execution Plan

## 1. Scope and Intent

Implement these four refactors as production-ready slices:

1. `refactor(web): Replace duplicate right panel with node detail panel`
2. `refactor(web): Normalize global context bar and naming consistency`
3. `refactor(web): Consolidate graph action toolbar and remove menu leakage`
4. `refactor(web): Add semantic node badges and metric labels`

The objective is to restore graph-first UX, remove duplicated information, and make node semantics readable without guessing.

## 2. Boundaries

### In scope

- Canvas shell layout and panel composition.
- Top context bar naming/hierarchy.
- Graph action toolbar ownership and grouping.
- Node visual semantics (type/state badges + metric labels).

### Out of scope

- Backend API contracts.
- Plugin lifecycle v2.
- New routes or navigation model redesign.
- New domain capabilities (lineage algorithm, run orchestration logic).

## 3. Architecture Constraints

- Keep `CanvasShell` as orchestration layer only; avoid business logic inside render tree.
- Keep `useCanvasController` as selection source-of-truth.
- Preserve existing plugin registry integration (`getInspectorPanels`, overlays, renderers).
- No temporary placeholders, no hidden TODO debt.

## 4. Problem Decomposition

### P1: Right panel duplicates or degrades into non-actionable content

- Users need selected-node detail, not another node list.
- Empty/unsupported states must be explicit.

### P2: Global context and graph actions are mixed

- `File/Edit` style leakage in graph workspace adds noise.
- `Add data` ownership is ambiguous between explorer and toolbar.

### P3: Global context bar has naming/hierarchy drift

- Product naming inconsistency (`DVT+` variants).
- Runtime context elements are not clearly grouped.

### P4: Node semantics are not self-explanatory

- Metrics lack labels/units.
- Type/state cues require reading text line by line.

## 5. Delivery Strategy (Micro-commits)

Work in strict order to minimize churn:

1. S1 right panel foundation.
2. S3 global context normalization.
3. S2 toolbar/context split (depends on S3 naming baseline).
4. S4 semantic badges/labels (depends on S1 detail surface).

Each slice must be shippable independently.

## 6. Work Breakdown by Slice

### S1 - Replace duplicate right panel with node detail panel

Commit:
`refactor(web): Replace duplicate right panel with node detail panel`

Files:

- `apps/web/src/app/components/InspectorPanel.tsx`
- `apps/web/src/app/views/canvas/CanvasShell.tsx`
- `apps/web/src/app/views/canvas/useCanvasController.ts`
- `apps/web/src/app/components/DbtExplorer.tsx`

Tasks:

1. Ensure right panel always renders one of three deterministic states:
   - no selection
   - selected node with core detail
   - selected node with core detail + plugin tabs
2. Keep selection identity from canvas controller only (`inspectorNodeId`).
3. Remove any residual duplicate-list composition from right panel.
4. Make explorer strictly discovery/drag surface (not detail renderer).

Acceptance criteria:

- Clicking a node updates right panel content in one render path.
- No full node list appears in the right panel.
- Empty state text is explicit and stable.
- Refresh does not corrupt selection logic (selection may reset, panel state must remain valid).

Test coverage target:

- `InspectorPanel` rendering branches.
- Selection-to-detail wiring in canvas shell/controller tests.

### S3 - Normalize global context bar and naming consistency

Commit:
`refactor(web): Normalize global context bar naming consistency`

Files:

- `apps/web/src/app/components/TopAppBar.tsx`
- `apps/web/src/app/Root.tsx` (only if spacing/wrapping contract requires)

Tasks:

1. Enforce context hierarchy order:
   - product
   - organization
   - project/workspace
   - environment
   - git/runtime context
2. Normalize product label to `DVT+` everywhere in web shell.
3. Replace ambiguous labels/tokens with explicit text.
4. Keep truncation and responsive behavior deterministic.

Acceptance criteria:

- Single product naming convention across routes.
- Hierarchy order is consistent on every view that uses top bar.
- No placeholder tokens shown in production UI.

Test coverage target:

- Top bar snapshot/render tests for naming and ordering.

### S2 - Consolidate graph action toolbar and remove menu leakage

Commit:
`refactor(web): Consolidate graph action toolbar by context`

Files:

- `apps/web/src/app/views/canvas/CanvasToolbar.tsx`
- `apps/web/src/app/views/canvas/CanvasShell.tsx`
- `apps/web/src/app/components/DbtExplorer.tsx`

Tasks:

1. Keep toolbar graph-context only (layout, overlays, columns, cost, run/plan).
2. Remove pseudo-global menu constructs from graph toolbar.
3. Ensure one clear owner for `Add data` entry point.
4. Normalize spacing/alignment for left rail icons and toolbar icons.

Acceptance criteria:

- Toolbar actions are graph-specific and non-duplicated.
- `Add data` exists in one primary location and behaves consistently.
- Visual spacing is balanced (no crowded rail, no oversized empty gap).

Test coverage target:

- Toolbar interaction tests for action visibility and click handling.

### S4 - Add semantic node badges and metric labels

Commit:
`refactor(web): Add semantic node badges and metric labels`

Files:

- `apps/web/src/app/plugins/dbt/DbtNodeRenderer.tsx`
- `apps/web/src/app/components/InspectorPanel.tsx`
- optional mapping helpers used by node rendering

Tasks:

1. Add concise semantic badges for node type and run state.
2. Label metrics explicitly:
   - `Duration: <value>s`
   - `Cost: $<value>`
3. Align wording between canvas card and inspector detail.
4. Keep color semantics restrained and consistent.

Acceptance criteria:

- User can scan node meaning without opening details.
- Metrics are understandable without tooltips.
- Same node shows same semantic labels in both surfaces.

Test coverage target:

- Node renderer tests for badge visibility and metric labels.

## 7. Validation Protocol (Mandatory)

For each slice:

1. `pnpm exec prettier --write <changed-files>`
2. `pnpm exec eslint <changed-files> --max-warnings 0`
3. Run relevant tests for touched components/hooks.
4. `pnpm verify:prepush`

Rules:

- Do not skip checks.
- Do not use `--no-verify`.
- If a command fails, fix root cause before next slice.

## 8. Manual QA Checklist

Run after each slice and full run after S4:

1. Open `/canvas` with normal desktop viewport.
2. Verify left rail icon spacing and click targets.
3. Select `source`, `model`, `test`, `exposure`; verify right-panel detail changes.
4. Clear selection; verify deterministic empty state.
5. Verify toolbar has contextual graph actions only.
6. Verify global context bar naming and hierarchy.
7. Press `F5`; verify UI structure remains coherent (no broken layout state).
8. Interact with minimap and pan/zoom; verify no flicker or infinite render loop.

## 9. Risk Register (Local to This Refactor)

- R1: render loop on selection/minimap sync.
  - Mitigation: isolate effects with stable dependencies and guards.
- R2: action regression when moving toolbar ownership.
  - Mitigation: preserve handlers, refactor composition only.
- R3: visual regression in compact widths.
  - Mitigation: explicit width/spacing constraints and responsive checks.
- R4: semantic overload in node cards.
  - Mitigation: cap badges and keep text short.

## 10. Rollback Strategy

- Keep slices isolated so each commit can be reverted independently.
- If S3/S2 causes nav confusion, revert only that slice while keeping S1 detail panel.
- If S4 visual semantics degrade readability, revert S4 only.

## 11. Definition of Done

This plan is complete only when all are true:

1. Four refactors landed as independent commits.
2. Right panel is detail-only and deterministic.
3. Global context bar naming/hierarchy is normalized.
4. Toolbar is contextual and non-duplicated.
5. Node semantics and metric labels are explicit.
6. `pnpm verify:prepush` passes on final integrated state.
