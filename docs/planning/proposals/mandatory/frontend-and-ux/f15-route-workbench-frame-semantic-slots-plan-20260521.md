---
title: F-15 Route Workbench Frame Semantic Slots Plan
status: Accepted
date: 2026-05-21
last_reviewed: 2026-05-21
owners:
  - apps/web
task_id: F-15
---

# F-15 Route Workbench Frame Semantic Slots Plan

## Think-First Analysis

Problem summary: F-15 documents a stable workbench grammar, but the shared
`RouteWorkbenchFrame` only enforced header/body structure. Route-level panels
could still be repeated as anonymous children.

Root cause: the component was extracted as a layout helper before the route
slot vocabulary was encoded as a semantic API.

Selected approach: add a no-legacy `RouteWorkbenchFrameSlots` parameter object,
document the component locally, save the Fowler review in `buzon`, migrate
direct route consumers, and add semantic tests that fail if docs or slot names
drift.

Out of scope:

- migrating every route to the slot API;
- implementing a resizable `ContextPanel`;
- changing shell-level `AppShellFrame`;
- adding or changing backend command/query rails.

## Fowler Opportunity Matrix

<!-- markdownlint-disable MD060 -->

| Scenario                                                           | Opportunity          | Fowler pattern             | DDD owner                             | Command/query rail                | Implementation surfaces                       | Unit or package test           | Architecture test                          | User-flow test                   | Out of scope                 |
| ------------------------------------------------------------------ | -------------------- | -------------------------- | ------------------------------------- | --------------------------------- | --------------------------------------------- | ------------------------------ | ------------------------------------------ | -------------------------------- | ---------------------------- |
| Route panels encoded as arbitrary children                         | Primitive obsession  | Introduce Parameter Object | Operator workbench presentation model | none - internal presentation only | `RouteWorkbenchFrame.tsx`                     | `RouteWorkbenchFrame.test.tsx` | `routeWorkbenchFrame.architecture.test.ts` | route tests stay green           | context panel extraction     |
| F-15 docs promise slots while code exposes only body wrapper       | Documentation drift  | Component guide            | Web workbench docs                    | none - docs only                  | component guide, user stories, buzon analysis | docs gates                     | `routeWorkbenchFrame.architecture.test.ts` | not required                     | ADR                          |
| Architecture tests can prove files exist without proving semantics | Test-only confidence | Semantic Fitness Function  | Web architecture tests                | none - architecture guard only    | architecture test                             | focused architecture test      | `routeWorkbenchFrame.architecture.test.ts` | not required                     | broad web architecture suite |
| Code workbench repeats left/primary layout locally                 | Duplicate semantics  | Move Embellishment         | Code workbench presentation model     | none - internal presentation only | `CodeView.tsx`                                | `CodeView.test.tsx`            | `routeWorkbenchFrame.architecture.test.ts` | not required; same visible route | right panel extraction       |

<!-- markdownlint-enable MD060 -->

## Red-Green Plan

1. Add a behavior test expecting `leftPanel`, `primarySurface`, `rightPanel`,
   and `bottomDrawer` slot DOM.
2. Add an architecture test expecting the semantic API, component guide, user
   stories, Fowler analysis, and owned-concern docblock.
3. Run both focused tests and observe failure.
4. Add `RouteWorkbenchFrameSlots` and remove anonymous `children` as a body API.
5. Add the local component guide, user stories, and `buzon` analysis.
6. Update web component docs and generated indexes.
7. Validate with focused tests, feature mechanization, docs checks, typecheck,
   and prepush.

ADR decision: no ADR is required. This is a local component API implementation
of the accepted F-15 workbench contract, not a new architecture decision.

```feature-mechanization
version: 1
featureId: F15-ROUTE-WORKBENCH-FRAME-SEMANTIC-SLOTS-20260521
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f15-route-workbench-frame-semantic-slots-plan-20260521.md
componentGuides:
  - docs/architecture/components/web/route-workbench-frame-component.md
userStories:
  - docs/architecture/components/web/route-workbench-frame-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/main-workspace-views-and-ux.md
  - docs/architecture/components/web/ux-implementation-guide.md
  - docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md
allowedImplementationSurfaces:
  - apps/web/src/app/components/workbench/RouteWorkbenchFrame.tsx
  - apps/web/src/app/components/workbench/RouteWorkbenchFrame.test.tsx
  - apps/web/src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
  - apps/web/src/app/views/AdminView.tsx
  - apps/web/src/app/views/ArtifactsView.tsx
  - apps/web/src/app/views/CodeView.tsx
  - apps/web/src/app/views/CodeView.test.tsx
  - apps/web/src/app/views/CostView.tsx
  - apps/web/src/app/views/DiffView.tsx
  - apps/web/src/app/views/LineageView.tsx
  - apps/web/src/app/views/PluginsView.tsx
  - apps/web/src/app/views/plugins/PluginsRouteWorkbench.tsx
  - apps/web/src/app/views/plugins/pluginsViewModel.ts
  - apps/web/src/app/views/diff/DiffStateViews.tsx
  - apps/web/src/app/views/lineage/LineageStateViews.tsx
  - apps/web/cypress/e2e/shell/route-workbench-slots.cy.ts
  - buzon/20260521-codex-fowler-route-workbench-frame-analysis-and-remediation.md
  - docs/architecture/components/web/code-workbench-workspace-files-component.md
  - docs/architecture/components/web/index.md
  - docs/architecture/components/web/route-workbench-frame-component.md
  - docs/architecture/components/web/route-workbench-frame-user-stories.md
  - docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md
  - docs/planning/proposals/mandatory/frontend-and-ux/f15-route-workbench-frame-semantic-slots-plan-20260521.md
forbiddenImplementationSurfaces:
  - apps/api/**
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
commandQueryRails:
  - name: RouteWorkbenchFrameSlotProjection
    type: query
    dddOwner: Operator workbench presentation model
domainObjects:
  - name: RouteWorkbenchFrameSlots
    type: presentation parameter object
    owner: apps/web
fowlerSignals:
  - Primitive obsession
  - Documentation drift
  - Test-only confidence
architectureGuards:
  - pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
cypressFlows:
  - pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
completionGate:
  - pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
  - pnpm --filter @dvt/web exec vitest run --config vitest.monaco.config.ts src/app/views/CodeView.test.tsx
  - pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/workbench/RouteWorkbenchFrame.test.tsx
  - pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
  - pnpm --filter @dvt/web typecheck
  - pnpm docs:feature-mechanization -- --feature F15-ROUTE-WORKBENCH-FRAME-SEMANTIC-SLOTS-20260521
  - pnpm docs:feature-mechanization:implementation
  - pnpm docs:sync
  - pnpm verify:prepush
redGreenCycles:
  - id: f15-route-workbench-frame-slots
    redTest: pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/workbench/RouteWorkbenchFrame.test.tsx
    expectedFailure: RouteWorkbenchFrame does not render semantic slot DOM.
    patchSurfaces:
      - apps/web/src/app/components/workbench/RouteWorkbenchFrame.tsx
      - apps/web/src/app/components/workbench/RouteWorkbenchFrame.test.tsx
    greenTest: pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/workbench/RouteWorkbenchFrame.test.tsx
  - id: f15-no-legacy-route-workbench-frame
    redTest: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    expectedFailure: RouteWorkbenchFrame still accepts anonymous children and direct route consumers have not adopted slots.
    patchSurfaces:
      - apps/web/src/app/components/workbench/RouteWorkbenchFrame.tsx
      - apps/web/src/app/components/workbench/RouteWorkbenchFrame.test.tsx
      - apps/web/src/app/views/AdminView.tsx
      - apps/web/src/app/views/ArtifactsView.tsx
      - apps/web/src/app/views/CostView.tsx
      - apps/web/src/app/views/DiffView.tsx
      - apps/web/src/app/views/LineageView.tsx
      - apps/web/src/app/views/PluginsView.tsx
      - apps/web/src/app/views/diff/DiffStateViews.tsx
      - apps/web/src/app/views/lineage/LineageStateViews.tsx
    greenTest: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
  - id: f15-route-workbench-frame-architecture-docs
    redTest: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    expectedFailure: Component guide, user stories, Fowler analysis, and semantic API are missing.
    patchSurfaces:
      - apps/web/src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
      - buzon/20260521-codex-fowler-route-workbench-frame-analysis-and-remediation.md
      - docs/architecture/components/web/route-workbench-frame-component.md
      - docs/architecture/components/web/route-workbench-frame-user-stories.md
    greenTest: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
  - id: f15-code-view-slot-adoption
    redTest: pnpm --filter @dvt/web exec vitest run --config vitest.monaco.config.ts src/app/views/CodeView.test.tsx
    expectedFailure: CodeView renders file tree and editor as anonymous RouteWorkbenchFrame children.
    patchSurfaces:
      - apps/web/src/app/views/CodeView.tsx
      - apps/web/src/app/views/CodeView.test.tsx
      - docs/architecture/components/web/code-workbench-workspace-files-component.md
    greenTest: pnpm --filter @dvt/web exec vitest run --config vitest.monaco.config.ts src/app/views/CodeView.test.tsx
  - id: f15-route-workbench-browser-ux-proof
    redTest: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    expectedFailure: Browser route coverage did not yet prove the semantic slot UX.
    patchSurfaces:
      - apps/web/cypress/e2e/shell/route-workbench-slots.cy.ts
      - docs/architecture/components/web/route-workbench-frame-user-stories.md
    greenTest: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
symbols:
  - name: RouteWorkbenchFrameSlots
    path: apps/web/src/app/components/workbench/RouteWorkbenchFrame.tsx
    dddOwner: Operator workbench presentation model
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: N/A - component API only.
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/workbench/RouteWorkbenchFrame.test.tsx]
  - name: RouteWorkbenchSlotLayout
    path: apps/web/src/app/components/workbench/RouteWorkbenchFrame.tsx
    dddOwner: Operator workbench presentation model
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: N/A - component API only.
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/workbench/RouteWorkbenchFrame.test.tsx]
  - name: APP_ROOT
    path: apps/web/src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    dddOwner: Web architecture test harness
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: N/A - architecture test helper only.
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts]
  - name: REPO_ROOT
    path: apps/web/src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    dddOwner: Web architecture test harness
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: N/A - architecture test helper only.
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts]
  - name: readAppSource
    path: apps/web/src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    dddOwner: Web architecture test harness
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: N/A - architecture test helper only.
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts]
  - name: readRepoDoc
    path: apps/web/src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    dddOwner: Web architecture test harness
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: N/A - architecture test helper only.
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts]
  - name: WORKSPACE_FILE_TREE
    path: apps/web/cypress/e2e/shell/route-workbench-slots.cy.ts
    dddOwner: Route workbench browser UX proof
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Semantic fitness function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [N/A - Cypress fixture constant]
  - name: stubRouteWorkbenchBootstrapApis
    path: apps/web/cypress/e2e/shell/route-workbench-slots.cy.ts
    dddOwner: Route workbench browser UX proof
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Semantic fitness function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [N/A - Cypress route stub helper]
  - name: stubCodeWorkbenchApis
    path: apps/web/cypress/e2e/shell/route-workbench-slots.cy.ts
    dddOwner: Route workbench browser UX proof
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Semantic fitness function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [N/A - Cypress route stub helper]
  - name: assertPrimaryRouteWorkbench
    path: apps/web/cypress/e2e/shell/route-workbench-slots.cy.ts
    dddOwner: Route workbench browser UX proof
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Semantic fitness function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [N/A - Cypress assertion helper]
  - name: PluginSurfaceState
    path: apps/web/src/app/views/plugins/pluginsViewModel.ts
    dddOwner: Plugins route presentation model
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/PluginsView.test.tsx]
  - name: PluginReadinessItem
    path: apps/web/src/app/views/plugins/pluginsViewModel.ts
    dddOwner: Plugins route presentation model
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/PluginsView.test.tsx]
  - name: PluginReadiness
    path: apps/web/src/app/views/plugins/pluginsViewModel.ts
    dddOwner: Plugins route presentation model
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/PluginsView.test.tsx]
  - name: PluginCapabilitiesSnapshot
    path: apps/web/src/app/views/plugins/pluginsViewModel.ts
    dddOwner: Plugins route presentation model
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/PluginsView.test.tsx]
  - name: PluginProbeStatus
    path: apps/web/src/app/views/plugins/pluginsViewModel.ts
    dddOwner: Plugins route presentation model
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/PluginsView.test.tsx]
  - name: pluginsViewCopy
    path: apps/web/src/app/views/plugins/pluginsViewModel.ts
    dddOwner: Plugins route presentation model
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/PluginsView.test.tsx]
  - name: formatEnvFlagValue
    path: apps/web/src/app/views/plugins/pluginsViewModel.ts
    dddOwner: Plugins route presentation model
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Extract Function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/PluginsView.test.tsx]
  - name: resolveProbeStatus
    path: apps/web/src/app/views/plugins/pluginsViewModel.ts
    dddOwner: Plugins route presentation model
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Extract Function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/PluginsView.test.tsx]
  - name: resolvePluginReadiness
    path: apps/web/src/app/views/plugins/pluginsViewModel.ts
    dddOwner: Plugins route presentation model
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Extract Function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/PluginsView.test.tsx]
  - name: PluginsViewHeader
    path: apps/web/src/app/views/plugins/PluginsRouteWorkbench.tsx
    dddOwner: Plugins route presentation model
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Extract Component]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/PluginsView.test.tsx]
  - name: PluginsPrimarySurface
    path: apps/web/src/app/views/plugins/PluginsRouteWorkbench.tsx
    dddOwner: Plugins route presentation model
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Extract Component]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/PluginsView.test.tsx]
  - name: resolveStatusIcon
    path: apps/web/src/app/views/plugins/PluginsRouteWorkbench.tsx
    dddOwner: Plugins route presentation model
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Extract Function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/PluginsView.test.tsx]
  - name: PluginCapabilityProbeCard
    path: apps/web/src/app/views/plugins/PluginsRouteWorkbench.tsx
    dddOwner: Plugins route presentation model
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Extract Component]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/PluginsView.test.tsx]
  - name: PluginRegistryContent
    path: apps/web/src/app/views/plugins/PluginsRouteWorkbench.tsx
    dddOwner: Plugins route presentation model
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Extract Component]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/PluginsView.test.tsx]
  - name: PluginCard
    path: apps/web/src/app/views/plugins/PluginsRouteWorkbench.tsx
    dddOwner: Plugins route presentation model
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Extract Component]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/PluginsView.test.tsx]
  - name: PluginIdentity
    path: apps/web/src/app/views/plugins/PluginsRouteWorkbench.tsx
    dddOwner: Plugins route presentation model
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Extract Component]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/PluginsView.test.tsx]
  - name: PluginMetadataBadges
    path: apps/web/src/app/views/plugins/PluginsRouteWorkbench.tsx
    dddOwner: Plugins route presentation model
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Extract Component]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/PluginsView.test.tsx]
  - name: PluginReadinessCard
    path: apps/web/src/app/views/plugins/PluginsRouteWorkbench.tsx
    dddOwner: Plugins route presentation model
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Extract Component]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/PluginsView.test.tsx]
  - name: PluginTaxonomySection
    path: apps/web/src/app/views/plugins/PluginsRouteWorkbench.tsx
    dddOwner: Plugins route presentation model
    cqRails: [RouteWorkbenchFrameSlotProjection]
    fowlerSignals: [Extract Component]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/workbench/routeWorkbenchFrame.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/route-workbench-slots.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/PluginsView.test.tsx]
```
