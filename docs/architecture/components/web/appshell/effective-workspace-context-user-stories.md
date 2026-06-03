---
title: Effective Workspace Context User Stories
status: Active
owner: Web / API / Architecture
last_reviewed: 2026-05-10
planning_type: architecture
---

# Effective Workspace Context User Stories

## Purpose

These stories cover protected web API-mode workspace context resolution.

## Scenario Matrix

| Scenario | User intent                                       | Expected behavior                                               | Guard                   |
| -------- | ------------------------------------------------- | --------------------------------------------------------------- | ----------------------- |
| EWC-1    | Enter a protected route with a valid session      | UI resolves server-owned workspace context before rendering     | Unit, route             |
| EWC-2    | Enter with no authenticated session               | UI redirects to login and does not use local workspace defaults | Unit                    |
| EWC-3    | Enter with valid session but no granted workspace | UI denies protected route startup instead of inventing scope    | API route, web resolver |
| EWC-4    | Work after context resolution                     | Downstream API calls use the granted tenant/project scope       | Web resolver            |
| EWC-5    | Preserve session boundary                         | `/session` stays authentication-only                            | Architecture            |
| EWC-6    | Preserve local demo mode                          | Mock mode may use demo scope but remains outside API authority  | Documentation           |

## User Stories

### EWC-1: Resolve Granted Workspace Before Route Render

As an operator opening Canvas in API mode, I want the application to load the
workspace context granted by the backend before the route renders, so the UI
does not display a tenant/project/environment that the backend has not granted.

Acceptance:

- given `/session` succeeds;
- and `/workspace/context` returns an effective workspace;
- when a protected route is entered;
- then `sessionStore` is updated with that effective workspace;
- and only then does the protected route render.

### EWC-2: Do Not Use Local Defaults As Protected Authority

As a platform owner, I want local env and localStorage values to be ignored as
authority in API-mode route startup, so stale browser state cannot present an
ungranted workspace.

Acceptance:

- given localStorage contains a different tenant/project/environment;
- when `/workspace/context` returns the granted context;
- then the granted context replaces the local projection.

### EWC-3: Deny Startup Without Granted Workspace

As an operator without workspace grants, I want the app to stop at protected
route startup, so I do not see a workspace that I cannot use.

Acceptance:

- given `/session` succeeds;
- and `/workspace/context` returns forbidden;
- when a protected route is entered;
- then the route is not rendered;
- and the user sees the existing protected-route denial posture.

### EWC-4: Keep Session Endpoint Narrow

As an API maintainer, I want `GET /session` to remain a principal profile query,
so authentication does not absorb workspace-selection responsibilities.

Acceptance:

- given the API route files are inspected;
- then `sessionRoute.ts` does not return or import effective workspace context;
- and `workspaceContextRoute.ts` owns `GET /workspace/context`.

### EWC-5: Expose Granted Options For Future Selection

As a future project selector, I want the backend to return the granted workspace
options alongside the effective workspace, so a later selector can choose only
valid scopes.

Acceptance:

- given multiple workspaces are granted;
- when `/workspace/context` is called;
- then the response includes the effective workspace and granted options;
- and the effective workspace is one of those options.

## Coverage Map

```mermaid
flowchart LR
  Stories["EWC stories"] --> ApiRoute["workspaceContextRoute.test.ts"]
  Stories --> ApiQuery["embeddedWorkspaceContextQuery.test.ts"]
  Stories --> WebResolver["protectedRouteSessionContext.test.ts"]
  Stories --> Arch["protectedRouteSessionContext.architecture.test.ts"]
  Arch --> Docs["component guide and ADR"]
```
