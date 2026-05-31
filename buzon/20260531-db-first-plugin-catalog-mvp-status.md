---
title: DB-first Plugin Catalog MVP — Iteration Status
status: Draft
owner: Codex / Web / API / Architecture
last_reviewed: 2026-05-31
planning_type: status
---

# DB-first Plugin Catalog MVP — Iteration Status

## Summary

Implemented the first DB-backed `ListWorkspacePlugins` slice so the Plugins view
can consume a protected API read model instead of treating `PLUGIN_REGISTRY` as
catalog authority.

The static frontend registry remains only a UI contribution enrichment source.
The DB/API catalog is now the product-facing plugin list for the Plugins route.

## Implemented surfaces

### API

- Added `IWorkspacePluginCatalogRepository` and workspace plugin DTOs.
- Added `ListWorkspacePluginsUseCase`.
- Added `EmbeddedWorkspacePluginCatalogRepository` with embedded migration and
  bootstrap rows for built-in plugins.
- Added `workspace:plugins:view` authorization action.
- Added protected `GET /workspace/plugins` route.
- Mounted the route in protected runtime route registration.
- Added plugin catalog repository migration to protected runtime startup.
- Granted `workspace:plugins:view` to newly onboarded project workspaces.

### Web

- Added workspace plugins HTTP endpoint helper.
- Added API-backed `IWorkspacePluginCatalogQueryPort` implementation.
- Wired app services and workspace ports to use the DB-backed catalog port.
- Added TanStack query key/hook for the plugin catalog.
- Updated Plugins view to load catalog data.
- Updated Plugins route workbench to render DB catalog rows and use local
  `PLUGIN_REGISTRY` only for UI contribution enrichment.
- Added explicit loading and error states for plugin catalog failures.

### Tests added/updated

- API route test for `GET /workspace/plugins` authentication, missing scope, and
  successful authorized query.
- API repository test for enabled DB-backed plugin projection and migration SQL.
- Runtime route registration test expects `/workspace/plugins`.
- Protected runtime composition test expects plugin catalog migration.
- Project onboarding repository test expects `workspace:plugins:view` grant.
- Web adapter test proves `getPlugins()` calls the scoped `/workspace/plugins`
  endpoint and no longer belongs to unsupported workspace operations.

## Critical notes

- Tests were authored but not executed in this tool session because the local
  checked-out repository is not available in the execution sandbox.
- Branch is behind `main`; rebase or merge from main before opening/merging PR.
- The slice deliberately does not implement plugin install/update/delete command
  rails, marketplace, sandbox execution changes, or remote frontend module
  loading.

## Suggested validation commands

```bash
pnpm --filter dvt-api test -- workspacePluginCatalogRoutes.test.ts EmbeddedWorkspacePluginCatalogRepository.test.ts
pnpm --filter dvt-api test -- registerProtectedRuntimeRoutes.test.ts protectedRuntimeComposition.test.ts embeddedProjectOnboardingRepository.test.ts
pnpm --filter dvt-web test -- workspacePorts.api.test.ts
pnpm --filter dvt-api typecheck
pnpm --filter dvt-web typecheck
```

## Residual risks

1. Exact API test mocks may need minor type tightening if strict test tsconfig
   rejects structural value objects in authorization context.
2. The branch needs to be rebased against current `main` because main advanced
   while this branch was being implemented.
3. A later slice should add DB command rails for plugin registration/update and
   normalized capability/readiness rows.
