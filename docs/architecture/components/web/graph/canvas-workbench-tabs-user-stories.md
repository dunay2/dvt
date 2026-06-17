---
title: Canvas Workbench Tabs User Stories
status: Superseded
owner: Frontend / Architecture
last_reviewed: 2026-06-17
planning_type: architecture
---

# Canvas Workbench Tabs User Stories

These stories are retired.

The active product grammar comes from `buzon/TAREA.TXT`: Graph is the base mode,
menus are contextual, and fixed route-local tabs do not own Canvas work. New
stories must be written against active contextual surfaces and Planning DB tasks,
not against the retired tab strip.

Active story surfaces:

- Canvas context menu for insertion and graph-level actions.
- Node context menu for node-owned actions only.
- Node workbench for properties, columns, tests, preview, and runs.
- Bottom operational drawer for Log, Problems, Runs, and Preview.
- Source import dialog for connection, exploration, metadata, and selection.

Retirement decision:

- Do not use these retired stories as acceptance criteria.
- Do not recreate tab-specific command/query rails from this document.
