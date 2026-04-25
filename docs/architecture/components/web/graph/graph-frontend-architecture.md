---
title: Graph Frontend Architecture
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-22
---

# Graph Frontend Architecture

## Purpose

The Graph surface is the bounded frontend authoring context of DVT.

Its job is to expose graph authoring, route operability, preview, and run
handoff without becoming the source of execution truth or shell truth.

## Governing Sources

- [Graph Route Bootstrap Architecture](./graph-route-bootstrap-architecture.md)
- [Canvas Controller Current To Target Architecture](./canvas-controller-current-to-target-architecture.md)
- [Canvas Component Map And Modernization Review](./canvas-component-map-and-modernization-review.md)
- [Canvas Route Composition Component](./canvas-route-composition-component.md)
- [Canvas Authoring Runtime Component](./canvas-authoring-runtime-component.md)
- [Canvas Authoring Projection Component](./canvas-authoring-projection-component.md)
- [Canvas Draft Session Component](./canvas-draft-session-component.md)
- [Canvas Graph Lifecycle Component](./canvas-graph-lifecycle-component.md)
- [Graph Sequences And State Machines](./graph-sequences-and-state-machines.md)
- [Frontend Fowler Implementation Pattern](../frontend-fowler-implementation-pattern.md)
- [Frontend Data Boundary Architecture](../frontend-data-boundary-architecture.md)

Reading rule:

- use this page for pack-level frontend posture
- use the controller and component docs for Canvas-local detail
- use the route-bootstrap doc for shell contract and startup rules

## Scope

In scope:

- Canvas route composition and operability
- route startup handoff from route context to shell context
- draft aggregate, scope projection, and route-local command seams
- plugin declaration boundary for graph behavior

Out of scope:

- backend persistence ownership
- planner redesign
- shell-wide navigation outside graph-facing routes

## Canonical Anchors

| Concern                     | Primary anchors                                                                                                                                                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell handoff               | [Root.tsx](../../../../../apps/web/src/app/Root.tsx), [routes.ts](../../../../../apps/web/src/app/routes.ts), [usePublishedRouteBootstrap.ts](../../../../../apps/web/src/app/bootstrap/usePublishedRouteBootstrap.ts)                                                                |
| Canvas route facade         | [Canvas.tsx](../../../../../apps/web/src/app/views/Canvas.tsx), [useCanvasController.ts](../../../../../apps/web/src/app/views/canvas/useCanvasController.ts), [canvasRouteViewState.ts](../../../../../apps/web/src/app/views/canvas/canvasRouteViewState.ts)                        |
| Draft authoring core        | [canvasDraftSession.ts](../../../../../apps/web/src/app/views/canvas/canvasDraftSession.ts), [canvasDraftScope.ts](../../../../../apps/web/src/app/views/canvas/canvasDraftScope.ts), [canvasGraphLifecycle.ts](../../../../../apps/web/src/app/views/canvas/canvasGraphLifecycle.ts) |
| Plugin boundary             | [PluginManifest.ts](../../../../../apps/web/src/app/plugins/contracts/PluginManifest.ts), [ConnectionRules.ts](../../../../../apps/web/src/app/plugins/contracts/ConnectionRules.ts), [registry.ts](../../../../../apps/web/src/app/plugins/registry.ts)                              |
| Route copy and presentation | [copy.ts](../../../../../apps/web/src/app/views/canvas/copy.ts), [CanvasToolbar.tsx](../../../../../apps/web/src/app/views/canvas/CanvasToolbar.tsx), [canvasExecutionState.ts](../../../../../apps/web/src/app/views/canvas/canvasExecutionState.ts)                                 |

## Frontend Topology

```mermaid
flowchart LR
  Shell["Shell and Root"] --> Bootstrap["Route bootstrap contract"]
  Bootstrap --> Canvas["Canvas route"]
  Bootstrap --> OtherGraph["Lineage / Code / Diff / Artifacts / Runs / Cost"]

  Canvas --> Controller["useCanvasController facade"]
  Controller --> Commands["Command seams"]
  Controller --> Queries["Query and presentation seams"]
  Commands --> DraftAggregate["canvasDraftSession aggregate"]
  Commands --> GraphLifecycle["canvasGraphLifecycle component"]
  Commands --> Execution["Plan and run handoff"]
  Queries --> Scope["canvasDraftScope and route state"]

  DraftAggregate --> Workspace["workspace snapshot and protected draft ports"]
  Execution --> Services["plan and run service ports"]
  Canvas --> Plugins["plugin contracts and registry"]
  Plugins --> Rules["ConnectionRules and node-kind policies"]
```

Current posture:

- shell startup is contract-driven, not pathname-driven
- Canvas owns authoring truth, not execution truth
- command and query seams are becoming explicit instead of widget-driven
- plugin declarations are separated from runtime composition and policy

## Current Architecture Point

As of 2026-04-22:

- route startup is generalized by `route.id` plus explicit bootstrap metadata
- Canvas graph mutation now flows through one local lifecycle component
- edge admission lives behind a narrow pure policy seam; node drop, duplicate,
  and first-node creation use canonical admission before any viewport
  projection, while plugin graph strategies only parse or project
  plugin-owned payloads
- connection and transformation validation stay typed until presentation
- route-visible operator copy is centralized instead of repeated across handlers
- protected draft reads now project a semantic canonical graph,
  `canvasAuthoringGraphProjection.ts` derives active authoring semantics from
  that protected graph plus scoped local working-set additions only, and
  `useCanvasViewportGraphModel.ts` projects those semantics into React Flow
  state
- Canvas source-import affordances are now capability-gated instead of being
  implied by legacy mock-era empty states; the active `api` path hides
  `Add data` until the backend import endpoint exists, and `mock` is not a
  substitute active-authoring runtime under the hard-cut
- the DVT authoring catalog now explicitly includes the governed
  `dvt:source -> dvt:sql_transform -> dvt:sink` path instead of letting source
  nodes fall through the unknown-node fallback

## Protected Draft Semantic Projection

The current no-legacy transition point is now explicit:

- `canvasDraftReadModel.ts` is the route-facing read-model seam for protected
  draft outcomes
- `workspaceGraphDraftProjection.ts` projects both the lossy persisted draft
  record and the semantic canonical graph used by Canvas authoring
- `canvasAuthoringGraphProjection.ts` treats protected semantic graph as first
  authority and supplements it only with route-local explicit additions that
  are not yet persisted remotely
- `useCanvasAuthoringProjection.ts` composes semantic authoring projection and
  viewport projection without turning React Flow into semantic authority
- `useCanvasViewportGraphModel.ts` owns viewport-ready node and edge state only

```mermaid
flowchart LR
  DraftPort["protected workspaceGraphDraft boundary"] --> ReadModel["canvasDraftReadModel"]
  ReadModel --> Semantic["semantic canonical graph"]
  ReadModel --> Projected["projected draft record"]
  Semantic --> AuthoringProjection["canvasAuthoringGraphProjection.ts"]
  Projected --> DraftSession["CanvasDraftSession"]
  DraftSession --> AuthoringProjection
  AuthoringProjection --> ProjectionHook["useCanvasAuthoringProjection.ts"]
  ProjectionHook --> ViewportModel["useCanvasViewportGraphModel.ts"]
  ViewportModel --> View["Canvas shell and viewport"]
```

Interpretation rule:

- semantic graph owns visible authoring semantics when a protected draft is
  present
- route-local canonical-node supplementation may cover only pending or
  locally-added working-set members that are not yet persisted in the
  protected draft
- viewport node and edge state is a downstream projection of that semantic
  authoring graph, never a second semantic merge point
- projected record still owns persisted working-set membership and positions
- the legacy workspace-snapshot path is no longer allowed to override or
  supplement active route semantics
- capability-gated authoring actions such as source import must be derived from
  explicit service seams plus route posture, never from fallback copy

## Plugin Contract Boundary

`PluginManifest.ts` is the canonical declaration contract for graph-facing
plugins.

| Module               | Owns                                                                 | Must not own                                |
| -------------------- | -------------------------------------------------------------------- | ------------------------------------------- |
| `PluginManifest.ts`  | vocabulary, contribution DTOs, node-kind and connection declarations | runtime composition, graph-policy execution |
| `registry.ts`        | static plugin composition, availability filtering, port maps         | declaration semantics                       |
| `ConnectionRules.ts` | graph-policy evaluation over manifest declarations                   | plugin registration and route copy          |
| `copy.ts`            | locale-resolved operator copy                                        | plugin declaration semantics                |

```mermaid
flowchart LR
  Manifest["PluginManifest.ts"] --> Registry["registry.ts"]
  Manifest --> Rules["ConnectionRules.ts"]
  Manifest --> Copy["copy.ts consumers"]
  Registry --> PortMap["plugin port maps"]
  PortMap --> Rules
  Rules --> CanvasPolicy["canvasConnectionAggregate edge policy"]
  Registry --> CanvasKinds["CanvasKindRegistration catalog"]
  CanvasKinds --> ActiveDocument["canvasDocument.kind"]
  ActiveDocument --> StrategyResolver["resolveActiveCanvasGraphStrategy"]
  Registry --> StrategyResolver
  StrategyResolver --> Strategy["CanvasGraphStrategy payload parsing and projection"]
  Strategy --> Admission["admitCanonicalNodeToCanvas"]
  Admission --> ViewportProjection["mapDroppedCanonicalNodeToCanvasNode"]
```

Reading rule:

- ask `PluginManifest.ts` what a plugin may declare
- ask `registry.ts` which plugins are active
- ask `ConnectionRules.ts` how those declarations affect graph semantics
- ask the active canvas document which graph strategy and authoring catalog are
  in force; do not ask the graph strategy for canvas-kind posture

## Active Strategy And Canonical Admission

The active Canvas document owns the authoring kind. Graph strategies are now
payload/projection adapters only.

```mermaid
sequenceDiagram
  participant User
  participant Canvas as Canvas document
  participant Resolver as canvasActiveGraphStrategy
  participant Strategy as CanvasGraphStrategy
  participant Admission as admitCanonicalNodeToCanvas
  participant Mapper as viewport mapper
  participant Lifecycle as canvasGraphLifecycle

  Canvas->>Resolver: canvas.kind
  Resolver->>Strategy: select strategy by kind
  User->>Strategy: drop plugin payload
  Strategy-->>Admission: CanonicalNode or null
  Admission-->>Mapper: accepted canonical node
  Mapper-->>Lifecycle: viewport node is projection only
  Admission->>Lifecycle: admit explicit canonical node
```

Invariant:

- `admitCanonicalNodeToCanvas` must not import React Flow or produce viewport
  nodes.
- `CanvasGraphStrategy` must not expose canvas-kind policy.

## Architecture Pack

Recommended reading order:

1. [Graph Route Bootstrap Architecture](./graph-route-bootstrap-architecture.md)
2. [Canvas Controller Current To Target Architecture](./canvas-controller-current-to-target-architecture.md)
3. [Canvas Component Map And Modernization Review](./canvas-component-map-and-modernization-review.md)
4. [Canvas Route Composition Component](./canvas-route-composition-component.md)
5. [Canvas Authoring Runtime Component](./canvas-authoring-runtime-component.md)
6. [Canvas Authoring Projection Component](./canvas-authoring-projection-component.md)
7. [Canvas Draft Session Component](./canvas-draft-session-component.md)
8. [Canvas Graph Lifecycle Component](./canvas-graph-lifecycle-component.md)
9. [Graph Sequences And State Machines](./graph-sequences-and-state-machines.md)
10. [Graph Canvas Runtime Model](./graph-canvas-runtime-model.md)
11. [Graph Decision Rationale And Patterns](./graph-decision-rationale-and-patterns.md)

## Evolution Direction

Near-term:

- finish the TF-E2 authoring lifecycle under one draft authority
- keep shared write semantics inside command seams, not adapter hooks
- keep route startup explicit for every graph-adjacent route
- close proof and operability coverage for the graph pack

Long-term:

- Graph remains one bounded frontend authoring context
- the authoring core follows DDD plus tactical CQRS plus hexagonal layering
- the route edge remains Fowler-compatible through explicit facades and
  presentation models
- the shell consumes graph route contracts but does not own graph domain rules

## Related Pages

- [Graph Architecture Docs](./index.md)
- [web component](../index.md)
- [UX Implementation Guide](../ux-implementation-guide.md)
- [System Delivery Status](../../../../system-delivery-status.md)
