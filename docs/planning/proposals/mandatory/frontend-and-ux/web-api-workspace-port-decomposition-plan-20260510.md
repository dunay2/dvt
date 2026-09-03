---
title: Web API Workspace Port Decomposition Plan
status: Implemented
owner: Web / API / Architecture
last_reviewed: 2026-08-03
planning_type: mandatory
---

# Web API Workspace Port Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [x]`) syntax for tracking.

**Goal:** Split the broad web `IWorkspacePort` into narrow capability ports so
each web consumer depends only on the command/query rail it actually uses.

**Architecture:** Use Fowler Extract Interface, Service Layer, Gateway, and
Semantic Architecture Test patterns. Existing API-backed graph/file reads stay
real; missing backend rails stay explicit unavailable states; mock/demo
semantics are fenced by capability.

**Tech Stack:** React, TypeScript, Vitest, repository feature mechanization,
Mermaid architecture docs, existing web service composition root.

---

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/reviews/20260510-web-api-integration-gap-review.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/web-api-workspace-port-route-parity-remediation-plan-20260510.md`
- `docs/architecture/components/web/workspace/workspace-port-decomposition-component.md`
- `docs/architecture/components/web/workspace/workspace-port-decomposition-user-stories.md`
- `buzon/20260510-codex-fowler-workspace-port-decomposition-analysis.md`

## Feature Mechanization

```feature-mechanization
version: 1
featureId: WEB-API-WORKSPACE-PORT-DECOMPOSITION-20260510
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/web-api-workspace-port-decomposition-plan-20260510.md
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
  - docs/planning/reviews/20260510-web-api-integration-gap-review.md
allowedImplementationSurfaces:
  - buzon/20260510-codex-fowler-workspace-port-decomposition-analysis.md
  - docs/architecture/components/web/workspace/workspace-port-decomposition-component.md
  - docs/architecture/components/web/workspace/workspace-port-decomposition-user-stories.md
  - docs/architecture/components/web/code-workbench-workspace-files-component.md
  - docs/planning/proposals/mandatory/frontend-and-ux/web-api-workspace-port-decomposition-plan-20260510.md
  - docs/planning/reviews/20260510-web-api-integration-gap-review.md
  - apps/api/src/application/ports/**
  - apps/api/src/application/services/**
  - apps/api/src/entrypoints/http/**
  - apps/api/src/infrastructure/workspaceFiles/**
  - apps/api/test/**
  - apps/web/src/app/ports/index.ts
  - apps/web/src/app/ports/workspace.ts
  - apps/web/src/app/services/workspace/**
  - apps/web/src/app/services/composition/**
  - apps/web/src/app/services/AppServicesContext.tsx
  - apps/web/src/app/services/AppServicesContext.test.tsx
  - apps/web/src/app/queries/workspaceQueries.ts
  - apps/web/src/app/views/**
  - apps/web/src/app/components/**
  - apps/web/src/app/services/**/*.test.ts
  - apps/web/src/app/**/*.architecture.test.ts
  - apps/web/cypress/**
  - docs/planning/status/**
  - docs/.manifest.json
  - docs/**/index.md
forbiddenImplementationSurfaces:
  - packages/**
  - specs/contracts/**
  - docs/archive/**
commandQueryRails:
  - name: GetWorkspaceGraphDraft
    type: query
    dddOwner: Workspace graph draft read model
  - name: ListWorkspaceFiles
    type: query
    dddOwner: Workspace file read model
  - name: GetWorkspaceFileContent
    type: query
    dddOwner: Workspace file read model
  - name: GetWorkspaceDiffChanges
    type: query
    dddOwner: Workspace diff read model
    status: missing-backend-rail
  - name: ListWorkspacePlugins
    type: query
    dddOwner: Runtime plugin catalog read model
    status: missing-backend-rail
  - name: ListAdminRoles
    type: query
    dddOwner: Admin RBAC read model
    status: missing-backend-rail
  - name: ListAdminAuditLog
    type: query
    dddOwner: Admin audit read model
    status: missing-backend-rail
  - name: ListWarehouseConnections
    type: query
    dddOwner: Warehouse source discovery read model
    status: missing-backend-rail
  - name: ListWarehouseConnectionSourceObjects
    type: query
    dddOwner: Warehouse source discovery read model
    status: missing-backend-rail
  - name: ImportWarehouseSources
    type: command
    dddOwner: Warehouse source import command model
    status: missing-backend-rail
  - name: SaveWorkspaceFileContent
    type: command
    dddOwner: Workspace file command model
    status: implemented
domainObjects:
  - name: IWorkspaceGraphSnapshotQueryPort
    type: web query port
    owner: Workspace graph snapshot presentation
  - name: IWorkspaceFilesQueryPort
    type: web query port
    owner: Workspace file read presentation
  - name: IWorkspaceDiffQueryPort
    type: web query port
    owner: Workspace diff presentation
  - name: IWorkspacePluginCatalogQueryPort
    type: web query port
    owner: Plugin catalog presentation
  - name: IWorkspaceAdminReadPort
    type: web query port
    owner: Admin read-model presentation
  - name: IWarehouseSourceImportPort
    type: web command/query port
    owner: Warehouse source import presentation
  - name: IWorkspaceFileContentCommandPort
    type: web command port
    owner: Workspace file write command presentation
fowlerSignals:
  - God Port mixes unrelated bounded concerns
  - Interface Pollution forces broad test stubs
  - Hidden Authority lets mock mode define product semantics
  - Semantic architecture guard is missing
architectureGuards:
  - pnpm --filter @dvt/web exec vitest run src/app/services/workspace/workspacePortDecomposition.architecture.test.ts
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - this slice changes service dependency shape and fail-closed semantics only
completionGate:
  - pnpm docs:sync
  - pnpm --filter @dvt/web exec vitest run src/app/services/workspace/workspacePortDecomposition.architecture.test.ts
  - pnpm --filter @dvt/web exec vitest run src/app/services/workspace/workspacePorts.api.test.ts src/app/services/workspace/workspacePorts.files.test.ts src/app/services/workspace/workspacePorts.imports.test.ts
  - pnpm --filter @dvt/web typecheck
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: semantic-port-ownership-guard
    redTest: pnpm --filter @dvt/web exec vitest run src/app/services/workspace/workspacePortDecomposition.architecture.test.ts
    expectedFailure: architecture guard does not exist and broad IWorkspacePort still owns unrelated capabilities.
    patchSurfaces:
      - apps/web/src/app/services/workspace/workspacePortDecomposition.architecture.test.ts
      - apps/web/src/app/ports/workspace.ts
    greenTest: pnpm --filter @dvt/web exec vitest run src/app/services/workspace/workspacePortDecomposition.architecture.test.ts
  - id: api-port-factory-split
    redTest: pnpm --filter @dvt/web exec vitest run src/app/services/workspace/workspacePorts.api.test.ts
    expectedFailure: API composition still exposes a broad workspace port factory.
    patchSurfaces:
      - apps/web/src/app/services/workspace/workspacePorts.api.ts
      - apps/web/src/app/services/workspace/workspacePorts.api.test.ts
      - apps/web/src/app/services/workspace/workspacePorts.ts
    greenTest: pnpm --filter @dvt/web exec vitest run src/app/services/workspace/workspacePorts.api.test.ts
  - id: consumer-minimal-port-migration
    redTest: pnpm --filter @dvt/web typecheck
    expectedFailure: consumers still require IWorkspacePort after narrow ports are introduced.
    patchSurfaces:
      - apps/web/src/app/services/composition/appServices.ts
      - apps/web/src/app/services/AppServicesContext.tsx
      - apps/web/src/app/queries/workspaceQueries.ts
      - apps/web/src/app/views/**
      - apps/web/src/app/components/**
    greenTest: pnpm --filter @dvt/web typecheck
symbols:
  - &workspace_port_symbol
    name: IWorkspaceGraphSnapshotQueryPort
    path: apps/web/src/app/ports/workspace.ts
    dddOwner: Workspace port decomposition
    cqRails: [GetWorkspaceGraphDraft]
    fowlerSignals: [Hard-cut broad workspace service shape]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/services/workspace/workspacePortDecomposition.architecture.test.ts
    cypressCoverage: N/A - dependency-shape slice only
    unitTests:
      - apps/web/src/app/services/workspace/workspacePortDecomposition.architecture.test.ts
      - apps/web/src/app/services/workspace/workspacePorts.api.test.ts
      - apps/web/src/app/services/workspace/workspacePorts.files.test.ts
      - apps/web/src/app/services/workspace/workspacePorts.imports.test.ts
  - <<: *workspace_port_symbol
    name: IWorkspaceFilesQueryPort
    path: apps/web/src/app/ports/workspace.ts
    cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent]
  - <<: *workspace_port_symbol
    name: IWorkspaceDiffQueryPort
    path: apps/web/src/app/ports/workspace.ts
    cqRails: [GetWorkspaceDiffChanges]
  - <<: *workspace_port_symbol
    name: IWorkspacePluginCatalogQueryPort
    path: apps/web/src/app/ports/workspace.ts
    cqRails: [ListWorkspacePlugins]
  - <<: *workspace_port_symbol
    name: IWorkspaceAdminReadPort
    path: apps/web/src/app/ports/workspace.ts
    cqRails: [ListAdminRoles, ListAdminAuditLog]
  - <<: *workspace_port_symbol
    name: IWarehouseSourceImportPort
    path: apps/web/src/app/ports/workspace.ts
    cqRails: [ListWarehouseConnections, ListWarehouseConnectionSourceObjects, ImportWarehouseSources]
  - <<: *workspace_port_symbol
    name: IWorkspaceFileContentCommandPort
    path: apps/web/src/app/ports/workspace.ts
    cqRails: [SaveWorkspaceFileContent]
  - <<: *workspace_port_symbol
    name: useWorkspaceGraphSnapshotQueryPort
    path: apps/web/src/app/services/AppServicesContext.tsx
  - <<: *workspace_port_symbol
    name: useWorkspaceFilesQueryPort
    path: apps/web/src/app/services/AppServicesContext.tsx
    cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent]
  - <<: *workspace_port_symbol
    name: useWorkspaceDiffQueryPort
    path: apps/web/src/app/services/AppServicesContext.tsx
    cqRails: [GetWorkspaceDiffChanges]
  - <<: *workspace_port_symbol
    name: useWorkspacePluginCatalogQueryPort
    path: apps/web/src/app/services/AppServicesContext.tsx
    cqRails: [ListWorkspacePlugins]
  - <<: *workspace_port_symbol
    name: useWorkspaceAdminReadPort
    path: apps/web/src/app/services/AppServicesContext.tsx
    cqRails: [ListAdminRoles, ListAdminAuditLog]
  - <<: *workspace_port_symbol
    name: useWarehouseSourceImportPort
    path: apps/web/src/app/services/AppServicesContext.tsx
    cqRails: [ListWarehouseConnections, ListWarehouseConnectionSourceObjects, ImportWarehouseSources]
  - <<: *workspace_port_symbol
    name: useWorkspaceFileContentCommandPort
    path: apps/web/src/app/services/AppServicesContext.tsx
    cqRails: [SaveWorkspaceFileContent]
  - <<: *workspace_port_symbol
    name: AppServicesProvider
    path: apps/web/src/app/services/AppServicesContext.tsx
  - <<: *workspace_port_symbol
    name: WorkspacePorts
    path: apps/web/src/app/services/workspace/workspacePorts.ts
  - <<: *workspace_port_symbol
    name: createWorkspacePorts
    path: apps/web/src/app/services/workspace/workspacePorts.ts
  - <<: *workspace_port_symbol
    name: isWorkspaceFileNotFoundApiError
    path: apps/web/src/app/services/workspace/workspacePorts.api.ts
    cqRails: [GetWorkspaceFileContent]
  - <<: *workspace_port_symbol
    name: getWorkspaceGraphSnapshot
    path: apps/web/src/app/services/workspace/workspacePorts.api.ts
  - <<: *workspace_port_symbol
    name: rejectUnsupportedApiWorkspaceCapability
    path: apps/web/src/app/services/workspace/workspacePorts.api.ts
    cqRails:
      [GetWorkspaceDiffChanges, ListWorkspacePlugins, ListAdminRoles, ListAdminAuditLog,
      SaveWorkspaceFileContent]
  - <<: *workspace_port_symbol
    name: createApiWorkspaceGraphSnapshotQueryPort
    path: apps/web/src/app/services/workspace/workspacePorts.api.ts
  - <<: *workspace_port_symbol
    name: createApiWorkspaceFilesQueryPort
    path: apps/web/src/app/services/workspace/workspacePorts.api.ts
    cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent]
  - <<: *workspace_port_symbol
    name: createApiWorkspaceDiffQueryPort
    path: apps/web/src/app/services/workspace/workspacePorts.api.ts
    cqRails: [GetWorkspaceDiffChanges]
  - <<: *workspace_port_symbol
    name: createApiWorkspacePluginCatalogQueryPort
    path: apps/web/src/app/services/workspace/workspacePorts.api.ts
    cqRails: [ListWorkspacePlugins]
  - <<: *workspace_port_symbol
    name: createApiWorkspaceAdminReadPort
    path: apps/web/src/app/services/workspace/workspacePorts.api.ts
    cqRails: [ListAdminRoles, ListAdminAuditLog]
  - <<: *workspace_port_symbol
    name: createApiWarehouseSourceImportPort
    path: apps/web/src/app/services/workspace/workspacePorts.api.ts
    cqRails: [ListWarehouseConnections, ListWarehouseConnectionSourceObjects, ImportWarehouseSources]
  - <<: *workspace_port_symbol
    name: createApiWorkspaceFileContentCommandPort
    path: apps/web/src/app/services/workspace/workspacePorts.api.ts
    cqRails: [SaveWorkspaceFileContent]
  - <<: *workspace_port_symbol
    name: SaveWorkspaceFileContentUseCase
    path: apps/api/src/application/services/saveWorkspaceFileContentUseCase.ts
    dddOwner: Workspace file command model
    cqRails: [SaveWorkspaceFileContent]
    unitTests:
      - apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts
      - apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts
  - <<: *workspace_port_symbol
    name: SaveWorkspaceFileContentBody
    path: apps/api/src/entrypoints/http/workspaceFilesRoutes.ts
    dddOwner: Workspace file HTTP command adapter
    cqRails: [SaveWorkspaceFileContent]
    unitTests:
      - apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts
      - apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts
  - <<: *workspace_port_symbol
    name: WorkspaceFilesAction
    path: apps/api/src/entrypoints/http/workspaceFilesRoutes.ts
    dddOwner: Workspace file HTTP authorization adapter
    cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent, SaveWorkspaceFileContent]
    unitTests:
      - apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts
      - apps/api/test/application/services/protectedSecurityAccessDecision.architecture.test.ts
  - <<: *workspace_port_symbol
    name: parseSaveWorkspaceFileContentBody
    path: apps/api/src/entrypoints/http/workspaceFilesRoutes.ts
    dddOwner: Workspace file HTTP command adapter
    cqRails: [SaveWorkspaceFileContent]
    unitTests:
      - apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts
  - <<: *workspace_port_symbol
    name: stubWorkspaceContext
    path: apps/web/cypress/e2e/canvas/canvas-happy-path-draggable.cy.ts
    dddOwner: Canvas browser workspace context proof
    cqRails: [GetWorkspaceGraphDraft]
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-happy-path-draggable.cy.ts
    unitTests:
      - apps/web/cypress/e2e/canvas/canvas-happy-path-draggable.cy.ts
  - <<: *workspace_port_symbol
    name: CODE_COPY
    path: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts
    dddOwner: Code workbench localized browser proof
    cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent]
    cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts
    unitTests:
      - apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts
  - <<: *workspace_port_symbol
    name: ShellBootstrapApiOptions
    path: apps/web/cypress/support/workspaceSession.ts
    dddOwner: Shell bootstrap E2E support
    cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent, SaveWorkspaceFileContent]
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts
    unitTests:
      - apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts
      - apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts
  - <<: *workspace_port_symbol
    name: stubShellBootstrapApis
    path: apps/web/cypress/support/workspaceSession.ts
    dddOwner: Shell bootstrap E2E support
    cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent, SaveWorkspaceFileContent]
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts
    unitTests:
      - apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts
      - apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts
  - <<: *workspace_port_symbol
    name: mockConnections
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
    cqRails: [ListWarehouseConnections]
  - <<: *workspace_port_symbol
    name: mockSourceObjectsByConnectionId
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
    cqRails: [ListWarehouseConnectionSourceObjects]
  - <<: *workspace_port_symbol
    name: defaultGraphSnapshot
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
  - <<: *workspace_port_symbol
    name: cloneGraphSnapshot
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
  - <<: *workspace_port_symbol
    name: cloneWorkspaceFileEntries
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
  - <<: *workspace_port_symbol
    name: cloneFileContent
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
  - <<: *workspace_port_symbol
    name: cloneFileContents
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
  - <<: *workspace_port_symbol
    name: ensureWorkspaceDirectoryChildren
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
  - <<: *workspace_port_symbol
    name: MockWorkspaceState
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
  - <<: *workspace_port_symbol
    name: createMockWorkspaceState
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
  - <<: *workspace_port_symbol
    name: ensureWorkspaceFileEntry
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
  - <<: *workspace_port_symbol
    name: createDefaultWorkspaceFileTree
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
  - <<: *workspace_port_symbol
    name: toSourceNodeId
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
  - <<: *workspace_port_symbol
    name: buildYamlFileName
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
    cqRails: [ImportWarehouseSources]
  - <<: *workspace_port_symbol
    name: createImportedSourceNode
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
    cqRails: [ImportWarehouseSources]
  - <<: *workspace_port_symbol
    name: buildImportResult
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
    cqRails: [ImportWarehouseSources]
  - <<: *workspace_port_symbol
    name: importMockSources
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
    cqRails: [ImportWarehouseSources]
  - <<: *workspace_port_symbol
    name: mockFileTree
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
  - <<: *workspace_port_symbol
    name: defaultFileContents
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
  - <<: *workspace_port_symbol
    name: inferLanguage
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
    cqRails: [SaveWorkspaceFileContent]
  - <<: *workspace_port_symbol
    name: MockWorkspacePorts
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
  - <<: *workspace_port_symbol
    name: createMockWorkspaceGraphSnapshotQueryPort
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
  - <<: *workspace_port_symbol
    name: createMockWorkspaceDiffQueryPort
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
    cqRails: [GetWorkspaceDiffChanges]
  - <<: *workspace_port_symbol
    name: createMockWorkspacePluginCatalogQueryPort
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
    cqRails: [ListWorkspacePlugins]
  - <<: *workspace_port_symbol
    name: createMockWorkspaceAdminReadPort
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
    cqRails: [ListAdminRoles, ListAdminAuditLog]
  - <<: *workspace_port_symbol
    name: createMockWarehouseSourceImportPort
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
    cqRails: [ListWarehouseConnections, ListWarehouseConnectionSourceObjects, ImportWarehouseSources]
  - <<: *workspace_port_symbol
    name: createMockWorkspaceFilesQueryPort
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
    cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent]
  - <<: *workspace_port_symbol
    name: createMockWorkspaceFileContentCommandPort
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
    cqRails: [SaveWorkspaceFileContent]
  - <<: *workspace_port_symbol
    name: createMockWorkspacePorts
    path: apps/web/src/app/services/workspace/workspacePorts.mock.ts
  - <<: *workspace_port_symbol
    name: WorkspacePortCopy
    path: apps/web/src/app/services/workspace/workspacePortCopy.ts
  - <<: *workspace_port_symbol
    name: WorkspacePortLanguage
    path: apps/web/src/app/services/workspace/workspacePortCopy.ts
  - <<: *workspace_port_symbol
    name: COPY_BY_KEY
    path: apps/web/src/app/services/workspace/workspacePortCopy.ts
  - <<: *workspace_port_symbol
    name: LOCALIZED_COPY_BY_LANGUAGE
    path: apps/web/src/app/services/workspace/workspacePortCopy.ts
  - <<: *workspace_port_symbol
    name: resolveWorkspacePortLanguage
    path: apps/web/src/app/services/workspace/workspacePortCopy.ts
  - <<: *workspace_port_symbol
    name: detectWorkspacePortLocale
    path: apps/web/src/app/services/workspace/workspacePortCopy.ts
  - <<: *workspace_port_symbol
    name: resolveWorkspacePortCopy
    path: apps/web/src/app/services/workspace/workspacePortCopy.ts
  - <<: *workspace_port_symbol
    name: readRepoFile
    path: apps/web/src/app/services/workspace/workspacePortDecomposition.architecture.test.ts
  - <<: *workspace_port_symbol
    name: ApiWorkspacePorts
    path: apps/web/src/app/services/workspace/workspacePorts.api.test.ts
  - <<: *workspace_port_symbol
    name: unsupportedApiWorkspaceOperations
    path: apps/web/src/app/services/workspace/workspacePorts.api.test.ts
  - <<: *workspace_port_symbol
    name: ApiWorkspacePortHarnessOptions
    path: apps/web/src/app/services/workspace/workspaceApiClient.test.harness.ts
  - <<: *workspace_port_symbol
    name: createApiClientHarness
    path: apps/web/src/app/services/workspace/workspaceApiClient.test.harness.ts
  - <<: *workspace_port_symbol
    name: createApiWorkspacePortHarness
    path: apps/web/src/app/services/workspace/workspacePortsApi.test.harness.ts
  - <<: *workspace_port_symbol
    name: buildWorkspacePortStubs
    path: apps/web/src/app/services/composition/appServices.test.ts
  - <<: *workspace_port_symbol
    name: buildWarehouseSourceImportPort
    path: apps/web/src/app/components/SourceImportWizard.test.tsx
    cqRails: [ListWarehouseConnections, ListWarehouseConnectionSourceObjects, ImportWarehouseSources]
  - <<: *workspace_port_symbol
    name: useConnectionsLoader
    path: apps/web/src/app/components/sourceImportWizard/useSourceImportWizardDataLoaders.ts
    cqRails: [ListWarehouseConnections]
  - <<: *workspace_port_symbol
    name: buildWorkspaceAdminReadPort
    path: apps/web/src/app/views/AdminView.test.tsx
    cqRails: [ListAdminRoles, ListAdminAuditLog]
  - <<: *workspace_port_symbol
    name: buildWorkspaceFilesQueryPort
    path: apps/web/src/app/views/CodeView.test.tsx
    cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent]
  - <<: *workspace_port_symbol
    name: buildWorkspaceGraphSnapshotQueryPort
    path: apps/web/src/app/views/CostView.test.tsx
  - <<: *workspace_port_symbol
    name: buildDiffViewWorkspacePorts
    path: apps/web/src/app/views/DiffView.test.tsx
    cqRails: [GetWorkspaceDiffChanges]
  - <<: *workspace_port_symbol
    name: buildWorkspaceGraphSnapshotQueryPort
    path: apps/web/src/app/views/LineageView.test.tsx
  - <<: *workspace_port_symbol
    name: buildWorkspaceFilesQueryPort
    path: apps/web/src/app/views/artifacts/useArtifactsViewModel.test.tsx
    cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent]
  - <<: *workspace_port_symbol
    name: createWorkspaceFilePortMocks
    path: apps/web/src/app/views/canvas/useCanvasExecutionActions.test.support.tsx
    cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent, SaveWorkspaceFileContent]
  - <<: *workspace_port_symbol
    name: resolveWorkspaceFilePortMocks
    path: apps/web/src/app/views/canvas/useCanvasExecutionActions.test.support.tsx
    cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent, SaveWorkspaceFileContent]
  - <<: *workspace_port_symbol
    name: ControlledExecutionActionsHookHostProps
    path: apps/web/src/app/views/canvas/useCanvasExecutionActions.test.support.tsx
    cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent, SaveWorkspaceFileContent]
  - <<: *workspace_port_symbol
    name: StatefulExecutionActionsHookHostProps
    path: apps/web/src/app/views/canvas/useCanvasExecutionActions.test.support.tsx
    cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent, SaveWorkspaceFileContent]
```

## Fowler Planning Matrix

| Scenario                                                | Opportunity             | Fowler pattern              | DDD owner                                   | Command/query rail                                                                           | Implementation surfaces                                  | Unit or package test           | Architecture test                                 | User-flow test                | Out of scope                         |
| ------------------------------------------------------- | ----------------------- | --------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------ | ------------------------------------------------- | ----------------------------- | ------------------------------------ |
| Split graph snapshot reads from broad workspace service | Responsibility overload | Extract Interface, Gateway  | Workspace graph draft read model            | `GetWorkspaceGraphDraft`                                                                     | `workspace.ts`, `workspacePorts.api.ts`, graph consumers | `workspacePorts.api.test.ts`   | `workspacePortDecomposition.architecture.test.ts` | Existing canvas/lineage tests | New graph backend route              |
| Split file reads from file writes                       | Command/query mixing    | CQRS, Gateway               | Workspace file read/write model             | `ListWorkspaceFiles`, `GetWorkspaceFileContent`, `SaveWorkspaceFileContent`                  | `workspace.ts`, files service/tests, file consumers      | `workspacePorts.files.test.ts` | `workspacePortDecomposition.architecture.test.ts` | Existing code/artifact tests  | non-file workspace mutation commands |
| Isolate missing diff rail                               | Hidden authority        | Fail-closed Adapter         | Workspace diff read model                   | `GetWorkspaceDiffChanges`                                                                    | diff port, `DiffView`, tests                             | `DiffView.test.tsx`            | `workspacePortDecomposition.architecture.test.ts` | N/A                           | Implementing diff backend            |
| Isolate plugin catalog readiness                        | Hidden authority        | Gateway, Published Language | Runtime plugin catalog read model           | `ListWorkspacePlugins`                                                                       | plugin catalog port, plugin view tests                   | plugin view test               | architecture guard                                | N/A                           | Runtime plugin execution             |
| Isolate admin roles/audit                               | Feature envy            | Service Layer, Read Model   | Admin RBAC/audit read models                | `ListAdminRoles`, `ListAdminAuditLog`                                                        | admin read port, admin view tests                        | `AdminView.test.tsx`           | architecture guard                                | N/A                           | Backend admin routes                 |
| Fence warehouse import                                  | Mock runtime authority  | Command Gateway             | Warehouse source import command/read models | `ListWarehouseConnections`, `ListWarehouseConnectionSourceObjects`, `ImportWarehouseSources` | source import port, wizard tests                         | `SourceImportWizard.test.tsx`  | architecture guard                                | N/A                           | Backend warehouse connector          |

## File Structure

Create or modify:

- `apps/web/src/app/ports/workspace.ts`
  - Keeps shared workspace DTOs.
  - Replaces `IWorkspacePort` with narrow exported interfaces.
- `apps/web/src/app/services/workspace/workspacePorts.api.ts`
  - Exposes API factory methods for graph snapshot and file read ports.
  - Keeps unsupported API capabilities as fail-closed ports.
- `apps/web/src/app/services/workspace/workspacePorts.mock.ts`
  - Exposes mock/demo factories by capability.
  - Keeps demo-only behavior explicit.
- `apps/web/src/app/services/workspace/workspacePorts.ts`
  - Composes capability ports after the hard cut. It does not export a broad
    workspace service or compatibility factory.
- `apps/web/src/app/services/workspace/workspacePortDecomposition.architecture.test.ts`
  - Semantic architecture guard for narrow port ownership.
- `apps/web/src/app/services/composition/appServices.ts`
  - Publishes narrow ports in `AppServices`.
- `apps/web/src/app/services/AppServicesContext.tsx`
  - Exposes hooks for narrow ports.
- Web views/hooks under `apps/web/src/app/views/**`, `apps/web/src/app/components/**`,
  and `apps/web/src/app/queries/workspaceQueries.ts`
  - Consume only the narrow ports they need.

## Task 1: Semantic Architecture Guard

**Files:**

- Create: `apps/web/src/app/services/workspace/workspacePortDecomposition.architecture.test.ts`
- Modify: `apps/web/src/app/ports/workspace.ts`

- [x] **Step 1: Write the failing architecture test**

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function readRepoFile(...segments: string[]): string {
  return readFileSync(resolve(process.cwd(), ...segments), 'utf8');
}

describe('workspace port decomposition architecture', () => {
  it('does not expose a broad IWorkspacePort god port', () => {
    const source = readRepoFile('src', 'app', 'ports', 'workspace.ts');

    expect(source).not.toContain('export interface IWorkspacePort');
    expect(source).toContain('export interface IWorkspaceGraphSnapshotQueryPort');
    expect(source).toContain('export interface IWorkspaceFilesQueryPort');
    expect(source).toContain('export interface IWorkspaceDiffQueryPort');
    expect(source).toContain('export interface IWorkspaceAdminReadPort');
    expect(source).toContain('export interface IWarehouseSourceImportPort');
  });

  it('keeps read ports free of command methods', () => {
    const source = readRepoFile('src', 'app', 'ports', 'workspace.ts');

    const filesPort = source.slice(
      source.indexOf('export interface IWorkspaceFilesQueryPort'),
      source.indexOf('export interface IWorkspaceDiffQueryPort')
    );

    expect(filesPort).toContain('listFiles');
    expect(filesPort).toContain('getFileContent');
    expect(filesPort).not.toContain('saveFileContent');
    expect(filesPort).not.toContain('importSources');
  });

  it('keeps API missing rails unavailable before transport', () => {
    const source = readRepoFile('src', 'app', 'services', 'workspace', 'workspacePorts.api.ts');

    expect(source).toContain('createApiWorkspaceDiffQueryPort');
    expect(source).toContain('createApiWorkspaceAdminReadPort');
    expect(source).toContain('createApiWarehouseSourceImportPort');
    expect(source).not.toContain("getJson<DiffChange[]>('/diff/changes')");
    expect(source).not.toContain("getJson<Plugin[]>('/plugins')");
    expect(source).not.toContain("getJson<Role[]>('/admin/roles')");
    expect(source).not.toContain("getJson<AuditLogEntry[]>('/admin/audit')");
  });
});
```

- [x] **Step 2: Run the test and verify red**

Run:

```bash
pnpm --filter @dvt/web exec vitest run src/app/services/workspace/workspacePortDecomposition.architecture.test.ts
```

Expected: FAIL because `IWorkspacePort` still exists and narrow interfaces do
not exist.

- [x] **Step 3: Add narrow interfaces with docblocks**

Add owned-concern docblocks and interfaces in
`apps/web/src/app/ports/workspace.ts`:

```ts
/** Owned concern: expose presentation graph snapshots derived from protected workspace graph draft reads. */
export interface IWorkspaceGraphSnapshotQueryPort {
  getGraphSnapshot: () => Promise<WorkspaceGraphSnapshot>;
}

/** Owned concern: expose read-only workspace file tree and file content queries. */
export interface IWorkspaceFilesQueryPort {
  listFiles: () => Promise<WorkspaceFileEntry[]>;
  getFileContent: (path: string) => Promise<FileContent>;
}

/** Owned concern: expose authoritative workspace diff read models when the backend rail exists. */
export interface IWorkspaceDiffQueryPort {
  getDiffChanges: () => Promise<DiffChange[]>;
}

/** Owned concern: expose backend-published plugin catalog/readiness when the backend rail exists. */
export interface IWorkspacePluginCatalogQueryPort {
  getPlugins: () => Promise<Plugin[]>;
}

/** Owned concern: expose admin role and audit read models when backend rails exist. */
export interface IWorkspaceAdminReadPort {
  getRoles: () => Promise<Role[]>;
  getAuditLog: () => Promise<AuditLogEntry[]>;
}

/** Owned concern: expose warehouse source discovery and import as demo-only until backend rails exist. */
export interface IWarehouseSourceImportPort {
  listWarehouseConnections: () => Promise<WarehouseConnection[]>;
  listSourceObjects: (connectionId: string) => Promise<SourceObject[]>;
  importSources: (input: ImportSourcesInput) => Promise<ImportSourcesResult>;
}

/** Owned concern: expose workspace file content writes only after an accepted backend command exists. */
export interface IWorkspaceFileContentCommandPort {
  saveFileContent: (path: string, content: string) => Promise<FileContent>;
}
```

- [x] **Step 4: Remove `IWorkspacePort`**

Remove the broad interface before moving consumers. Typecheck is expected to
fail until later tasks migrate consumers.

- [x] **Step 5: Re-run the architecture test**

Run:

```bash
pnpm --filter @dvt/web exec vitest run src/app/services/workspace/workspacePortDecomposition.architecture.test.ts
```

Expected: FAIL only on API factory names until Task 2.

## Task 2: API Port Factories

**Files:**

- Modify: `apps/web/src/app/services/workspace/workspacePorts.api.ts`
- Modify: `apps/web/src/app/services/workspace/workspacePorts.api.test.ts`
- Modify: `apps/web/src/app/services/workspace/workspacePorts.ts`

- [x] **Step 1: Refactor API factories**

Create named factories:

```ts
export function createApiWorkspaceGraphSnapshotQueryPort(
  apiClient: ApiClient
): IWorkspaceGraphSnapshotQueryPort {
  return {
    getGraphSnapshot: () => getWorkspaceGraphSnapshot(apiClient),
  };
}

export function createApiWorkspaceFilesQueryPort(apiClient: ApiClient): IWorkspaceFilesQueryPort {
  return {
    listFiles: () =>
      apiClient.getJson<WorkspaceFileEntry[]>(
        buildWorkspaceFilesEndpoint(readWorkspaceFilesScope())
      ),
    getFileContent: async (path) => {
      try {
        return await apiClient.getJson<FileContent>(
          buildWorkspaceFileContentEndpoint(path, readWorkspaceFilesScope())
        );
      } catch (error) {
        if (error instanceof ApiError && isWorkspaceFileNotFoundApiError(error)) {
          throw new WorkspaceFileLoadError('not_found', path);
        }
        throw error;
      }
    },
  };
}
```

For missing rails, expose fail-closed factories:

```ts
export function createApiWorkspaceDiffQueryPort(): IWorkspaceDiffQueryPort {
  return {
    getDiffChanges: () =>
      rejectUnsupportedApiWorkspaceCapability('workspace.diffChanges', 'GetWorkspaceDiffChanges'),
  };
}
```

- [x] **Step 2: Update API tests to target factories**

Update the existing route-parity tests so each unsupported operation is tested
through the narrow factory that owns it.

- [x] **Step 3: Run API workspace tests**

Run:

```bash
pnpm --filter @dvt/web exec vitest run src/app/services/workspace/workspacePorts.api.test.ts
```

Expected: PASS.

## Task 3: Mock Port Factories

**Files:**

- Modify: `apps/web/src/app/services/workspace/workspacePorts.mock.ts`
- Modify: `apps/web/src/app/services/workspace/workspacePorts.imports.test.ts`
- Modify: `apps/web/src/app/services/workspace/workspacePorts.files.test.ts`

- [x] **Step 1: Split mock factories by capability**

Expose mock factories matching the narrow interfaces while sharing existing
mock state where tests require it.

- [x] **Step 2: Fence demo-only semantics**

Keep source import, diff, admin, plugin, and file write behavior under
capability-specific mock factories. The exported names must make demo locality
visible in tests and composition.

- [x] **Step 3: Run mock workspace tests**

Run:

```bash
pnpm --filter @dvt/web exec vitest run src/app/services/workspace/workspacePorts.files.test.ts src/app/services/workspace/workspacePorts.imports.test.ts
```

Expected: PASS.

## Task 4: Composition Root Migration

**Files:**

- Modify: `apps/web/src/app/services/composition/appServices.ts`
- Modify: `apps/web/src/app/services/AppServicesContext.tsx`
- Modify: `apps/web/src/app/services/composition/appServices.test.ts`
- Modify: `apps/web/src/app/services/AppServicesContext.test.tsx`

- [x] **Step 1: Replace `workspaceService` in `AppServices`**

Expose named narrow ports:

```ts
readonly workspaceGraphSnapshotQuery: IWorkspaceGraphSnapshotQueryPort;
readonly workspaceFilesQuery: IWorkspaceFilesQueryPort;
readonly workspaceDiffQuery: IWorkspaceDiffQueryPort;
readonly workspacePluginCatalogQuery: IWorkspacePluginCatalogQueryPort;
readonly workspaceAdminRead: IWorkspaceAdminReadPort;
readonly warehouseSourceImport: IWarehouseSourceImportPort;
readonly workspaceFileContentCommand: IWorkspaceFileContentCommandPort;
```

- [x] **Step 2: Add narrow hooks**

Add hooks such as `useWorkspaceFilesQueryPort()` and
`useWorkspaceDiffQueryPort()` instead of `useWorkspaceService()`.

- [x] **Step 3: Run composition tests**

Run:

```bash
pnpm --filter @dvt/web exec vitest run src/app/services/composition/appServices.test.ts src/app/services/AppServicesContext.test.tsx
```

Expected: PASS.

## Task 5: Consumer Migration

**Files:**

- Modify: `apps/web/src/app/queries/workspaceQueries.ts`
- Modify: `apps/web/src/app/views/admin/useAdminViewData.ts`
- Modify: `apps/web/src/app/components/SourceImportWizard.tsx`
- Modify: `apps/web/src/app/components/sourceImportWizard/*.ts`
- Modify: `apps/web/src/app/views/artifacts/useArtifactsViewModel.ts`
- Modify: `apps/web/src/app/views/DiffView*.tsx`
- Modify: canvas action files that still accept `workspaceService`

- [x] **Step 1: Migrate file consumers**

Use `IWorkspaceFilesQueryPort` for code/artifacts file reads.

- [x] **Step 2: Migrate diff consumers**

Use `IWorkspaceDiffQueryPort` for diff reads.

- [x] **Step 3: Migrate admin consumers**

Use `IWorkspaceAdminReadPort` for roles and audit.

- [x] **Step 4: Migrate warehouse import consumers**

Use `IWarehouseSourceImportPort` for source import wizard flows.

- [x] **Step 5: Migrate file write/provenance consumers**

Use `IWorkspaceFileContentCommandPort` only where a file write is still
required. If API mode has no accepted backend command, preserve fail-closed
behavior and keep the capability unavailable.

- [x] **Step 6: Run web typecheck**

Run:

```bash
pnpm --filter @dvt/web typecheck
```

Expected: PASS.

## Task 6: Documentation, Mechanization, And Closeout

**Files:**

- Modify: `docs/planning/reviews/20260510-web-api-integration-gap-review.md`
- Modify: `docs/architecture/components/web/workspace/workspace-port-decomposition-component.md`
- Modify: `docs/architecture/components/web/workspace/workspace-port-decomposition-user-stories.md`
- Modify: this plan

- [x] **Step 1: Mark implementation status**

After code is green, set `mechanizationStatus: implemented` and update symbol
entries for every added exported port, factory, and architecture-test helper.

- [x] **Step 2: Update drift review**

Change the review entry for `IWorkspacePort` from open drift to remediated
semantic decomposition, while keeping missing backend rails listed as future
work.

- [x] **Step 3: Run generated docs sync**

Run:

```bash
pnpm docs:sync
pnpm governance:refresh
```

Expected: generated docs and governance DB checks are stable.

- [x] **Step 4: Run closeout validation**

Run:

```bash
pnpm --filter @dvt/web exec vitest run src/app/services/workspace/workspacePortDecomposition.architecture.test.ts
pnpm --filter @dvt/web exec vitest run src/app/services/workspace/workspacePorts.api.test.ts src/app/services/workspace/workspacePorts.files.test.ts src/app/services/workspace/workspacePorts.imports.test.ts
pnpm --filter @dvt/web typecheck
pnpm docs:feature-mechanization:implementation
pnpm verify:prepush
```

Expected: all commands pass.

## ADR Decision

No ADR is required for this port decomposition slice because it applies existing
architecture governance and does not introduce new backend command/query
semantics. A future slice that accepts backend semantics for diff, plugin
catalog, admin read models, warehouse source import, or workspace file write
should create or update an ADR if ownership, lifecycle, authorization, or
compatibility policy changes.
