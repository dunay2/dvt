---
title: F-24 Context Panel Token Convergence Plan
status: Accepted
owner: Web / Canvas
last_reviewed: 2026-05-22
planning_type: proposal
---

# F-24 Context Panel Token Convergence Plan

## Problem

The F-24 React Flow token component covered graph nodes, minimap colors, edge
projection, and the plugin-owned dbt node renderer, but the graph-adjacent
context panels still carried local `slate-*` and `gray-*` chrome. That left the
operator workbench with two presentation vocabularies around the same Canvas
graph surface.

## Fowler Opportunity Matrix

| scenario                                                   | opportunity                               | Fowler pattern                      | DDD owner                              | command/query rail                | implementation surfaces                                                                                                                                             | unit or package test        | architecture test                                  | user-flow test                   | out of scope                                |
| ---------------------------------------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------- | -------------------------------- | ------------------------------------------- |
| Canvas graph context panels share graph-neighboring chrome | Primitive obsession / duplicate semantics | Introduce Presentation Token Object | Operator workbench graph visual tokens | none - internal presentation only | `graphVisualTokens.ts`, `DbtExplorer.tsx`, `InspectorPanel.tsx`, `CanvasInspectorAuthoringSection.tsx`, graph visual token component docs, Lane E planning evidence | existing Canvas/graph tests | `graphVisualTokenConvergence.architecture.test.ts` | not required; no behavior change | Monaco editor theme and shell-global tokens |

## Public API Target

- `graphVisualClasses.contextPanel*`
- `graphVisualClasses.inspector*`
- `graphStatusDotClasses`

## Red / Green Plan

1. Extend the F-24 architecture guard to include the dbt explorer, Canvas
   inspector, and Canvas inspector authoring section.
2. Move panel shell, header, action, tab, muted-text, and error-text classes to
   the graph visual token component.
3. Run focused graph architecture and affected component validation.

## Feature Mechanization

```feature-mechanization
version: 1
featureId: F24-CONTEXT-PANEL-TOKEN-CONVERGENCE-20260522
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f24-context-panel-token-convergence-plan-20260522.md
componentGuides:
  - docs/architecture/components/web/graph/react-flow-visual-token-component.md
userStories:
  - docs/architecture/components/web/graph/react-flow-visual-token-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md
  - docs/guides/ai-work-protocol.md
allowedImplementationSurfaces:
  - apps/web/src/app/components/DbtExplorer.tsx
  - apps/web/src/app/components/InspectorPanel.tsx
  - apps/web/src/app/plugins/graph/graphVisualTokens.ts
  - apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
  - apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx
  - docs/architecture/components/web/graph/react-flow-visual-token-component.md
  - docs/planning/closeouts/**
  - docs/planning/state/agent-lane-e.yaml
forbiddenImplementationSurfaces:
  - apps/api/**
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
commandQueryRails:
  - name: ReactFlowGraphVisualTokenQuery
    type: query
    dddOwner: React Flow visual token component
domainObjects:
  - name: graphVisualTokens
    type: presentation token object
    owner: apps/web
fowlerSignals:
  - Primitive obsession
  - Duplicate semantics
  - Documentation drift
architectureGuards:
  - pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
cypressFlows:
  - N/A - context-panel token convergence only; no user flow behavior changes.
completionGate:
  - pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
  - pnpm --filter @dvt/web test -- src/app/components/DbtExplorer.test.tsx src/app/views/canvas/CanvasInspectorPanel.test.tsx
  - pnpm --filter @dvt/web typecheck
  - pnpm docs:feature-mechanization -- --feature F24-CONTEXT-PANEL-TOKEN-CONVERGENCE-20260522
  - pnpm docs:feature-mechanization:implementation
  - pnpm docs:sync
  - pnpm verify:prepush
redGreenCycles:
  - id: f24-context-panel-token-boundary
    redTest: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    expectedFailure: Graph context panels do not import graphVisualTokens and still contain local slate/gray visual literals.
    patchSurfaces:
      - apps/web/src/app/components/DbtExplorer.tsx
      - apps/web/src/app/components/InspectorPanel.tsx
      - apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx
      - apps/web/src/app/plugins/graph/graphVisualTokens.ts
    greenTest: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
symbols:
  - name: contextPanelLeftShell
    path: apps/web/src/app/plugins/graph/graphVisualTokens.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - visual token class API only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: contextPanelRightShell
    path: apps/web/src/app/plugins/graph/graphVisualTokens.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - visual token class API only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: contextPanelActionButton
    path: apps/web/src/app/plugins/graph/graphVisualTokens.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - visual token class API only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: DBT_EXPLORER_SOURCE
    path: apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: INSPECTOR_PANEL_SOURCE
    path: apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: CANVAS_INSPECTOR_AUTHORING_SOURCE
    path: apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
```
