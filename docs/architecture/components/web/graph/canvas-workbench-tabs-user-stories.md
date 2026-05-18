---
title: Canvas Workbench Tabs User Stories
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-05-06
planning_type: architecture
---

# Canvas Workbench Tabs User Stories

## Purpose

These stories define the user-visible scenarios for Canvas-scoped workbench
tabs. They are local to the Canvas Workbench Tabs component and must stay
aligned with:

- `docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md`
- `docs/architecture/components/web/graph/canvas-workbench-tabs-component.md`
- `docs/architecture/components/web/graph/canvas-legacy-retirement-component.md`
- `docs/architecture/components/web/graph/canvas-legacy-retirement-user-stories.md`
- `buzon/20260504-codex-fowler-canvas-workbench-tabs-and-layout-analysis-and-remediation.md`
- `buzon/20260506-codex-fowler-canvas-workbench-stage-1-text-only-tabs-review.md`

## User Stories

### US-CANVAS-WORKBENCH-001 - Default Graph Tab

As a Canvas user, I want `/canvas` to open the Graph tab so the primary graph
workbench remains the default route-local view.

Acceptance:

- `/canvas` resolves to `graph`.
- Graph is active in `CanvasWorkbenchTabsReadModel`.
- Canvas document tabs remain separate from workbench view tabs.

### US-CANVAS-WORKBENCH-002 - Code Tab

As a Canvas user, I want Code to open as a Canvas workbench tab so selected
node code context is not treated as a global application destination.

Acceptance:

- selecting Code executes `SelectCanvasWorkbenchTab(code)`;
- the route becomes `/canvas/code`;
- Code does not appear in the left shell navigation rail.

### US-CANVAS-WORKBENCH-003 - Lineage Tab

As a Canvas user, I want Lineage to open inside the Canvas workbench so lineage
uses the active tenant, project, environment, and Canvas context.

Acceptance:

- selecting Lineage executes `SelectCanvasWorkbenchTab(lineage)`;
- the route becomes `/canvas/lineage`;
- retired global Lineage route aliases are not used.

### US-CANVAS-WORKBENCH-004 - Diff Tab

As a Canvas user, I want Diff to open inside the Canvas workbench so comparison
state remains scoped to the active Canvas.

Acceptance:

- selecting Diff executes `SelectCanvasWorkbenchTab(diff)`;
- the route becomes `/canvas/diff`;
- Diff does not appear as a global shell sibling of Canvas.

### US-CANVAS-WORKBENCH-005 - Artifacts Tab

As a Canvas user, I want Artifacts to open inside the Canvas workbench so
evidence is inspected in the current Canvas context.

Acceptance:

- selecting Artifacts executes `SelectCanvasWorkbenchTab(artifacts)`;
- the route becomes `/canvas/artifacts`;
- Artifacts does not publish a retired global shell entry.

### US-CANVAS-WORKBENCH-006 - Canvas-Scoped Runs Tab

As a Canvas user, I want Runs inside Canvas to remain distinct from global Runs
so Canvas-scoped runtime evidence does not replace global run navigation.

Acceptance:

- global Runs remains a shell navigation destination;
- Canvas Runs is selected through `OpenCanvasScopedRunTab`;
- Canvas Runs renders through `/canvas/runs`.

### US-CANVAS-WORKBENCH-007 - Unknown Tab Recovery

As a user following a stale or malformed Canvas tab URL, I want fail-closed
recovery to Graph.

Acceptance:

- unknown tab IDs produce an unavailable state;
- the recovery command targets Graph;
- no plugin tab is guessed from the unknown string.

### US-CANVAS-WORKBENCH-008 - Shell Navigation Exclusion

As a reviewer, I want Canvas-only tabs excluded from fixed shell navigation so a
future plugin cannot reintroduce Code, Lineage, Diff, or Artifacts as global
siblings.

Acceptance:

- `ListShellNavigationItems` returns only shell placements;
- Cypress checks both retired hrefs and retired shell navigation captions;
- architecture tests forbid compatibility through `ViewContribution.nav`.

### US-CANVAS-WORKBENCH-009 - Readable Horizontal Labels

As a Canvas user, I want Graph, Code, Lineage, Diff, Artifacts, and Runs labels
to be readable in a horizontal tab strip.

Acceptance:

- tabs render outside fixed left navigation;
- tabs render inside the Canvas outlet;
- labels are not truncated in the desktop workbench viewport;
- Cypress proves `scrollWidth <= clientWidth + tolerance` for each label.

### US-CANVAS-WORKBENCH-010 - Stage 1 Text-Only Tabs

As a Canvas user, I want the Stage 1 workbench tabs to render as text-only
labels so plugin icons cannot compete with the graph canvas.

Acceptance:

- `CanvasWorkbenchTabsReadModel` exposes labels, routes, active state, scope,
  and availability only;
- `CanvasWorkbenchTabStrip` renders one visible label span per tab trigger;
- the tab strip does not render `svg`, `Icon`, or `tab.icon` paths.

### US-CANVAS-WORKBENCH-011 - Plugin Icon Isolation

As a plugin author, I want placement icon metadata to remain available to
surfaces that intentionally render icons without forcing icons into Canvas
workbench tabs.

Acceptance:

- plugin placement may still carry icon metadata;
- `ListCanvasWorkbenchTabs` does not expose that metadata in the tab read
  model;
- future icon-bearing surfaces must create their own read model instead of
  reusing `CanvasWorkbenchTabsReadModel`.

### US-CANVAS-WORKBENCH-012 - Semantic Component Guide

As a reviewer, I want a local component guide for the tab strip so public API,
invariants, transitions, and consumers can be reviewed without reading the
entire Stage 1 proposal.

Acceptance:

- the guide names `CanvasWorkbenchTabStrip`, its props, and its consumer path;
- the guide documents text-only and passive-view invariants;
- the guide includes transition and sequence diagrams.

### US-CANVAS-WORKBENCH-013 - Semantic Architecture Guard

As a maintainer, I want the architecture test to validate semantics, not only
barrel thinness or source-string absence.

Acceptance:

- the guard requires the local component guide and Stage 1 mailbox review;
- the guard requires owned-concern headers on the local tab proof modules;
- the guard verifies the text-only read model and browser proof vocabulary.

## Scenario Matrix

| Story                   | Rail                                 | DDD owner                               | Primary proof                              | Negative proof                                     |
| ----------------------- | ------------------------------------ | --------------------------------------- | ------------------------------------------ | -------------------------------------------------- |
| US-CANVAS-WORKBENCH-001 | `ListCanvasWorkbenchTabs`            | `CanvasWorkbenchTabsReadModel`          | `canvasWorkbenchTabs.test.ts`              | Graph default cannot select plugin tab by accident |
| US-CANVAS-WORKBENCH-002 | `SelectCanvasWorkbenchTab`           | `CanvasWorkbenchTabSelectionCommand`    | `canvas-workbench-tabs.cy.ts`              | Code absent from fixed shell navigation            |
| US-CANVAS-WORKBENCH-003 | `SelectCanvasWorkbenchTab`           | `CanvasWorkbenchTabSelectionCommand`    | `canvas-workbench-tabs.cy.ts`              | retired Lineage route ID absent                    |
| US-CANVAS-WORKBENCH-004 | `SelectCanvasWorkbenchTab`           | `CanvasWorkbenchTabSelectionCommand`    | `canvasWorkbenchRouteState.test.ts`        | Diff absent from fixed shell navigation            |
| US-CANVAS-WORKBENCH-005 | `SelectCanvasWorkbenchTab`           | `CanvasWorkbenchTabSelectionCommand`    | `canvasWorkbenchTabs.test.ts`              | Artifacts absent from fixed shell navigation       |
| US-CANVAS-WORKBENCH-006 | `OpenCanvasScopedRunTab`             | `CanvasScopedRunSelection`              | `canvasWorkbenchTabs.architecture.test.ts` | global Runs remains shell-owned                    |
| US-CANVAS-WORKBENCH-007 | `ResolveCanvasWorkbenchContext`      | `CanvasWorkbenchContext`                | `canvasWorkbenchRouteState.test.ts`        | unknown tab fails closed                           |
| US-CANVAS-WORKBENCH-008 | `ListShellNavigationItems`           | `ShellNavigationReadModel`              | `shellNavigationModel.test.ts`             | workbench placement rejected                       |
| US-CANVAS-WORKBENCH-009 | `VerifyCanvasWorkbenchVisualPosture` | `CanvasWorkbenchVisualPostureReadModel` | `canvas-workbench-tabs.cy.ts`              | truncated labels fail Cypress                      |
| US-CANVAS-WORKBENCH-010 | `ListCanvasWorkbenchTabs`            | `CanvasWorkbenchTabsReadModel`          | `canvasWorkbenchTabs.test.ts`              | icon render data absent from read model            |
| US-CANVAS-WORKBENCH-011 | `ListCanvasWorkbenchTabs`            | `CanvasWorkbenchTabsReadModel`          | `canvasWorkbenchTabs.architecture.test.ts` | plugin icon metadata cannot leak into tab strip    |
| US-CANVAS-WORKBENCH-012 | `none - docs contract`               | `CanvasWorkbenchTabStrip`               | `canvasWorkbenchTabs.architecture.test.ts` | missing API/invariant/transition docs fail guard   |
| US-CANVAS-WORKBENCH-013 | `VerifyCanvasWorkbenchVisualPosture` | `CanvasWorkbenchVisualPostureReadModel` | `canvasWorkbenchTabs.architecture.test.ts` | missing semantic proof vocabulary fails guard      |

## TDD Traceability

- `canvasWorkbenchTabs.architecture.test.ts` guards component docs, mailbox
  analysis, C&Q catalog, and owned-concern module headers.
- `canvas-workbench-tabs.cy.ts` guards the browser route flow and visual
  posture.
- The label-readability regression was caught red by the enhanced Cypress
  geometry assertion before the tab strip layout was made non-truncating.
- The Stage 1 semantic guard requires the tab-strip component guide, text-only
  stories, mailbox analysis, owned-concern docblocks, and browser no-icon
  proof to stay aligned.
