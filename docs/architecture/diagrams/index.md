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

- [Architecture Problem Register](./architecture-problem-register.md) -
  source-first current problem graph with explicit issue/epic ownership and a
  traceability rule preventing discovered problems from becoming lost work
- [Implementation Architecture Diagrams](./implementation-architecture-diagrams.md) -
  overview, domain model, package dependency graph, extracted-diagram navigation,
  and consolidated desired-architecture delta
- [Engine Internal Components](./engine-internal-components.md) -
  engine-layer topology, southbound ports, and runtime capability dispatch
- [Run State Machines](./run-state-machines.md) -
  run and step lifecycle diagrams plus active state-machine concerns
- [Start-run Sequences](./start-run-sequences.md) -
  `startRun`, `signal`, and `cancel` sequence diagrams
- [Maintenance And Reconciliation](./maintenance-and-reconciliation.md) -
  orphaned-intent and stuck-run reconciliation flows
- [Outbox Delivery Architecture](./outbox-delivery-architecture.md) -
  outbox worker flow, risks, and delivery architecture

## Related Pages

- [C4 Engine Architecture](../components/engine/architecture/c4-engine.md)
- [Domain Map](../domain-map.md)
- [Component Map](../component-map.md)
- [System Overview](../system-overview.md)
