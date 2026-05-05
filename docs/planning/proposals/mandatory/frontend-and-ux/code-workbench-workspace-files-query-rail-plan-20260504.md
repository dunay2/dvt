---
title: Code Workbench Workspace Files Query Rail Plan
status: Accepted
owner: Web / API Architecture
last_reviewed: 2026-05-04
planning_type: mandatory-proposal
---

# Code Workbench Workspace Files Query Rail Plan

This proposal mechanizes the Code workbench read-only workspace files slice.

The governing analysis and implementation plan live in:

- `buzon/20260504-codex-fowler-code-tab-workspace-files-analysis-and-plan.md`
- `docs/architecture/components/web/code-workbench-workspace-files-component.md`
- `docs/architecture/components/web/code-workbench-workspace-files-user-stories.md`

Route-level alpha context now lives outside this child-slice manifest:

- `docs/planning/proposals/mandatory/frontend-and-ux/internal-alpha-product-route-plan-20260505.md`
- `docs/planning/reviews/architecture-and-governance/20260504-internal-alpha-evolution-route.md`

This proposal remains the implementation authority only for the workspace-files
child slice.

```feature-mechanization
version: 1
featureId: CODE-WORKBENCH-WORKSPACE-FILES
mechanizationStatus: closed
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/code-workbench-workspace-files-query-rail-plan-20260504.md
componentGuides:
  - docs/architecture/components/web/code-workbench-workspace-files-component.md
  - apps/api/docs/protected-runtime-route-group-component.md
userStories:
  - docs/architecture/components/web/code-workbench-workspace-files-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - apps/api/docs/protected-runtime-route-group-component.md
  - apps/api/src/application/ports/accessDecision.ts
  - apps/api/src/application/ports/protectedRuntimeCommandQueryRails.ts
  - apps/api/src/application/ports/workspaceFiles.ts
  - apps/api/src/application/services/getWorkspaceFileContentUseCase.ts
  - apps/api/src/application/services/listWorkspaceFilesUseCase.ts
  - apps/api/src/entrypoints/http/httpErrorReasonCatalog.ts
  - apps/api/src/entrypoints/http/httpErrorTranslation.ts
  - apps/api/src/entrypoints/http/extractBearerToken.ts
  - apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts
  - apps/api/src/entrypoints/http/runtimeRoutes.constants.ts
  - apps/api/src/entrypoints/http/workspaceFilesRouteGroup.ts
  - apps/api/src/entrypoints/http/workspaceFilesRoutes.ts
  - apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts
  - apps/api/src/plugins/env.ts
  - apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts
  - apps/api/test/entrypoints/http/extractBearerToken.test.ts
  - apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts
  - apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
  - apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts
  - apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts
  - apps/web/src/app/services/workspace/workspaceFilesHttp.ts
  - apps/web/src/app/services/workspace/workspaceService.api.ts
  - apps/web/src/app/services/workspace/workspaceService.files.test.ts
  - buzon/20260504-codex-fowler-code-tab-workspace-files-analysis-and-plan.md
  - docs/architecture/components/web/code-workbench-workspace-files-component.md
  - docs/architecture/components/web/code-workbench-workspace-files-user-stories.md
  - docs/planning/proposals/mandatory/frontend-and-ux/code-workbench-workspace-files-query-rail-plan-20260504.md
  - docs/planning/reviews/architecture-and-governance/20260504-dvt-deep-architectural-review.md
forbiddenImplementationSurfaces:
  - packages/**
  - specs/**
commandQueryRails:
  - name: ListWorkspaceFiles
    type: query
    dddOwner: WorkspaceFileTree
  - name: GetWorkspaceFileContent
    type: query
    dddOwner: WorkspaceFileContent
domainObjects:
  - name: WorkspaceFileTree
    type: read model
    owner: Operational evidence reads
  - name: WorkspaceFileContent
    type: read model
    owner: Operational evidence reads
  - name: WorkspacePath
    type: value object
    owner: Operational evidence reads
  - name: WorkspaceFileReadPolicy
    type: policy
    owner: Operational evidence reads
  - name: WorkspaceFileRepository
    type: outbound port
    owner: Operational evidence reads
fowlerSignals:
  - Boundary drift
  - Hidden authority
  - Responsibility overload
  - Test-only confidence
architectureGuards:
  - pnpm --filter dvt-api test -- workspaceFilesQueryRail.architecture.test.ts
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/code-workbench-workspace-files.cy.ts
completionGate:
  - pnpm --filter dvt-api test -- registerProtectedRuntimeRoutes.test.ts workspaceFilesRoutes.test.ts workspaceFilesQueryRail.architecture.test.ts protectedRuntimeRouteGroup.architecture.test.ts
  - pnpm --filter @dvt/web test -- workspaceService.files.test.ts CodeView.test.tsx
  - pnpm --filter dvt-api typecheck
  - pnpm --filter @dvt/web typecheck
  - pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/code-workbench-workspace-files.cy.ts
  - pnpm verify:prepush
redGreenCycles:
  - id: workspace-files-query-rail
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: Workspace file query implementation surfaces and symbols are rejected before this manifest declares them.
    patchSurfaces:
      - docs/planning/proposals/mandatory/frontend-and-ux/code-workbench-workspace-files-query-rail-plan-20260504.md
    greenTest: pnpm docs:feature-mechanization:implementation
symbols:
  - { name: CommandAuthorizationAction, path: apps/api/src/application/ports/accessDecision.ts, dddOwner: WorkspaceFileReadPolicy, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Hidden authority], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: QueryAuthorizationAction, path: apps/api/src/application/ports/accessDecision.ts, dddOwner: WorkspaceFileReadPolicy, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Hidden authority], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: RequestedScope, path: apps/api/src/application/ports/accessDecision.ts, dddOwner: WorkspaceFileReadPolicy, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Data clump], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: IWorkspaceFileRepository, path: apps/api/src/application/ports/workspaceFiles.ts, dddOwner: WorkspaceFileRepository, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Boundary drift], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: InvalidWorkspacePathError, path: apps/api/src/application/ports/workspaceFiles.ts, dddOwner: WorkspacePath, cqRails: [GetWorkspaceFileContent], fowlerSignals: [Primitive obsession], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: WorkspaceFileContent, path: apps/api/src/application/ports/workspaceFiles.ts, dddOwner: WorkspaceFileContent, cqRails: [GetWorkspaceFileContent], fowlerSignals: [Boundary drift], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: WorkspaceFileEntry, path: apps/api/src/application/ports/workspaceFiles.ts, dddOwner: WorkspaceFileTree, cqRails: [ListWorkspaceFiles], fowlerSignals: [Boundary drift], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: WorkspaceFileNotFoundError, path: apps/api/src/application/ports/workspaceFiles.ts, dddOwner: WorkspaceFileReadPolicy, cqRails: [GetWorkspaceFileContent], fowlerSignals: [Test-only confidence], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: GetWorkspaceFileContentUseCase, path: apps/api/src/application/services/getWorkspaceFileContentUseCase.ts, dddOwner: WorkspaceFileContent, cqRails: [GetWorkspaceFileContent], fowlerSignals: [Boundary drift], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: ListWorkspaceFilesUseCase, path: apps/api/src/application/services/listWorkspaceFilesUseCase.ts, dddOwner: WorkspaceFileTree, cqRails: [ListWorkspaceFiles], fowlerSignals: [Boundary drift], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: ProtectedWorkspaceFilesRouteGroupOptions, path: apps/api/src/entrypoints/http/workspaceFilesRouteGroup.ts, dddOwner: WorkspaceFileReadPolicy, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Responsibility overload], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts] }
  - { name: RuntimeAuth, path: apps/api/src/entrypoints/http/workspaceFilesRouteGroup.ts, dddOwner: WorkspaceFileReadPolicy, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Data clump], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts] }
  - { name: registerProtectedWorkspaceFilesRouteGroup, path: apps/api/src/entrypoints/http/workspaceFilesRouteGroup.ts, dddOwner: WorkspaceFileReadPolicy, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Responsibility overload], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts] }
  - { name: resolveWorkspaceFilesRoot, path: apps/api/src/entrypoints/http/workspaceFilesRouteGroup.ts, dddOwner: WorkspaceFileRepository, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Boundary drift], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts] }
  - { name: WorkspaceFilePathParams, path: apps/api/src/entrypoints/http/workspaceFilesRoutes.ts, dddOwner: WorkspacePath, cqRails: [GetWorkspaceFileContent], fowlerSignals: [Primitive obsession], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: WorkspaceFilesQuery, path: apps/api/src/entrypoints/http/workspaceFilesRoutes.ts, dddOwner: WorkspaceFileReadPolicy, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Data clump], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: WorkspaceFilesRouteDeps, path: apps/api/src/entrypoints/http/workspaceFilesRoutes.ts, dddOwner: WorkspaceFileReadPolicy, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Data clump], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: authorizeWorkspaceFilesRequest, path: apps/api/src/entrypoints/http/workspaceFilesRoutes.ts, dddOwner: WorkspaceFileReadPolicy, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Hidden authority], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: parseRequestedScope, path: apps/api/src/entrypoints/http/workspaceFilesRoutes.ts, dddOwner: WorkspaceFileReadPolicy, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Primitive obsession], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: parseRequiredEnvironmentId, path: apps/api/src/entrypoints/http/workspaceFilesRoutes.ts, dddOwner: WorkspaceFileReadPolicy, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Primitive obsession], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: parseRequiredProjectId, path: apps/api/src/entrypoints/http/workspaceFilesRoutes.ts, dddOwner: WorkspaceFileReadPolicy, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Primitive obsession], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: parseRequiredTenantId, path: apps/api/src/entrypoints/http/workspaceFilesRoutes.ts, dddOwner: WorkspaceFileReadPolicy, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Primitive obsession], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: registerWorkspaceFilesRoutes, path: apps/api/src/entrypoints/http/workspaceFilesRoutes.ts, dddOwner: WorkspaceFileReadPolicy, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Boundary drift], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: ALLOWED_EXTENSIONS, path: apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts, dddOwner: WorkspacePath, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Primitive obsession], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: EXCLUDED_NAMES, path: apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts, dddOwner: WorkspaceFileRepository, cqRails: [ListWorkspaceFiles], fowlerSignals: [Boundary drift], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: LocalWorkspaceFileRepository, path: apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts, dddOwner: WorkspaceFileRepository, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Boundary drift], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: LocalWorkspaceFileRepositoryOptions, path: apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts, dddOwner: WorkspaceFileRepository, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Data clump], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: MAX_FILE_BYTES, path: apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts, dddOwner: WorkspaceFileRepository, cqRails: [GetWorkspaceFileContent], fowlerSignals: [Primitive obsession], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: MAX_LISTED_FILES, path: apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts, dddOwner: WorkspaceFileRepository, cqRails: [ListWorkspaceFiles], fowlerSignals: [Primitive obsession], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: inferLanguage, path: apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts, dddOwner: WorkspaceFileContent, cqRails: [GetWorkspaceFileContent], fowlerSignals: [Boundary drift], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: isAllowedFileName, path: apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts, dddOwner: WorkspacePath, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Primitive obsession], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: joinWorkspacePath, path: apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts, dddOwner: WorkspacePath, cqRails: [ListWorkspaceFiles], fowlerSignals: [Primitive obsession], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: read, path: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, dddOwner: Workspace files architecture guard, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Test-only confidence], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts] }
  - { name: repoRoot, path: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, dddOwner: Workspace files architecture guard, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Test-only confidence], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts] }
  - { name: SCOPE_QUERY, path: apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts, dddOwner: Workspace file route tests, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Test-only confidence], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: principal, path: apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts, dddOwner: Workspace file route tests, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Test-only confidence], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts] }
  - { name: WORKSPACE_FILE_TREE, path: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, dddOwner: Code workbench user flow fixture, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Test-only confidence], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/web/src/app/services/workspace/workspaceService.files.test.ts] }
  - { name: stubCodeWorkbenchApis, path: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, dddOwner: Code workbench user flow fixture, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Test-only confidence], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/web/src/app/services/workspace/workspaceService.files.test.ts] }
  - { name: WORKSPACE_FILES_ENDPOINT, path: apps/web/src/app/services/workspace/workspaceFilesHttp.ts, dddOwner: WorkspaceFileTree, cqRails: [ListWorkspaceFiles], fowlerSignals: [Boundary drift], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/web/src/app/services/workspace/workspaceService.files.test.ts] }
  - { name: WORKSPACE_FILES_HTTP_ERROR_REASON, path: apps/web/src/app/services/workspace/workspaceFilesHttp.ts, dddOwner: WorkspaceFileReadPolicy, cqRails: [GetWorkspaceFileContent], fowlerSignals: [Boundary drift], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/web/src/app/services/workspace/workspaceService.files.test.ts] }
  - { name: WorkspaceFilesScope, path: apps/web/src/app/services/workspace/workspaceFilesHttp.ts, dddOwner: WorkspaceFileReadPolicy, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Data clump], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/web/src/app/services/workspace/workspaceService.files.test.ts] }
  - { name: buildWorkspaceFileContentEndpoint, path: apps/web/src/app/services/workspace/workspaceFilesHttp.ts, dddOwner: WorkspaceFileContent, cqRails: [GetWorkspaceFileContent], fowlerSignals: [Boundary drift], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/web/src/app/services/workspace/workspaceService.files.test.ts] }
  - { name: buildWorkspaceFilesEndpoint, path: apps/web/src/app/services/workspace/workspaceFilesHttp.ts, dddOwner: WorkspaceFileTree, cqRails: [ListWorkspaceFiles], fowlerSignals: [Boundary drift], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/web/src/app/services/workspace/workspaceService.files.test.ts] }
  - { name: readWorkspaceFilesScope, path: apps/web/src/app/services/workspace/workspaceFilesHttp.ts, dddOwner: WorkspaceFileReadPolicy, cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent], fowlerSignals: [Hidden authority], architectureGuard: apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts, cypressCoverage: apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts, unitTests: [apps/web/src/app/services/workspace/workspaceService.files.test.ts] }
```
