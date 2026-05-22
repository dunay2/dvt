---
title: F-24 React Flow Token Convergence Plan
status: Accepted
owner: Web / Canvas
last_reviewed: 2026-05-22
planning_type: proposal
---

# F-24 React Flow Token Convergence Plan

## Problem

`F-24` still has React Flow visual decisions spread across Canvas projection and
plugin graph renderer modules. Edge colors, minimap colors, fallback node chrome,
and graph node state colors are encoded as local Tailwind color families or hex
literals instead of a named operator-workbench graph token component.

## Fowler Opportunity Matrix

| scenario                                                                    | opportunity                               | Fowler pattern                      | DDD owner                              | command/query rail                | implementation surfaces                                                                           | unit or package test           | architecture test                                  | user-flow test                   | out of scope                                        |
| --------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------- | -------------------------------- | --------------------------------------------------- |
| React Flow edge projection and plugin node rendering share visual semantics | Primitive obsession / duplicate semantics | Introduce Presentation Token Object | Operator workbench graph visual tokens | none - internal presentation only | `graphVisualTokens.ts`, Canvas mapper, plugin graph renderers, node-kind catalogs, component docs | existing Canvas viewport tests | `graphVisualTokenConvergence.architecture.test.ts` | not required; no behavior change | Monaco theme hardening and context panel extraction |

## Public API Target

- `graphVisualClasses`
- `graphStatusDotClasses`
- `graphStatusRingClasses`
- `graphNodeKindToneClasses`
- `graphFlowPalette`
- `resolveGraphNodeKindTone`

## Red / Green Plan

1. Add an architecture guard that fails while graph modules own local color
   families or hex literals.
2. Add a graph visual token component and route Canvas/graph/plugin modules
   through it.
3. Run focused architecture and Canvas projection tests.

## Feature Mechanization

```feature-mechanization
version: 1
featureId: F24-REACT-FLOW-TOKEN-CONVERGENCE-20260522
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f24-react-flow-token-convergence-plan-20260522.md
componentGuides:
  - docs/architecture/components/web/graph/react-flow-visual-token-component.md
userStories:
  - docs/architecture/components/web/graph/react-flow-visual-token-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/iconography-and-design-tokens-contract.md
  - docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md
  - docs/guides/ai-work-protocol.md
allowedImplementationSurfaces:
  - apps/web/src/app/plugins/FallbackNodeRenderer.tsx
  - apps/web/src/app/plugins/graph/**
  - apps/web/src/app/plugins/nodeTypeCatalog.dbt.ts
  - apps/web/src/app/plugins/dvt/dvtNodeTypeCatalog.ts
  - apps/web/src/app/views/canvas/canvasNodeMapper.ts
  - apps/web/src/app/views/canvas/CanvasViewport.test.tsx
  - docs/architecture/components/web/graph/**
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
  - N/A - visual token convergence only; no user flow behavior changes.
completionGate:
  - pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
  - pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasViewport.test.tsx
  - pnpm --filter @dvt/web typecheck
  - pnpm docs:feature-mechanization -- --feature F24-REACT-FLOW-TOKEN-CONVERGENCE-20260522
  - pnpm docs:feature-mechanization:implementation
  - pnpm docs:sync
  - pnpm verify:prepush
redGreenCycles:
  - id: f24-react-flow-token-boundary
    redTest: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    expectedFailure: React Flow graph token module does not exist and Canvas/plugin graph modules still contain local color-family or hex visual literals.
    patchSurfaces:
      - apps/web/src/app/plugins/graph/graphVisualTokens.ts
      - apps/web/src/app/plugins/graph/GraphNodeRenderer.tsx
      - apps/web/src/app/plugins/FallbackNodeRenderer.tsx
      - apps/web/src/app/plugins/nodeTypeCatalog.dbt.ts
      - apps/web/src/app/plugins/dvt/dvtNodeTypeCatalog.ts
      - apps/web/src/app/views/canvas/canvasNodeMapper.ts
    greenTest: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
symbols:
  - name: graphVisualClasses
    path: apps/web/src/app/plugins/graph/graphVisualTokens.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - visual token class API only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: graphStatusDotClasses
    path: apps/web/src/app/plugins/graph/graphVisualTokens.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - visual token class API only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: graphStatusRingClasses
    path: apps/web/src/app/plugins/graph/graphVisualTokens.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - visual token class API only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: GraphNodeKindTone
    path: apps/web/src/app/plugins/graph/graphVisualTokens.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - visual token type only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: graphNodeKindToneClasses
    path: apps/web/src/app/plugins/graph/graphVisualTokens.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - visual token class API only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: graphNodeKindToneByKind
    path: apps/web/src/app/plugins/graph/graphVisualTokens.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - visual token lookup table only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: graphFlowPalette
    path: apps/web/src/app/plugins/graph/graphVisualTokens.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - visual token palette only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: resolveGraphNodeKindTone
    path: apps/web/src/app/plugins/graph/graphVisualTokens.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Move Presentation Logic]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - visual token query helper only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: createGraphFlowEdgeStyle
    path: apps/web/src/app/plugins/graph/graphVisualTokens.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - visual token query helper only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: TOKEN_SOURCE
    path: apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: GRAPH_RENDERER_SOURCE
    path: apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: FALLBACK_RENDERER_SOURCE
    path: apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: CANVAS_NODE_MAPPER_SOURCE
    path: apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: DBT_NODE_CATALOG_SOURCE
    path: apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: DVT_NODE_CATALOG_SOURCE
    path: apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: COMPONENT_GUIDE
    path: apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: USER_STORIES
    path: apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: GRAPH_CONSUMER_SOURCES
    path: apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
```

## ADR Decision

No new ADR is required. This is an internal presentation-token convergence slice
under the existing `F-24` frontend visual-system work.
