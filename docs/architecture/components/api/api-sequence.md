---
title: api Sequence
status: Draft
owner: API / Entry Domain
last_reviewed: 2026-03-28
---

# api Sequence

## Main Flow: Plan Execution Request

```mermaid
sequenceDiagram
  participant Client as HTTP Client
  participant Auth as AuthMiddleware
  participant Route as RouteHandler
  participant Engine as @dvt/engine
  participant Delivery as @dvt/delivery

  Client->>Auth: POST /runs (bearer token)
  Auth->>Auth: validateToken(token)
  Auth-->>Route: AuthContext
  Route->>Route: validateRequestBody(req.body)
  Route->>Engine: triggerPlanExecution(planId, context)
  Engine-->>Route: RunId
  Route->>Delivery: getRunStatus(runId)
  Delivery-->>Route: RunStatus
  Route-->>Client: HTTP 202 { runId, status }
```

## Global Flow Position

`apps/api` is the outermost entry point of the DVT system. All external traffic — from CI pipelines, the web UI (`@dvt/web`), or other services — enters through this component. It delegates plan execution and signal handling to `@dvt/engine`, and delegates status queries to `@dvt/delivery`. It does not interact with adapters, the database, or Temporal directly. It is called by external HTTP clients and calls `@dvt/engine` and `@dvt/delivery`.

## Key Files

- `apps/api/src/index.ts`
- `apps/api/src/routes/`
- `apps/api/src/middleware/auth.ts`
