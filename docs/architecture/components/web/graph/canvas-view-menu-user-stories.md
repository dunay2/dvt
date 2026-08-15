---
title: Canvas Properties Window User Stories
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-08-14
---

# Canvas Properties Window User Stories

The historical `US-CANVAS-VIEW-*` identifiers remain stable, but their accepted
surface is the Canvas contextual properties window rather than the global
`View` menu.

## UX Stories

### US-CANVAS-VIEW-001: Keep the top bar and View menu scannable

As a Canvas user, I want Canvas properties in one contextual window so the top
bar and global `View` menu expose only global workflow and view commands.

Acceptance:

- Given I open `/canvas`, layout, overlay, background, and grid controls are not
  rendered as top-bar buttons.
- Given I open `View`, Canvas-specific properties are absent while panels, focus
  mode, and language remain available.
- Given I open the Canvas background context menu, `Canvas properties` opens the
  single properties window.

### US-CANVAS-VIEW-002: Edit appearance transactionally

As a graph reviewer, I want to stage Canvas background and overlay choices so I
can review them before changing the active view.

Acceptance:

- Appearance groups background, Impact, Columns, Cost when supported, and the
  empty-canvas guide.
- `Apply` invokes only the existing preference callbacks whose values changed.
- `Cancel`, close, and `Escape` invoke no preference callback.

### US-CANVAS-VIEW-003: Configure grid presentation in one tab

As a graph author, I want grid visibility, size, color, snap, and restore
defaults grouped together.

Acceptance:

- Grid controls are exposed in the localized Grid/Rejilla tab.
- Invalid colors normalize through the existing Canvas palette rules.
- Restoring defaults stages size `20px` and the canonical default grid color;
  it does not apply until `Apply`.

### US-CANVAS-VIEW-004: Keep layout permission-aware

As an operator, I want automatic layout available in the same properties
window without bypassing graph permissions.

Acceptance:

- The Layout/Distribución tab is available only when graph editing permits
  automatic layout.
- Applying the staged layout request uses the existing layout command.
- The properties window cannot plan or start a run.

## Architecture Stories

### US-CANVAS-VIEW-ARCH-001: Reuse one workbench properties component

As a maintainer, I want Canvas to compose a shared properties window rather
than hand-building another modal.

Acceptance:

- `WorkbenchPropertiesWindow` owns dialog structure, tabs, scrolling, footer,
  focus return, and keyboard dismissal.
- `CanvasSettingsDialog` owns only Canvas field composition and edit-buffer to
  callback mapping.
- No Canvas-specific shell contribution store remains.

### US-CANVAS-VIEW-ARCH-002: Architecture tests validate single-surface semantics

As an architect, I want tests to fail when Canvas properties return to global
View or bypass the shared component.

Acceptance:

- Presentation tests assert Canvas property labels are absent from `View`.
- Architecture tests assert Canvas composes `WorkbenchPropertiesWindow` and the
  retired contribution files do not exist.
- The component guide records public API, invariants, transitions, consumers,
  diagrams, and semantic fitness commands.
