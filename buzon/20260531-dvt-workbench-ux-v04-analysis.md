# DVT+ Workbench UX v0.4 Analysis

Status: Proposed analysis
Date: 2026-05-31
Scope: Workbench UX shell, graph canvas, insert palette, runtime panel

## Context

This note records the review and refinement of the DVT+ workbench UX direction after the v0.4 specification.

The target remains a graph-first data workflow workbench, not a generic SaaS dashboard. The intended interaction model combines:

- VS Code / Visual Studio-style command discipline.
- GitHub-like minimal chrome and restraint.
- Apache NiFi / draw.io-style graph construction.

The governing product principle remains:

> The UI reflects state. The planner decides. The engine executes. Persisted state remains the source of truth.

## Current accepted direction

```text
Top menu:
DVT+ | File Edit View Insert Export Run Admin Help | Context labels | Run

Workbench header:
Sessionize Events Pipeline

View strip:
Graph | SQL | Lineage | Docs | Logs | Metrics | More

Body:
Canvas + Right Inspector

On-demand:
Insert palette
Graph outline
Minimap

Bottom:
Runtime panel, collapsed unless relevant
```

## Pros

### 1. Less dashboard, more workbench

Removing permanent left navigation and moving commands into the top shell makes the product feel like a developer/data workbench rather than an administration dashboard.

The canvas becomes the dominant surface and the graph remains the main object of work.

### 2. Insert as a command is the right direction

The Insert/Add experience should be command-driven and contextual. A permanent left Add panel consumes graph space and can become noisy.

Correct separation:

```text
Insert = create elements
View / Outline = find existing elements
Canvas = work with the graph
```

### 3. Run as the only persistent primary action is clean

Run is the main operational intent of the workbench. Export is important but does not need to compete visually as a permanent primary button.

Recommended hierarchy:

```text
Global/frequent commands -> top menus
Primary workbench operation -> Run button
```

### 4. Reduced view strip is stronger

Visible:

```text
Graph | SQL | Lineage | Docs | Logs | Metrics | More
```

Under More:

```text
YAML | JSON | Diff | Tests | Artifacts
```

This avoids a long technical tab strip while preserving full access through the View menu.

### 5. Insert affordance must be preserved

The clean shell must not hide how users create nodes. Empty canvas and first-use states should show a subtle affordance:

```text
Press Cmd/Ctrl + I or / to insert nodes
```

The Insert menu should expose the shortcut on hover or inside the menu item.

### 6. Minimap as a toggle is functional

For real dbt projects, graphs can easily exceed 30 nodes. The minimap is not decoration; it supports spatial orientation.

Recommended behavior:

```text
View > Minimap
```

Default hidden for small graphs; available or suggested for large graphs.

### 7. Runtime collapsed by default is important

The bottom panel should not permanently consume 30 percent of vertical space during authoring.

Rules:

```text
No run context -> collapsed
Active run -> visible or surfaced
Failed run -> visible alert or auto-expand
Cmd/Ctrl + J -> toggle runtime panel
```

## Cons and risks

### 1. Top menus can hide too much functionality

A minimal shell improves focus but can hurt discoverability.

Mitigation:

- Command palette using Cmd/Ctrl + K.
- Empty canvas Insert hint.
- Menu shortcuts displayed in menu items.

### 2. Desktop-style menus may feel heavy if overused

File/Edit/View/Insert/Export/Run/Admin/Help is powerful but must be visually restrained.

Mitigation:

- Keep menus flat and compact.
- Avoid mega-menus.
- Use command palette for discovery.

### 3. Export may be premature as a top-level menu

Export deserves a top-level menu only if it becomes a product capability, not a single secondary command.

Keep it if it includes:

- Project snapshot export.
- Workbench export.
- Graph image export.
- Execution plan export.
- Run evidence export.
- Logs export.

Otherwise, it can later collapse into File.

### 4. More can become a dumping ground

More must contain only less-frequent views of the current workbench.

Do not put admin, run commands, or create commands under More.

### 5. Insert palette requires a real registry

The Add palette must not be hard-coded in React views.

It should be resolved from a workbench-aware registry/capability query.

Example contract shape:

```ts
interface NodeTypeDefinition {
  id: string;
  label: string;
  category: string;
  workbenchKinds: readonly string[];
  capabilities: readonly string[];
  permissions: readonly string[];
  icon: string;
  creationCommand: string;
}
```

### 6. Edge contrast must balance readability and noise

Edges must be readable against the grid, but large graphs can become visually noisy.

Recommended states:

```text
Normal edge -> medium contrast
Selected path -> high contrast
Muted unrelated edges -> low contrast
Error path -> error color
```

### 7. Node kebab menu visibility needs balance

Showing the node `⋮` permanently makes node headers dense. Hiding it completely reduces discoverability.

Show it on:

- hover
- focus
- selection
- touch mode equivalent

### 8. Runtime collapse must not hide failures

Runtime can be collapsed when irrelevant, but failures must surface immediately.

Rules:

```text
No run active -> collapsed
Run active -> visible or status surfaced
Run failed -> auto-expand or prominent alert
Run succeeded -> may stay collapsed/collapsible
```

## Additional UX invariants to add to v0.4

1. The graph canvas remains the dominant authoring surface.
2. No permanent double-left-navigation is allowed.
3. Add/create behavior is command-driven, not permanently docked by default.
4. Context labels are read-only reference indicators in the workbench shell.
5. Workbench views are projections of the same workbench state, not global navigation.
6. Runtime evidence is separated from graph authoring.
7. The UI never executes directly; it submits user intent through application commands.
8. Node types visible in Insert/Add must be resolved from the active workbench capability registry.
9. Admin screens are shell-level destinations, never embedded in the canvas.
10. Any persistent panel must justify its space by active context: selected node, active run, active search, or explicit pin.

## Progressive disclosure rules

- Empty canvas: show Insert hint.
- Normal authoring: show canvas, view strip, inspector only if selection exists or pinned.
- Large graph: allow minimap and outline, but keep them optional.
- Active run: expand or surface runtime panel.
- Failed run: force visible error affordance.
- No active run: runtime panel is collapsed by default.
- Node secondary actions are hidden until hover, focus, or selection.

## Responsive behavior

For widths below the desktop threshold:

- Context labels collapse into a compact breadcrumb.
- View strip keeps Graph, SQL, Lineage and More visible.
- Inspector becomes a right drawer.
- Runtime panel becomes a bottom drawer.
- Add palette opens as a command palette or modal-less overlay.
- Run remains the only persistent primary action.

## Command palette

The shell should support a command palette as the universal command discovery surface.

Recommended shortcut:

```text
Cmd/Ctrl + K
```

Initial command groups:

- Insert node.
- Open view.
- Run command.
- Export command.
- Toggle panel.
- Admin destination.

The command palette must call the same command/query rails as menus and buttons. It must not introduce a parallel action path.

## Add palette pinning

The Add palette may be pinned only as a user presentation preference.

Rules:

- Default state: unpinned and closed.
- Opened by Insert, shortcut, empty-canvas hint or command palette.
- Auto-closes after insert unless pinned.
- Pinned state is stored as UI preference, not domain state.
- Pinned palette must not create a second permanent navigation rail.

## Accessibility and keyboard navigation

- All top menu commands must be keyboard reachable.
- Add palette must support keyboard search, arrow navigation and Enter to insert.
- Canvas toolbar active mode must be announced visually and through ARIA state.
- Runtime error state must not rely on color alone.
- Node status must have text/tooltip alternatives.
- Focus order: shell > view strip > canvas controls > canvas > inspector > runtime.

## UX acceptance tests

- Insert hint appears on an empty canvas.
- Insert menu shows its shortcut.
- Add palette only shows node types valid for the active workbench.
- Canvas toolbar shows one active tool mode.
- Runtime panel is collapsed when no run context exists.
- Runtime panel expands or surfaces alert on failed run.
- Minimap can be toggled from View > Minimap.
- Node kebab menu is hidden until hover/focus/selection.
- Edges meet minimum contrast in dark mode.
- Context labels do not render as dropdown controls.

## Final governing sentence

DVT+ uses a minimal shell with command-driven creation, graph-first authoring, state-driven runtime evidence, and contextual capabilities resolved from the active workbench.
