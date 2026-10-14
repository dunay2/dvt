---
title: Architecture Diagram Catalog
status: Active
owner: Architecture / Docs
last_reviewed: 2026-08-28
---

# Architecture Diagram Catalog

Code-grounded visual architecture artifacts. Every diagram traces to shipped
source files and uses color coding to distinguish implemented (green) from
planned (orange) elements.

## Catalog

- [Architecture Problem Register](../reference-architecture.md#section-architecture-problem-register) -
  source-first current problem graph with explicit issue/epic ownership and a
  maintained traceability rule preventing discovered problems from becoming lost work
- [Implementation Architecture Diagrams](./implementation-architecture-diagrams.md) -
  overview, domain model, package dependency graph, extracted-diagram navigation,
  and consolidated desired-architecture delta
- [Engine Internal Components](./engine-internal-components.md) -
  engine-layer topology, southbound ports, and runtime capability dispatch
- [Run State Machines](../workflow-failure-handling-and-recovery.md#section-run-state-machines) -
  run and step lifecycle diagrams plus active state-machine concerns
- [Start-run Sequences](../components/engine/architecture/start-run-application-decomposition-diagrams.md#section-start-run-sequences) -
  `startRun`, `signal`, and `cancel` sequence diagrams
- [Maintenance And Reconciliation](../workflow-failure-handling-and-recovery.md#section-maintenance-and-reconciliation) -
  orphaned-intent and stuck-run reconciliation flows
- [Outbox Delivery Architecture](../domain-delivery.md#section-outbox-delivery-architecture) -
  outbox worker flow, risks, and delivery architecture

## Related Pages

- [C4 Engine Architecture](../components/engine/architecture/c4-engine.md)
- [Domain Map](../domain-map.md)
- [Component Map](../component-map.md)
- [System Overview](../reference-architecture.md#section-system-overview)
