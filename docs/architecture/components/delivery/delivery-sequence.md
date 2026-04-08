---
title: Delivery Sequence
status: Active
owner: Delivery / Docs
last_reviewed: 2026-04-07
topics:
  - Sequence Diagram
  - Runtime Flow Position
  - Key Files & References
---

# Delivery Sequence

## Sequence diagram

```mermaid
sequenceDiagram
  participant Runtime as Engine/API Runtime
  participant Delivery as @dvt/delivery
  participant Outbox as Outbox Worker
  participant Projector as Projector Worker
  participant Lineage as Lineage Worker

  Runtime->>Delivery: emit execution-side facts / admission signals
  Delivery->>Outbox: schedule delivery work
  Delivery->>Projector: schedule projection updates
  Delivery->>Lineage: schedule lineage publication
```

## Runtime flow position

Delivery consumes execution-side facts and pushes them into delivery,
projection, and lineage runtimes. It does not become the source of truth for
execution or planning state.

## Code anchors

- [OutboxWorkerRuntime.ts](../../../../packages/@dvt/delivery/src/application/OutboxWorkerRuntime.ts)
- [ProjectorWorkerRuntime.ts](../../../../packages/@dvt/delivery/src/application/ProjectorWorkerRuntime.ts)
- [LineageWorkerRuntime.ts](../../../../packages/@dvt/delivery/src/application/LineageWorkerRuntime.ts)
