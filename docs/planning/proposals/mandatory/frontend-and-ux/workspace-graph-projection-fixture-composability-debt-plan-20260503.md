---
title: Workspace Graph Projection Fixture Composability Debt Plan
status: Proposed
owner: Frontend / Architecture
last_reviewed: 2026-05-03
planning_type: proposal
---

# Workspace Graph Projection Fixture Composability Debt Plan

## Debt Summary

`apps/web/src/app/services/workspace/workspaceGraphDraftProjectionExpected.test.fixtures.ts`
contains one large fixture factory:
`buildExpectedCanvasAuthoringSemanticGraph()`.

The method is currently a monolithic inline graph literal (nodes + edges +
nested metadata). It is valid but not composable, so test evolution requires
editing one broad object instead of reusing focused fixture parts.

## Why This Is Debt

| Signal                    | Finding                                               | Target pattern                                         |
| ------------------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| Large method / data clump | One function owns all semantic graph fixture details. | Extract fixture parts into focused builders/constants. |
| Low fixture reuse         | Future tests will copy/patch nested literals.         | Object Mother + fixture composition helpers.           |
| Drift risk                | Local edits can silently diverge node/edge semantics. | Canonical fixture catalog with architecture guard.     |

## Command-Query Rail Context

This debt belongs to the workspace graph projection test boundary.

| Rail                                           | Type  | DDD owner                                                |
| ---------------------------------------------- | ----- | -------------------------------------------------------- |
| `ProjectWorkspaceGraphDraftSemanticGraph`      | query | `WorkspaceGraphDraftSemanticGraph` read model            |
| `ValidateWorkspaceProjectionFixtureBoundaries` | query | `WorkspaceGraphDraftFixtureCatalog` test boundary policy |

## Proposed Fix Slice

Refactor fixtures into composable parts:

1. introduce per-node fixture builders (`source`, `transform`, `sink`)
2. introduce edge fixture builders
3. expose one semantic-graph assembler using those parts
4. keep one canonical import surface for projection tests
5. add/extend architecture test proving fixture composability boundaries

No compatibility alias should remain once fixture assembly is canonicalized.

```feature-mechanization
version: 1
featureId: WORKSPACE-GRAPH-PROJECTION-FIXTURE-COMPOSABILITY-DEBT
mechanizationStatus: closed
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/workspace-graph-projection-fixture-composability-debt-plan-20260503.md
componentGuides:
  - docs/planning/proposals/mandatory/frontend-and-ux/workspace-graph-projection-fixture-composability-debt-plan-20260503.md
userStories:
  - docs/planning/proposals/mandatory/frontend-and-ux/workspace-graph-projection-fixture-composability-debt-plan-20260503.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/frontend-and-ux/workspace-graph-projection-fixture-composability-debt-plan-20260503.md
forbiddenImplementationSurfaces:
  - .github/**
  - apps/**
  - packages/**
  - scripts/**
  - specs/**
commandQueryRails:
  - name: ProjectWorkspaceGraphDraftSemanticGraph
    type: query
    dddOwner: WorkspaceGraphDraftSemanticGraph read model
  - name: ValidateWorkspaceProjectionFixtureBoundaries
    type: query
    dddOwner: WorkspaceGraphDraftFixtureCatalog
domainObjects:
  - name: WorkspaceGraphDraftFixtureCatalog
    type: fixture catalog
    owner: Workspace projection tests
  - name: WorkspaceGraphDraftSemanticGraphFixture
    type: read-model fixture
    owner: Workspace projection tests
fowlerSignals:
  - Large method
  - Data clump
  - Divergent change
architectureGuards:
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - test-fixture debt registration only
completionGate:
  - pnpm exec markdownlint-cli2 docs/planning/proposals/mandatory/frontend-and-ux/workspace-graph-projection-fixture-composability-debt-plan-20260503.md --config .markdownlint-cli2.jsonc
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: projection-fixture-debt-registration
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: New projection fixture debt plan is outside allowedImplementationSurfaces before this manifest exists.
    patchSurfaces:
      - docs/planning/proposals/mandatory/frontend-and-ux/workspace-graph-projection-fixture-composability-debt-plan-20260503.md
    greenTest: pnpm docs:feature-mechanization:implementation
symbols:
  - name: WorkspaceGraphProjectionFixtureComposabilityDebtPlan
    path: docs/planning/proposals/mandatory/frontend-and-ux/workspace-graph-projection-fixture-composability-debt-plan-20260503.md
    dddOwner: Workspace projection fixture debt governance
    cqRails:
      - ProjectWorkspaceGraphDraftSemanticGraph
      - ValidateWorkspaceProjectionFixtureBoundaries
    fowlerSignals:
      - Large method
      - Data clump
      - Divergent change
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - test-fixture debt registration only
    unitTests:
      - pnpm docs:feature-mechanization:implementation
```
