---
title: Canvas Workbench Tabs Component
status: Superseded
owner: Frontend / Architecture
last_reviewed: 2026-06-17
planning_type: architecture
---

# Canvas Workbench Tabs Component

This component is retired.

The active Canvas direction is graph-first and contextual: Graph is the base
surface, Code/Log/Project/Source/Preview/Properties are contextual surfaces, and
global workbench tabs are not an active implementation target.

Active governing surfaces:

- `docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md`
- `docs/architecture/components/web/graph/canvas-legacy-retirement-component.md`
- `docs/architecture/components/web/appshell/canvas-workbench-screen-composition-component.md`
- `docs/architecture/components/web/frontend-component-inventory.md`
- `buzon/TAREA.TXT`

Retirement decision:

- Do not recreate route-local Canvas tabs.
- Do not use this document as active command/query, component, or test guidance.
- Use `RenderCanvasContextualGraphSurface`, `ResolveCanvasContextMenu`,
  `InspectCanvasNodeProperties`, and `PreviewExecutablePlan` for current Canvas
  graph behavior.
