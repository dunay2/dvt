---
title: Canvas View Menu User Stories
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-05-16
---

# Canvas View Menu User Stories

## UX Stories

### US-CANVAS-VIEW-001: Keep the top bar scannable

As a Canvas user, I want visual preferences under `View` so the top bar shows
workflow posture and primary actions without horizontal clutter.

Acceptance:

- Given I open `/canvas`, when the top bar renders, then layout, impact,
  columns, grid, grid color, and snap controls are not rendered as top-bar
  toolbar buttons.
- Given I open the `View` menu, then those controls are available there.

### US-CANVAS-VIEW-002: Toggle overlays from View

As a graph reviewer, I want to toggle Impact, Columns, and Cost overlays from
the `View` menu so projection controls live in one place.

Acceptance:

- Given the Canvas supports the cost overlay, when I open `View`, then Cost is
  available as a checked menu item.
- Given I select Impact or Columns, then the existing Canvas overlay command is
  invoked.

### US-CANVAS-VIEW-003: Configure grid presentation from View

As a graph author, I want grid visibility, grid color, and snap-to-grid controls
under `View` so visual alignment preferences are grouped together.

Acceptance:

- Given I open `View`, then Rejilla and Ajustar are checkable items.
- Given I change grid color, then the existing grid color command receives the
  selected color.
- Given I reset grid size, then the existing shell grid-size preference remains
  available.

### US-CANVAS-VIEW-004: Keep Plan and Run primary

As an operator, I want Plan and Run to remain visible so execution intent stays
obvious.

Acceptance:

- Given the Canvas route renders, then Plan and Run remain in the top bar.
- Given Canvas is read-only, then Plan and Run keep their existing disabled
  posture.

## Architecture Stories

### US-CANVAS-VIEW-ARCH-001: Route contributes view controls through a narrow seam

As a maintainer, I want the Canvas route to register a view-menu contribution
instead of teaching `ShellMenu` Canvas internals.

Acceptance:

- The contribution API is documented with public API, invariants, transitions,
  consumers, and diagrams.
- `ShellMenu` consumes the contribution store only.
- `ShellMenu` does not import Canvas controller or graph runtime modules.

### US-CANVAS-VIEW-ARCH-002: Architecture tests validate semantics

As an architect, I want tests to validate command-surface ownership, not only
barrel thinness.

Acceptance:

- The architecture test fails if `CanvasToolbarPrimaryControls` renders
  View-owned labels.
- The architecture test fails if the component guide omits public API,
  invariants, transitions, consumers, or diagrams.
