---
title: F-17-F Fowler Analysis - Workspace Diff Backend Rail
status: Accepted
date: 2026-05-22
owners:
  - apps/api
  - apps/web
task_id: F-17
---

# F-17-F Fowler Analysis - Workspace Diff Backend Rail

## Context

F-17 had completed Monaco presentation surfaces for Diff, Artifacts,
Templates, Code, and bundle isolation. The remaining architectural gap was that
`GetWorkspaceDiffChanges` existed in web docs and mock doubles, but API mode
still rejected it before transport.

## Fowler Signals

| Signal               | Evidence                                                          | Remediation                                                                                                              |
| -------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Primitive obsession  | The web adapter knew the rail name only as an unsupported string. | Promote the rail to `PROTECTED_RUNTIME_WORKSPACE_COMMAND_QUERY_RAILS`.                                                   |
| Feature envy         | Diff route depended on frontend fixture semantics for diff rows.  | Move authoritative reads behind `GET /workspace/diff/changes`.                                                           |
| Shotgun surgery risk | Workspace scope parsing repeats across workspace reads.           | Keep the first rail aligned with file-read behavior; extract a shared scope parser in a later purely mechanical cleanup. |
| Documentation drift  | Workspace component docs said diff was unavailable in API mode.   | Update component docs and diagrams to the accepted protected endpoint.                                                   |

## Applied Patterns

- Introduce Gateway: `workspaceDiffChangesHttp.ts` centralizes the web endpoint.
- Repository: `LocalWorkspaceDiffChangesRepository` owns artifact-backed reads.
- Service Layer: `ListWorkspaceDiffChangesUseCase` keeps HTTP separate from read
  model retrieval.
- Semantic Fitness Function: `workspaceDiffChangesQueryRail.architecture.test.ts`
  guards route registration, rail catalog, docs, and web adapter posture.

## Invariants

- `GetWorkspaceDiffChanges` is a query, not a command.
- The route is scoped by tenant, project, and environment.
- The route authorizes `workspace:diff:view`.
- Missing `target/diff_changes.json` means no published diff read model and
  returns `[]`.
- Malformed diff artifacts fail closed with `invalid_workspace_diff_changes`.
- The web adapter must call the scoped protected endpoint, not a bare
  `/diff/changes` route.

## Future Lessons

- Presentation work that names a backend rail should create the backend rail
  before removing the fail-closed adapter posture.
- Contract promotion to `@dvt/contracts` should happen when response metadata
  or multi-adapter reuse appears. This slice avoided ARC-2 by keeping the DTO
  local and shape-compatible.
- The repeated workspace scope parser is now a visible refactor opportunity,
  but not a behavioral blocker.
