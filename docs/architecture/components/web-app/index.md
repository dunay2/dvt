---
title: apps/web
status: Draft
owner: UI / Visualization Domain
last_reviewed: 2026-03-15
---

# apps/web

## Component Map

```mermaid
flowchart LR
  web[apps/web]
  api[apps/api]
  engine[@dvt/engine]
  web --> api
  web --> engine
```

## Location

- apps/web

## Domain

- [UI / Visualization Domain](../domain-ui.md)

## Main Responsibilities

- User interface, visualization
- Root: WebAggregate (central web model)
- Aggregates: UIComponentAggregate
- Ensures user interaction, visualization, and status display

## Explanation

apps/web is responsible for user interaction, visualization, and status display:

- **Root:** [WebAggregate](web-app.md#webaggregate) — represents the central web model, owning UI components and visualization logic.
- **Aggregates:** [UIComponentAggregate](web-app.md#uicomponentaggregate).
- **Responsibilities:**
  - Display run status and workflow progress.
  - Enable user interaction and monitoring.
  - Integrate with API and engine.

**Interactions:**

- **[API](api.md):** Receives status queries and exposes endpoints.
- **[Engine](engine.md):** Receives workflow status for display.

Web coordinates these interactions to ensure user interaction, visualization, and status display.

## WebAggregate

Represents the central web model, owning UI components and visualization logic. Responsible for:

- Managing UI components
- Managing visualization logic
- Reporting web status

## UIComponentAggregate

Represents UI component management for web. Responsible for:

- Storing UI components
- Managing UI operations
- Reporting UI status

## Restrictions

- Must comply with UI contracts and API definitions
- Only interacts with UI domain, API, and engine

## Related Documentation

- [Component Map](../component-map.md)
- [UI / Visualization Domain](../domain-ui.md)

## Detailed Documentation

- [DDD Structure](web-app-ddd.md)
- [Functionalities](web-app-functional.md)
- [Constraints & Invariants](web-app-constraints.md)
- [Sequence Diagrams](web-app-sequence.md)
