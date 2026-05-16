---
title: Web Vitest suite partition plan
status: Accepted
date: 2026-05-17
last_reviewed: 2026-05-17
owners:
  - apps/web
---

# Web Vitest Suite Partition Plan

## Purpose

Split `@dvt/web` Vitest execution into governed primary suites and Canvas focus
lanes without reducing coverage or changing product behavior. The historical
`pnpm --filter @dvt/web test` command remains the full compatibility suite.

## Scope

- Add one suite catalog for `@dvt/web` Vitest ownership.
- Add unit, presentation, architecture, Canvas focus, and CI package commands.
- Split Canvas route-state and startup/draft-recovery architecture god tests by
  semantic responsibility.
- Document the partition in the test architecture and CI command guides.

```feature-mechanization
version: 1
featureId: WEB-VITEST-SUITE-PARTITION-20260517
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/web-vitest-suite-partition-plan-20260517.md
componentGuides:
  - docs/guides/test-architecture.md
  - docs/guides/testing-and-ci-capabilities.md
userStories:
  - docs/planning/proposals/mandatory/frontend-and-ux/web-vitest-suite-partition-plan-20260517.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/command-query-rail-governance.md
  - docs/guides/test-architecture.md
  - docs/guides/testing-and-ci-capabilities.md
allowedImplementationSurfaces:
  - .github/workflows/test.yml
  - package.json
  - apps/web/package.json
  - apps/web/vitest*.ts
  - apps/web/src/testing/vitestSuites.architecture.test.ts
  - apps/web/src/app/views/Canvas.test.support.tsx
  - apps/web/src/app/views/Canvas.routeStates.*.test.tsx
  - apps/web/src/app/views/canvas/canvasStartupBootstrapPublication.architecture.test.ts
  - apps/web/src/app/views/canvas/canvasDraftRecoveryBoundary.architecture.test.ts
  - apps/web/src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts
  - apps/web/src/app/views/canvas/canvasStartupAndDraftRecovery.architecture.support.ts
  - docs/guides/test-architecture.md
  - docs/guides/testing-and-ci-capabilities.md
  - docs/architecture/components/web/api-client-auth-component.md
  - docs/architecture/components/web/web-store-domain-ownership-component.md
  - docs/architecture/components/web/graph/canvas-authoring-draft-boundary-component.md
  - docs/architecture/components/web/graph/canvas-draft-access-posture-component.md
  - docs/architecture/components/web/graph/canvas-first-authoring-live-proof-component.md
  - docs/architecture/components/web/graph/canvas-layout-persistence-component.md
  - docs/architecture/components/web/graph/canvas-route-composition-component.md
  - docs/architecture/components/web/graph/canvas-route-presentation-component.md
  - docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-component.md
  - docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-user-stories.md
  - docs/architecture/components/web/graph/workspace-graph-draft-test-fixture-boundary-component.md
  - docs/planning/proposals/mandatory/frontend-and-ux/web-vitest-suite-partition-plan-20260517.md
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
  - apps/api/**
  - specs/**
commandQueryRails:
  - name: WebVitestSuitePartition
    type: command
    dddOwner: Web test tooling
domainObjects:
  - name: WebVitestSuiteCatalog
    type: test execution catalog
    owner: apps/web
  - name: WebVitestPrimarySuite
    type: test ownership lane
    owner: apps/web
  - name: CanvasRouteStateTestPartition
    type: route-state test partition
    owner: Canvas route presentation
fowlerSignals:
  - God test
  - Semantic encapsulation
  - Boundary drift
  - Duplicate semantics
architectureGuards:
  - pnpm --filter @dvt/web test:architecture
  - pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing/vitestSuites.architecture.test.ts
cypressFlows:
  - N/A - Vitest suite partition has no browser automation surface.
completionGate:
  - pnpm --filter @dvt/web test:unit
  - pnpm --filter @dvt/web test:presentation
  - pnpm --filter @dvt/web test:architecture
  - pnpm --filter @dvt/web test:canvas
  - pnpm --filter @dvt/web test
  - pnpm --filter @dvt/web typecheck
  - pnpm governance:refresh
  - pnpm verify:prepush
redGreenCycles:
  - id: web-vitest-suite-catalog
    redTest: pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/testing/vitestSuites.architecture.test.ts
    expectedFailure: The suite partition guard cannot import vitest.suites before the catalog exists.
    patchSurfaces:
      - apps/web/vitest*.ts
      - apps/web/package.json
      - package.json
      - .github/workflows/test.yml
      - apps/web/src/testing/vitestSuites.architecture.test.ts
    greenTest: pnpm --filter @dvt/web test:architecture
  - id: canvas-route-state-god-test-split
    redTest: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing/vitestSuites.architecture.test.ts
    expectedFailure: Canvas.routeStates.test.tsx still exists as a route-state concentrator.
    patchSurfaces:
      - apps/web/src/app/views/Canvas.routeStates.*.test.tsx
      - apps/web/src/app/views/Canvas.test.support.tsx
    greenTest: pnpm --filter @dvt/web test:canvas
  - id: canvas-startup-architecture-split
    redTest: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing/vitestSuites.architecture.test.ts
    expectedFailure: canvasStartupAndDraftRecovery.architecture.test.ts still exists as a semantic concentrator.
    patchSurfaces:
      - apps/web/src/app/views/canvas/canvasStartupBootstrapPublication.architecture.test.ts
      - apps/web/src/app/views/canvas/canvasDraftRecoveryBoundary.architecture.test.ts
      - apps/web/src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts
      - apps/web/src/app/views/canvas/canvasStartupAndDraftRecovery.architecture.support.ts
    greenTest: pnpm --filter @dvt/web test:architecture
symbols:
  - name: WEB_VITEST_PRIMARY_SUITE_NAMES
    path: apps/web/vitest.suites.ts
    dddOwner: WebVitestSuiteCatalog
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - Vitest-only test tooling.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: WEB_VITEST_FOCUS_SUITE_NAMES
    path: apps/web/vitest.suites.ts
    dddOwner: WebVitestSuiteCatalog
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - Vitest-only test tooling.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: WebVitestPrimarySuiteName
    path: apps/web/vitest.suites.ts
    dddOwner: WebVitestSuiteCatalog
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - Vitest-only test tooling.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: WebVitestFocusSuiteName
    path: apps/web/vitest.suites.ts
    dddOwner: WebVitestSuiteCatalog
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - Vitest-only test tooling.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: WebVitestSuiteName
    path: apps/web/vitest.suites.ts
    dddOwner: WebVitestSuiteCatalog
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - Vitest-only test tooling.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: WebVitestSuiteDefinition
    path: apps/web/vitest.suites.ts
    dddOwner: WebVitestSuiteCatalog
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - Vitest-only test tooling.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: WEB_VITEST_DEFAULT_EXCLUDE
    path: apps/web/vitest.suites.ts
    dddOwner: WebVitestSuiteCatalog
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - Vitest-only test tooling.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: WEB_VITEST_SUITES
    path: apps/web/vitest.suites.ts
    dddOwner: WebVitestSuiteCatalog
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - Vitest-only test tooling.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: createWebVitestConfig
    path: apps/web/vitest.suites.ts
    dddOwner: WebVitestSuiteCatalog
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - Vitest-only test tooling.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: classifyWebVitestFile
    path: apps/web/vitest.suites.ts
    dddOwner: WebVitestSuiteCatalog
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - Vitest-only test tooling.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: normalizeWebVitestPath
    path: apps/web/vitest.suites.ts
    dddOwner: WebVitestSuiteCatalog
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - Vitest-only test tooling.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: isArchitectureTestPath
    path: apps/web/vitest.suites.ts
    dddOwner: WebVitestSuiteCatalog
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - Vitest-only test tooling.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: isCanvasFocusPath
    path: apps/web/vitest.suites.ts
    dddOwner: WebVitestSuiteCatalog
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - Vitest-only test tooling.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: webRoot
    path: apps/web/src/testing/vitestSuites.architecture.test.ts
    dddOwner: WebVitestSuitePartition
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - Vitest-only test tooling.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: sourceRoot
    path: apps/web/src/testing/vitestSuites.architecture.test.ts
    dddOwner: WebVitestSuitePartition
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - Vitest-only test tooling.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: normalizePath
    path: apps/web/src/testing/vitestSuites.architecture.test.ts
    dddOwner: WebVitestSuitePartition
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - Vitest-only test tooling.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: listFiles
    path: apps/web/src/testing/vitestSuites.architecture.test.ts
    dddOwner: WebVitestSuitePartition
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - Vitest-only test tooling.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: listWebVitestFiles
    path: apps/web/src/testing/vitestSuites.architecture.test.ts
    dddOwner: WebVitestSuitePartition
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - Vitest-only test tooling.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: countTestCases
    path: apps/web/src/testing/vitestSuites.architecture.test.ts
    dddOwner: WebVitestSuitePartition
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [God test]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - Vitest-only test tooling.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: countLines
    path: apps/web/src/testing/vitestSuites.architecture.test.ts
    dddOwner: WebVitestSuitePartition
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [God test]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - Vitest-only test tooling.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: CanvasRouteHarness
    path: apps/web/src/app/views/Canvas.test.support.tsx
    dddOwner: CanvasRouteStateTestPartition
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - covered by Vitest route-state tests.
    unitTests: [pnpm --filter @dvt/web test:canvas]
  - name: expectCanvasRegistryClosed
    path: apps/web/src/app/views/Canvas.test.support.tsx
    dddOwner: CanvasRouteStateTestPartition
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - covered by Vitest route-state tests.
    unitTests: [pnpm --filter @dvt/web test:canvas]
  - name: expectPrimaryCanvasActionsBlocked
    path: apps/web/src/app/views/Canvas.test.support.tsx
    dddOwner: CanvasRouteStateTestPartition
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - covered by Vitest route-state tests.
    unitTests: [pnpm --filter @dvt/web test:canvas]
  - name: expectActiveCanvasTab
    path: apps/web/src/app/views/Canvas.test.support.tsx
    dddOwner: CanvasRouteStateTestPartition
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - covered by Vitest route-state tests.
    unitTests: [pnpm --filter @dvt/web test:canvas]
  - name: requireAuthoringNodeKind
    path: apps/web/src/app/views/Canvas.test.support.tsx
    dddOwner: CanvasRouteStateTestPartition
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - covered by Vitest route-state tests.
    unitTests: [pnpm --filter @dvt/web test:canvas]
  - name: buildInspectorFixtureNode
    path: apps/web/src/app/views/Canvas.test.support.tsx
    dddOwner: CanvasRouteStateTestPartition
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - covered by Vitest route-state tests.
    unitTests: [pnpm --filter @dvt/web test:canvas]
  - name: expectBlockedCanvasRouteState
    path: apps/web/src/app/views/Canvas.test.support.tsx
    dddOwner: CanvasRouteStateTestPartition
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - covered by Vitest route-state tests.
    unitTests: [pnpm --filter @dvt/web test:canvas]
  - name: FirstCanvasCycleFixture
    path: apps/web/src/app/views/Canvas.routeStates.host-cycle-persistence.test.tsx
    dddOwner: CanvasRouteStateTestPartition
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - covered by Vitest route-state tests.
    unitTests: [pnpm --filter @dvt/web test:canvas]
  - name: FIRST_CANVAS_CYCLE_FIXTURES
    path: apps/web/src/app/views/Canvas.routeStates.host-cycle-persistence.test.tsx
    dddOwner: CanvasRouteStateTestPartition
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - covered by Vitest route-state tests.
    unitTests: [pnpm --filter @dvt/web test:canvas]
  - name: installFirstCanvasCycleController
    path: apps/web/src/app/views/Canvas.routeStates.host-cycle-persistence.test.tsx
    dddOwner: CanvasRouteStateTestPartition
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - covered by Vitest route-state tests.
    unitTests: [pnpm --filter @dvt/web test:canvas]
  - name: REPO_ROOT
    path: apps/web/src/app/views/canvas/canvasStartupAndDraftRecovery.architecture.support.ts
    dddOwner: Canvas startup architecture tests
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - architecture-only support.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: RETIRED_ROUTE_SHIM_TERM_PATTERNS
    path: apps/web/src/app/views/canvas/canvasStartupAndDraftRecovery.architecture.support.ts
    dddOwner: Canvas startup architecture tests
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - architecture-only support.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: ownedConcernModules
    path: apps/web/src/app/views/canvas/canvasStartupAndDraftRecovery.architecture.support.ts
    dddOwner: Canvas startup architecture tests
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - architecture-only support.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: readRepoFile
    path: apps/web/src/app/views/canvas/canvasStartupAndDraftRecovery.architecture.support.ts
    dddOwner: Canvas startup architecture tests
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - architecture-only support.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: repoFileExists
    path: apps/web/src/app/views/canvas/canvasStartupAndDraftRecovery.architecture.support.ts
    dddOwner: Canvas startup architecture tests
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - architecture-only support.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: readAppSource
    path: apps/web/src/app/views/canvas/canvasStartupAndDraftRecovery.architecture.support.ts
    dddOwner: Canvas startup architecture tests
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - architecture-only support.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: listCanvasSourceFiles
    path: apps/web/src/app/views/canvas/canvasStartupAndDraftRecovery.architecture.support.ts
    dddOwner: Canvas startup architecture tests
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - architecture-only support.
    unitTests: [pnpm --filter @dvt/web test:architecture]
  - name: buildCanonicalNode
    path: apps/web/src/app/views/canvas/canvasStartupAndDraftRecovery.architecture.support.ts
    dddOwner: Canvas startup architecture tests
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: N/A - architecture-only support.
    unitTests: [pnpm --filter @dvt/web test:architecture]
```
