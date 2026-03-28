---
title: @dvt/web
status: Draft
owner: UI / Visualization Domain
last_reviewed: 2026-03-15
---

# @dvt/web

## Component Map

```mermaid
flowchart LR
  web[@dvt/web]
  api[apps/api]
  engine[@dvt/engine]
  web --> api
  web --> engine
```

## Location

- packages/@dvt/web

## Domain

- [UI / Visualization Domain](../domain-ui.md)

## Main Responsibility

- UI components, visualization, user interaction

## Explanation

@dvt/web provides UI components and visualization for the DVT system, interacting with API and engine.

## Restrictions

- Must comply with UI contracts and API definitions
- Only interacts with UI domain, API, and engine

## Related Documentation

- [Component Map](../component-map.md)
- [UI / Visualization Domain](../domain-ui.md)

## Detailed Documentation

- [DDD Structure](web-ddd.md)
- [Functionalities](web-functional.md)
- [Constraints & Invariants](web-constraints.md)
- [Sequence Diagrams](web-sequence.md)
