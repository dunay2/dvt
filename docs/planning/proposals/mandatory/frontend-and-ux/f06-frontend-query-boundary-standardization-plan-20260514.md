---
title: F-06 Frontend Query Boundary Standardization Plan
status: Active
date: 2026-05-14
owners:
  - web
planning_type: mandatory
related_tasks:
  - F-06
governing_sources:
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/frontend-data-boundary-architecture.md
  - docs/architecture/components/web/frontend-query-boundary-component.md
---

# F-06 Frontend Query Boundary Standardization Plan

## Purpose

F-06 standardizes TanStack Query ownership for `apps/web`. The goal is not to
rename every hook. The goal is to make cache keys, query functions, enabled
predicates, staleness policy, and invalidation ownership explicit enough that
operator views do not become hidden data orchestration modules.

## Fowler Diagnosis

The active smell is shotgun query ownership. Query keys were already centralized
in `queryKeys.ts`, but selected views and plugin panels still imported
`@tanstack/react-query` directly. That split cache semantics between
presentation modules and query modules.

The applied pattern is a thin query boundary:

1. Query modules own TanStack Query calls and cache keys.
2. Views consume query hooks and derive presentation state.
3. Service ports stay behind query hooks.
4. Architecture tests prevent direct query ownership from returning to selected
   operator surfaces.

## Command And Query Rail

F-06 is a query-boundary hardening slice behind existing user-facing routes.

| Rail                        | Type  | Owning bounded context | DDD object or read model                              | Adapter surface                     |
| --------------------------- | ----- | ---------------------- | ----------------------------------------------------- | ----------------------------------- |
| Workspace query read models | query | Web workspace          | Workspace diff, graph, files, roles, audit, artifacts | `workspaceQueries.ts`               |
| Run query read models       | query | Web runtime            | Run summaries, snapshots, workspace detail            | `runsQueries.ts`                    |
| Platform health query       | query | Web shell health       | Platform health snapshot                              | `usePlatformHealthSnapshotQuery.ts` |
| Runtime capabilities query  | query | Web shell capabilities | Runtime capability snapshot                           | `useRuntimeCapabilitiesQuery.ts`    |

## Implemented Slice

This slice moves direct query ownership out of:

1. `views/runs/useRunWorkspace.ts`
2. `views/admin/useAdminViewData.ts`
3. `views/artifacts/useArtifactsViewModel.ts`
4. `plugins/dbt/DbtNodeRenderer.tsx`

The semantic guard is
`apps/web/src/app/queries/queryKeyPolicy.architecture.test.ts`.

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: F06-FRONTEND-QUERY-BOUNDARY-STANDARDIZATION
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f06-frontend-query-boundary-standardization-plan-20260514.md
componentGuides:
  - docs/architecture/components/web/frontend-query-boundary-component.md
userStories:
  - docs/planning/state/lane-e-shell-baseline-target-guide.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/frontend-data-boundary-architecture.md
  - docs/architecture/components/web/frontend-query-boundary-component.md
allowedImplementationSurfaces:
  - apps/web/src/app/plugins/dbt/DbtNodeRenderer.tsx
  - apps/web/src/app/queries/queryKeyPolicy.architecture.test.ts
  - apps/web/src/app/queries/runsQueries.ts
  - apps/web/src/app/queries/workspaceQueries.ts
  - apps/web/src/app/views/admin/useAdminViewData.ts
  - apps/web/src/app/views/artifacts/useArtifactsViewModel.ts
  - apps/web/src/app/views/runs/useRunWorkspace.ts
  - buzon/20260514-codex-fowler-f06-query-boundary-analysis.md
  - docs/architecture/components/web/frontend-query-boundary-component.md
  - docs/architecture/components/web/index.md
  - docs/planning/proposals/mandatory/frontend-and-ux/f06-frontend-query-boundary-standardization-plan-20260514.md
forbiddenImplementationSurfaces:
  - apps/api/**
  - packages/**
  - specs/contracts/**
commandQueryRails:
  - name: Workspace query read models
    type: query
    dddOwner: Web workspace query boundary
  - name: Run query read models
    type: query
    dddOwner: Web runtime query boundary
domainObjects:
  - name: FrontendQueryBoundary
    type: component
    owner: Web / Architecture
  - name: WorkspaceArtifactMap
    type: read model
    owner: Web workspace query boundary
  - name: RunWorkspaceQuery
    type: read model
    owner: Web runtime query boundary
fowlerSignals:
  - Shotgun query ownership
  - Boundary drift
  - Hidden cache policy
architectureGuards:
  - pnpm --filter @dvt/web test -- queryKeyPolicy.architecture.test.ts
cypressFlows:
  - none: query-boundary architecture and unit slice only
completionGate:
  - pnpm --filter @dvt/web test -- queryKeyPolicy.architecture.test.ts useRunWorkspace.test.tsx useArtifactsViewModel.test.tsx AdminView.test.tsx
  - pnpm --filter @dvt/web typecheck
  - pnpm --filter @dvt/web test
  - pnpm verify:prepush
redGreenCycles:
  - id: f06-selected-operator-query-boundary
    redTest: pnpm --filter @dvt/web test -- queryKeyPolicy.architecture.test.ts
    expectedFailure: selected operator views and dbt panel import @tanstack/react-query directly.
    patchSurfaces:
      - apps/web/src/app/plugins/dbt/DbtNodeRenderer.tsx
      - apps/web/src/app/queries/queryKeyPolicy.architecture.test.ts
      - apps/web/src/app/queries/runsQueries.ts
      - apps/web/src/app/queries/workspaceQueries.ts
      - apps/web/src/app/views/admin/useAdminViewData.ts
      - apps/web/src/app/views/artifacts/useArtifactsViewModel.ts
      - apps/web/src/app/views/runs/useRunWorkspace.ts
    greenTest: pnpm --filter @dvt/web test -- queryKeyPolicy.architecture.test.ts
symbols:
  - name: F06FrontendQueryBoundaryStandardizationPlan
    path: docs/planning/proposals/mandatory/frontend-and-ux/f06-frontend-query-boundary-standardization-plan-20260514.md
    dddOwner: Web query boundary governance
    cqRails:
      - Workspace query read models
      - Run query read models
    fowlerSignals:
      - Boundary drift
    architectureGuard: queryKeyPolicy.architecture.test.ts
    cypressCoverage: none
    unitTests:
      - queryKeyPolicy.architecture.test.ts
  - name: FrontendQueryBoundaryComponent
    path: docs/architecture/components/web/frontend-query-boundary-component.md
    dddOwner: Web query boundary governance
    cqRails:
      - Workspace query read models
      - Run query read models
    fowlerSignals:
      - Boundary drift
    architectureGuard: queryKeyPolicy.architecture.test.ts
    cypressCoverage: none
    unitTests:
      - queryKeyPolicy.architecture.test.ts
  - name: F06QueryBoundaryFowlerAnalysis
    path: buzon/20260514-codex-fowler-f06-query-boundary-analysis.md
    dddOwner: Web query boundary governance
    cqRails:
      - Workspace query read models
      - Run query read models
    fowlerSignals:
      - Shotgun query ownership
    architectureGuard: queryKeyPolicy.architecture.test.ts
    cypressCoverage: none
    unitTests:
      - queryKeyPolicy.architecture.test.ts
  - name: useScopedRunSummariesQueryForHistory
    path: apps/web/src/app/queries/runsQueries.ts
    dddOwner: Web runtime query boundary
    cqRails:
      - Run query read models
    fowlerSignals:
      - Hidden cache policy
    architectureGuard: queryKeyPolicy.architecture.test.ts
    cypressCoverage: none
    unitTests:
      - RunsView.test.tsx
  - name: useRunSnapshotQuery
    path: apps/web/src/app/queries/runsQueries.ts
    dddOwner: Web runtime query boundary
    cqRails:
      - Run query read models
    fowlerSignals:
      - Hidden cache policy
    architectureGuard: queryKeyPolicy.architecture.test.ts
    cypressCoverage: none
    unitTests:
      - RunsView.test.tsx
  - name: useRunWorkspaceQuery
    path: apps/web/src/app/queries/runsQueries.ts
    dddOwner: Web runtime query boundary
    cqRails:
      - Run query read models
    fowlerSignals:
      - Hidden cache policy
    architectureGuard: queryKeyPolicy.architecture.test.ts
    cypressCoverage: none
    unitTests:
      - useRunWorkspace.test.tsx
  - name: WorkspaceArtifactRecord
    path: apps/web/src/app/queries/workspaceQueries.ts
    dddOwner: Web workspace query boundary
    cqRails:
      - Workspace query read models
    fowlerSignals:
      - Boundary drift
    architectureGuard: queryKeyPolicy.architecture.test.ts
    cypressCoverage: none
    unitTests:
      - useArtifactsViewModel.test.tsx
  - name: WorkspaceArtifactMap
    path: apps/web/src/app/queries/workspaceQueries.ts
    dddOwner: Web workspace query boundary
    cqRails:
      - Workspace query read models
    fowlerSignals:
      - Boundary drift
    architectureGuard: queryKeyPolicy.architecture.test.ts
    cypressCoverage: none
    unitTests:
      - useArtifactsViewModel.test.tsx
  - name: WORKSPACE_ARTIFACT_FILE_NAMES
    path: apps/web/src/app/queries/workspaceQueries.ts
    dddOwner: Web workspace query boundary
    cqRails:
      - Workspace query read models
    fowlerSignals:
      - Boundary drift
    architectureGuard: queryKeyPolicy.architecture.test.ts
    cypressCoverage: none
    unitTests:
      - useArtifactsViewModel.test.tsx
  - name: flattenWorkspaceEntries
    path: apps/web/src/app/queries/workspaceQueries.ts
    dddOwner: Web workspace query boundary
    cqRails:
      - Workspace query read models
    fowlerSignals:
      - Boundary drift
    architectureGuard: queryKeyPolicy.architecture.test.ts
    cypressCoverage: none
    unitTests:
      - useArtifactsViewModel.test.tsx
  - name: parseStructuredContent
    path: apps/web/src/app/queries/workspaceQueries.ts
    dddOwner: Web workspace query boundary
    cqRails:
      - Workspace query read models
    fowlerSignals:
      - Boundary drift
    architectureGuard: queryKeyPolicy.architecture.test.ts
    cypressCoverage: none
    unitTests:
      - useArtifactsViewModel.test.tsx
  - name: loadWorkspaceArtifacts
    path: apps/web/src/app/queries/workspaceQueries.ts
    dddOwner: Web workspace query boundary
    cqRails:
      - Workspace query read models
    fowlerSignals:
      - Boundary drift
    architectureGuard: queryKeyPolicy.architecture.test.ts
    cypressCoverage: none
    unitTests:
      - useArtifactsViewModel.test.tsx
  - name: useWorkspaceRolesQuery
    path: apps/web/src/app/queries/workspaceQueries.ts
    dddOwner: Web workspace query boundary
    cqRails:
      - Workspace query read models
    fowlerSignals:
      - Hidden cache policy
    architectureGuard: queryKeyPolicy.architecture.test.ts
    cypressCoverage: none
    unitTests:
      - AdminView.test.tsx
  - name: useWorkspaceAuditQuery
    path: apps/web/src/app/queries/workspaceQueries.ts
    dddOwner: Web workspace query boundary
    cqRails:
      - Workspace query read models
    fowlerSignals:
      - Hidden cache policy
    architectureGuard: queryKeyPolicy.architecture.test.ts
    cypressCoverage: none
    unitTests:
      - AdminView.test.tsx
  - name: useWorkspaceArtifactsQuery
    path: apps/web/src/app/queries/workspaceQueries.ts
    dddOwner: Web workspace query boundary
    cqRails:
      - Workspace query read models
    fowlerSignals:
      - Hidden cache policy
    architectureGuard: queryKeyPolicy.architecture.test.ts
    cypressCoverage: none
    unitTests:
      - useArtifactsViewModel.test.tsx
```
