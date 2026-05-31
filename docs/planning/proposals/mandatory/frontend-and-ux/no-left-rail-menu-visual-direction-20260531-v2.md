---
title: No Left Rail Menu Visual Direction V2
status: Draft
owner: Frontend / Architecture
last_reviewed: 2026-05-31
---

# No Left Rail Menu Visual Direction V2

## Purpose

Define the target front-end menu direction for DVT+ without a global left rail.

This proposal supersedes earlier visual explorations that retained a permanent left navigation rail. The target shell uses a top application bar, workspace tabs, and context-specific panels.

## Decision

DVT+ should not use a permanent global left rail in the main authoring workbench.

The primary navigation model is:

```text
Top application shell
  Tenant / Project / Environment / Git / Search / Plan status / User actions

Workspace tab strip
  Graph / Code / Lineage / Diff / Artifacts / Runs

Workbench body
  Contextual left panel / central work surface / right inspector
```

## Rationale

The workbench is the product center. Keeping a permanent left rail competes with the graph, code, lineage, and run views. The product already treats Canvas and adjacent views as a bounded workbench context, so global navigation should move to the top shell and command palette rather than consuming a full vertical rail.

This also better expresses the dependency model:

```text
Workspace context
  -> active canvas / graph
  -> workbench tabs derived from that context
  -> contextual panels derived from active tab and selection
```

## Required visual structure

### Top shell

The top shell should contain:

- Product mark: DVT+
- Tenant selector
- Project selector
- Environment selector
- Git branch / detached state
- Search / command entry
- Plan status indicator
- Notifications/help/user actions

### Workspace tabs

The workspace tabs should contain:

- Graph
- Code
- Lineage
- Diff
- Artifacts
- Runs

These are not global app sections. They are workbench views for the active workspace/canvas context.

### Contextual left panel

The contextual panel is visible when useful for the active tab. For Graph and Code, it should separate:

- Authoring Catalog: node/resource types that can be instantiated.
- Project Assets: prepared resources that exist in the project but are not necessarily on the canvas.
- Canvas Nodes: node instances currently visible in the active canvas.

### Right inspector

The right inspector should be selection-driven:

- Node details
- Schema/columns
- Tests/quality
- Lineage
- Run history
- Cost and freshness metadata when available

## Theme variants

Two visual directions are attached to this proposal:

- `assets/no-left-rail-menu-20260531-v2/dvt_front_no_left_rail_light_v2.png`
- `assets/no-left-rail-menu-20260531-v2/dvt_front_no_left_rail_dark_v2.png`

Both variants intentionally remove the global left rail.

## Implementation notes

1. Do not reintroduce a global left rail in Canvas/Workbench routes.
2. Route-level views such as Code, Lineage, Diff, Artifacts, and Runs should be represented as workspace tabs when the user is inside the authoring workbench.
3. Project-level or operational global entry points can live in top-shell menus or command palette.
4. Contextual panels should be tab-specific and should not become global navigation.
5. The left contextual panel must keep Authoring Catalog, Project Assets, and Canvas Nodes as distinct concepts.

## Acceptance criteria

- The main workbench has no permanent global left rail.
- Top shell exposes tenant/project/environment/git context.
- Graph, Code, Lineage, Diff, Artifacts, and Runs appear as workspace tabs.
- The left contextual panel separates Authoring Catalog, Project Assets, and Canvas Nodes.
- The right inspector is driven by active selection.
- Light and dark themes preserve the same information architecture.

## Risks

### Risk: top shell becomes overloaded

Mitigation: reserve top shell for context selectors and global actions only. Use command palette for lower-frequency navigation.

### Risk: users lose global discoverability

Mitigation: provide a command palette, breadcrumb, and workspace switcher.

### Risk: contextual panel is mistaken for navigation

Mitigation: label it by domain concepts and keep its content dependent on active tab.

### Risk: Code/Lineage/Runs need project-wide mode

Mitigation: support a project-wide mode inside the tab, but keep it visually scoped to the workbench.

## Migration plan

1. Update visual documentation and UX specs.
2. Refactor shell navigation model to distinguish top-shell actions from workbench tabs.
3. Replace permanent left rail in workbench layout with contextual panels.
4. Adjust tests and architecture fitness checks to fail if Canvas route reintroduces a global rail.
5. Keep a temporary fallback route for global operational views only if needed.

## References

- React Flow: https://reactflow.dev/
- Monaco Editor: https://microsoft.github.io/monaco-editor/
- C4 Model: https://c4model.com/
