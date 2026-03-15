---
title: apps/api
status: Draft
owner: API / Entry Domain
last_reviewed: 2026-03-15
---

# apps/api

## Component Map

```mermaid
flowchart LR
  api[apps/api]
  engine[@dvt/engine]
  delivery[@dvt/delivery]
  api --> engine
  api --> delivery
```

## Location

- apps/api

## Domain

- [API / Entry Domain](../domain-api.md)

## Main Responsibility

- HTTP API, routing, authentication, signal handling

## Explanation

apps/api exposes HTTP endpoints, manages routing and authentication, and handles signals for plan execution and status queries.

## Restrictions

- Must comply with API contracts and authentication requirements
- Only interacts with API domain, engine, and delivery

## Related Documentation

- [Component Map](../component-map.md)
- [API / Entry Domain](../domain-api.md)
