---
title: F-15-H First Canvas Draft Capability Split Plan
status: Accepted
owner: Frontend / Canvas
last_reviewed: 2026-05-20
planning_type: mandatory
lane: E
task_id: F-15-H
parent_task_id: F-15
---

# F-15-H First Canvas Draft Capability Split Plan

## Objective

Close the remaining first-canvas semantic drift by projecting draft persistence
as `canPersistGraphDraft` instead of deriving the Canvas authoring runtime from
`canEditEdges`.

## Existing Task Check

Existing F15G work created the first-canvas availability policy and component
guide. This slice extends that task family because the observed runtime drift
is outside the original F15G allowed surfaces: protected route session
projection and authoring-runtime input vocabulary.

## Command And Query Rail

| Rail                          | Type    | Owner           | Impact                                                                 |
| ----------------------------- | ------- | --------------- | ---------------------------------------------------------------------- |
| `CreateCanvasDocumentCommand` | command | Canvas document | Reused; no command semantics change.                                   |
| `GetProtectedRouteSession`    | query   | Session context | Reused; web maps scopes to the new local `canPersistGraphDraft` field. |
| `SaveWorkspaceGraphDraft`     | command | Draft boundary  | Reused through existing Canvas document command execution.             |

No new backend rail is introduced.

## Fowler Matrix

| Scenario                                                                 | Opportunity         | Fowler pattern                                   | DDD owner                        | Rail                          | Surfaces                                                                                                                                                                                     | Unit or package test                                         | Architecture test                                      | User-flow test                                | Out of scope                        |
| ------------------------------------------------------------------------ | ------------------- | ------------------------------------------------ | -------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------ | --------------------------------------------- | ----------------------------------- |
| First-canvas creation depends on edge-edit permission projection         | Primitive obsession | Replace overloaded boolean with named capability | Canvas document creation policy  | `CreateCanvasDocumentCommand` | `authorizationStore.ts`, `protectedRouteSessionContext.ts`, `canvasAuthoringRuntime.types.ts`, `useCanvasAuthoringRuntime.ts`, `useCanvasController.ts`                                      | `protectedRouteSessionContext.test.ts`, controller core test | `CanvasPlaygroundHost.architecture.test.tsx`           | Existing Canvas Cypress screen proof retained | Backend auth model changes          |
| Runtime contract names draft persistence as graph edit transport         | Boundary drift      | Intention-revealing interface                    | Canvas authoring runtime         | `CreateCanvasDocumentCommand` | `canvasAuthoringRuntime.types.ts`, `useCanvasAuthoringRuntime.ts`, `canvas-authoring-runtime-component.md`                                                                                   | controller core test                                         | `canvasAuthoringRuntimeComponent.architecture.test.ts` | N/A                                           | Node/edge authoring policy changes  |
| Docs say creation ignores `canEditEdges` but session projection does not | Documentation drift | Component guide plus semantic fitness function   | First Canvas creation capability | `CreateCanvasDocumentCommand` | `canvas-first-canvas-creation-capability-component.md`, `canvas-first-canvas-creation-capability-user-stories.md`, `buzon/20260520-codex-fowler-f15h-first-canvas-draft-capability-split.md` | markdown/docs gates                                          | `CanvasPlaygroundHost.architecture.test.tsx`           | N/A                                           | Shell menu layout and admin/plugins |

## Red / Green Cycles

1. **Session capability projection**
   - Red: `pnpm --filter @dvt/web test:unit -- protectedRouteSessionContext.test.ts`
   - Expected failure: `canPersistGraphDraft` is missing when
     `workspace:graph-draft:save` is granted and `canEditEdges` is explicitly
     false.
   - Green: add `canPersistGraphDraft` to `UserPermissions` and project it from
     the draft-save scope.

2. **Canvas controller runtime handoff**
   - Red: `pnpm --filter @dvt/web test:presentation -- useCanvasController.core.test.tsx`
   - Expected failure: first-canvas creation stays false when graph edits are
     denied but draft persistence is granted.
   - Green: pass `store.userPermissions.canPersistGraphDraft` into the
     authoring runtime.

3. **Semantic architecture guard**
   - Red: `pnpm --filter @dvt/web test:architecture -- CanvasPlaygroundHost.architecture.test.tsx canvasAuthoringRuntimeComponent.architecture.test.ts`
   - Expected failure: runtime still exposes `canEditDraftTransport` or
     controller still passes `canEditEdges` to draft persistence.
   - Green: rename runtime input to `canPersistGraphDraftTransport` and guard
     the controller handoff.

## ADR Decision

No ADR is required. The slice changes local web capability projection and
runtime vocabulary behind existing rails. It does not change API contracts,
engine contracts, adapters, planner behavior, or persistence authority.

```feature-mechanization
version: 1
featureId: F15H-FIRST-CANVAS-DRAFT-CAPABILITY-SPLIT-20260520
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f15h-first-canvas-draft-capability-split-plan-20260520.md
componentGuides:
  - docs/architecture/components/web/graph/canvas-first-canvas-creation-capability-component.md
  - docs/architecture/components/web/graph/canvas-authoring-runtime-component.md
userStories:
  - docs/architecture/components/web/graph/canvas-first-canvas-creation-capability-user-stories.md
  - buzon/20260520-codex-fowler-f15h-first-canvas-draft-capability-split.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/graph/canvas-first-canvas-creation-capability-component.md
  - docs/architecture/components/web/graph/canvas-startup-template-selection-component.md
allowedImplementationSurfaces:
  - apps/web/src/app/stores/authorizationStore.ts
  - apps/web/src/app/stores/authorizationStore.test.ts
  - apps/web/src/app/services/session/protectedRouteSessionContext.ts
  - apps/web/src/app/services/session/protectedRouteSessionContext.test.ts
  - apps/web/src/app/services/session/protectedRouteSessionContext.architecture.test.ts
  - apps/web/src/app/services/composition/appServicesAuthorityHardcut.architecture.test.ts
  - apps/web/src/app/routes.test.tsx
  - apps/web/src/app/views/Canvas.test.controller.defaults.ts
  - apps/web/src/app/views/Canvas.test.hostCycleScenario.ts
  - apps/web/src/app/views/Canvas.readOnlyStates.test.tsx
  - apps/web/src/app/views/Canvas.routeStates.backend-recovery-priority.test.tsx
  - apps/web/src/app/views/Canvas.routeStates.first-canvas-policy.test.tsx
  - apps/web/src/app/views/canvas/canvasAuthoringRuntime.types.ts
  - apps/web/src/app/views/canvas/canvasAuthoringState.ts
  - apps/web/src/app/views/canvas/canvasAuthoringState.test.ts
  - apps/web/src/app/views/canvas/canvasRouteInteractionState.test.ts
  - apps/web/src/app/views/canvas/canvasShellPanelsBuilder.test.ts
  - apps/web/src/app/views/canvas/useCanvasAuthoringRuntime.ts
  - apps/web/src/app/views/canvas/useCanvasController.ts
  - apps/web/src/app/views/canvas/useCanvasController.core.test.tsx
  - apps/web/src/app/views/canvas/useCanvasController.test.stateFactory.ts
  - apps/web/src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
  - apps/web/src/app/views/canvas/canvasAuthoringRuntimeComponent.architecture.test.ts
  - buzon/20260520-codex-fowler-f15h-first-canvas-draft-capability-split.md
  - docs/architecture/components/web/graph/canvas-first-canvas-creation-capability-component.md
  - docs/architecture/components/web/graph/canvas-first-canvas-creation-capability-user-stories.md
  - docs/architecture/components/web/graph/canvas-authoring-runtime-component.md
  - docs/planning/proposals/mandatory/frontend-and-ux/f15h-first-canvas-draft-capability-split-plan-20260520.md
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
  - name: GetProtectedRouteSession
    type: query
    dddOwner: ProtectedRouteSessionContext
domainObjects:
  - name: UserPermissions
    type: value object
    owner: Web authorization projection
  - name: CanvasDocumentCreationCapability
    type: policy
    owner: Frontend Canvas
fowlerSignals:
  - Boundary drift
  - Primitive obsession
  - Feature envy
  - Documentation drift
  - Test-only confidence
architectureGuards:
  - pnpm --filter @dvt/web test:architecture -- CanvasPlaygroundHost.architecture.test.tsx canvasAuthoringRuntimeComponent.architecture.test.ts
cypressFlows:
  - apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts remains the browser proof for rendered first-canvas posture.
completionGate:
  - pnpm docs:feature-mechanization -- --feature F15H-FIRST-CANVAS-DRAFT-CAPABILITY-SPLIT-20260520
  - pnpm --filter @dvt/web test:unit -- protectedRouteSessionContext.test.ts authorizationStore.test.ts
  - pnpm --filter @dvt/web test:presentation -- useCanvasController.core.test.tsx
  - pnpm --filter @dvt/web test:architecture -- CanvasPlaygroundHost.architecture.test.tsx canvasAuthoringRuntimeComponent.architecture.test.ts
  - pnpm --filter @dvt/web test:canvas
  - pnpm --filter @dvt/web typecheck
  - pnpm docs:sync
  - pnpm governance:refresh
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: session-draft-capability-projection
    redTest: pnpm --filter @dvt/web test:unit -- protectedRouteSessionContext.test.ts
    expectedFailure: canPersistGraphDraft is absent from projected user permissions.
    patchSurfaces:
      - apps/web/src/app/stores/authorizationStore.ts
      - apps/web/src/app/stores/authorizationStore.test.ts
      - apps/web/src/app/services/session/protectedRouteSessionContext.ts
      - apps/web/src/app/services/session/protectedRouteSessionContext.test.ts
    greenTest: pnpm --filter @dvt/web test:unit -- protectedRouteSessionContext.test.ts authorizationStore.test.ts
  - id: controller-draft-capability-handoff
    redTest: pnpm --filter @dvt/web test:presentation -- useCanvasController.core.test.tsx
    expectedFailure: first-canvas creation remains unavailable when graph edits are denied but draft persistence is granted.
    patchSurfaces:
      - apps/web/src/app/views/canvas/useCanvasController.ts
      - apps/web/src/app/views/canvas/useCanvasAuthoringRuntime.ts
      - apps/web/src/app/views/canvas/canvasAuthoringState.ts
      - apps/web/src/app/views/canvas/canvasAuthoringState.test.ts
      - apps/web/src/app/views/canvas/canvasAuthoringRuntime.types.ts
      - apps/web/src/app/views/canvas/useCanvasController.core.test.tsx
      - apps/web/src/app/views/canvas/useCanvasController.test.stateFactory.ts
    greenTest: pnpm --filter @dvt/web test:presentation -- useCanvasController.core.test.tsx
  - id: semantic-architecture-guard
    redTest: pnpm --filter @dvt/web test:architecture -- CanvasPlaygroundHost.architecture.test.tsx canvasAuthoringRuntimeComponent.architecture.test.ts
    expectedFailure: architecture tests still find canEditDraftTransport or canEditEdges as the draft persistence handoff.
    patchSurfaces:
      - apps/web/src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
      - apps/web/src/app/views/canvas/canvasAuthoringRuntimeComponent.architecture.test.ts
      - docs/architecture/components/web/graph/canvas-first-canvas-creation-capability-component.md
      - docs/architecture/components/web/graph/canvas-authoring-runtime-component.md
    greenTest: pnpm --filter @dvt/web test:architecture -- CanvasPlaygroundHost.architecture.test.tsx canvasAuthoringRuntimeComponent.architecture.test.ts
symbols:
  - name: UserPermissions
    path: apps/web/src/app/stores/authorizationStore.ts
    dddOwner: WebAuthorizationProjection
    cqRails: [GetProtectedRouteSession]
    fowlerSignals: [Primitive obsession, Boundary drift]
    architectureGuard: pnpm --filter @dvt/web test:architecture -- CanvasPlaygroundHost.architecture.test.tsx canvasAuthoringRuntimeComponent.architecture.test.ts
    unitTests: [pnpm --filter @dvt/web test:unit -- protectedRouteSessionContext.test.ts authorizationStore.test.ts]
    cypressCoverage: apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts
  - name: DEFAULT_USER_PERMISSIONS
    path: apps/web/src/app/stores/authorizationStore.ts
    dddOwner: WebAuthorizationProjection
    cqRails: [GetProtectedRouteSession]
    fowlerSignals: [Fail-closed authority]
    architectureGuard: pnpm --filter @dvt/web test:architecture -- CanvasPlaygroundHost.architecture.test.tsx canvasAuthoringRuntimeComponent.architecture.test.ts
    unitTests: [pnpm --filter @dvt/web test:unit -- authorizationStore.test.ts]
    cypressCoverage: apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts
  - name: CONTROLLER_SOURCE
    path: apps/web/src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
    dddOwner: CanvasSemanticArchitectureGuard
    cqRails: [GetProtectedRouteSession, CreateCanvasDocumentCommand]
    fowlerSignals: [Semantic fitness function, Boundary drift]
    architectureGuard: pnpm --filter @dvt/web test:architecture -- CanvasPlaygroundHost.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web test:presentation -- useCanvasController.core.test.tsx]
    cypressCoverage: apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts
  - name: RUNTIME_CONTRACT_SOURCE
    path: apps/web/src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
    dddOwner: CanvasSemanticArchitectureGuard
    cqRails: [GetProtectedRouteSession, CreateCanvasDocumentCommand]
    fowlerSignals: [Semantic fitness function, Boundary drift]
    architectureGuard: pnpm --filter @dvt/web test:architecture -- CanvasPlaygroundHost.architecture.test.tsx canvasAuthoringRuntimeComponent.architecture.test.ts
    unitTests: [pnpm --filter @dvt/web test:presentation -- useCanvasController.core.test.tsx]
    cypressCoverage: apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts
  - name: buildDefaultCanvasHarnessStore
    path: apps/web/src/app/views/canvas/useCanvasController.test.stateFactory.ts
    dddOwner: CanvasControllerTestHarness
    cqRails: [GetProtectedRouteSession, CreateCanvasDocumentCommand]
    fowlerSignals: [Test fixture boundary, Boundary drift]
    architectureGuard: pnpm --filter @dvt/web test:architecture -- CanvasPlaygroundHost.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web test:presentation -- useCanvasController.core.test.tsx]
    cypressCoverage: apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts
```
