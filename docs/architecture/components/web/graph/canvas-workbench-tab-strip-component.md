---
title: Canvas Workbench Tab Strip Component
status: Superseded
owner: Frontend / Architecture
last_reviewed: 2026-06-17
planning_type: architecture
---

# Canvas Workbench Tab Strip Component

This component is retired.

The active Canvas UX removes the route-local tab strip. Persistent Graph remains
the base surface, while Code, source import, node properties, execution preview,
logs, and project exploration open from contextual commands.

Active governing surfaces:

- `docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md`
- `docs/architecture/components/web/appshell/canvas-workbench-screen-composition-component.md`
- `docs/architecture/components/web/frontend-component-inventory.md`
- `buzon/TAREA.TXT`

Retirement decision:

- Do not add tab-strip renderers, tab presenters, or tab-read-model tests back to
  the Canvas route.
- Component tests should target the active contextual components that render the
  behavior, not a synthetic route tab strip.
