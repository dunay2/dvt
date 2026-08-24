---
title: System Architecture
status: Active
owner: Architecture / Docs
last_reviewed: 2026-08-24
---

# System Architecture

This is the entrypoint for repository-wide system structure.

Use it when the question is:

- which subsystems exist today;
- how those subsystems compose real components;
- where to jump next for flow, component, or domain detail;
- which accepted target subsystem boundaries are being introduced without
  claiming they are already implemented AS-IS.

## Read This With

1. [Reference Architecture](../reference-architecture.md)
2. [System Delivery Status](../system-delivery-status.md)
3. [Subsystem Architecture](./subsystems/index.md)
4. [DVT Component Map](../component-map.md)
5. [DVT Domain Map](../domain-map.md)
6. [Semantic Transformation Subsystem - VTX2 Target](./subsystems/semantic-transformation/index.md)

## System To Subsystem Topology

The following remains the current AS-IS system composition. Target VTX2
semantic transformation is documented separately below so accepted design does
not become false implementation evidence.

```mermaid
flowchart TB
  System["DVT system"] -.-> Lifecycle["Canonical run lifecycle"]
  System -.-> Read["Read subsystem"]
  System -.-> Authoring["Authoring and planning subsystem"]
  System -.-> Delivery["Delivery subsystem"]

  Lifecycle --> ApiExecution["apps/api"]
  Lifecycle --> Engine["@dvt/engine"]
  Lifecycle --> State["state-store"]
  Lifecycle --> Provider["provider adapters"]
  Lifecycle --> DeliveryFlow["@dvt/delivery"]

  Read --> Web["apps/web"]
  Read --> Api["apps/api"]
  Read --> EngineRead["@dvt/engine read and enrich services"]
  Read --> StateRead["@dvt/state-store read models"]

  Authoring --> WebAuthoring["apps/web"]
  Authoring --> ApiAuthoring["apps/api"]
  Authoring --> Planner["@dvt/planner"]

  Delivery --> DeliveryLib["@dvt/delivery"]
  Delivery --> Outbox["apps/outbox-worker"]
  Delivery --> Projector["apps/projector-worker"]
  Delivery --> Lineage["apps/lineage-worker"]
```

## Target VTX2 Semantic Transformation Route

ADR-0064 adds an accepted target subsystem boundary inside authoring/planning
without replacing the existing Flow/Execution architecture.

```mermaid
flowchart LR
  Inputs["SQL / Canvas / future language frontend"]
  Semantic["Pinned Substrait logical profile\n+ DVT stable identity sidecar"]
  Card["DVT card projection"]
  Renderer["Governed target renderer"]
  Provider["Provider-native readiness"]
  Planner["Existing generic Planner / ExecutionPlan"]

  Inputs --> Semantic
  Semantic --> Card
  Card --> Semantic
  Semantic --> Renderer
  Renderer --> Provider
  Provider --> Planner
```

See [Semantic Transformation Subsystem - VTX2 Target](./subsystems/semantic-transformation/index.md).

The accepted boundary keeps these concepts independent:

```text
Substrait logical operator count
!= Canvas card count
!= ExecutionPlan step count
```

## Routing Rule

- System pages explain composition and handoff between subsystems.
- Subsystem pages explain end-to-end flows across components.
- Component pages under `docs/architecture/components/` are the canonical home
  for a repo workspace and its public surface.
- Domain pages remain the ownership view; they do not replace subsystem or
  component docs.
- Target subsystem pages MUST identify themselves as target architecture until
  implementation evidence closes the gap to AS-IS.

## Current Active Routes

- [Canonical run lifecycle subsystem](./subsystems/canonical-run-lifecycle/index.md)
- [Distributed consistency model](./distributed-consistency-model.md)
- [Subsystem Architecture](./subsystems/index.md)
- [DVT Component Map](../component-map.md)
- [DVT Domain Map](../domain-map.md)
- [DVT System Architecture](../system-overview.md)

## Accepted Target Routes

- [Semantic Transformation Subsystem - VTX2 Target](./subsystems/semantic-transformation/index.md)

## Related Pages

- [Architecture Surface Inventory 2026-04-02](../architecture-surface-inventory-20260402.md)
- [Architecture Component Surfaces](../components/index.md)
- [ADR-0064 - Substrait semantic reference and bounded logical profile](../../adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md)
