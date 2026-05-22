---
title: F-17-F Workspace Diff Backend Rail Closeout
status: Accepted
date: 2026-05-22
owners:
  - apps/api
  - apps/web
task_id: F-17
---

# F-17-F Workspace Diff Backend Rail Closeout

## Summary

`GetWorkspaceDiffChanges` is now a protected runtime query rail instead of a
web-only unsupported capability.

## Rail

| Field                   | Value                                                   |
| ----------------------- | ------------------------------------------------------- |
| Name                    | `GetWorkspaceDiffChanges`                               |
| Kind                    | query                                                   |
| Bounded context         | Operational evidence read models                        |
| Read model              | `WorkspaceDiffChanges`                                  |
| Application port        | `ListWorkspaceDiffChangesUseCase`                       |
| Adapter surface         | `GET /workspace/diff/changes`                           |
| Scope and authorization | `workspace:diff:view`, tenant/project/environment scope |

## Behavior

- Scoped requests return `DiffChange[]` from `target/diff_changes.json`.
- Missing published diff artifact returns `[]`.
- Malformed diff artifact returns a canonical bad-request envelope with
  `invalid_workspace_diff_changes`.
- Missing token, denied action, and missing scope fail closed.
- The web API adapter now calls the scoped protected runtime endpoint.

## Validation

- `pnpm exec vitest run --config vitest.config.ts test/entrypoints/http/workspaceDiffChangesRoutes.test.ts test/architecture/workspaceDiffChangesQueryRail.architecture.test.ts test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts`
- `pnpm exec vitest run --config vitest.unit.config.ts src/app/services/workspace/workspacePorts.api.test.ts`
- `node --test scripts/run-dev-stack.auth.test.cjs`

Additional closeout validation is recorded in the final task report.
