---
title: DB-First Plugin Catalog MVP Plan
status: Implemented
owner: Web / API / Architecture
last_reviewed: 2026-06-01
planning_type: mandatory
---

# DB-First Plugin Catalog MVP Plan

## Purpose

Implement the first DB-backed `ListWorkspacePlugins` slice so the Plugins route
uses a protected API read model instead of treating the frontend
`PLUGIN_REGISTRY` as product catalog authority.

This is a hard-cut pre-alpha slice. It does not add compatibility behavior for
previously persisted project grants. Supported project grants are the canonical
current grant policy emitted by project onboarding.

## Scope

Included:

- Add the protected `ListWorkspacePlugins` query rail.
- Add an API repository and use case for the workspace plugin catalog read
  model.
- Add protected `GET /workspace/plugins`.
- Wire the web workspace plugin catalog port to the protected API.
- Keep frontend plugin contributions as presentation enrichment only.

Excluded:

- Plugin install, update, delete, enable, or disable commands.
- Marketplace, sandbox execution, and remote frontend module loading.
- Compatibility or backfill for pre-alpha persisted grant rows.
- Changing runtime plugin execution authority.

## Feature Mechanization

```feature-mechanization
version: 1
featureId: E-DB-FIRST-PLUGIN-CATALOG-MVP-20260601
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/e-db-first-plugin-catalog-mvp-plan-20260601.md
componentGuides:
  - docs/architecture/components/web/workspace/workspace-port-decomposition-component.md
  - docs/architecture/components/web/workspace/workspace-port-decomposition-user-stories.md
  - docs/planning/reviews/20260510-web-api-integration-gap-review.md
userStories:
  - docs/architecture/components/web/workspace/workspace-port-decomposition-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/reference-architecture.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/frontend-and-ux/e-db-first-plugin-catalog-mvp-plan-20260601.md
  - docs/architecture/components/web/workspace/workspace-port-decomposition-component.md
  - docs/architecture/components/web/workspace/workspace-port-decomposition-user-stories.md
  - docs/planning/reviews/20260510-web-api-integration-gap-review.md
  - docs/**/index.md
  - docs/.manifest.json
  - apps/api/src/application/ports/accessDecisionActions.ts
  - apps/api/src/application/ports/protectedRuntimeRailVocabulary.ts
  - apps/api/src/application/ports/protectedRuntimeWorkspaceCommandQueryRails.ts
  - apps/api/src/application/ports/workspacePluginCatalog.ts
  - apps/api/src/application/services/listWorkspacePluginsUseCase.ts
  - apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts
  - apps/api/src/entrypoints/http/runtimeRoutes.constants.ts
  - apps/api/src/entrypoints/http/workspacePluginCatalogRouteGroup.ts
  - apps/api/src/entrypoints/http/workspacePluginCatalogRoutes.ts
  - apps/api/src/infrastructure/auth/embeddedProjectOnboardingRepository.ts
  - apps/api/src/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.ts
  - apps/api/src/modules/buildProtectedRuntimeModule.ts
  - apps/api/src/modules/protectedRuntime/buildProtectedSecurityRuntime.ts
  - apps/api/src/modules/types.ts
  - apps/api/test/app/protectedRuntimeAppTestSupport.ts
  - apps/api/test/app/protectedRuntimeComposition.test.ts
  - apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts
  - apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
  - apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
  - apps/api/test/infrastructure/auth/embeddedProjectOnboardingRepository.test.ts
  - apps/api/test/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.test.ts
  - apps/api/test/modules/registerOperationalHooks.cases.ts
  - apps/web/src/app/queries/queryKeys.ts
  - apps/web/src/app/queries/workspaceQueries.ts
  - apps/web/src/app/services/composition/appServices.ts
  - apps/web/src/app/services/workspace/workspaceErrors.ts
  - apps/web/src/app/services/workspace/workspacePluginCatalog.api.ts
  - apps/web/src/app/services/workspace/workspacePluginsHttp.ts
  - apps/web/src/app/services/workspace/workspacePorts.api.test.ts
  - apps/web/src/app/services/workspace/workspacePorts.ts
  - apps/web/src/app/services/workspace/workspacePortsApi.test.harness.ts
  - apps/web/src/app/types/dbt.ts
  - apps/web/src/app/views/PluginsView.tsx
  - apps/web/src/app/views/plugins/PluginsRouteWorkbench.tsx
  - apps/web/src/app/views/plugins/pluginsViewModel.ts
forbiddenImplementationSurfaces:
  - packages/**
  - specs/contracts/**
  - apps/api/src/application/services/startRunFacade.ts
  - apps/api/src/application/services/planPreviewUseCase.ts
  - apps/api/src/infrastructure/temporal/**
  - apps/web/src/app/plugins/**/runtime/**
commandQueryRails:
  - name: ListWorkspacePlugins
    type: query
    dddOwner: Runtime plugin catalog read model
  - name: CreateProject
    type: command
    dddOwner: Project onboarding aggregate
domainObjects:
  - name: WorkspacePluginCatalog
    type: read model
    owner: API protected runtime
  - name: IWorkspacePluginCatalogQueryPort
    type: web query port
    owner: Web workspace composition
  - name: workspace:plugins:view
    type: authorization action
    owner: Protected runtime authorization
fowlerSignals:
  - Frontend static registry was acting as product catalog authority.
  - Workspace plugin query existed as a web port without a backend rail.
  - Plugin catalog readiness must be separate from runtime execution.
architectureGuards:
  - pnpm --filter dvt-api test -- test/entrypoints/http/workspacePluginCatalogRoutes.test.ts test/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.test.ts test/infrastructure/auth/embeddedProjectOnboardingRepository.test.ts
  - pnpm --filter dvt-api test -- test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts
  - pnpm --filter @dvt/web test -- src/app/services/workspace/workspacePorts.api.test.ts src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts src/app/views/PluginsView.test.tsx
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - protected query rail and route workbench rendering only
completionGate:
  - pnpm docs:sync
  - pnpm docs:status:generate
  - pnpm --filter dvt-api test -- test/entrypoints/http/workspacePluginCatalogRoutes.test.ts test/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.test.ts test/infrastructure/auth/embeddedProjectOnboardingRepository.test.ts test/app/protectedRuntimeComposition.test.ts test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts
  - pnpm --filter @dvt/web test -- src/app/services/workspace/workspacePorts.api.test.ts src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts src/app/views/PluginsView.test.tsx
  - pnpm --filter dvt-api typecheck
  - pnpm --filter @dvt/web typecheck
  - pnpm verify:prepush
redGreenCycles:
  - id: db-first-plugin-catalog-query-rail
    redTest: pnpm --filter @dvt/web test -- src/app/services/workspace/workspacePorts.api.test.ts
    expectedFailure: The workspace plugin catalog API port still rejects ListWorkspacePlugins as unsupported.
    patchSurfaces:
      - apps/web/src/app/services/workspace/workspacePluginCatalog.api.ts
      - apps/web/src/app/services/workspace/workspacePluginsHttp.ts
      - apps/api/src/entrypoints/http/workspacePluginCatalogRoutes.ts
    greenTest: pnpm --filter @dvt/web test -- src/app/services/workspace/workspacePorts.api.test.ts
symbols:
  - name: AUTHORIZATION_ACTION_NAME
    path: apps/api/src/application/ports/accessDecisionActions.ts
    dddOwner: Protected runtime authorization vocabulary
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Workspace plugin query requires an explicit action grant.]
    architectureGuard: pnpm --filter dvt-api test -- test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
    cypressCoverage: N/A - API route authorization only
    unitTests:
      - apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
  - name: IWorkspacePluginCatalogRepository
    path: apps/api/src/application/ports/workspacePluginCatalog.ts
    dddOwner: Runtime plugin catalog read model
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Runtime catalog read authority belongs behind an API port.]
    architectureGuard: pnpm --filter dvt-api test -- test/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.test.ts
    cypressCoverage: N/A - repository projection only
    unitTests:
      - apps/api/test/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.test.ts
  - name: WorkspacePluginCatalogScope
    path: apps/api/src/application/ports/workspacePluginCatalog.ts
    dddOwner: Runtime plugin catalog read model
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Workspace plugin reads are scoped to tenant, project, and environment.]
    architectureGuard: pnpm --filter dvt-api test -- test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
    cypressCoverage: N/A - API route scope parsing only
    unitTests:
      - apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
  - name: WorkspacePluginDescriptor
    path: apps/api/src/application/ports/workspacePluginCatalog.ts
    dddOwner: Runtime plugin catalog read model
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Plugin catalog descriptors are projected read models.]
    architectureGuard: pnpm --filter dvt-api test -- test/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.test.ts
    cypressCoverage: N/A - repository projection only
    unitTests:
      - apps/api/test/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.test.ts
  - name: ListWorkspacePluginsUseCase
    path: apps/api/src/application/services/listWorkspacePluginsUseCase.ts
    dddOwner: Runtime plugin catalog read model
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Expose plugin catalog reads through a use case instead of route-local SQL.]
    architectureGuard: pnpm --filter dvt-api test -- test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
    cypressCoverage: N/A - API use case only
    unitTests:
      - apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
  - name: registerProtectedWorkspacePluginCatalogRouteGroup
    path: apps/api/src/entrypoints/http/workspacePluginCatalogRouteGroup.ts
    dddOwner: Protected runtime route composition
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Route groups implement rails instead of inventing local semantics.]
    architectureGuard: pnpm --filter dvt-api test -- test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
    cypressCoverage: N/A - route registration only
    unitTests:
      - apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
  - name: WorkspacePluginCatalogRouteDeps
    path: apps/api/src/entrypoints/http/workspacePluginCatalogRoutes.ts
    dddOwner: Protected workspace plugin catalog HTTP adapter
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Route dependencies remain explicit and injectable.]
    architectureGuard: pnpm --filter dvt-api test -- test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
    cypressCoverage: N/A - route unit only
    unitTests:
      - apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
  - name: WorkspacePluginCatalogQuery
    path: apps/api/src/entrypoints/http/workspacePluginCatalogRoutes.ts
    dddOwner: Protected workspace plugin catalog HTTP adapter
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Scope arrives through explicit query parameters.]
    architectureGuard: pnpm --filter dvt-api test -- test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
    cypressCoverage: N/A - route unit only
    unitTests:
      - apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
  - name: ParsedWorkspacePluginCatalogScope
    path: apps/api/src/entrypoints/http/workspacePluginCatalogRoutes.ts
    dddOwner: Protected workspace plugin catalog HTTP adapter
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [HTTP strings are parsed into domain scope value objects.]
    architectureGuard: pnpm --filter dvt-api test -- test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
    cypressCoverage: N/A - route unit only
    unitTests:
      - apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
  - name: ParseResult
    path: apps/api/src/entrypoints/http/workspacePluginCatalogRoutes.ts
    dddOwner: Protected workspace plugin catalog HTTP adapter
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Scope parse failures fail closed before authorization.]
    architectureGuard: pnpm --filter dvt-api test -- test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
    cypressCoverage: N/A - route unit only
    unitTests:
      - apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
  - name: registerWorkspacePluginCatalogRoutes
    path: apps/api/src/entrypoints/http/workspacePluginCatalogRoutes.ts
    dddOwner: Protected workspace plugin catalog HTTP adapter
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [HTTP route adapts the protected query rail.]
    architectureGuard: pnpm --filter dvt-api test -- test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
    cypressCoverage: N/A - route unit only
    unitTests:
      - apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
  - name: authenticateWorkspacePluginCatalogRequest
    path: apps/api/src/entrypoints/http/workspacePluginCatalogRoutes.ts
    dddOwner: Protected workspace plugin catalog HTTP adapter
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Authentication precedes catalog reads.]
    architectureGuard: pnpm --filter dvt-api test -- test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
    cypressCoverage: N/A - route unit only
    unitTests:
      - apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
  - name: parseWorkspacePluginCatalogScope
    path: apps/api/src/entrypoints/http/workspacePluginCatalogRoutes.ts
    dddOwner: Protected workspace plugin catalog HTTP adapter
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Scope parsing is centralized before authorization.]
    architectureGuard: pnpm --filter dvt-api test -- test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
    cypressCoverage: N/A - route unit only
    unitTests:
      - apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
  - name: parseRequiredTenantId
    path: apps/api/src/entrypoints/http/workspacePluginCatalogRoutes.ts
    dddOwner: Protected workspace plugin catalog HTTP adapter
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Tenant scope is mandatory for protected catalog reads.]
    architectureGuard: pnpm --filter dvt-api test -- test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
    cypressCoverage: N/A - route unit only
    unitTests:
      - apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
  - name: parseRequiredProjectId
    path: apps/api/src/entrypoints/http/workspacePluginCatalogRoutes.ts
    dddOwner: Protected workspace plugin catalog HTTP adapter
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Project scope is mandatory for protected catalog reads.]
    architectureGuard: pnpm --filter dvt-api test -- test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
    cypressCoverage: N/A - route unit only
    unitTests:
      - apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
  - name: parseRequiredEnvironmentId
    path: apps/api/src/entrypoints/http/workspacePluginCatalogRoutes.ts
    dddOwner: Protected workspace plugin catalog HTTP adapter
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Environment scope is mandatory for protected catalog reads.]
    architectureGuard: pnpm --filter dvt-api test -- test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
    cypressCoverage: N/A - route unit only
    unitTests:
      - apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
  - name: EmbeddedWorkspacePluginCatalogRepository
    path: apps/api/src/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.ts
    dddOwner: Runtime plugin catalog read model
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [DB-backed catalog rows are the product catalog authority.]
    architectureGuard: pnpm --filter dvt-api test -- test/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.test.ts
    cypressCoverage: N/A - repository projection only
    unitTests:
      - apps/api/test/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.test.ts
  - name: Queryable
    path: apps/api/src/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.ts
    dddOwner: Runtime plugin catalog repository adapter
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Repository dependency is narrowed to query execution.]
    architectureGuard: pnpm --filter dvt-api test -- test/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.test.ts
    cypressCoverage: N/A - repository projection only
    unitTests:
      - apps/api/test/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.test.ts
  - name: WorkspacePluginRow
    path: apps/api/src/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.ts
    dddOwner: Runtime plugin catalog repository adapter
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [DB rows are projected into catalog descriptors.]
    architectureGuard: pnpm --filter dvt-api test -- test/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.test.ts
    cypressCoverage: N/A - repository projection only
    unitTests:
      - apps/api/test/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.test.ts
  - name: projectPluginRow
    path: apps/api/src/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.ts
    dddOwner: Runtime plugin catalog repository adapter
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Projection shape is owned by the repository adapter.]
    architectureGuard: pnpm --filter dvt-api test -- test/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.test.ts
    cypressCoverage: N/A - repository projection only
    unitTests:
      - apps/api/test/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.test.ts
  - name: normalizeStringArray
    path: apps/api/src/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.ts
    dddOwner: Runtime plugin catalog repository adapter
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Catalog array values are normalized at the DB adapter boundary.]
    architectureGuard: pnpm --filter dvt-api test -- test/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.test.ts
    cypressCoverage: N/A - repository projection only
    unitTests:
      - apps/api/test/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.test.ts
  - name: quoteIdentifier
    path: apps/api/src/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.ts
    dddOwner: Runtime plugin catalog repository adapter
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Schema identifiers are escaped locally at SQL boundary.]
    architectureGuard: pnpm --filter dvt-api test -- test/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.test.ts
    cypressCoverage: N/A - repository projection only
    unitTests:
      - apps/api/test/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.test.ts
  - name: createPrincipal
    path: apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
    dddOwner: Protected workspace plugin catalog route test
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Route authorization tests use explicit principal fixtures.]
    architectureGuard: pnpm --filter dvt-api test -- test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
    cypressCoverage: N/A - route unit only
    unitTests:
      - apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
  - name: WorkspacePluginCatalogRouteDeps
    path: apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
    dddOwner: Protected workspace plugin catalog route test
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Route test dependencies mirror the registered route contract.]
    architectureGuard: pnpm --filter dvt-api test -- test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
    cypressCoverage: N/A - route unit only
    unitTests:
      - apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
  - name: AuthorizeWorkspacePluginCatalog
    path: apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
    dddOwner: Protected workspace plugin catalog route test
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Route tests keep authorizer doubles typed to the route contract.]
    architectureGuard: pnpm --filter dvt-api test -- test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
    cypressCoverage: N/A - route unit only
    unitTests:
      - apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
  - name: createDeps
    path: apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
    dddOwner: Protected workspace plugin catalog route test
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Route dependencies are tested through explicit doubles.]
    architectureGuard: pnpm --filter dvt-api test -- test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
    cypressCoverage: N/A - route unit only
    unitTests:
      - apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts
  - name: useWorkspacePluginCatalogQuery
    path: apps/web/src/app/queries/workspaceQueries.ts
    dddOwner: Web workspace query hook
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Plugins route consumes a query hook rather than a local registry.]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/services/workspace/workspacePorts.api.test.ts
    cypressCoverage: N/A - route query only
    unitTests:
      - apps/web/src/app/services/workspace/workspacePorts.api.test.ts
  - name: createApiWorkspacePluginCatalogQueryPort
    path: apps/web/src/app/services/workspace/workspacePluginCatalog.api.ts
    dddOwner: Web workspace API adapter
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Web plugin catalog reads call the protected API rail.]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/services/workspace/workspacePorts.api.test.ts
    cypressCoverage: N/A - adapter unit only
    unitTests:
      - apps/web/src/app/services/workspace/workspacePorts.api.test.ts
  - name: WORKSPACE_PLUGINS_ENDPOINT
    path: apps/web/src/app/services/workspace/workspacePluginsHttp.ts
    dddOwner: Web workspace API adapter
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Endpoint strings are centralized for workspace plugin reads.]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/services/workspace/workspacePorts.api.test.ts
    cypressCoverage: N/A - adapter unit only
    unitTests:
      - apps/web/src/app/services/workspace/workspacePorts.api.test.ts
  - name: WorkspacePluginsResponse
    path: apps/web/src/app/services/workspace/workspacePluginsHttp.ts
    dddOwner: Web workspace API adapter
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [API response shape is explicit at the adapter boundary.]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/services/workspace/workspacePorts.api.test.ts
    cypressCoverage: N/A - adapter unit only
    unitTests:
      - apps/web/src/app/services/workspace/workspacePorts.api.test.ts
  - name: readWorkspacePluginsScope
    path: apps/web/src/app/services/workspace/workspacePluginsHttp.ts
    dddOwner: Web workspace API adapter
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Scope projection is centralized for plugin catalog reads.]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/services/workspace/workspacePorts.api.test.ts
    cypressCoverage: N/A - adapter unit only
    unitTests:
      - apps/web/src/app/services/workspace/workspacePorts.api.test.ts
  - name: buildWorkspacePluginsEndpoint
    path: apps/web/src/app/services/workspace/workspacePluginsHttp.ts
    dddOwner: Web workspace API adapter
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Scoped endpoint construction is tested at the adapter boundary.]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/services/workspace/workspacePorts.api.test.ts
    cypressCoverage: N/A - adapter unit only
    unitTests:
      - apps/web/src/app/services/workspace/workspacePorts.api.test.ts
  - name: Plugin
    path: apps/web/src/app/types/dbt.ts
    dddOwner: Web plugin catalog DTO
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Frontend DTO now carries DB-backed plugin catalog fields.]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/services/workspace/workspacePorts.api.test.ts
    cypressCoverage: N/A - DTO only
    unitTests:
      - apps/web/src/app/services/workspace/workspacePorts.api.test.ts
  - name: PluginsView
    path: apps/web/src/app/views/PluginsView.tsx
    dddOwner: Plugins route composition
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Route reads backend catalog data before rendering plugin readiness.]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    cypressCoverage: N/A - route composition only
    unitTests:
      - apps/web/src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
  - name: toCatalogPlugin
    path: apps/web/src/app/views/PluginsView.test.tsx
    dddOwner: Plugins route composition test
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Route tests project local contributions into explicit DB catalog rows.]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/PluginsView.test.tsx
    cypressCoverage: N/A - route presentation test only
    unitTests:
      - apps/web/src/app/views/PluginsView.test.tsx
  - name: buildPluginCatalogPayload
    path: apps/web/src/app/views/PluginsView.test.tsx
    dddOwner: Plugins route composition test
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Route tests declare the DB catalog instead of relying on local registry fallback.]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/PluginsView.test.tsx
    cypressCoverage: N/A - route presentation test only
    unitTests:
      - apps/web/src/app/views/PluginsView.test.tsx
  - name: createPluginCatalogQueryPort
    path: apps/web/src/app/views/PluginsView.test.tsx
    dddOwner: Plugins route composition test
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Route tests inject the ListWorkspacePlugins query port explicitly.]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/PluginsView.test.tsx
    cypressCoverage: N/A - route presentation test only
    unitTests:
      - apps/web/src/app/views/PluginsView.test.tsx
  - name: PluginsViewHeaderProps
    path: apps/web/src/app/views/plugins/PluginsRouteWorkbench.tsx
    dddOwner: Plugins route workbench
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Header displays DB catalog count separately from local contributions.]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    cypressCoverage: N/A - route workbench only
    unitTests:
      - apps/web/src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
  - name: pluginCapabilities
    path: apps/web/src/app/views/plugins/PluginsRouteWorkbench.tsx
    dddOwner: Plugins route workbench
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Catalog capabilities are projected into contribution capabilities.]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    cypressCoverage: N/A - route workbench only
    unitTests:
      - apps/web/src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
  - name: applyCatalogOverlay
    path: apps/web/src/app/views/plugins/PluginsRouteWorkbench.tsx
    dddOwner: Plugins route workbench
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [DB catalog rows overlay local presentation contributions.]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    cypressCoverage: N/A - route workbench only
    unitTests:
      - apps/web/src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
  - name: toCatalogContribution
    path: apps/web/src/app/views/plugins/PluginsRouteWorkbench.tsx
    dddOwner: Plugins route workbench
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [Backend-only plugins can be rendered without frontend registry entries.]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    cypressCoverage: N/A - route workbench only
    unitTests:
      - apps/web/src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
  - name: mergePluginCatalogWithLocalContributions
    path: apps/web/src/app/views/plugins/PluginsRouteWorkbench.tsx
    dddOwner: Plugins route workbench
    cqRails: [ListWorkspacePlugins]
    fowlerSignals: [DB catalog is source of truth and local registry enriches presentation only.]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    cypressCoverage: N/A - route workbench only
    unitTests:
      - apps/web/src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
```

## Acceptance Criteria

- `GET /workspace/plugins` authenticates, authorizes
  `workspace:plugins:view`, validates tenant/project/environment scope, and
  returns catalog descriptors from DB-backed rows.
- `IWorkspacePluginCatalogQueryPort.getPlugins()` calls the scoped protected API
  endpoint instead of throwing an unsupported-capability error.
- The Plugins route renders DB catalog rows and uses `PLUGIN_REGISTRY` only as
  local presentation enrichment.
- Newly created projects receive the canonical `workspace:plugins:view` grant.
- There is no compatibility backfill for pre-alpha grant rows.

## Validation

Run:

```bash
pnpm docs:sync
pnpm docs:status:generate
pnpm --filter dvt-api test -- test/entrypoints/http/workspacePluginCatalogRoutes.test.ts test/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.test.ts test/infrastructure/auth/embeddedProjectOnboardingRepository.test.ts test/app/protectedRuntimeComposition.test.ts test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts
pnpm --filter @dvt/web test -- src/app/services/workspace/workspacePorts.api.test.ts src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts src/app/views/PluginsView.test.tsx
pnpm --filter dvt-api typecheck
pnpm --filter @dvt/web typecheck
pnpm verify:prepush
```
