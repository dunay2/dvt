---
title: F-25 Plugin UX Contract Docks Plan
status: Accepted
owner: Web / Plugins
last_reviewed: 2026-05-22
planning_type: proposal
---

# F-25 Plugin UX Contract Docks Plan

## Problem

F-25 already had the plugin capability table, but the parent task still called
for the governed dock contract: route-header contributions, command-palette
contributions, and bottom-diagnostics contributions. Without explicit rails,
future plugin surfaces could scan the static registry directly or create local
chrome rules.

## Fowler Opportunity Matrix

| scenario                                    | opportunity                                          | Fowler pattern                                   | DDD owner                      | command/query rail                                 | implementation surfaces                                                          | unit test          | architecture test                              | user-flow test                                                        | out of scope                                                             |
| ------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------ | ------------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Plugins need governed dock extension points | Primitive registry fields and future shotgun surgery | Published Interface / Explicit Type / Query Rail | Plugin UX integration contract | `ListPluginDockContributions` - presentation query | `PluginManifest.ts`, `registry.ts`, Monitoring contribution seed, component docs | `registry.test.ts` | `pluginRuntimeProjection.architecture.test.ts` | N/A - this slice adds contract rails, not rendered command palette UI | backend plugin execution, command palette renderer, bottom drawer tab UI |

## Public API Target

- `RouteHeaderContribution`
- `CommandPaletteContribution`
- `BottomDiagnosticsContribution`
- `getRouteHeaderContributions()`
- `getCommandPaletteContributions()`
- `getBottomDiagnosticsContributions()`

## Red / Green Plan

1. Add a red registry test proving the three docks must project through
   dedicated runtime rails and filter disabled backend plugins.
2. Add explicit contribution types and registry query rails.
3. Seed Monitoring with one route-header, command-palette, and
   bottom-diagnostics contribution so the rails are exercised by real plugin
   data.
4. Add an architecture guard and component guide so the contract remains a
   documented component boundary.

## Feature Mechanization

```feature-mechanization
version: 1
featureId: F25-PLUGIN-UX-CONTRACT-DOCKS-20260522
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f25-plugin-ux-contract-docks-plan-20260522.md
componentGuides:
  - docs/architecture/components/web/plugins/plugin-ux-integration-contract.md
userStories:
  - docs/architecture/components/web/plugins/plugin-capability-table-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/docs/05-plugin-ux-integration-contract.md
  - docs/guides/ai-work-protocol.md
allowedImplementationSurfaces:
  - apps/web/src/app/plugins/contracts/PluginManifest.ts
  - apps/web/src/app/plugins/registry.ts
  - apps/web/src/app/plugins/registry.test.ts
  - apps/web/src/app/plugins/pluginRuntimeProjection.architecture.test.ts
  - apps/web/src/app/plugins/monitoring/monitoringContributions.ts
  - docs/architecture/components/web/plugins/plugin-ux-integration-contract.md
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
  - name: ListPluginDockContributions
    type: query
    dddOwner: Plugin UX integration contract
domainObjects:
  - name: Plugin UX integration contract
    type: presentation query contract
    owner: apps/web
fowlerSignals:
  - Primitive Obsession
  - Shotgun Surgery
  - Documentation drift
architectureGuards:
  - pnpm --filter @dvt/web test -- src/app/plugins/pluginRuntimeProjection.architecture.test.ts
cypressFlows:
  - N/A - this slice adds contract rails and runtime projection tests, not visible dock rendering.
completionGate:
  - pnpm --filter @dvt/web test -- src/app/plugins/registry.test.ts src/app/plugins/pluginRuntimeProjection.architecture.test.ts
  - pnpm --filter @dvt/web typecheck
  - pnpm --filter @dvt/web lint
  - pnpm docs:feature-mechanization -- --feature F25-PLUGIN-UX-CONTRACT-DOCKS-20260522
  - pnpm docs:feature-mechanization:implementation
  - pnpm docs:sync
  - pnpm docs:status:generate
  - pnpm verify:prepush
redGreenCycles:
  - id: f25-plugin-dock-runtime-rails
    redTest: pnpm --filter @dvt/web test -- src/app/plugins/registry.test.ts
    expectedFailure: The plugin registry has no route-header, command-palette, or bottom-diagnostics query rails.
    patchSurfaces:
      - apps/web/src/app/plugins/contracts/PluginManifest.ts
      - apps/web/src/app/plugins/registry.ts
      - apps/web/src/app/plugins/monitoring/monitoringContributions.ts
      - apps/web/src/app/plugins/registry.test.ts
    greenTest: pnpm --filter @dvt/web test -- src/app/plugins/registry.test.ts
  - id: f25-plugin-dock-architecture-docs
    redTest: pnpm --filter @dvt/web test -- src/app/plugins/pluginRuntimeProjection.architecture.test.ts
    expectedFailure: The plugin UX integration component guide is missing.
    patchSurfaces:
      - docs/architecture/components/web/plugins/plugin-ux-integration-contract.md
      - docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md
      - apps/web/src/app/plugins/pluginRuntimeProjection.architecture.test.ts
    greenTest: pnpm --filter @dvt/web test -- src/app/plugins/pluginRuntimeProjection.architecture.test.ts
symbols:
  - name: RouteHeaderContribution
    path: apps/web/src/app/plugins/contracts/PluginManifest.ts
    dddOwner: Plugin UX integration contract
    cqRails: [ListPluginDockContributions]
    fowlerSignals: [Explicit Type]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/pluginRuntimeProjection.architecture.test.ts
    cypressCoverage: N/A - contract type only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/registry.test.ts]
  - name: CommandPaletteContribution
    path: apps/web/src/app/plugins/contracts/PluginManifest.ts
    dddOwner: Plugin UX integration contract
    cqRails: [ListPluginDockContributions]
    fowlerSignals: [Explicit Type]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/pluginRuntimeProjection.architecture.test.ts
    cypressCoverage: N/A - command palette UI is outside this slice.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/registry.test.ts]
  - name: BottomDiagnosticsContribution
    path: apps/web/src/app/plugins/contracts/PluginManifest.ts
    dddOwner: Plugin UX integration contract
    cqRails: [ListPluginDockContributions]
    fowlerSignals: [Explicit Type]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/pluginRuntimeProjection.architecture.test.ts
    cypressCoverage: N/A - bottom drawer tab UI is outside this slice.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/registry.test.ts]
  - name: PluginContributionAvailability
    path: apps/web/src/app/plugins/contracts/PluginManifest.ts
    dddOwner: Plugin UX integration contract
    cqRails: [ListPluginDockContributions]
    fowlerSignals: [Explicit Type]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/pluginRuntimeProjection.architecture.test.ts
    cypressCoverage: N/A - contract type only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/registry.test.ts]
  - name: PluginContributionAvailabilityContext
    path: apps/web/src/app/plugins/contracts/PluginManifest.ts
    dddOwner: Plugin UX integration contract
    cqRails: [ListPluginDockContributions]
    fowlerSignals: [Explicit Type]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/pluginRuntimeProjection.architecture.test.ts
    cypressCoverage: N/A - contract type only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/registry.test.ts]
  - name: getRouteHeaderContributions
    path: apps/web/src/app/plugins/registry.ts
    dddOwner: Plugin UX integration contract
    cqRails: [ListPluginDockContributions]
    fowlerSignals: [Query Rail]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/pluginRuntimeProjection.architecture.test.ts
    cypressCoverage: N/A - projection rail only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/registry.test.ts]
  - name: getCommandPaletteContributions
    path: apps/web/src/app/plugins/registry.ts
    dddOwner: Plugin UX integration contract
    cqRails: [ListPluginDockContributions]
    fowlerSignals: [Query Rail]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/pluginRuntimeProjection.architecture.test.ts
    cypressCoverage: N/A - projection rail only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/registry.test.ts]
  - name: getBottomDiagnosticsContributions
    path: apps/web/src/app/plugins/registry.ts
    dddOwner: Plugin UX integration contract
    cqRails: [ListPluginDockContributions]
    fowlerSignals: [Query Rail]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/pluginRuntimeProjection.architecture.test.ts
    cypressCoverage: N/A - projection rail only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/registry.test.ts]
  - name: compareByOrder
    path: apps/web/src/app/plugins/registry.ts
    dddOwner: Plugin UX integration contract
    cqRails: [ListPluginDockContributions]
    fowlerSignals: [Local Helper]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/pluginRuntimeProjection.architecture.test.ts
    cypressCoverage: N/A - deterministic sorting helper only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/registry.test.ts]
  - name: APP_ROOT
    path: apps/web/src/app/plugins/pluginRuntimeProjection.architecture.test.ts
    dddOwner: Plugin UX integration contract
    cqRails: [ListPluginDockContributions]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/pluginRuntimeProjection.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/pluginRuntimeProjection.architecture.test.ts]
  - name: REPO_ROOT
    path: apps/web/src/app/plugins/pluginRuntimeProjection.architecture.test.ts
    dddOwner: Plugin UX integration contract
    cqRails: [ListPluginDockContributions]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/pluginRuntimeProjection.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/pluginRuntimeProjection.architecture.test.ts]
  - name: readAppSource
    path: apps/web/src/app/plugins/pluginRuntimeProjection.architecture.test.ts
    dddOwner: Plugin UX integration contract
    cqRails: [ListPluginDockContributions]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/pluginRuntimeProjection.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/pluginRuntimeProjection.architecture.test.ts]
  - name: readRepoDoc
    path: apps/web/src/app/plugins/pluginRuntimeProjection.architecture.test.ts
    dddOwner: Plugin UX integration contract
    cqRails: [ListPluginDockContributions]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/pluginRuntimeProjection.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/plugins/pluginRuntimeProjection.architecture.test.ts]
```
