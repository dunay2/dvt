---
title: F-14-A Web Vitest Changed Suite Routing Plan
status: Accepted
date: 2026-05-18
last_reviewed: 2026-05-18
owners:
  - apps/web
---

# F-14-A Web Vitest Changed Suite Routing Plan

## Think-First Analysis

Problem summary: F-14 added suite ownership and a named CI lane, but local
developers still need to decide manually which `@dvt/web` test command is the
smallest safe command for a change set.

Root cause: the suite catalog classifies test files, but no public query maps
changed source, test, and governance paths to executable package commands.

Selected approach: add `WebVitestChangedSuiteRouter` beside the suite catalog,
split Canvas into narrower local focus lanes, then expose a package command
that reads changed files and runs the routed suite delegates.

Out of scope:

- changing product runtime behavior;
- replacing `test:web:ci` in GitHub Actions;
- adding new test framework;
- Cypress routing.

## Fowler Opportunity Matrix

<!-- markdownlint-disable MD060 -->

| Scenario                   | Opportunity         | Pattern             | DDD owner                   | Rail                       | Tests                               |
| -------------------------- | ------------------- | ------------------- | --------------------------- | -------------------------- | ----------------------------------- |
| Local test guessing        | Boundary drift      | Change-set query    | Frontend test governance    | WebVitestSuitePartition    | `vitestSuites.architecture.test.ts` |
| Canvas loop too large      | Feedback-loop drag  | Focus lane adapter  | WebVitestChangedSuiteRouter | WebVitestChangedSuiteRoute | `test:changed -- --files ...`       |
| Command-list duplication   | Duplicate semantics | Catalog command map | `WebVitestSuiteCatalog`     | WebVitestSuitePartition    | Architecture guard                  |
| Docs omit local transition | Documentation drift | Component guide     | Web component documentation | Docs governance            | Markdown and docs sync gates        |

<!-- markdownlint-enable MD060 -->

## Red-Green Plan

1. Add architecture tests for changed-suite routing and expected package/root
   scripts.
2. Run the architecture test and observe failure because the router API and
   scripts do not exist.
3. Implement the router API in `apps/web/vitest.suites.ts`.
4. Add the command adapter under `apps/web/scripts/`.
5. Add `test:changed` and `test:web:changed`.
6. Update docs and component guides.
7. Run targeted tests, docs sync, and pre-push validation.

ADR decision: no new ADR is required. This is an implementation of the existing
F-14 suite-catalog decision and the repository command/query rail governance,
not a new architectural policy.

```feature-mechanization
version: 1
featureId: F14A-WEB-VITEST-CHANGED-SUITE-ROUTING-20260518
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f14a-web-vitest-changed-suite-routing-plan-20260518.md
componentGuides:
  - docs/architecture/components/web/web-vitest-changed-suite-router-component.md
userStories:
  - docs/architecture/components/web/web-vitest-changed-suite-router-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/guides/ai-work-protocol.md
  - docs/guides/test-architecture.md
allowedImplementationSurfaces:
  - apps/web/vitest.suites.ts
  - apps/web/scripts/run-vitest-changed-suites.ts
  - apps/web/vitest.canvas-*.config.ts
  - apps/web/package.json
  - apps/web/src/testing/vitestSuites.architecture.test.ts
  - package.json
  - buzon/20260518-f14a-fowler-web-vitest-changed-suite-routing-analysis.md
  - docs/architecture/components/web/index.md
  - docs/architecture/components/web/web-vitest-changed-suite-router-component.md
  - docs/architecture/components/web/web-vitest-changed-suite-router-user-stories.md
  - docs/guides/testing-and-ci-capabilities.md
  - docs/guides/test-architecture.md
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
  - apps/api/**
commandQueryRails:
  - name: WebVitestSuitePartition
    type: command
    dddOwner: Frontend test governance
  - name: WebVitestChangedSuiteRoute
    type: query
    dddOwner: Frontend test governance
domainObjects:
  - name: WebVitestChangedSuiteRouter
    type: changed-file query
    owner: apps/web
fowlerSignals:
  - Boundary drift
  - Duplicate semantics
  - Feedback-loop drag
  - Documentation drift
architectureGuards:
  - pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
cypressFlows:
  - N/A - F-14-A governs Vitest local routing and does not change browser behavior.
completionGate:
  - pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
  - pnpm --filter @dvt/web test:changed -- --files apps/web/src/app/views/canvas/CanvasToolbar.tsx
  - pnpm --filter @dvt/web test:canvas-unit
  - pnpm --filter @dvt/web test:canvas-architecture
  - pnpm --filter @dvt/web typecheck
  - pnpm docs:feature-mechanization:implementation
  - pnpm docs:sync
  - pnpm verify:prepush
redGreenCycles:
  - id: f14a-changed-suite-router
    redTest: pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
    expectedFailure: test:changed, test:web:changed, router API, and component index link are absent.
    patchSurfaces:
      - apps/web/vitest.suites.ts
      - apps/web/scripts/run-vitest-changed-suites.ts
      - apps/web/package.json
      - package.json
      - docs/architecture/components/web/index.md
    greenTest: pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
  - id: f14a-canvas-subfocus-router
    redTest: pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
    expectedFailure: Canvas changes still route to the broad canvas suite and subfocus commands are absent.
    patchSurfaces:
      - apps/web/vitest.suites.ts
      - apps/web/vitest.canvas-unit.config.ts
      - apps/web/vitest.canvas-presentation.config.ts
      - apps/web/vitest.canvas-architecture.config.ts
      - apps/web/package.json
      - apps/web/src/testing/vitestSuites.architecture.test.ts
    greenTest: pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
symbols:
  - name: resolveWebVitestChangedSuitePlan
    path: apps/web/vitest.suites.ts
    dddOwner: Frontend test governance
    cqRails: [WebVitestChangedSuiteRoute]
    fowlerSignals: [Boundary drift, Feedback-loop drag]
    architectureGuard: pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
    cypressCoverage: N/A - Vitest local routing only.
    unitTests: [pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts]
  - name: WEB_VITEST_CHANGED_SUITE_COMMANDS
    path: apps/web/vitest.suites.ts
    dddOwner: Frontend test governance
    cqRails: [WebVitestChangedSuiteRoute]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
    cypressCoverage: N/A - command catalog metadata only.
    unitTests: [pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts]
  - name: WEB_VITEST_CHANGED_SUITE_CONFIGS
    path: apps/web/vitest.suites.ts
    dddOwner: Frontend test governance
    cqRails: [WebVitestChangedSuiteRoute]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
    cypressCoverage: N/A - config catalog metadata only.
    unitTests: [pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts]
  - name: WEB_VITEST_CHANGED_SUITE_ORDER
    path: apps/web/vitest.suites.ts
    dddOwner: Frontend test governance
    cqRails: [WebVitestChangedSuiteRoute]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
    cypressCoverage: N/A - command ordering metadata only.
    unitTests: [pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts]
  - name: WebVitestChangedSuiteName
    path: apps/web/vitest.suites.ts
    dddOwner: Frontend test governance
    cqRails: [WebVitestChangedSuiteRoute]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web typecheck
    cypressCoverage: N/A - type alias only.
    unitTests: [pnpm --filter @dvt/web typecheck]
  - name: normalizeWebVitestChangedPath
    path: apps/web/vitest.suites.ts
    dddOwner: Frontend test governance
    cqRails: [WebVitestChangedSuiteRoute]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
    cypressCoverage: N/A - local path classification only.
    unitTests: [pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts]
  - name: isWebVitestGovernancePath
    path: apps/web/vitest.suites.ts
    dddOwner: Frontend test governance
    cqRails: [WebVitestChangedSuiteRoute]
    fowlerSignals: [Documentation drift]
    architectureGuard: pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
    cypressCoverage: N/A - governance path classification only.
    unitTests: [pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts]
  - name: resolveChangedSuiteForWebPath
    path: apps/web/vitest.suites.ts
    dddOwner: Frontend test governance
    cqRails: [WebVitestChangedSuiteRoute]
    fowlerSignals: [Feedback-loop drag]
    architectureGuard: pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
    cypressCoverage: N/A - local suite routing only.
    unitTests: [pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts]
  - name: isWebVitestTestPath
    path: apps/web/vitest.suites.ts
    dddOwner: Frontend test governance
    cqRails: [WebVitestChangedSuiteRoute]
    fowlerSignals: [Feedback-loop drag]
    architectureGuard: pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
    cypressCoverage: N/A - local test-file routing only.
    unitTests: [pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts]
  - name: createExactChangedTestCommand
    path: apps/web/vitest.suites.ts
    dddOwner: Frontend test governance
    cqRails: [WebVitestChangedSuiteRoute]
    fowlerSignals: [Feedback-loop drag]
    architectureGuard: pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
    cypressCoverage: N/A - local test-file routing only.
    unitTests: [pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts]
  - name: resolveCanvasChangedSuite
    path: apps/web/vitest.suites.ts
    dddOwner: Frontend test governance
    cqRails: [WebVitestChangedSuiteRoute]
    fowlerSignals: [Feedback-loop drag]
    architectureGuard: pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
    cypressCoverage: N/A - Canvas local suite routing only.
    unitTests: [pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts]
  - name: run-vitest-changed-suites
    path: apps/web/scripts/run-vitest-changed-suites.ts
    dddOwner: Frontend test governance
    cqRails: [WebVitestChangedSuiteRoute]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
    cypressCoverage: N/A - command adapter only.
    unitTests: [pnpm --filter @dvt/web test:changed -- --files apps/web/src/app/views/canvas/CanvasToolbar.tsx]
  - name: parseExplicitFiles
    path: apps/web/scripts/run-vitest-changed-suites.ts
    dddOwner: Frontend test governance
    cqRails: [WebVitestChangedSuiteRoute]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm --filter @dvt/web test:changed -- --files apps/web/src/app/views/canvas/CanvasToolbar.tsx
    cypressCoverage: N/A - command argument parsing only.
    unitTests: [pnpm --filter @dvt/web test:changed -- --files apps/web/src/app/views/canvas/CanvasToolbar.tsx]
  - name: gitOutput
    path: apps/web/scripts/run-vitest-changed-suites.ts
    dddOwner: Frontend test governance
    cqRails: [WebVitestChangedSuiteRoute]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm --filter @dvt/web test:changed -- --files apps/web/src/app/views/canvas/CanvasToolbar.tsx
    cypressCoverage: N/A - local Git query helper only.
    unitTests: [pnpm --filter @dvt/web test:changed -- --files apps/web/src/app/views/canvas/CanvasToolbar.tsx]
  - name: readChangedFiles
    path: apps/web/scripts/run-vitest-changed-suites.ts
    dddOwner: Frontend test governance
    cqRails: [WebVitestChangedSuiteRoute]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm --filter @dvt/web test:changed -- --files apps/web/src/app/views/canvas/CanvasToolbar.tsx
    cypressCoverage: N/A - local Git query helper only.
    unitTests: [pnpm --filter @dvt/web test:changed -- --files apps/web/src/app/views/canvas/CanvasToolbar.tsx]
  - name: runCommand
    path: apps/web/scripts/run-vitest-changed-suites.ts
    dddOwner: Frontend test governance
    cqRails: [WebVitestChangedSuiteRoute]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test:changed -- --files apps/web/src/app/views/canvas/CanvasToolbar.tsx
    cypressCoverage: N/A - local command adapter only.
    unitTests: [pnpm --filter @dvt/web test:changed -- --files apps/web/src/app/views/canvas/CanvasToolbar.tsx]
  - name: main
    path: apps/web/scripts/run-vitest-changed-suites.ts
    dddOwner: Frontend test governance
    cqRails: [WebVitestChangedSuiteRoute]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test:changed -- --files apps/web/src/app/views/canvas/CanvasToolbar.tsx
    cypressCoverage: N/A - command adapter entrypoint only.
    unitTests: [pnpm --filter @dvt/web test:changed -- --files apps/web/src/app/views/canvas/CanvasToolbar.tsx]
  - name: Canvas Vitest subfocus configs
    path: apps/web/vitest.canvas-*.config.ts
    dddOwner: Frontend test governance
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Feedback-loop drag]
    architectureGuard: pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
    cypressCoverage: N/A - Vitest focus config only.
    unitTests:
      - pnpm --filter @dvt/web test:canvas-unit
      - pnpm --filter @dvt/web test:canvas-architecture
```
