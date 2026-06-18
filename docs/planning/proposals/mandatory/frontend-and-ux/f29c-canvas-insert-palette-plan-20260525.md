---
title: F-29-C Canvas Insert Palette Plan
status: Superseded
date: 2026-05-25
owners:
  - apps/web
task_id: F-29-C
planning_type: mandatory-proposal
superseded_by:
  - UXDB-CANVAS-CONTEXT-MENU-P0-1
  - WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT-20260618
---

# F-29-C Canvas Insert Palette Plan

This proposal is superseded.

F-29-C introduced a fixed Canvas insert palette as a transitional affordance.
The Canvas-first product direction now rejects fixed insertion chrome: graph is
the base mode, node insertion starts from the Canvas context menu, and active
creation authority belongs to the existing `ResolveCanvasContextMenu` and
`CreateCanvasAuthoringNode` rails.

Do not use this document as implementation authority for new work. The active
state is recorded in Planning DB by:

- `UXDB-CANVAS-CONTEXT-MENU-P0-1`
- `WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT-20260618`
- `SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU`
- `SYS-WEB-CANVAS-ADD-NODE-PALETTE` with deprecated status

The retired fixed-palette files must not be recreated. The current product
contract is:

- empty and ready Canvas states do not mount a fixed add-node palette;
- right-click on the Canvas opens the contextual creation surface;
- context-menu presenter and viewport tests own interaction behavior;
- browser E2E verifies the right-click menu remains visible after a real user
  context-click gesture.

Validation for the superseding slice lives with the DB-first task and component
profiles, not in this historical proposal.
