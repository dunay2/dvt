---
title: @dvt/contracts
status: Draft
owner: Shared Boundary Domain
last_reviewed: 2026-03-15
---

# @dvt/contracts

## Component Map

```mermaid
flowchart LR
  contracts[@dvt/contracts]
  engine[@dvt/engine]
  api[apps/api]
  web[@dvt/web]
  contracts --> engine
  contracts --> api
  contracts --> web
```

## Location

- packages/@dvt/contracts

## Domain

- [Shared Boundary Domain](../domain-shared.md)

## Main Responsibility

- Define contracts and types for the DVT system

## Explanation

@dvt/contracts formalizes interfaces, types, and contracts used across domains. It ensures consistency and validation of events and data.

## Restrictions

- Must comply with contract governance and versioning
- Used by multiple domains, but must not leak domain-specific logic

## Related Documentation

- [Component Map](../component-map.md)
- [Shared Boundary Domain](../domain-shared.md)

## Detailed Documentation

- [DDD Structure](./contracts-ddd.md)
- [Functionalities](./contracts-functional.md)
- [Constraints & Invariants](./contracts-constraints.md)
- [Sequence Diagrams](./contracts-sequence.md)
