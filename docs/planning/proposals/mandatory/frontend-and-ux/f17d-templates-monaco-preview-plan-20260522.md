---
title: F-17-D Templates Monaco Preview Plan
status: Active
owner: Web / Architecture
date: 2026-05-22
last_reviewed: 2026-05-22
planning_type: proposal
---

# F-17-D Templates Monaco Preview Plan

## Think-First Analysis

F-21 added the governed `/templates` route and kept generated source in a basic
read-only `<pre>` block. That was the right first vertical, but F-17 now needs
Templates to join the same embedded Monaco review strategy already used by Diff
and Artifacts.

Root cause: generated source is source-code shaped, but the route still owns the
preview rendering inline. That keeps validation and generation well-contained,
yet misses the common Monaco gateway and leaves Templates as the remaining
route named in the Monaco rationale without an explicit read-only surface.

Constraints and invariants:

- Templates owns catalog, parameter state, validation, and deterministic preview
  projection.
- Monaco owns only read-only source inspection; it must not own generation,
  execution, persistence, or shell layout.
- The route remains `/templates` and keeps `RouteWorkbenchFrame`.
- Canvas remains graph-first and non-Monaco-centric.
- No backend contracts, adapter surfaces, provider execution, or generic
  template engine are introduced.

## Pre-Implementation Brief

Mode: Full.

Scope:

- [Task: F-30] Add a Templates Monaco component guide, user stories, and Fowler analysis.
- [Task: F-30] Add semantic architecture tests for Templates Monaco ownership.
- [Task: F-30] Extract a route-local `TemplateMonacoPreviewPanel`.
- Replace the ready `<pre>` preview with `MonacoCodeViewer`.
- Preserve blocked-preview behavior and deterministic preview projection.

Out of scope:

- Monaco editing;
- export/download commands;
- backend template contracts;
- provider execution;
- Canvas Monaco hosting;
- a generic template framework.

## Fowler Opportunity Matrix

<!-- markdownlint-disable MD060 -->

| Scenario                 | Opportunity            | Fowler pattern              | DDD owner                            | Command/query rail                 | Implementation surfaces                    | Unit or package test                  | Architecture test                             | User-flow test           | Out of scope        |
| ------------------------ | ---------------------- | --------------------------- | ------------------------------------ | ---------------------------------- | ------------------------------------------ | ------------------------------------- | --------------------------------------------- | ------------------------ | ------------------- |
| Generated source preview | Inline presentation    | Extract Component + Gateway | `TemplateMonacoPreviewPanel`         | `GenerateExecutionTemplatePreview` | Templates workbench and Monaco viewer      | `TemplateMonacoPreviewPanel.test.tsx` | `templatesMonacoPreview.architecture.test.ts` | `TemplatesView.test.tsx` | editing             |
| Route semantic ownership | Hidden authority       | Semantic Fitness Function   | Templates route workbench            | `ListExecutionTemplateProfiles`    | architecture docs and tests                | n/a                                   | `templatesMonacoPreview.architecture.test.ts` | n/a                      | shell changes       |
| Shared Monaco reuse      | Duplicate route wiring | Gateway                     | `MonacoCodeViewer`                   | none - presentation gateway        | shared Monaco component                    | existing Monaco tests                 | Templates/Artifacts architecture guards       | n/a                      | new Monaco surface  |
| Blocked preview state    | Incomplete affordance  | Explicit State              | `ExecutionTemplatePreviewProjection` | `GenerateExecutionTemplatePreview` | `TemplatesRouteWorkbench` validation state | `TemplatesView.test.tsx`              | `templatesMonacoPreview.architecture.test.ts` | `TemplatesView.test.tsx` | fake export command |

<!-- markdownlint-enable MD060 -->

```feature-mechanization
version: 1
featureId: F17D-TEMPLATES-MONACO-PREVIEW-20260522
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f17d-templates-monaco-preview-plan-20260522.md
componentGuides:
  - docs/architecture/components/web/templates/execution-template-monaco-preview-component.md
userStories:
  - docs/architecture/components/web/templates/execution-template-monaco-preview-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/proposals/monaco-workbench-integration-rationale-20260402.md
  - docs/architecture/components/web/templates/execution-template-source-generation-component.md
allowedImplementationSurfaces:
  - apps/web/package.json
  - apps/web/src/app/views/TemplatesView.test.tsx
  - apps/web/src/app/views/templates/TemplatesRouteWorkbench.tsx
  - apps/web/src/app/views/templates/TemplateMonacoPreviewPanel.tsx
  - apps/web/src/app/views/templates/TemplateMonacoPreviewPanel.test.tsx
  - apps/web/src/app/views/templates/templatesMonacoPreview.architecture.test.ts
  - apps/web/cypress/e2e/templates/templates-workbench.cy.ts
  - apps/web/src/app/components/monaco/MonacoCodeViewer.tsx
  - apps/web/src/app/components/monaco/MonacoCodeSurface.tsx
  - pnpm-lock.yaml
  - buzon/20260522-f17d-fowler-templates-monaco-preview-analysis.md
  - docs/.manifest.json
  - docs/architecture/components/web/index.md
  - docs/architecture/components/web/templates/execution-template-monaco-preview-component.md
  - docs/architecture/components/web/templates/execution-template-monaco-preview-user-stories.md
  - docs/architecture/components/web/templates/execution-template-source-generation-component.md
  - docs/planning/closeouts/20260522-f17d-templates-monaco-preview-closeout.md
  - docs/planning/proposals/mandatory/frontend-and-ux/f17d-templates-monaco-preview-plan-20260522.md
forbiddenImplementationSurfaces:
  - apps/api/**
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
commandQueryRails:
  - name: GenerateExecutionTemplatePreview
    type: query
    dddOwner: ExecutionTemplatePreviewProjection
  - name: ListExecutionTemplateProfiles
    type: query
    dddOwner: ExecutionTemplateCatalogReadModel
domainObjects:
  - name: TemplateMonacoPreviewPanel
    type: presentation adapter
    owner: apps/web
  - name: ExecutionTemplatePreviewProjection
    type: projection
    owner: apps/web
  - name: MonacoCodeViewer
    type: presentation gateway
    owner: apps/web
fowlerSignals:
  - Inline presentation
  - Hidden authority
  - Documentation drift
  - Semantic fitness function
architectureGuards:
  - pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts
cypressFlows:
  - pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
completionGate:
  - pnpm docs:feature-mechanization -- --feature F17D-TEMPLATES-MONACO-PREVIEW-20260522
  - pnpm docs:feature-mechanization:implementation -- --feature F17D-TEMPLATES-MONACO-PREVIEW-20260522
  - pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/templates/TemplateMonacoPreviewPanel.test.tsx
  - pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/TemplatesView.test.tsx
  - pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts
  - pnpm --filter @dvt/web typecheck
  - pnpm --filter @dvt/web lint
  - pnpm docs:sync
  - pnpm docs:status:generate
  - pnpm governance:refresh
  - pnpm verify:prepush
redGreenCycles:
  - id: f17d-templates-monaco-semantic-guard
    redTest: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts
    expectedFailure: Templates still renders the generated source inline and has no route-local Monaco preview panel.
    patchSurfaces:
      - apps/web/src/app/views/templates/TemplatesRouteWorkbench.tsx
      - apps/web/src/app/views/templates/TemplateMonacoPreviewPanel.tsx
      - apps/web/src/app/views/templates/templatesMonacoPreview.architecture.test.ts
    greenTest: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts
symbols:
  - name: TemplateMonacoPreviewPanelProps
    path: apps/web/src/app/views/templates/TemplateMonacoPreviewPanel.tsx
    dddOwner: Template generated source presentation adapter
    cqRails: [GenerateExecutionTemplatePreview]
    fowlerSignals: [Extract Component]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/templates/TemplateMonacoPreviewPanel.test.tsx]
  - name: TemplateMonacoPreviewPanel
    path: apps/web/src/app/views/templates/TemplateMonacoPreviewPanel.tsx
    dddOwner: Template generated source presentation adapter
    cqRails: [GenerateExecutionTemplatePreview]
    fowlerSignals: [Gateway]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/templates/TemplateMonacoPreviewPanel.test.tsx]
  - name: TRANSITIVE_MONACO_VIEWER_AUTHORITIES
    path: apps/web/src/app/views/templates/templatesMonacoPreview.architecture.test.ts
    dddOwner: Templates Monaco transitive authority catalog
    cqRails: [GenerateExecutionTemplatePreview]
    fowlerSignals: [Hidden authority, Semantic Fitness Function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts]
  - name: REPO_ROOT
    path: apps/web/src/app/views/templates/templatesMonacoPreview.architecture.test.ts
    dddOwner: Templates Monaco architecture test support
    cqRails: [GenerateExecutionTemplatePreview]
    fowlerSignals: [Semantic Fitness Function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts]
  - name: APP_ROOT
    path: apps/web/src/app/views/templates/templatesMonacoPreview.architecture.test.ts
    dddOwner: Templates Monaco architecture test support
    cqRails: [GenerateExecutionTemplatePreview]
    fowlerSignals: [Semantic Fitness Function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts]
  - name: readAppSource
    path: apps/web/src/app/views/templates/templatesMonacoPreview.architecture.test.ts
    dddOwner: Templates Monaco architecture test support
    cqRails: [GenerateExecutionTemplatePreview]
    fowlerSignals: [Semantic Fitness Function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts]
  - name: readRepoDoc
    path: apps/web/src/app/views/templates/templatesMonacoPreview.architecture.test.ts
    dddOwner: Templates Monaco architecture test support
    cqRails: [GenerateExecutionTemplatePreview]
    fowlerSignals: [Semantic Fitness Function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts]
  - name: collectProductionSourceFiles
    path: apps/web/src/app/views/templates/templatesMonacoPreview.architecture.test.ts
    dddOwner: Templates Monaco architecture test support
    cqRails: [GenerateExecutionTemplatePreview]
    fowlerSignals: [Semantic Fitness Function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts]
  - name: stubTemplatesRouteBootstrapApis
    path: apps/web/cypress/e2e/templates/templates-workbench.cy.ts
    dddOwner: Templates browser UX proof
    cqRails: [GenerateExecutionTemplatePreview]
    fowlerSignals: [Semantic Fitness Function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [N/A - Cypress route helper]
```
