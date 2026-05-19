---
title: F-15-E Canvas Startup Template Selection Plan
status: Accepted
owner: Frontend / Canvas
last_reviewed: 2026-05-18
planning_type: mandatory
---

# F-15-E Canvas Startup Template Selection Plan

## Objective

Converge Canvas first-start selection so `dbt` and `Transformation` are shown
as canvas templates inside the active workspace, not as project types. Keep the
existing protected draft command rail and improve documentation, stories,
semantic architecture coverage, and focused TDD tests.

## Scope

- Show active workspace context in the first-canvas host surface.
- Use template language in route copy and component documentation.
- Render `CanvasKindRegistration.createTitle` as the visible template choice.
- Keep `CanvasPlaygroundHostTemplate` passive.
- Add a semantic architecture guard that checks docs, stories, copy, context
  flow, and template invariants.
- Add focused presentation tests for workspace context and command dispatch.

## Command And Query Rail

- Rail: `CreateCanvasDocumentCommand`
- Type: command
- Owning bounded context: Web Canvas playground host
- DDD object: Canvas document inside workspace graph draft
- Application port: `IWorkspaceGraphDraftAuthoringPort`
- Adapter surface: `/workspace/graph/draft`
- Scope and authorization: active `WorkspaceScope`; first-canvas creation must
  be offered only when the protected draft can persist a missing canvas
  document. Graph edit permission remains a later node/edge mutation concern.
- Negative tests: no template command construction, no project selector, no
  project-type copy, no alternate create-canvas rail.

```feature-mechanization
version: 1
featureId: F15E-CANVAS-STARTUP-TEMPLATE-SELECTION-20260518
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f15e-canvas-startup-template-selection-plan-20260518.md
componentGuides:
  - docs/architecture/components/web/graph/canvas-startup-template-selection-component.md
  - docs/architecture/components/web/graph/canvas-playground-host-component.md
userStories:
  - docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-user-stories.md
  - buzon/20260518-codex-fowler-f15e-canvas-startup-template-selection.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/components/web/graph/canvas-playground-host-component.md
  - docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-user-stories.md
allowedImplementationSurfaces:
  - apps/web/src/app/views/canvas/CanvasPlaygroundHost.tsx
  - apps/web/src/app/views/canvas/CanvasPlaygroundHost.templates.tsx
  - apps/web/src/app/views/canvas/CanvasPlaygroundHost.test.tsx
  - apps/web/src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
  - apps/web/src/app/views/canvas/CanvasCenterSurface.tsx
  - apps/web/src/app/views/canvas/canvasCenterSurface.types.ts
  - apps/web/src/app/views/canvas/canvasCenterSurfaceWorkbench.tsx
  - apps/web/src/app/views/canvas/canvasControllerViewModel.ts
  - apps/web/src/app/views/canvas/canvasCopy.types.ts
  - apps/web/src/app/views/canvas/canvasCopyCatalog.route.ts
  - apps/web/src/app/views/canvas/canvasCopyCatalog.route.es.ts
  - apps/web/src/app/views/canvas/canvasHostCycleState.ts
  - apps/web/src/app/views/canvas/canvasHostCycleState.test.ts
  - apps/web/src/app/views/canvas/CanvasEmptyAuthoringEntrypoint.architecture.test.ts
  - apps/web/src/app/views/canvas/canvasRouteViewState.ts
  - apps/web/src/app/views/canvas/canvasShellBuilder.types.ts
  - apps/web/src/app/views/canvas/canvasShellLayoutBuilder.tsx
  - apps/web/src/app/views/canvas/canvasShellPropsBuilder.tsx
  - buzon/20260518-codex-fowler-f15e-canvas-startup-template-selection.md
  - docs/architecture/components/web/graph/canvas-playground-host-component.md
  - docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-user-stories.md
  - docs/architecture/components/web/graph/canvas-startup-template-selection-component.md
  - docs/planning/proposals/mandatory/frontend-and-ux/f15e-canvas-startup-template-selection-plan-20260518.md
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
  - apps/api/**
  - specs/**
commandQueryRails:
  - name: CreateCanvasDocumentCommand
    type: command
    dddOwner: CanvasDocument
domainObjects:
  - name: CanvasDocument
    type: workspace graph draft child document
    owner: Frontend Canvas host
fowlerSignals:
  - Boundary drift
  - Semantic encapsulation
  - Registry language leak
  - Documentation drift
architectureGuards:
  - pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
cypressFlows:
  - N/A - first-start semantic copy and command dispatch are covered by focused Vitest and architecture tests; Cypress live first-authoring remains the governed browser rail for end-to-end persistence.
completionGate:
  - pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.test.tsx src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
  - pnpm --filter @dvt/web test:canvas
  - pnpm --filter @dvt/web typecheck
  - pnpm docs:sync
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: f15e-canvas-startup-template-selection
    redTest: pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.test.tsx src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
    expectedFailure: Host does not carry workspace scope to first-start presentation and the visible option title still uses registry label copy.
    patchSurfaces:
      - apps/web/src/app/views/canvas/CanvasPlaygroundHost.tsx
      - apps/web/src/app/views/canvas/CanvasPlaygroundHost.templates.tsx
      - apps/web/src/app/views/canvas/canvasRouteViewState.ts
      - apps/web/src/app/views/canvas/canvasShellLayoutBuilder.tsx
    greenTest: pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.test.tsx src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
symbols:
  - name: CanvasPlaygroundHost
    path: apps/web/src/app/views/canvas/CanvasPlaygroundHost.tsx
    dddOwner: CanvasDocument
    cqRails: [CreateCanvasDocumentCommand]
    fowlerSignals: [Semantic encapsulation, Boundary drift]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.test.tsx]
    cypressCoverage: Covered indirectly by live first-authoring Cypress flows; no new browser flow is required for copy-only template posture.
  - name: CanvasPlaygroundHostTemplate
    path: apps/web/src/app/views/canvas/CanvasPlaygroundHost.templates.tsx
    dddOwner: CanvasDocument
    cqRails: [CreateCanvasDocumentCommand]
    fowlerSignals: [Semantic encapsulation, Registry language leak]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.test.tsx]
    cypressCoverage: N/A - passive template semantics are guarded by Vitest and architecture tests.
  - name: formatWorkspaceScope
    path: apps/web/src/app/views/canvas/CanvasPlaygroundHost.templates.tsx
    dddOwner: CanvasDocument
    cqRails: [CreateCanvasDocumentCommand]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.test.tsx]
    cypressCoverage: N/A - scope formatting is a first-start presentation concern covered by focused Vitest.
  - name: PLAYGROUND_HOST_TEMPLATE_SOURCE
    path: apps/web/src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
    dddOwner: CanvasDocument
    cqRails: [CreateCanvasDocumentCommand]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx]
    cypressCoverage: N/A - architecture source reader symbol.
  - name: ROUTE_COPY_SOURCE
    path: apps/web/src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
    dddOwner: CanvasDocument
    cqRails: [CreateCanvasDocumentCommand]
    fowlerSignals: [Semantic encapsulation, Documentation drift]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx]
    cypressCoverage: N/A - architecture source reader symbol.
  - name: HOST_CYCLE_SOURCE
    path: apps/web/src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
    dddOwner: CanvasDocument
    cqRails: [CreateCanvasDocumentCommand]
    fowlerSignals: [Semantic encapsulation, Documentation drift]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx]
    cypressCoverage: N/A - architecture source reader symbol guarding first-canvas capability semantics.
  - name: canCreateFirstCanvasDocument
    path: apps/web/src/app/views/canvas/canvasHostCycleState.ts
    dddOwner: CanvasDocument
    cqRails: [CreateCanvasDocumentCommand]
    fowlerSignals: [Semantic encapsulation, Boundary drift]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasHostCycleState.test.ts]
    cypressCoverage: apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts proves the template button remains enabled before graph mutation opens.
  - name: workspaceScope
    path: apps/web/src/app/views/canvas/CanvasPlaygroundHost.test.tsx
    dddOwner: CanvasDocument
    cqRails: [CreateCanvasDocumentCommand]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.test.tsx]
    cypressCoverage: N/A - test fixture proving visible active workspace context.
  - name: canvasKinds
    path: apps/web/src/app/views/canvas/CanvasPlaygroundHost.test.tsx
    dddOwner: CanvasDocument
    cqRails: [CreateCanvasDocumentCommand]
    fowlerSignals: [Registry language leak]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.test.tsx]
    cypressCoverage: N/A - test fixture proving template titles come from canvas registration createTitle.
  - name: renderHost
    path: apps/web/src/app/views/canvas/CanvasPlaygroundHost.test.tsx
    dddOwner: CanvasDocument
    cqRails: [CreateCanvasDocumentCommand]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasPlaygroundHost.test.tsx]
    cypressCoverage: N/A - focused render harness for host presentation semantics.
```

## ADR Decision

No ADR is required. The slice reuses the current host facade, session-context
query, plugin registry, and protected draft command rail without changing a
cross-system contract or persistence authority.
