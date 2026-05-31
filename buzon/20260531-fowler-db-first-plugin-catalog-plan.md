---
title: Fowler Plan — DB-first Plugin Catalog MVP
status: Draft
owner: Codex / Web / API / Architecture
last_reviewed: 2026-05-31
planning_type: implementation-plan
---

# Fowler Plan — DB-first Plugin Catalog MVP

## 1. Decision

Implement a small DB-first slice for the workspace plugin catalog.

The slice removes the permanent `ListWorkspacePlugins` frontend stub and makes the
protected API + PostgreSQL application DB the read authority for plugin catalog
entries. The frontend static `PLUGIN_REGISTRY` remains only a local contribution
source for UI modules that are already bundled into the web runtime.

This is intentionally smaller than plugin installation, marketplace, sandbox
execution, or remote module loading.

## 2. Root opportunity

| Finding | Root opportunity | Critical reading |
| --- | --- | --- |
| `createApiWorkspacePluginCatalogQueryPort().getPlugins()` fails closed forever with `workspace.plugins/ListWorkspacePlugins`. | Hidden authority + documentation drift. | The fail-closed posture was correct while the route did not exist, but it has become permanent product drift: the UI cannot prove whether backend plugin catalog data exists. |
| `PluginsRouteWorkbench` renders only `PLUGIN_REGISTRY`. | Hidden authority + duplicate semantics. | Static frontend registry is not a product catalog. It is a bundle-local contribution mechanism. Treating it as the catalog blocks DB-first evolution. |
| Capability probe can be healthy while plugin catalog is still static. | Boundary drift. | Capabilities and catalog are different read models. The UI must not infer catalog completeness from `/capabilities`. |

## 3. Fowler planning matrix

| scenario | opportunity | Fowler pattern | DDD owner | command/query rail | implementation surfaces | unit or package test | architecture test | user-flow test | out of scope |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| User opens Plugins and sees only static frontend plugins even when backend plugins exist. | Hidden authority | Repository + Read Model + Gateway adapter | `WorkspacePluginCatalog` read model | `ListWorkspacePlugins` query | `apps/api/src/application/ports/workspacePluginCatalog.ts`, `apps/api/src/application/services/listWorkspacePluginsUseCase.ts`, `apps/api/src/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.ts`, `apps/api/src/entrypoints/http/workspacePluginCatalogRoutes.ts`, `apps/web/src/app/services/workspace/workspacePorts.api.ts`, `apps/web/src/app/views/PluginsView.tsx`, `apps/web/src/app/views/plugins/PluginsRouteWorkbench.tsx` | API repository test: enabled scoped/global plugins are projected from DB and disabled rows are excluded. Web adapter test: `getPlugins()` calls scoped endpoint and returns DTOs. | Existing plugin table architecture test remains valid: table still owns dense UX and does not query directly. Add source-level guard that the API adapter no longer rejects `workspace.plugins`. | Not implemented in this slice; manual smoke via route + view is sufficient for MVP. | plugin installation, marketplace, sandbox execution, permissions editor, remote frontend module loading. |
| Backend plugin catalog route is unavailable. | Test-only confidence / hidden failure | Explicit error state | `PluginRegistryContent` presentation model | same `ListWorkspacePlugins` query | `PluginsView`, `PluginsRouteWorkbench`, `pluginsViewModel` | Web view/model test can be added later; MVP keeps explicit `ViewStateOverlay` branch. | Existing route-workbench ownership guard. | Not implemented. | detailed retry/backoff UX. |
| New projects created through onboarding miss plugin-catalog view grants. | Documentation drift / boundary drift | Policy list centralization | `ProjectOnboardingRepository` grant policy | `CreateProject` command updates project grants | `apps/api/src/infrastructure/auth/embeddedProjectOnboardingRepository.ts`, `apps/api/src/application/ports/accessDecisionActions.ts` | Existing project onboarding tests should assert workspace action list when expanded. | Not added in MVP. | Not needed. | full RBAC admin UI. |

## 4. Allowed implementation surfaces

- `buzon/20260531-fowler-db-first-plugin-catalog-plan.md`
- API application port/use-case/repository/route for workspace plugin catalog.
- Protected runtime composition root wiring for the new query use case.
- Existing auth action vocabulary, only to add `workspace:plugins:view`.
- Web workspace API adapter, query hook, and Plugins route composition.
- Focused unit tests around repository projection and frontend adapter endpoint.

No engine, planner, run state, Temporal, Conductor, or dbt execution files are
allowed in this slice.

## 5. Critical implementation rules

1. Fail closed on authentication and authorization.
2. Query scope is tenant/project/environment; the DB may expose global bootstrap
   rows, but only after the requested workspace has been authorized.
3. Disabled DB plugin rows must not be returned to the web catalog in the MVP.
4. The frontend must show an explicit catalog error if the DB-backed query fails.
5. Local static contributions may be additive, but DB rows are the catalog source
   of truth for backend-only plugin visibility.

## 6. Definition of Done

- `IWorkspacePluginCatalogQueryPort.getPlugins()` performs an HTTP query instead
  of throwing `WorkspaceApiCapabilityUnsupportedError`.
- Protected API exposes `GET /workspace/plugins?tenantId&projectId&environmentId`.
- PostgreSQL migration is embedded in the repository adapter and creates the
  plugin catalog table.
- A plugin row that exists only in DB can be projected into the Plugins route.
- The work leaves engine untouched.
- Unit tests cover repository projection and frontend adapter endpoint building.

## 7. Residual opportunity intentionally left

- Move plugin capabilities/readiness into a richer normalized DB model.
- Add write rails for registering/updating plugins.
- Add plugin lifecycle governance: install, enable, disable, version pinning.
- Add end-to-end browser proof once a backend fixture can seed DB plugin rows.
