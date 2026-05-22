---
title: F-25 Plugin Capability Table Plan
status: Accepted
owner: Web / Plugins
last_reviewed: 2026-05-22
planning_type: proposal
---

# F-25 Plugin Capability Table Plan

## Problem

The Plugins route had adopted the route frame and readiness cards, but F-25
still called for a denser plugin catalog surface with search, availability,
capability, backend state, and detail. Keeping every readiness item as repeated
cards made the route harder to scan and left no governed dock for plugin
catalog filtering.

## Fowler Opportunity Matrix

| scenario                                    | opportunity                              | Fowler pattern                 | DDD owner                          | command/query rail                              | implementation surfaces                                                                 | unit or package test   | architecture test                             | user-flow test                     | out of scope                              |
| ------------------------------------------- | ---------------------------------------- | ------------------------------ | ---------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------- | ---------------------------------- | ----------------------------------------- |
| Plugins route needs dense readiness catalog | Duplicated presentation / primitive grid | Extract Component / Read Model | Plugin capability table read model | `ListPluginCapabilityRows` - presentation query | Plugins route table, readiness view model, plugin component docs, Lane E planning state | `PluginsView.test.tsx` | `pluginsCapabilityTable.architecture.test.ts` | not required; route unit covers UX | plugin execution, backend plugin contract |

## Public API Target

- `PluginCapabilityTable`
- `PluginCapabilitiesSnapshot`
- `resolvePluginReadiness()`
- `pluginsViewCopy`

## Red / Green Plan

1. Add red Plugins route tests for search and backend blocked filtering.
2. Extract `PluginCapabilityTable` and keep query ownership in `PluginsView`.
3. Add semantic architecture guard and component docs.
4. Run focused Plugins validation and web type/lint gates.

## Feature Mechanization

```feature-mechanization
version: 1
featureId: F25-PLUGIN-CAPABILITY-TABLE-20260522
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f25-plugin-capability-table-plan-20260522.md
componentGuides:
  - docs/architecture/components/web/plugins/plugin-capability-table-component.md
userStories:
  - docs/architecture/components/web/plugins/plugin-capability-table-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md
  - docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/docs/05-plugin-ux-integration-contract.md
  - docs/guides/ai-work-protocol.md
allowedImplementationSurfaces:
  - apps/web/src/app/views/PluginsView.test.tsx
  - apps/web/src/app/views/plugins/PluginCapabilityTable.tsx
  - apps/web/src/app/views/plugins/PluginsRouteWorkbench.tsx
  - apps/web/src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
  - apps/web/src/app/views/plugins/pluginsViewModel.ts
  - docs/architecture/components/web/plugins/**
  - docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md
  - docs/planning/closeouts/**
  - docs/planning/state/agent-lane-e.yaml
forbiddenImplementationSurfaces:
  - apps/api/**
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
commandQueryRails:
  - name: ListPluginCapabilityRows
    type: query
    dddOwner: Plugin capability table read model
domainObjects:
  - name: PluginCapabilityTable
    type: presentation read model component
    owner: apps/web
fowlerSignals:
  - Long method pressure
  - Duplicate presentation
  - Documentation drift
architectureGuards:
  - pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
cypressFlows:
  - N/A - route unit tests cover search/filter UX in jsdom.
completionGate:
  - pnpm --filter @dvt/web test -- src/app/views/PluginsView.test.tsx src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
  - pnpm --filter @dvt/web typecheck
  - pnpm --filter @dvt/web lint
  - pnpm docs:feature-mechanization -- --feature F25-PLUGIN-CAPABILITY-TABLE-20260522
  - pnpm docs:feature-mechanization:implementation
  - pnpm docs:sync
  - pnpm docs:status:generate
  - pnpm verify:prepush
redGreenCycles:
  - id: f25-plugin-capability-table-filtering
    redTest: pnpm --filter @dvt/web test -- src/app/views/PluginsView.test.tsx
    expectedFailure: Plugins route has no searchable capability table or backend-state filter.
    patchSurfaces:
      - apps/web/src/app/views/plugins/PluginCapabilityTable.tsx
      - apps/web/src/app/views/plugins/PluginsRouteWorkbench.tsx
      - apps/web/src/app/views/plugins/pluginsViewModel.ts
      - apps/web/src/app/views/PluginsView.test.tsx
    greenTest: pnpm --filter @dvt/web test -- src/app/views/PluginsView.test.tsx
symbols:
  - name: PluginCapabilityTable
    path: apps/web/src/app/views/plugins/PluginCapabilityTable.tsx
    dddOwner: Plugin capability table read model
    cqRails: [ListPluginCapabilityRows]
    fowlerSignals: [Extract Component]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    cypressCoverage: N/A - route unit covers table UX.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/PluginsView.test.tsx]
  - name: PluginCapabilityRow
    path: apps/web/src/app/views/plugins/PluginCapabilityTable.tsx
    dddOwner: Plugin capability table read model
    cqRails: [ListPluginCapabilityRows]
    fowlerSignals: [Read Model]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    cypressCoverage: N/A - internal type only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/PluginsView.test.tsx]
  - name: PluginCapabilityTableProps
    path: apps/web/src/app/views/plugins/PluginCapabilityTable.tsx
    dddOwner: Plugin capability table read model
    cqRails: [ListPluginCapabilityRows]
    fowlerSignals: [Explicit interface]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    cypressCoverage: N/A - component prop type only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/PluginsView.test.tsx]
  - name: BackendFilter
    path: apps/web/src/app/views/plugins/PluginCapabilityTable.tsx
    dddOwner: Plugin capability table read model
    cqRails: [ListPluginCapabilityRows]
    fowlerSignals: [Replace primitive with value set]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    cypressCoverage: N/A - filter value set only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/PluginsView.test.tsx]
  - name: createCapabilityRows
    path: apps/web/src/app/views/plugins/PluginCapabilityTable.tsx
    dddOwner: Plugin capability table read model
    cqRails: [ListPluginCapabilityRows]
    fowlerSignals: [Read Model]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    cypressCoverage: N/A - pure table projection.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/PluginsView.test.tsx]
  - name: filterCapabilityRows
    path: apps/web/src/app/views/plugins/PluginCapabilityTable.tsx
    dddOwner: Plugin capability table read model
    cqRails: [ListPluginCapabilityRows]
    fowlerSignals: [Specification]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    cypressCoverage: N/A - route unit covers filter behavior.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/PluginsView.test.tsx]
  - name: resolveBackendFilter
    path: apps/web/src/app/views/plugins/PluginCapabilityTable.tsx
    dddOwner: Plugin capability table read model
    cqRails: [ListPluginCapabilityRows]
    fowlerSignals: [Specification]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    cypressCoverage: N/A - route unit covers filter behavior.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/PluginsView.test.tsx]
  - name: resolveStatusIcon
    path: apps/web/src/app/views/plugins/PluginCapabilityTable.tsx
    dddOwner: Plugin capability table read model
    cqRails: [ListPluginCapabilityRows]
    fowlerSignals: [Presentation mapper]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    cypressCoverage: N/A - visual helper only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/PluginsView.test.tsx]
  - name: PluginTaxonomy
    path: apps/web/src/app/views/plugins/PluginCapabilityTable.tsx
    dddOwner: Plugin capability table read model
    cqRails: [ListPluginCapabilityRows]
    fowlerSignals: [Extract Component]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    cypressCoverage: N/A - detail subsection only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/PluginsView.test.tsx]
  - name: PluginCapabilityDetail
    path: apps/web/src/app/views/plugins/PluginCapabilityTable.tsx
    dddOwner: Plugin capability table read model
    cqRails: [ListPluginCapabilityRows]
    fowlerSignals: [Extract Component]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    cypressCoverage: N/A - route unit covers selected detail.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/PluginsView.test.tsx]
  - name: APP_ROOT
    path: apps/web/src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    dddOwner: Plugin capability table read model
    cqRails: [ListPluginCapabilityRows]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts]
  - name: REPO_ROOT
    path: apps/web/src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    dddOwner: Plugin capability table read model
    cqRails: [ListPluginCapabilityRows]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts]
  - name: readAppSource
    path: apps/web/src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    dddOwner: Plugin capability table read model
    cqRails: [ListPluginCapabilityRows]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts]
  - name: readRepoDoc
    path: apps/web/src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    dddOwner: Plugin capability table read model
    cqRails: [ListPluginCapabilityRows]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/plugins/pluginsCapabilityTable.architecture.test.ts]
```
