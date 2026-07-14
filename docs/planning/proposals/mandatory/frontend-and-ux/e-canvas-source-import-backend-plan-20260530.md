---
title: E Canvas Source Import Backend Plan
status: Accepted
date: 2026-05-30
owners:
  - Web
  - API
planning_type: mandatory-plan
---

# E Canvas Source Import Backend Plan

## Feature Mechanization

```feature-mechanization
version: 1
featureId: E-CANVAS-SOURCE-IMPORT-BACKEND-1
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/e-canvas-source-import-backend-plan-20260530.md
componentGuides:
  - docs/architecture/components/web/workspace/workspace-port-decomposition-component.md
  - docs/architecture/command-query-rail-governance.md
  - docs/adr/ADR-0058-warehouse-source-import-rails.md
userStories:
  - buzon/20260530-codex-fowler-canvas-source-import-backend-gap-analysis.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/workspace/workspace-port-decomposition-component.md
  - docs/adr/ADR-0058-warehouse-source-import-rails.md
allowedImplementationSurfaces:
  - apps/api/src/application/ports/**
  - apps/api/src/application/services/**
  - apps/api/src/entrypoints/http/**
  - apps/api/src/infrastructure/warehouseSourceImport/**
  - apps/api/test/architecture/**
  - apps/api/test/entrypoints/http/**
  - apps/web/src/app/services/workspace/**
  - docs/adr/ADR-0058-warehouse-source-import-rails.md
  - docs/adr/index.md
  - docs/planning/closeouts/20260530-e-canvas-source-import-backend-closeout.md
  - docs/planning/proposals/mandatory/frontend-and-ux/e-canvas-source-import-backend-plan-20260530.md
  - docs/planning/proposals/index.md
  - docs/planning/proposals/mandatory/frontend-and-ux/index.md
  - docs/.manifest.json
forbiddenImplementationSurfaces:
  - packages/**
  - specs/contracts/**
  - apps/web/cypress/**
  - docs/archive/**
commandQueryRails:
  - name: ListWarehouseConnections
    type: query
    dddOwner: Warehouse source import
  - name: ListWarehouseConnectionSourceObjects
    type: query
    dddOwner: Warehouse source import
  - name: ImportWarehouseSources
    type: command
    dddOwner: Warehouse source import
domainObjects:
  - name: WarehouseConnectionCatalog
    type: read model
    owner: Warehouse source import
  - name: WorkspaceGraphAuthoringDraft
    type: aggregate
    owner: Workspace graph draft
  - name: IWarehouseSourceImportPort
    type: web adapter port
    owner: Web workspace integration
fowlerSignals:
  - API mode source import used a throw-only adapter
  - Frontend fixture authority was masking a missing backend rail
  - Source import must mutate the authoritative graph draft aggregate
architectureGuards:
  - pnpm --filter dvt-api test -- test/entrypoints/http/warehouseSourceImportRoutes.test.ts test/architecture/warehouseSourceImportRails.architecture.test.ts
  - pnpm --filter @dvt/web test:unit:run -- src/app/services/workspace/workspacePorts.api.test.ts
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - backend rail and adapter slice only
completionGate:
  - pnpm docs:sync
  - pnpm governance:refresh
  - pnpm --filter dvt-api test
  - pnpm --filter @dvt/web test:unit:run
  - pnpm --filter dvt-api typecheck
  - pnpm --filter @dvt/web typecheck
  - pnpm --filter dvt-api lint
  - pnpm --filter @dvt/web lint
  - pnpm verify:prepush
redGreenCycles:
  - id: api-warehouse-source-import-rails
    redTest: pnpm --filter dvt-api test -- test/entrypoints/http/warehouseSourceImportRoutes.test.ts test/architecture/warehouseSourceImportRails.architecture.test.ts
    expectedFailure: Warehouse source import API ports, routes, route group, and rail declarations do not exist.
    patchSurfaces:
      - apps/api/src/application/ports/warehouseSourceImport.ts
      - apps/api/src/application/services/importWarehouseSourcesUseCase.ts
      - apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts
      - apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts
      - apps/api/test/architecture/warehouseSourceImportRails.architecture.test.ts
    greenTest: pnpm --filter dvt-api test -- test/entrypoints/http/warehouseSourceImportRoutes.test.ts test/architecture/warehouseSourceImportRails.architecture.test.ts
  - id: web-source-import-api-adapter
    redTest: pnpm --filter @dvt/web test:unit:run -- src/app/services/workspace/workspacePorts.api.test.ts
    expectedFailure: API mode source import remains disabled and throws unavailable errors.
    patchSurfaces:
      - apps/web/src/app/services/workspace/workspacePorts.api.ts
      - apps/web/src/app/services/workspace/workspacePorts.api.test.ts
      - apps/web/src/app/services/workspace/workspacePorts.imports.test.ts
    greenTest: pnpm --filter @dvt/web test:unit:run -- src/app/services/workspace/workspacePorts.api.test.ts
xApiSymbol: &api_symbol
  dddOwner: Warehouse source import
  cqRails: [ListWarehouseConnections, ListWarehouseConnectionSourceObjects, ImportWarehouseSources]
  fowlerSignals: [API mode source import used a throw-only adapter]
  architectureGuard: pnpm --filter dvt-api test -- test/entrypoints/http/warehouseSourceImportRoutes.test.ts test/architecture/warehouseSourceImportRails.architecture.test.ts
  cypressCoverage: N/A - backend rail and adapter slice only
  unitTests:
    - apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts
    - apps/api/test/architecture/warehouseSourceImportRails.architecture.test.ts
xWebSymbol: &web_symbol
  dddOwner: Web workspace integration
  cqRails: [ListWarehouseConnections, ListWarehouseConnectionSourceObjects, ImportWarehouseSources]
  fowlerSignals: [Frontend fixture authority was masking a missing backend rail]
  architectureGuard: pnpm --filter @dvt/web test:unit:run -- src/app/services/workspace/workspacePorts.api.test.ts
  cypressCoverage: N/A - backend rail and adapter slice only
  unitTests:
    - apps/web/src/app/services/workspace/workspacePorts.api.test.ts
    - apps/web/src/app/services/workspace/workspacePorts.imports.test.ts
symbols:
  - <<: *api_symbol
    name: IWarehouseConnectionCatalog
    path: apps/api/src/application/ports/warehouseSourceImport.ts
  - <<: *api_symbol
    name: ImportWarehouseSourcesInput
    path: apps/api/src/application/ports/warehouseSourceImport.ts
  - <<: *api_symbol
    name: ImportWarehouseSourcesResult
    path: apps/api/src/application/ports/warehouseSourceImport.ts
  - <<: *api_symbol
    name: InvalidWarehouseSourceImportRequestError
    path: apps/api/src/application/ports/warehouseSourceImport.ts
  - <<: *api_symbol
    name: SourceImportGrouping
    path: apps/api/src/application/ports/warehouseSourceImport.ts
  - <<: *api_symbol
    name: WarehouseColumn
    path: apps/api/src/application/ports/warehouseSourceImport.ts
  - <<: *api_symbol
    name: WarehouseConnection
    path: apps/api/src/application/ports/warehouseSourceImport.ts
  - <<: *api_symbol
    name: WarehouseConnectionCatalogEntry
    path: apps/api/src/application/ports/warehouseSourceImport.ts
  - <<: *api_symbol
    name: WarehouseConnectionNotFoundError
    path: apps/api/src/application/ports/warehouseSourceImport.ts
  - <<: *api_symbol
    name: WarehouseConnectionType
    path: apps/api/src/application/ports/warehouseSourceImport.ts
  - <<: *api_symbol
    name: WarehouseSourceDraftMutation
    path: apps/api/src/application/ports/warehouseSourceImport.ts
  - <<: *api_symbol
    name: WarehouseSourceImportDraftConflictError
    path: apps/api/src/application/ports/warehouseSourceImport.ts
  - <<: *api_symbol
    name: SourceObject
    path: apps/api/src/application/ports/warehouseSourceImport.ts
  - <<: *api_symbol
    name: SourceObjectNotFoundError
    path: apps/api/src/application/ports/warehouseSourceImport.ts
  - <<: *api_symbol
    name: ImportWarehouseSourcesUseCase
    path: apps/api/src/application/services/importWarehouseSourcesUseCase.ts
  - <<: *api_symbol
    name: appendImportedSourceNodes
    path: apps/api/src/application/services/importWarehouseSourcesUseCase.ts
  - <<: *api_symbol
    name: buildYamlFileName
    path: apps/api/src/application/services/importWarehouseSourcesUseCase.ts
  - <<: *api_symbol
    name: createInitialDraft
    path: apps/api/src/application/services/importWarehouseSourcesUseCase.ts
  - <<: *api_symbol
    name: sameTable
    path: apps/api/src/application/services/importWarehouseSourcesUseCase.ts
  - <<: *api_symbol
    name: toSourceNode
    path: apps/api/src/application/services/importWarehouseSourcesUseCase.ts
  - <<: *api_symbol
    name: toSourceNodeId
    path: apps/api/src/application/services/importWarehouseSourcesUseCase.ts
  - <<: *api_symbol
    name: ListWarehouseConnectionSourceObjectsUseCase
    path: apps/api/src/application/services/listWarehouseConnectionSourceObjectsUseCase.ts
  - <<: *api_symbol
    name: ListWarehouseConnectionsUseCase
    path: apps/api/src/application/services/listWarehouseConnectionsUseCase.ts
  - <<: *api_symbol
    name: ProtectedWarehouseSourceImportRouteGroupOptions
    path: apps/api/src/entrypoints/http/warehouseSourceImportRouteGroup.ts
  - <<: *api_symbol
    name: registerProtectedWarehouseSourceImportRouteGroup
    path: apps/api/src/entrypoints/http/warehouseSourceImportRouteGroup.ts
  - <<: *api_symbol
    name: ImportWarehouseSourcesBody
    path: apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts
  - <<: *api_symbol
    name: WarehouseConnectionParams
    path: apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts
  - <<: *api_symbol
    name: WarehouseSourceImportQuery
    path: apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts
  - <<: *api_symbol
    name: WarehouseSourceImportRouteDeps
    path: apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts
  - <<: *api_symbol
    name: authorizeWarehouseSourceImportRequest
    path: apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts
  - <<: *api_symbol
    name: invalidBody
    path: apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts
  - <<: *api_symbol
    name: isRecord
    path: apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts
  - <<: *api_symbol
    name: parseColumns
    path: apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts
  - <<: *api_symbol
    name: parseGrouping
    path: apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts
  - <<: *api_symbol
    name: parseImportWarehouseSourcesBody
    path: apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts
  - <<: *api_symbol
    name: parseRequestedScope
    path: apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts
  - <<: *api_symbol
    name: parseRequiredEnvironmentId
    path: apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts
  - <<: *api_symbol
    name: parseRequiredProjectId
    path: apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts
  - <<: *api_symbol
    name: parseRequiredTenantId
    path: apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts
  - <<: *api_symbol
    name: parseTables
    path: apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts
  - <<: *api_symbol
    name: registerWarehouseSourceImportRoutes
    path: apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts
  - <<: *api_symbol
    name: InMemoryWarehouseConnectionCatalog
    path: apps/api/src/infrastructure/warehouseSourceImport/InMemoryWarehouseConnectionCatalog.ts
  - <<: *api_symbol
    name: createDefaultWarehouseConnectionCatalog
    path: apps/api/src/infrastructure/warehouseSourceImport/InMemoryWarehouseConnectionCatalog.ts
  - <<: *api_symbol
    name: read
    path: apps/api/test/architecture/warehouseSourceImportRails.architecture.test.ts
  - <<: *api_symbol
    name: repoRoot
    path: apps/api/test/architecture/warehouseSourceImportRails.architecture.test.ts
  - <<: *api_symbol
    name: SCOPE_QUERY
    path: apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts
  - <<: *api_symbol
    name: buildApp
    path: apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts
  - <<: *api_symbol
    name: principal
    path: apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts
  - <<: *web_symbol
    name: buildWarehouseConnectionTablesEndpoint
    path: apps/web/src/app/services/workspace/workspacePorts.api.ts
  - <<: *web_symbol
    name: buildWarehouseConnectionsEndpoint
    path: apps/web/src/app/services/workspace/workspacePorts.api.ts
  - <<: *web_symbol
    name: buildWarehouseSourcesImportEndpoint
    path: apps/web/src/app/services/workspace/workspacePorts.api.ts
```
