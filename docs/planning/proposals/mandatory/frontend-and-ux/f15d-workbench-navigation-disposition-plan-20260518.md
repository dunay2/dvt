---
title: F-15-D Workbench Navigation Disposition Plan
status: Accepted
owner: Frontend / Shell
last_reviewed: 2026-05-18
planning_type: mandatory
---

# F-15-D Workbench Navigation Disposition Plan

## Objective

Resolve the Canvas workbench permanent-left-rail drift by moving route-family
chrome posture into an explicit shell query model. Canvas workbench routes use
menu navigation, while global shell routes keep the pinned rail.

## Scope

- Add `ResolveShellNavigationDisposition` as a frontend shell query rail.
- Keep `AppShellFrame` as a posture applier, not a pathname classifier.
- Keep global links reachable from the `View` menu when the rail is hidden.
- Document the component API, invariants, transitions, and consumers.
- Add semantic architecture coverage for the ownership boundary.

```feature-mechanization
version: 1
featureId: F15D-WORKBENCH-NAVIGATION-DISPOSITION-20260518
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f15d-workbench-navigation-disposition-plan-20260518.md
componentGuides:
  - docs/architecture/components/web/shell-navigation-disposition-component.md
userStories:
  - buzon/20260518-codex-fowler-f15d-workbench-navigation-rail-disposition.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/command-query-rail-governance.md
  - docs/planning/state/lane-e-shell-baseline-target-guide.md
  - buzon/20260516-codex-fowler-element-workbench-navigation-rail-disposition.md
allowedImplementationSurfaces:
  - apps/web/src/app/Root.tsx
  - apps/web/src/app/Root.shellChrome.test.support.ts
  - apps/web/src/app/Root.shellChrome.test.tsx
  - apps/web/src/app/components/TopAppBar.test.tsx
  - apps/web/src/app/components/TopAppBar.tsx
  - apps/web/src/app/components/shell/AppShellFrame.test.tsx
  - apps/web/src/app/components/shell/AppShellFrame.tsx
  - apps/web/src/app/components/shell/ShellMenu.tsx
  - apps/web/src/app/components/shell/copy.ts
  - apps/web/src/app/components/shell/types.ts
  - apps/web/src/app/routes.test.tsx
  - apps/web/src/app/shell/shellNavigationDisposition.architecture.test.ts
  - apps/web/src/app/shell/shellNavigationDisposition.test.ts
  - apps/web/src/app/shell/shellNavigationDisposition.ts
  - buzon/20260518-codex-fowler-f15d-workbench-navigation-rail-disposition.md
  - docs/architecture/components/web/shell-navigation-disposition-component.md
  - docs/planning/proposals/mandatory/frontend-and-ux/f15d-workbench-navigation-disposition-plan-20260518.md
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
  - apps/api/**
  - specs/**
commandQueryRails:
  - name: ResolveShellNavigationDisposition
    type: query
    dddOwner: ShellNavigationDisposition
domainObjects:
  - name: ShellNavigationDisposition
    type: route-family chrome read model
    owner: Frontend shell
fowlerSignals:
  - Boundary drift
  - Control coupling
  - Duplicate semantics
  - Semantic encapsulation
architectureGuards:
  - pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.architecture.test.ts
cypressFlows:
  - N/A - shell navigation disposition is covered by route render and architecture tests; Cypress remains the governed e2e rail and Playwright visual smoke is follow-up QA evidence, not this slice's primary rail.
completionGate:
  - pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.test.ts src/app/shell/shellNavigationDisposition.architecture.test.ts src/app/Root.shellChrome.test.tsx src/app/routes.test.tsx
  - pnpm --filter @dvt/web test:ci
  - pnpm --filter @dvt/web typecheck
  - pnpm lint
  - pnpm governance:refresh
  - pnpm verify:prepush
redGreenCycles:
  - id: f15d-workbench-rail-disposition
    redTest: pnpm --filter @dvt/web exec vitest run src/app/Root.shellChrome.test.tsx src/app/routes.test.tsx
    expectedFailure: Canvas route still mounts the permanent left rail before the shell disposition query is applied.
    patchSurfaces:
      - apps/web/src/app/Root.tsx
      - apps/web/src/app/components/shell/AppShellFrame.tsx
      - apps/web/src/app/components/shell/ShellMenu.tsx
      - apps/web/src/app/shell/shellNavigationDisposition.ts
    greenTest: pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.test.ts src/app/shell/shellNavigationDisposition.architecture.test.ts src/app/Root.shellChrome.test.tsx src/app/routes.test.tsx
symbols:
  - name: ShellNavigationDisposition
    path: apps/web/src/app/shell/shellNavigationDisposition.ts
    dddOwner: ShellNavigationDisposition
    cqRails: [ResolveShellNavigationDisposition]
    fowlerSignals: [Semantic encapsulation, Boundary drift]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.architecture.test.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.test.ts]
    cypressCoverage: N/A - Shell route posture is covered by Vitest render and semantic architecture tests; no Cypress flow is changed by this query model slice.
  - name: ShellNavigationDispositionReason
    path: apps/web/src/app/shell/shellNavigationDisposition.ts
    dddOwner: ShellNavigationDisposition
    cqRails: [ResolveShellNavigationDisposition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.architecture.test.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.test.ts]
    cypressCoverage: N/A - Shell route posture is covered by Vitest render and semantic architecture tests; no Cypress flow is changed by this query model slice.
  - name: ShellNavigationFooterMode
    path: apps/web/src/app/shell/shellNavigationDisposition.ts
    dddOwner: ShellNavigationDisposition
    cqRails: [ResolveShellNavigationDisposition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.architecture.test.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.test.ts]
    cypressCoverage: N/A - Shell route posture is covered by Vitest render and semantic architecture tests; no Cypress flow is changed by this query model slice.
  - name: ShellNavigationRailMode
    path: apps/web/src/app/shell/shellNavigationDisposition.ts
    dddOwner: ShellNavigationDisposition
    cqRails: [ResolveShellNavigationDisposition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.architecture.test.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.test.ts]
    cypressCoverage: N/A - Shell route posture is covered by Vitest render and semantic architecture tests; no Cypress flow is changed by this query model slice.
  - name: WORKBENCH_ROUTE_PREFIXES
    path: apps/web/src/app/shell/shellNavigationDisposition.ts
    dddOwner: ShellNavigationDisposition
    cqRails: [ResolveShellNavigationDisposition]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.architecture.test.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.test.ts]
    cypressCoverage: N/A - Shell route posture is covered by Vitest render and semantic architecture tests; no Cypress flow is changed by this query model slice.
  - name: isWorkbenchRoute
    path: apps/web/src/app/shell/shellNavigationDisposition.ts
    dddOwner: ShellNavigationDisposition
    cqRails: [ResolveShellNavigationDisposition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.architecture.test.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.test.ts]
    cypressCoverage: N/A - Shell route posture is covered by Vitest render and semantic architecture tests; no Cypress flow is changed by this query model slice.
  - name: resolveShellNavigationDisposition
    path: apps/web/src/app/shell/shellNavigationDisposition.ts
    dddOwner: ShellNavigationDisposition
    cqRails: [ResolveShellNavigationDisposition]
    fowlerSignals: [Semantic encapsulation, Control coupling]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.architecture.test.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.test.ts]
    cypressCoverage: N/A - Shell route posture is covered by Vitest render and semantic architecture tests; no Cypress flow is changed by this query model slice.
  - name: expectRootShellWorkbenchFrameChrome
    path: apps/web/src/app/Root.shellChrome.test.support.ts
    dddOwner: ShellNavigationDisposition
    cqRails: [ResolveShellNavigationDisposition]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/Root.shellChrome.test.tsx
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/Root.shellChrome.test.tsx]
    cypressCoverage: N/A - Shell route posture is covered by Vitest render and semantic architecture tests; no Cypress flow is changed by this query model slice.
  - name: TEST_NAVIGATION_MODEL
    path: apps/web/src/app/components/TopAppBar.test.tsx
    dddOwner: ShellNavigationDisposition
    cqRails: [ResolveShellNavigationDisposition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/components/TopAppBar.test.tsx
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/components/TopAppBar.test.tsx]
    cypressCoverage: N/A - Shell route posture is covered by Vitest render and semantic architecture tests; no Cypress flow is changed by this query model slice.
  - name: MENU_NAVIGATION_DISPOSITION
    path: apps/web/src/app/components/shell/AppShellFrame.test.tsx
    dddOwner: ShellNavigationDisposition
    cqRails: [ResolveShellNavigationDisposition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/components/shell/AppShellFrame.test.tsx
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/components/shell/AppShellFrame.test.tsx]
    cypressCoverage: N/A - Shell route posture is covered by Vitest render and semantic architecture tests; no Cypress flow is changed by this query model slice.
  - name: PINNED_NAVIGATION_DISPOSITION
    path: apps/web/src/app/components/shell/AppShellFrame.test.tsx
    dddOwner: ShellNavigationDisposition
    cqRails: [ResolveShellNavigationDisposition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/components/shell/AppShellFrame.test.tsx
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/components/shell/AppShellFrame.test.tsx]
    cypressCoverage: N/A - Shell route posture is covered by Vitest render and semantic architecture tests; no Cypress flow is changed by this query model slice.
  - name: APP_ROOT
    path: apps/web/src/app/shell/shellNavigationDisposition.architecture.test.ts
    dddOwner: ShellNavigationDisposition
    cqRails: [ResolveShellNavigationDisposition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.architecture.test.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.architecture.test.ts]
    cypressCoverage: N/A - Shell route posture is covered by Vitest render and semantic architecture tests; no Cypress flow is changed by this query model slice.
  - name: REPO_ROOT
    path: apps/web/src/app/shell/shellNavigationDisposition.architecture.test.ts
    dddOwner: ShellNavigationDisposition
    cqRails: [ResolveShellNavigationDisposition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.architecture.test.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.architecture.test.ts]
    cypressCoverage: N/A - Shell route posture is covered by Vitest render and semantic architecture tests; no Cypress flow is changed by this query model slice.
  - name: readAppSource
    path: apps/web/src/app/shell/shellNavigationDisposition.architecture.test.ts
    dddOwner: ShellNavigationDisposition
    cqRails: [ResolveShellNavigationDisposition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.architecture.test.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.architecture.test.ts]
    cypressCoverage: N/A - Shell route posture is covered by Vitest render and semantic architecture tests; no Cypress flow is changed by this query model slice.
  - name: readRepoSource
    path: apps/web/src/app/shell/shellNavigationDisposition.architecture.test.ts
    dddOwner: ShellNavigationDisposition
    cqRails: [ResolveShellNavigationDisposition]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.architecture.test.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run src/app/shell/shellNavigationDisposition.architecture.test.ts]
    cypressCoverage: N/A - Shell route posture is covered by Vitest render and semantic architecture tests; no Cypress flow is changed by this query model slice.
```
