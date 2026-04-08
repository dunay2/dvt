---
title: Frontend subsystem architecture
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-09
---

# Frontend subsystem architecture

This pack documents the frontend subsystem as a set of workbench flows,
interaction rules, and supporting UI narratives.

It is not the canonical component home for the frontend workspace. Use
[web component](../components/web/index.md) first when the question is about
`apps/web` itself.

## Use This Page For

1. workbench-wide UX flow and route relationships;
2. interaction rules between Canvas, Runs, Lineage, Code, Diff, and Artifacts;
3. supporting frontend narratives that cut across more than one module.

## Canonical Component Home

- [web component](../components/web/index.md)

## Current Shell Topology

```mermaid
flowchart TB
  Boot["App bootstrap"] --> Router["RouterProvider"]
  Router --> Root["Root shell"]
  Root --> TopBar["TopAppBar"]
  Root --> Health["ShellHealthBanner"]
  Root --> Nav["LeftNavigation"]
  Root --> Outlet["Route outlet"]
  Root --> Console["Console drawer"]

  Outlet --> Canvas["/canvas"]
  Outlet --> Runs["/runs"]
  Outlet --> Lineage["/lineage"]
  Outlet --> Code["/code"]
  Outlet --> Diff["/diff"]
  Outlet --> Artifacts["/artifacts"]
  Outlet --> Plugins["/plugins"]
  Outlet --> Admin["/admin"]
```

## Reading Order

1. [web component](../components/web/index.md)
2. [Read subsystem](../subsystems/read/index.md)
3. [Main Workspace Views And UX](main-workspace-views-and-ux.md)
4. [Frontend Data-Boundary Architecture](frontend-data-boundary-architecture.md)
5. [Workbench UI Contract And Component Inventory](workbench-ui-contract-and-component-inventory.md)
6. [Graph Frontend Architecture](graph/graph-frontend-architecture.md)
7. [Runs](runs/dvt-runs-frontend-architecture.md)
8. [Lineage](lineage/dvt-frontend-lineage.md)
9. [Frontend Observability Architecture](observability/front-observability-architecture-dvt.md)

## Related Pages

- [System Architecture](../system/index.md)
- [Subsystem Architecture](../subsystems/index.md)
- [DVT Component Map](../component-map.md)
- [UI / Visualization Domain](../domain-ui.md)
