---
title: Subsystem Architecture
status: Active
owner: Architecture / Docs
last_reviewed: 2026-04-09
---

# Subsystem Architecture

Subsystem pages document end-to-end flows across components.

A subsystem is not a package and it is not a second home for a component.
Subsystem docs exist to explain how several canonical components cooperate to
serve a product capability.

## Rules

- `docs/architecture/components/<component>/` is the canonical home for a real
  workspace component.
- subsystem pages explain flow, source of truth, handoffs, and dependency
  direction;
- subsystem pages must link back to the canonical component pages they compose;
- domain pages remain a separate ownership view.

## Current Subsystem Entry Points

- [Canonical run lifecycle](./canonical-run-lifecycle/index.md): the
  implemented run-state machine and the end-to-end command to event flow.
- [Read subsystem](./read/index.md): operator read flows from browser to backend,
  read models, and engine-backed enrichment.
- [Runtime subsystem](./runtime/index.md): governed runtime component grouping
  across engine, run domain, state-store, delivery, interpretation,
  verification, DSL, deterministic utilities, and CLI validation.

## Navigation Model

```mermaid
flowchart LR
  System["System"] -.-> Subsystem["Subsystem flow"]
  Subsystem --> Components["Canonical components"]
  Components --> Domains["Cross-cutting domain and ownership views"]
```

## Related Pages

- [System Architecture](../index.md)
- [Architecture Component Surfaces](../../components/index.md)
- [DVT Domain Map](../../domain-map.md)
