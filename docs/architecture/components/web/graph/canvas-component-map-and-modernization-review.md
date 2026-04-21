---
title: Canvas Component Map And Modernization Review
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-21
planning_type: architecture
---

# Canvas Component Map And Modernization Review

## Purpose

This document maps the Canvas route as a component system inside the wider DVT
workbench.

It focuses on:

- UI composition and component ownership
- route startup and shell handoff posture
- modernization decisions about what to keep, what to change, and what to avoid

For aggregate internals, use
[Canvas Draft Session Component](./canvas-draft-session-component.md). For
graph mutation semantics, use
[Canvas Graph Lifecycle Component](./canvas-graph-lifecycle-component.md). For
controller-local layering, use
[Canvas Controller Current To Target Architecture](./canvas-controller-current-to-target-architecture.md).

## Governing Sources

- [Graph Frontend Architecture](./graph-frontend-architecture.md)
- [Canvas Controller Current To Target Architecture](./canvas-controller-current-to-target-architecture.md)
- [Canvas Draft Session Component](./canvas-draft-session-component.md)
- [Canvas Graph Lifecycle Component](./canvas-graph-lifecycle-component.md)
- [Graph Route Bootstrap Architecture](./graph-route-bootstrap-architecture.md)
- [Graph Sequences And State Machines](./graph-sequences-and-state-machines.md)

Reading rule:

- use this page for route composition and component ownership
- use `canvas-controller-current-to-target-architecture.md` for seam layering
  inside the controller chain
- use `graph-route-bootstrap-architecture.md` for shell contract rules
- use `canvas-draft-session-component.md` for aggregate semantics and state
  transitions

## Canvas In The Workbench

Canvas is the graph-authoring workbench, not the whole frontend.

| Subsystem          | Owns                                                                             | Canvas must not absorb                                       |
| ------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Shell              | Frame, navigation, platform health, route reveal                                 | Graph semantics and draft truth                              |
| Canvas             | Workflow topology authoring, graph selection, overlays, preview, and run handoff | Full run monitoring, artifact browsing, review-heavy diff UX |
| Runs               | Active and historical run workspaces                                             | Topology editing                                             |
| Lineage            | Read-only dependency and impact analysis                                         | Main authoring flow                                          |
| Diff and Artifacts | Review and inspection density                                                    | Everyday graph interaction                                   |
| Templates          | Future source-generation workbench                                               | Toolbar sprawl and code-generation behavior inside Canvas    |

```mermaid
flowchart LR
  Shell["Persistent shell"] --> Canvas["Canvas workbench"]
  Shell --> Runs["Runs"]
  Shell --> Lineage["Lineage"]
  Shell --> Diff["Diff"]
  Shell --> Artifacts["Artifacts"]
  Shell --> Templates["Templates"]

  Canvas -->|"Plan or start run"| Runs
  Canvas -. "Graph context" .-> Lineage
  Canvas -. "Review context" .-> Diff
  Runs -->|"Run artifacts"| Artifacts
  Canvas -. "Workflow context" .-> Templates
```

## Canvas Component Stack

```mermaid
flowchart TB
  Canvas["Canvas.tsx"] --> Content["CanvasContent"]
  Content --> Controller["useCanvasController"]
  Content --> PlanModal["PlanPreviewModal"]
  Content --> EdgeModal["ConfirmEdgeModal"]

  Controller --> Shell["CanvasShell"]
  Shell --> Toolbar["CanvasToolbar"]
  Shell --> Center["CanvasCenterSurface and CanvasStateViews"]
  Shell --> Viewport["CanvasViewport"]
  Shell --> Explorer["DbtExplorer"]
  Shell --> Inspector["InspectorPanel"]
  Shell --> Import["SourceImportWizard"]
  Shell --> Recovery["CanvasRecoveryBanner"]

  Controller --> DraftSession["canvasDraftSession"]
  Controller --> GraphLifecycle["canvasGraphLifecycle"]
  Controller --> GraphHandlers["useCanvasGraphHandlers"]
  Controller --> Execution["useCanvasExecutionActions"]
  Controller --> RouteState["canvasRouteViewState"]
  Controller --> Publisher["usePublishedRouteBootstrap"]

  DraftSession --> Baseline["canvasDraftSessionBaseline"]
  DraftSession --> Machine["canvasDraftSessionMachine"]
  DraftSession --> WorkingSet["canvasDraftSessionWorkingSet"]

  GraphHandlers --> GraphUtils["canvasGraphUtils"]
  Execution --> PlanHandler["useCanvasPlanActionHandler"]
  Execution --> RunHandler["useCanvasRunStartHandler"]
  Publisher --> Registry["routeBootstrapRegistry"]
  Controller --> Services["AppServicesContext and queries"]
```

Reading rule:

- route boundaries are already reasonably mature
- the controller remains the main concentration point
- the safe move is to keep view seams stable and extract graph policy behind a
  dedicated component

## Key Responsibilities

| Element                                      | Primary role                                                     | Must stay out of scope                                      |
| -------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------- |
| `Canvas.tsx`                                 | Route entry, provider setup, modal mounting                      | Draft semantics and service orchestration                   |
| `CanvasContent`                              | Route composition seam over the controller facade                | Deep domain policy                                          |
| `CanvasShell`                                | Three-panel workbench layout and local chrome                    | Persistence and aggregate truth                             |
| `CanvasToolbar`                              | Stateless command and toggle surface                             | Hidden policy or ad hoc route-state logic                   |
| `CanvasCenterSurface` and `CanvasStateViews` | Center-surface rendering for loading, empty, error, and recovery | Shell reveal ownership                                      |
| `CanvasViewport`                             | React Flow projection and primitive event boundary               | Authoring semantics                                         |
| `DbtExplorer` and `InspectorPanel`           | Contextual side panels                                           | Global shell behavior                                       |
| `useCanvasController`                        | Route application facade                                         | Mixed persistence, projection, and widget logic in one file |
| `canvasDraftSession`                         | Namespaced aggregate API over draft truth                        | Direct service calls                                        |
| `useCanvasGraphHandlers`                     | Gesture-to-command adapter seam                                  | Duplicate mutation policy                                   |
| `useCanvasExecutionActions`                  | Plan and run handoff composition seam                            | Graph mutation ownership                                    |
| `usePublishedRouteBootstrap`                 | Publish explicit route startup posture to the shell              | Re-deriving authoring truth from shell heuristics           |

## Startup Contract

Canvas is a `published` route, not a `static` one.

That means:

- the shell must consume explicit startup posture from the route contract
- Canvas must publish loading, recovery, and ready posture deliberately
- `Root.tsx` must not infer Canvas operability from widget-local booleans

```mermaid
flowchart LR
  RouteId["route.id"] --> Handle["handle.routeBootstrap"]
  Handle --> Publisher["usePublishedRouteBootstrap"]
  Publisher --> Registration["useActiveRouteBootstrapRegistration"]
  Registration --> Registry["routeBootstrapRegistry"]
  Registry --> Root["Root.tsx"]
  Controller["useCanvasController"] --> RouteState["canvasRouteViewState"]
  RouteState --> Publisher
```

Canonical startup rule for this slice:

- `mount != settled`
- Canvas is only ready when its route-level presentation state is ready
- recovery posture is a route fact, not a JSX accident

## Modernization Review

### Keep

- explicit route boundary through `Canvas.tsx` plus `CanvasContent`
- presentational split across `CanvasShell`, `CanvasToolbar`, and
  `CanvasViewport`
- explicit shell props instead of opaque command bags
- service injection through governed app-service seams
- draft aggregate vocabulary separated from UI components

### Change

- keep shrinking `useCanvasController` and especially
  `useCanvasAuthoringRuntime.ts`
- consolidate route presentation state so banner, toolbar, and center surface
  cannot contradict each other
- align capability loading with the governed frontend data-boundary model
- remove duplicate overlay traversal where projection logic overlaps
- keep selection and inspector fallout from growing back into adapter seams

### Avoid

- hiding route contracts behind anonymous view-model bags
- reintroducing legacy parallel mutation paths
- moving Monaco-, review-, or artifact-heavy concerns back into Canvas
- letting the shell infer readiness from local widget heuristics

## Validation Focus For Next Iteration

- route-state consistency across toolbar, center surface, and recovery banner
- bootstrap publication lifecycle and teardown behavior
- `useCanvasAuthoringRuntime.ts` size and dependency spread
- overlay traversal duplication and hot-path cost
- selection and inspector command ownership if semantics expand

## Related Pages

- [Canvas Controller Current To Target Architecture](./canvas-controller-current-to-target-architecture.md)
- [Canvas Draft Session Component](./canvas-draft-session-component.md)
- [Graph Route Bootstrap Architecture](./graph-route-bootstrap-architecture.md)
- [Graph Sequences And State Machines](./graph-sequences-and-state-machines.md)
