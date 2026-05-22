---
title: F-24 dbt Node Renderer Token Convergence Plan
status: Accepted
owner: Web / Canvas
last_reviewed: 2026-05-22
planning_type: proposal
---

# F-24 dbt Node Renderer Token Convergence Plan

## Problem

The dbt plugin node renderer still owned local `slate-*`, `gray-*`, `neutral-*`,
and status badge classes after the React Flow token convergence slice. That
left a plugin-specific graph surface outside the same visual-system boundary.

## Fowler Opportunity Matrix

| scenario                                          | opportunity                  | Fowler pattern                      | DDD owner                         | command/query rail               | implementation surfaces                                                 | test                                                         | out of scope                   |
| ------------------------------------------------- | ---------------------------- | ----------------------------------- | --------------------------------- | -------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------ |
| dbt plugin renderer owns graph chrome color names | duplicate presentation logic | Introduce Presentation Token Object | React Flow visual token component | `ReactFlowGraphVisualTokenQuery` | `DbtNodeRenderer.tsx`, `graphVisualTokens.ts`, component docs, closeout | `graphVisualTokenConvergence.architecture.test.ts` red/green | Monaco visual-system hardening |

## Red / Green Plan

1. Extend the graph visual token guard to include `DbtNodeRenderer.tsx`.
2. Watch it fail while dbt owns local visual color families.
3. Move dbt node card, column, tag, inspector card, and status badge chrome to
   `graphVisualTokens.ts`.
4. Re-run the guard and focused dbt/plugin validations.

```feature-mechanization
version: 1
featureId: F24-DBT-NODE-RENDERER-TOKEN-CONVERGENCE-20260522
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f24-dbt-node-renderer-token-convergence-plan-20260522.md
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
  - apps/web/src/app/plugins/dbt/DbtNodeRenderer.tsx
  - apps/web/src/app/plugins/graph/graphVisualTokens.ts
  - apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
  - docs/architecture/components/web/graph/react-flow-visual-token-component.md
  - docs/planning/closeouts/**
  - docs/planning/state/agent-lane-e.yaml
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
commandQueryRails:
  - name: ReactFlowGraphVisualTokenQuery
    type: query
    dddOwner: React Flow visual token component
domainObjects:
  - name: graphVisualTokens
    type: presentation token object
    owner: apps/web
fowlerSignals:
  - Duplicate semantics
  - Primitive obsession
architectureGuards:
  - pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
cypressFlows:
  - N/A - visual token convergence only; no user-flow behavior changes.
completionGate:
  - pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
  - pnpm --filter @dvt/web typecheck
  - pnpm docs:feature-mechanization -- --feature F24-DBT-NODE-RENDERER-TOKEN-CONVERGENCE-20260522
  - pnpm docs:feature-mechanization:implementation
  - pnpm docs:sync
  - pnpm verify:prepush
redGreenCycles:
  - id: f24-dbt-node-renderer-token-boundary
    redTest: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    expectedFailure: DbtNodeRenderer does not import graphVisualTokens and still owns local color-family visual classes.
    patchSurfaces:
      - apps/web/src/app/plugins/dbt/DbtNodeRenderer.tsx
      - apps/web/src/app/plugins/graph/graphVisualTokens.ts
      - apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    greenTest: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
symbols:
  - name: graphStatusBadgeClasses
    path: apps/web/src/app/plugins/graph/graphVisualTokens.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - visual token class API only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
  - name: DBT_NODE_RENDERER_SOURCE
    path: apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    dddOwner: React Flow visual token component
    cqRails: [ReactFlowGraphVisualTokenQuery]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts]
```
