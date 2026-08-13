---
title: ADR-0062 - Server-owned granted workspace context and default
status: Accepted
date: 2026-05-10
owners:
  - API
  - Web
arc_level: ARC-1
---

# ADR-0062 - Server-Owned Granted Workspace Context And Default

## Status

Accepted.

Amended on 2026-08-13 by #2170 to distinguish the server-owned granted set and
default from the browser-owned validated selection.

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

Do not extend `GET /session` with workspace selection.

Add a distinct query rail:

- Name: `GetEffectiveWorkspaceContext`
- Surface: `GET /workspace/context`
- Owner: Protected runtime workspace context
- Input authority: authenticated principal plus backend grant store
- Output: a deterministic `defaultWorkspace` and the granted
  `availableWorkspaces`

`GET /session` remains responsible for authenticated principal profile and
grants. The workspace-context query owns the granted workspace set and its
deterministic sorted default. It does not persist or choose the user's current
workspace.

The web protected-route gate must resolve session first, then resolve workspace
context, and only then allow protected route rendering. The browser may retain
one selected workspace only while that exact identity remains in
`availableWorkspaces`; otherwise it must use `defaultWorkspace`. Browser state
is a validated selection projection, never grant or authorization authority.

## Consequences

Positive:

- Session and workspace context remain separate bounded read models.
- Protected route startup gets a server-validated scope before Canvas, Runs,
  and workspace services read `sessionStore`.
- Workspace selectors reuse the granted set without requiring a speculative
  server-side preference subsystem.

Costs:

- One additional protected API query runs during API-mode route gating.
- Existing session documentation and tests must distinguish session from
  workspace context.
- Selection is device-local until a measured product requirement justifies a
  separate server preference command and store.

## Validation

- `apps/api/test/entrypoints/http/workspaceContextRoute.test.ts`
- `apps/api/test/infrastructure/auth/embeddedWorkspaceContextQuery.test.ts`
- `apps/web/src/app/services/session/protectedRouteSessionContext.test.ts`
- `apps/web/src/app/services/session/protectedRouteSessionContext.architecture.test.ts`
