---
title: F-17-C Artifacts Monaco Read-Only Viewer Plan
status: Active
owner: Web / Architecture
date: 2026-05-20
last_reviewed: 2026-05-20
planning_type: proposal
---

# F-17-C Artifacts Monaco Read-Only Viewer Plan

## Think-First Analysis

Problem summary: `F-17-C` is still queued even though Artifacts already renders
Monaco-backed JSON previews. The implementation is useful but semantically
under-governed: the route has no local component guide, no stories, no Fowler
analysis, no architecture guard, and one inert command-looking button.

Root cause: implementation landed ahead of task closure and component
documentation. Existing rendered tests prove the route can show Monaco, but
they do not prove read-only semantics, route ownership, or non-Canvas posture.

Constraints and invariants:

- `docs/planning/proposals/monaco-workbench-integration-rationale-20260402.md`
  keeps Monaco embedded in Diff, Artifacts, and Templates only.
- Artifacts reuses `ListWorkspaceFiles` and `GetWorkspaceFileContent`; no new
  command/query rail is introduced.
- The route shell and tab topology remain unchanged.
- Monaco remains lazy and read-only for this slice.
- Canvas remains graph-first and non-Monaco-centric.

## Pre-Implementation Brief

Mode: Full.

Scope:

- Add Fowler analysis in `buzon`.
- Add Artifacts Monaco component guide and user stories.
- Add module owned-concern docblocks.
- Extract `ArtifactMonacoPreviewPanel`.
- Remove the inert `View Full File` affordance.
- Add semantic architecture guard.
- Update planning state and generated docs.

Out of scope:

- new backend artifact APIs;
- editing, save, or apply semantics;
- a full-file modal;
- Canvas Monaco hosting;
- Templates Monaco closure;
- bundle-budget enforcement beyond existing lazy loading.

Validation plan:

- `pnpm docs:feature-mechanization -- --feature F17C-ARTIFACTS-MONACO-READONLY-VIEWER-20260520`
- `pnpm --filter @dvt/web test -- src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts src/app/views/artifacts/ArtifactMonacoPreviewPanel.test.tsx`
- `pnpm --filter @dvt/web test -- src/app/views/ArtifactsView.test.tsx`
- `pnpm --filter @dvt/web test:changed -- --files apps/web/src/app/views/artifacts/ArtifactMonacoPreviewPanel.tsx apps/web/src/app/views/artifacts/ArtifactPreviewTabs.tsx apps/web/src/app/components/monaco/MonacoCodeSurface.tsx`
- `pnpm --filter @dvt/web typecheck`
- `pnpm --filter @dvt/web lint`
- `pnpm --filter @dvt/web test:e2e:startup-route-readiness`
- `pnpm docs:sync`
- `pnpm docs:status:generate`
- `pnpm governance:refresh`
- `pnpm verify:prepush`

## Fowler Opportunity Matrix

<!-- markdownlint-disable MD060 -->

| Scenario                   | Opportunity         | Fowler pattern                | DDD owner                                         | Command/query rail                              | Implementation surfaces                             | Unit or package test                  | Architecture test                                    | User-flow test        | Out of scope            |
| -------------------------- | ------------------- | ----------------------------- | ------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------- | ------------------------------------- | ---------------------------------------------------- | --------------------- | ----------------------- |
| Workspace artifact preview | Documentation drift | Presentation Model + Gateway  | `ArtifactPreviewDocumentMap` / `MonacoCodeViewer` | `ListWorkspaceFiles`, `GetWorkspaceFileContent` | Artifacts panels and Monaco viewer                  | `ArtifactsView.test.tsx`              | `artifactsMonacoReadonlyViewer.architecture.test.ts` | Vitest route test     | editing                 |
| Imported manifest preview  | Duplicate semantics | Extract Component             | `ArtifactMonacoPreviewPanel`                      | local import state only                         | `ArtifactPreviewTabs`, `ArtifactMonacoPreviewPanel` | `ArtifactMonacoPreviewPanel.test.tsx` | `artifactsMonacoReadonlyViewer.architecture.test.ts` | Vitest component test | backend import contract |
| Monaco route posture       | Hidden authority    | Semantic Fitness Function     | Artifacts route workbench                         | none - internal presentation only               | architecture docs and tests                         | n/a                                   | `artifactsMonacoReadonlyViewer.architecture.test.ts` | n/a                   | shell changes           |
| Fake full-file command     | Inert UI command    | Command-Query rail discipline | Artifacts route                                   | none exists                                     | `ArtifactPreviewTabs`                               | `ArtifactsView.test.tsx`              | `artifactsMonacoReadonlyViewer.architecture.test.ts` | Vitest route test     | full-file modal         |

<!-- markdownlint-enable MD060 -->

```feature-mechanization
version: 1
featureId: F17C-ARTIFACTS-MONACO-READONLY-VIEWER-20260520
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f17c-artifacts-monaco-readonly-viewer-plan-20260520.md
componentGuides:
  - docs/architecture/components/web/artifacts/artifacts-monaco-readonly-viewer-component.md
userStories:
  - docs/architecture/components/web/artifacts/artifacts-monaco-readonly-viewer-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/proposals/monaco-workbench-integration-rationale-20260402.md
allowedImplementationSurfaces:
  - apps/web/src/app/views/ArtifactsView.tsx
  - apps/web/src/app/views/ArtifactsView.test.tsx
  - apps/web/src/app/views/artifacts/ArtifactPreviewTabs.tsx
  - apps/web/src/app/views/artifacts/ArtifactMonacoPreviewPanel.tsx
  - apps/web/src/app/views/artifacts/ArtifactMonacoPreviewPanel.test.tsx
  - apps/web/src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts
  - apps/web/src/app/views/artifacts/copy.ts
  - apps/web/src/app/components/monaco/MonacoCodeViewer.tsx
  - apps/web/src/app/components/monaco/MonacoCodeSurface.tsx
  - apps/web/src/app/components/monaco/MonacoViewerFallback.tsx
  - apps/web/src/app/components/workbench/RouteWorkbenchFrame.tsx
  - apps/web/cypress/e2e/shell/startup-route-readiness.cy.ts
  - docs/architecture/components/web/artifacts/artifacts-monaco-readonly-viewer-component.md
  - docs/architecture/components/web/artifacts/artifacts-monaco-readonly-viewer-user-stories.md
  - docs/planning/proposals/mandatory/frontend-and-ux/f17c-artifacts-monaco-readonly-viewer-plan-20260520.md
  - docs/.manifest.json
  - buzon/20260520-f17c-fowler-artifacts-monaco-readonly-viewer-analysis.md
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
  - apps/api/**
commandQueryRails:
  - name: ListWorkspaceFiles
    type: query
    dddOwner: Workspace file tree read model
  - name: GetWorkspaceFileContent
    type: query
    dddOwner: Workspace file content read model
domainObjects:
  - name: ArtifactPreviewDocumentMap
    type: presentation read model
    owner: apps/web
  - name: ArtifactMonacoPreviewPanel
    type: presentation adapter
    owner: apps/web
  - name: MonacoCodeViewer
    type: presentation gateway
    owner: apps/web
fowlerSignals:
  - Documentation drift
  - Hidden authority
  - Fake command
  - Responsibility overload
architectureGuards:
  - pnpm --filter @dvt/web test -- src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts
cypressFlows:
  - pnpm --filter @dvt/web test:e2e:startup-route-readiness
completionGate:
  - pnpm --filter @dvt/web test -- src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts src/app/views/artifacts/ArtifactMonacoPreviewPanel.test.tsx
  - pnpm --filter @dvt/web test -- src/app/views/ArtifactsView.test.tsx
  - pnpm --filter @dvt/web test:changed -- --files apps/web/src/app/views/artifacts/ArtifactMonacoPreviewPanel.tsx apps/web/src/app/views/artifacts/ArtifactPreviewTabs.tsx apps/web/src/app/components/monaco/MonacoCodeSurface.tsx
  - pnpm --filter @dvt/web typecheck
  - pnpm --filter @dvt/web lint
  - pnpm --filter @dvt/web test:e2e:startup-route-readiness
  - pnpm governance:refresh
  - pnpm verify:prepush
redGreenCycles:
  - id: f17c-artifacts-monaco-semantic-architecture-guard
    redTest: pnpm --filter @dvt/web test -- src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts
    expectedFailure: component extraction and owned-concern module docblocks are missing.
    patchSurfaces:
      - apps/web/src/app/views/ArtifactsView.tsx
      - apps/web/src/app/views/artifacts/ArtifactPreviewTabs.tsx
      - apps/web/src/app/views/artifacts/ArtifactMonacoPreviewPanel.tsx
      - apps/web/src/app/components/monaco/MonacoCodeViewer.tsx
      - apps/web/src/app/components/monaco/MonacoCodeSurface.tsx
    greenTest: pnpm --filter @dvt/web test -- src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts
symbols:
  - name: APP_ROOT
    path: apps/web/src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts
    dddOwner: Artifacts Monaco architecture test support
    cqRails: [none - internal presentation only]
    fowlerSignals: [Semantic Fitness Function]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts]
  - name: REPO_ROOT
    path: apps/web/src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts
    dddOwner: Artifacts Monaco architecture test support
    cqRails: [none - internal presentation only]
    fowlerSignals: [Semantic Fitness Function]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts]
  - name: readAppSource
    path: apps/web/src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts
    dddOwner: Artifacts Monaco architecture test support
    cqRails: [none - internal presentation only]
    fowlerSignals: [Semantic Fitness Function]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts]
  - name: readRepoDoc
    path: apps/web/src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts
    dddOwner: Artifacts Monaco architecture test support
    cqRails: [none - internal presentation only]
    fowlerSignals: [Semantic Fitness Function]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts]
  - name: collectProductionSourceFiles
    path: apps/web/src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts
    dddOwner: Artifacts Monaco architecture test support
    cqRails: [none - internal presentation only]
    fowlerSignals: [Semantic Fitness Function]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts]
  - name: ArtifactMonacoPreviewPanelProps
    path: apps/web/src/app/views/artifacts/ArtifactMonacoPreviewPanel.tsx
    dddOwner: Artifacts structured payload presentation adapter
    cqRails: [none - internal presentation only]
    fowlerSignals: [Extract Component]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/artifacts/ArtifactMonacoPreviewPanel.test.tsx]
  - name: ArtifactMonacoPreviewPanel
    path: apps/web/src/app/views/artifacts/ArtifactMonacoPreviewPanel.tsx
    dddOwner: Artifacts structured payload presentation adapter
    cqRails: [none - internal presentation only]
    fowlerSignals: [Extract Component, Fake command removal]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/artifacts/ArtifactMonacoPreviewPanel.test.tsx]
  - name: MonacoCodeViewer
    path: apps/web/src/app/components/monaco/MonacoCodeViewer.tsx
    dddOwner: Monaco code viewer presentation gateway
    cqRails: [none - internal presentation only]
    fowlerSignals: [Gateway]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/ArtifactsView.test.tsx]
```
