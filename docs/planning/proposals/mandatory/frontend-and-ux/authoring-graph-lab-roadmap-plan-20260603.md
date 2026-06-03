---
title: Authoring graph lab roadmap plan
status: Proposed
date: 2026-06-03
last_reviewed: 2026-06-03
owners:
  - apps/web
planning_type: proposal
lane: E
---

# Authoring Graph Lab Roadmap Plan

## Think-First Analysis

Problem summary: the Canvas connection authoring surface still carried a
three-node transformation guard that rejected legitimate authoring graph shapes
such as chained dbt models, checks, exposures, and multi-hop source flows.

Root cause: graph interaction used a transformation-specific guard as general
Canvas edge policy. That collapsed authoring graph semantics into one
three-node template instead of a role-based graph policy plus plugin connection
rules.

Selected option: move general Canvas connection admission to role compatibility,
duplicate/cycle protection, and plugin-port rules in `canvasConnectionAggregate`.
Keep transformation graph validation as a separate validation concern instead
of using it as the universal edge authoring gate.

Rejected alternatives:

- Keep the old transformation guard and add exceptions. Rejected because it
  preserves duplicate authority for graph policy.
- Move authoring graph policy into UI handlers. Rejected because handlers should
  orchestrate commands, not own domain admission rules.
- Skip tests while cleaning the branch. Rejected because the branch changes
  Canvas graph behavior.

## Fowler Matrix

| Scenario                                         | Opportunity           | Fowler pattern                    | DDD owner                         | Command/query rail              | Implementation surfaces                   | Unit or package test                    | Architecture test                                 | Out of scope        |
| ------------------------------------------------ | --------------------- | --------------------------------- | --------------------------------- | ------------------------------- | ----------------------------------------- | --------------------------------------- | ------------------------------------------------- | ------------------- |
| Authoring graph allows source-model-model-check. | Hidden authority      | Replace Conditional with Strategy | Canvas connection aggregate       | AuthorCanvasGraphEdge           | `canvasConnectionAggregate.ts`            | `canvasConnectionAggregate.test.ts`     | `useCanvasEdgeAuthoringHandlers.architecture.ts`  | Backend graph store |
| UI handlers reuse aggregate rules.               | Duplicate semantics   | Extract Function / Pure Function  | Canvas graph handler test fixture | AuthorCanvasGraphEdge           | `useCanvasGraphHandlers.test.support.tsx` | `useCanvasGraphHandlers.edge*.test.tsx` | `canvasHandlerContracts.architecture.test.ts`     | Cypress expansion   |
| Transformation validation remains separate.      | Conflated abstraction | Separate Domain from Presentation | Transformation graph validation   | ValidateCanvasTransformationRun | `transformationConnectionGuard.ts`        | `transformationConnectionGuard.test.ts` | `transformationGraphValidation.architecture.test` | Runtime execution   |

```feature-mechanization
version: 1
featureId: CANVAS-AUTHORING-GRAPH-LAB-20260603
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/authoring-graph-lab-roadmap-plan-20260603.md
componentGuides:
  - docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md
userStories:
  - docs/architecture/components/web/graph/canvas-layout-persistence-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md
allowedImplementationSurfaces:
  - apps/web/src/app/views/canvas/canvasConnectionAggregate.ts
  - apps/web/src/app/views/canvas/canvasConnectionAggregate.test.ts
  - apps/web/src/app/views/canvas/canvasCopyFormatting.ts
  - apps/web/src/app/views/canvas/transformationConnectionGuard.ts
  - apps/web/src/app/views/canvas/transformationConnectionGuard.test.ts
  - apps/web/src/app/views/canvas/useCanvasGraphHandlers.test.support.tsx
  - apps/web/src/app/views/canvas/useCanvasGraphHandlers.edgeAuthoring.test.tsx
  - apps/web/src/app/views/canvas/useCanvasGraphHandlers.edgeReconnect.test.tsx
  - apps/web/src/app/views/canvas/canvasEdgeAdmissionTransaction.test.ts
  - buzon/20260531-authoring-graph-lab-closeout.md
  - buzon/20260531-authoring-graph-lab-roadmap.md
  - docs/planning/proposals/mandatory/frontend-and-ux/authoring-graph-lab-roadmap-plan-20260603.md
forbiddenImplementationSurfaces:
  - apps/api/**
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
  - specs/**
commandQueryRails:
  - name: AuthorCanvasGraphEdge
    type: command
    dddOwner: Canvas connection aggregate
  - name: ValidateCanvasTransformationRun
    type: query
    dddOwner: Transformation graph validation
domainObjects:
  - name: CanvasConnectionAggregate
    type: aggregate
    owner: Canvas graph authoring
  - name: TransformationConnectionGuard
    type: policy
    owner: Transformation graph validation
fowlerSignals:
  - Hidden authority
  - Duplicate semantics
  - Conflated abstraction
architectureGuards:
  - pnpm --filter @dvt/web test:canvas
  - pnpm docs:feature-mechanization:implementation -- --feature CANVAS-AUTHORING-GRAPH-LAB-20260603
cypressFlows:
  - N/A - unit and architecture coverage for pure Canvas graph policy branch cleanup
completionGate:
  - pnpm --filter @dvt/web typecheck
  - pnpm --filter @dvt/web lint
  - pnpm --filter @dvt/web test:canvas
  - pnpm docs:feature-mechanization:implementation -- --feature CANVAS-AUTHORING-GRAPH-LAB-20260603
  - pnpm verify:changed
  - pnpm verify:prepush
redGreenCycles:
  - id: authoring-role-policy
    redTest: pnpm --filter @dvt/web test:canvas -- src/app/views/canvas/canvasConnectionAggregate.test.ts
    expectedFailure: Canvas connection aggregate rejects authoring graph shapes through the old transformation-only guard.
    patchSurfaces:
      - apps/web/src/app/views/canvas/canvasConnectionAggregate.ts
      - apps/web/src/app/views/canvas/canvasConnectionAggregate.test.ts
      - apps/web/src/app/views/canvas/canvasCopyFormatting.ts
      - apps/web/src/app/views/canvas/transformationConnectionGuard.ts
      - apps/web/src/app/views/canvas/transformationConnectionGuard.test.ts
    greenTest: pnpm --filter @dvt/web test:canvas
  - id: graph-handler-fixture-role-policy
    redTest: pnpm --filter @dvt/web exec vitest run --config vitest.canvas.config.ts src/app/views/canvas/useCanvasGraphHandlers.edgeAuthoring.test.tsx src/app/views/canvas/useCanvasGraphHandlers.edgeReconnect.test.tsx
    expectedFailure: Graph handler tests still expect transformation guard test doubles instead of aggregate role policy.
    patchSurfaces:
      - apps/web/src/app/views/canvas/useCanvasGraphHandlers.test.support.tsx
      - apps/web/src/app/views/canvas/useCanvasGraphHandlers.edgeAuthoring.test.tsx
      - apps/web/src/app/views/canvas/useCanvasGraphHandlers.edgeReconnect.test.tsx
      - apps/web/src/app/views/canvas/canvasEdgeAdmissionTransaction.test.ts
    greenTest: pnpm --filter @dvt/web exec vitest run --config vitest.canvas.config.ts src/app/views/canvas/useCanvasGraphHandlers.edgeAuthoring.test.tsx src/app/views/canvas/useCanvasGraphHandlers.edgeReconnect.test.tsx src/app/views/canvas/canvasEdgeAdmissionTransaction.test.ts
symbols:
  - name: AUTHORING_ROLE_TARGETS
    path: apps/web/src/app/views/canvas/canvasConnectionAggregate.ts
    dddOwner: CanvasConnectionAggregate
    cqRails: [AuthorCanvasGraphEdge]
    fowlerSignals: [Hidden authority]
    architectureGuard: pnpm --filter @dvt/web test:canvas
    cypressCoverage: N/A - pure aggregate policy
    unitTests: [pnpm --filter @dvt/web test:canvas]
  - name: canConnectAuthoringRoles
    path: apps/web/src/app/views/canvas/canvasConnectionAggregate.ts
    dddOwner: CanvasConnectionAggregate
    cqRails: [AuthorCanvasGraphEdge]
    fowlerSignals: [Replace Conditional with Strategy]
    architectureGuard: pnpm --filter @dvt/web test:canvas
    cypressCoverage: N/A - pure aggregate policy
    unitTests: [pnpm --filter @dvt/web test:canvas]
  - name: confirmReconnect
    path: apps/web/src/app/views/canvas/canvasConnectionAggregate.ts
    dddOwner: CanvasConnectionAggregate
    cqRails: [AuthorCanvasGraphEdge]
    fowlerSignals: [Move Function]
    architectureGuard: pnpm --filter @dvt/web test:canvas
    cypressCoverage: N/A - pure aggregate policy
    unitTests: [pnpm --filter @dvt/web test:canvas]
  - name: formatUnsupportedCanvasKindMessage
    path: apps/web/src/app/views/canvas/canvasCopyFormatting.ts
    dddOwner: Canvas authoring copy policy
    cqRails: [AuthorCanvasGraphEdge]
    fowlerSignals: [Consolidate Conditional Expression]
    architectureGuard: pnpm --filter @dvt/web test:canvas
    cypressCoverage: N/A - copy policy helper
    unitTests: [pnpm --filter @dvt/web test:canvas]
  - name: formatDisabledCanvasPluginMessage
    path: apps/web/src/app/views/canvas/canvasCopyFormatting.ts
    dddOwner: Canvas authoring copy policy
    cqRails: [AuthorCanvasGraphEdge]
    fowlerSignals: [Consolidate Conditional Expression]
    architectureGuard: pnpm --filter @dvt/web test:canvas
    cypressCoverage: N/A - copy policy helper
    unitTests: [pnpm --filter @dvt/web test:canvas]
  - name: node
    path: apps/web/src/app/views/canvas/canvasConnectionAggregate.test.ts
    dddOwner: CanvasConnectionAggregate test fixture
    cqRails: [N/A - test helper]
    fowlerSignals: [Test data builder]
    architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature CANVAS-AUTHORING-GRAPH-LAB-20260603
    cypressCoverage: N/A - test helper
    unitTests: [pnpm --filter @dvt/web test:canvas]
  - name: link
    path: apps/web/src/app/views/canvas/canvasConnectionAggregate.test.ts
    dddOwner: CanvasConnectionAggregate test fixture
    cqRails: [N/A - test helper]
    fowlerSignals: [Test data builder]
    architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature CANVAS-AUTHORING-GRAPH-LAB-20260603
    cypressCoverage: N/A - test helper
    unitTests: [pnpm --filter @dvt/web test:canvas]
  - name: byId
    path: apps/web/src/app/views/canvas/canvasConnectionAggregate.test.ts
    dddOwner: CanvasConnectionAggregate test fixture
    cqRails: [N/A - test helper]
    fowlerSignals: [Test data builder]
    architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature CANVAS-AUTHORING-GRAPH-LAB-20260603
    cypressCoverage: N/A - test helper
    unitTests: [pnpm --filter @dvt/web test:canvas]
  - name: resetGraphHandlersTestDoubles
    path: apps/web/src/app/views/canvas/useCanvasGraphHandlers.test.support.tsx
    dddOwner: Canvas graph handler test fixture
    cqRails: [N/A - test helper]
    fowlerSignals: [Test fixture]
    architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature CANVAS-AUTHORING-GRAPH-LAB-20260603
    cypressCoverage: N/A - test helper
    unitTests: [pnpm --filter @dvt/web test:canvas]
  - name: restoreGraphHandlersTestDoubles
    path: apps/web/src/app/views/canvas/useCanvasGraphHandlers.test.support.tsx
    dddOwner: Canvas graph handler test fixture
    cqRails: [N/A - test helper]
    fowlerSignals: [Test fixture]
    architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature CANVAS-AUTHORING-GRAPH-LAB-20260603
    cypressCoverage: N/A - test helper
    unitTests: [pnpm --filter @dvt/web test:canvas]
  - name: rejectGraphHandlerConnectionWith
    path: apps/web/src/app/views/canvas/useCanvasGraphHandlers.test.support.tsx
    dddOwner: Canvas graph handler test fixture
    cqRails: [N/A - test helper]
    fowlerSignals: [Test fixture]
    architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature CANVAS-AUTHORING-GRAPH-LAB-20260603
    cypressCoverage: N/A - test helper
    unitTests: [pnpm --filter @dvt/web test:canvas]
  - name: evaluateGraphHandlerConnectionWith
    path: apps/web/src/app/views/canvas/useCanvasGraphHandlers.test.support.tsx
    dddOwner: Canvas graph handler test fixture
    cqRails: [N/A - test helper]
    fowlerSignals: [Test fixture]
    architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature CANVAS-AUTHORING-GRAPH-LAB-20260603
    cypressCoverage: N/A - test helper
    unitTests: [pnpm --filter @dvt/web test:canvas]
```
