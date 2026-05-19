---
title: F-15-G First Canvas Creation Capability Plan
status: Accepted
owner: Frontend / Canvas
last_reviewed: 2026-05-19
planning_type: mandatory
lane: E
task_id: F-15-G
parent_task_id: F-15
---

# F-15-G First Canvas Creation Capability Plan

## Objective

Close the semantic encapsulation gap left after the Canvas workbench and
template-selection fixes by extracting first-canvas creation availability into a
named local policy component.

## Scope

In scope:

- document the Fowler analysis in `buzon`;
- add a local component guide with public API, invariants, transitions,
  consumers, and diagrams;
- add user stories for writable, read-only, pending, failed, and existing-draft
  scenarios;
- add TDD coverage for the pure capability policy;
- update architecture coverage so lifecycle code uses the named policy instead
  of inline query conditionals;
- wire `useCanvasDraftLifecycle` through the policy.

Out of scope:

- backend route changes;
- contract, engine, planner, or adapter changes;
- new command/query rails;
- changing graph edit or node authoring semantics.

## Command And Query Rail

| Rail                            | Type    | Owner                         | Impact                                                                     |
| ------------------------------- | ------- | ----------------------------- | -------------------------------------------------------------------------- |
| `CreateCanvasDocumentCommand`   | command | Canvas document               | Reused; the new policy only decides whether the command can be exposed.    |
| `ResolveCanvasWorkbenchContext` | query   | Canvas workbench presentation | Reused; first-canvas capability is projected through existing route state. |

No new rail is introduced.

## Fowler Matrix

| Scenario                                                         | Opportunity          | Fowler pattern                         | DDD owner                           | Rail                                                    | Surfaces                                                                  | Unit test                                        | Architecture test                            | User-flow test                    | Out of scope          |
| ---------------------------------------------------------------- | -------------------- | -------------------------------------- | ----------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------- | --------------------------------- | --------------------- |
| First-canvas availability is an inline boolean in lifecycle code | Primitive obsession  | Replace conditional with Policy Object | Canvas document creation capability | `CreateCanvasDocumentCommand`                           | `canvasCreateCanvasDocumentAvailability.ts`, `useCanvasDraftLifecycle.ts` | `canvasCreateCanvasDocumentAvailability.test.ts` | `CanvasPlaygroundHost.architecture.test.tsx` | existing Cypress screen proof     | Backend persistence   |
| Docs name the invariant but not the owned capability API         | Documentation drift  | Component guide                        | Canvas document creation capability | `CreateCanvasDocumentCommand`                           | component guide, user stories, buzon                                      | markdown gates                                   | architecture doc guard                       | N/A                               | ADR                   |
| Browser proof can catch symptoms after the policy drifts         | Test-only confidence | Semantic Fitness Function              | Canvas document creation capability | `VerifyCanvasWorkbenchVisualPosture` as test read model | architecture test                                                         | policy test                                      | architecture guard                           | Cypress retained as browser proof | New browser framework |

## Red / Green Cycles

1. **Policy availability**
   - Red: `pnpm --filter @dvt/web test:unit -- canvasCreateCanvasDocumentAvailability.test.ts`
   - Expected failure: `canvasCreateCanvasDocumentAvailability` does not exist.
   - Green: add the policy module and pass writable, existing, pending, failed,
     and read-only cases.

2. **Lifecycle uses policy**
   - Red: `pnpm --filter @dvt/web test:architecture -- CanvasPlaygroundHost.architecture.test.tsx`
   - Expected failure: architecture guard cannot find policy usage and still
     sees inline protected draft query conditionals.
   - Green: `useCanvasDraftLifecycle` imports and delegates to
     `deriveCanCreateCanvasDocument`.

## ADR Decision

No ADR is required. This is a local frontend policy extraction behind existing
rails and does not change public contracts, persistence authority, or
cross-package architecture.

```feature-mechanization
version: 1
featureId: F15G-FIRST-CANVAS-CREATION-CAPABILITY-20260519
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f15g-first-canvas-creation-capability-plan-20260519.md
componentGuides:
  - docs/architecture/components/web/graph/canvas-first-canvas-creation-capability-component.md
userStories:
  - docs/architecture/components/web/graph/canvas-first-canvas-creation-capability-user-stories.md
  - buzon/20260519-codex-fowler-f15g-first-canvas-creation-capability.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/proposals/mandatory/frontend-and-ux/f15e-canvas-startup-template-selection-plan-20260518.md
  - docs/planning/proposals/mandatory/frontend-and-ux/f15f-canvas-workbench-screen-consolidation-plan-20260519.md
allowedImplementationSurfaces:
  - apps/web/src/app/views/canvas/canvasCreateCanvasDocumentAvailability.ts
  - apps/web/src/app/views/canvas/canvasCreateCanvasDocumentAvailability.test.ts
  - apps/web/src/app/views/canvas/useCanvasDraftLifecycle.ts
  - apps/web/src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
  - buzon/20260519-codex-fowler-f15g-first-canvas-creation-capability.md
  - docs/architecture/components/web/graph/canvas-first-canvas-creation-capability-component.md
  - docs/architecture/components/web/graph/canvas-first-canvas-creation-capability-user-stories.md
  - docs/planning/proposals/mandatory/frontend-and-ux/f15g-first-canvas-creation-capability-plan-20260519.md
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
  - name: ResolveCanvasWorkbenchContext
    type: query
    dddOwner: CanvasWorkbenchContext
domainObjects:
  - name: CanvasDocumentCreationCapability
    type: policy
    owner: Frontend Canvas
fowlerSignals:
  - Primitive obsession
  - Semantic encapsulation
  - Documentation drift
  - Test-only confidence
architectureGuards:
  - pnpm --filter @dvt/web test:architecture -- CanvasPlaygroundHost.architecture.test.tsx
cypressFlows:
  - apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts remains the browser proof for first-canvas creation through the protected draft route.
completionGate:
  - pnpm docs:feature-mechanization -- --feature F15G-FIRST-CANVAS-CREATION-CAPABILITY-20260519
  - pnpm --filter @dvt/web test:unit -- canvasCreateCanvasDocumentAvailability.test.ts
  - pnpm --filter @dvt/web test:architecture -- CanvasPlaygroundHost.architecture.test.tsx
  - pnpm --filter @dvt/web test:canvas
  - pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts
  - pnpm --filter @dvt/web typecheck
  - pnpm docs:status:generate
  - pnpm docs:sync
  - pnpm governance:refresh
  - pnpm verify:prepush
redGreenCycles:
  - id: first-canvas-creation-policy
    redTest: pnpm --filter @dvt/web test:unit -- canvasCreateCanvasDocumentAvailability.test.ts
    expectedFailure: Policy module is missing.
    patchSurfaces:
      - apps/web/src/app/views/canvas/canvasCreateCanvasDocumentAvailability.ts
      - apps/web/src/app/views/canvas/canvasCreateCanvasDocumentAvailability.test.ts
    greenTest: pnpm --filter @dvt/web test:unit -- canvasCreateCanvasDocumentAvailability.test.ts
  - id: lifecycle-policy-usage
    redTest: pnpm --filter @dvt/web test:architecture -- CanvasPlaygroundHost.architecture.test.tsx
    expectedFailure: Lifecycle does not delegate to deriveCanCreateCanvasDocument.
    patchSurfaces:
      - apps/web/src/app/views/canvas/useCanvasDraftLifecycle.ts
      - apps/web/src/app/views/canvas/CanvasPlaygroundHost.architecture.test.tsx
    greenTest: pnpm --filter @dvt/web test:architecture -- CanvasPlaygroundHost.architecture.test.tsx
symbols:
  - name: CanvasCreateCanvasDocumentAvailabilityInput
    path: apps/web/src/app/views/canvas/canvasCreateCanvasDocumentAvailability.ts
    dddOwner: CanvasDocumentCreationCapability
    cqRails: [CreateCanvasDocumentCommand]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture -- CanvasPlaygroundHost.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web test:unit -- canvasCreateCanvasDocumentAvailability.test.ts]
    cypressCoverage: apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts
  - name: deriveCanCreateCanvasDocument
    path: apps/web/src/app/views/canvas/canvasCreateCanvasDocumentAvailability.ts
    dddOwner: CanvasDocumentCreationCapability
    cqRails: [CreateCanvasDocumentCommand]
    fowlerSignals: [Primitive obsession, Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture -- CanvasPlaygroundHost.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web test:unit -- canvasCreateCanvasDocumentAvailability.test.ts]
    cypressCoverage: apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts
```
