---
title: System Architecture
status: Active
owner: Architecture / Docs
last_reviewed: 2026-04-09
---

# System Architecture

This is the entrypoint for repository-wide system structure.

Use it when the question is:

- which subsystems exist today;
- how those subsystems compose real components;
- where to jump next for flow, component, or domain detail.

## Read This With

1. [Reference Architecture](../reference-architecture.md)
2. [System Delivery Status](../system-delivery-status.md)
3. [Subsystem Architecture](./subsystems/index.md)
4. [DVT Component Map](../component-map.md)
5. [DVT Domain Map](../domain-map.md)

## System To Subsystem Topology

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

## Routing Rule

- System pages explain composition and handoff between subsystems.
- Subsystem pages explain end-to-end flows across components.
- Component pages under `docs/architecture/components/` are the canonical home
  for a repo workspace and its public surface.
- Domain pages remain the ownership view; they do not replace subsystem or
  component docs.

## Current Active Routes

- [Canonical run lifecycle subsystem](./subsystems/canonical-run-lifecycle/index.md)
- [Subsystem Architecture](./subsystems/index.md)
- [DVT Component Map](../component-map.md)
- [DVT Domain Map](../domain-map.md)
- [DVT System Architecture](../system-overview.md)

## Related Pages

- [Architecture Surface Inventory 2026-04-02](../architecture-surface-inventory-20260402.md)
- [Architecture Component Surfaces](../components/index.md)
