---
title: Server-owned Effective Workspace Context
status: Accepted
date: 2026-05-10
owners:
  - API
  - Web
arc_level: ARC-1
---

# ADR-0055: Server-owned Effective Workspace Context

## Status

Accepted.

## Context

The web UI uses tenant, project, and environment scope for protected runtime
queries and commands. Before this ADR, API mode could build that scope from
frontend defaults and localStorage through `sessionStore`, then send it through
headers or query parameters. Protected backend routes still enforced
authorization, but the browser could present or attempt an ungranted workspace
scope before denial.

One possible remediation was to extend `GET /session` with effective workspace
context. That would make the session endpoint responsible for both
authentication profile and workspace read-model selection.

## Decision

Do not extend `GET /session` with effective workspace selection.

Add a distinct query rail:

- Name: `GetEffectiveWorkspaceContext`
- Surface: `GET /workspace/context`
- Owner: Protected runtime workspace context
- Input authority: authenticated principal plus backend grant store
- Output: effective workspace context and granted workspace options

`GET /session` remains responsible for authenticated principal profile and
grants. The workspace-context query owns tenant/project/environment selection
for protected web API mode.

The web protected-route gate must resolve session first, then resolve effective
workspace context, and only then allow protected route rendering. The browser
may display and cache the granted context as a projection, but must not invent
it as product authority in API mode.

## Consequences

Positive:

- Session and workspace context remain separate bounded read models.
- Protected route startup gets one server-owned scope before Canvas, Runs, and
  workspace services read `sessionStore`.
- Future workspace selectors can mutate server-validated preferences without
  changing authentication profile shape.

Costs:

- One additional protected API query runs during API-mode route gating.
- Existing session documentation and tests must distinguish session from
  workspace context.
- The current `sessionStore` remains a projection until a later slice removes
  local selector authority completely.

## Validation

- `apps/api/test/entrypoints/http/workspaceContextRoute.test.ts`
- `apps/api/test/infrastructure/auth/embeddedWorkspaceContextQuery.test.ts`
- `apps/web/src/app/services/session/protectedRouteSessionContext.test.ts`
- `apps/web/src/app/services/session/protectedRouteSessionContext.architecture.test.ts`
