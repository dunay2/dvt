---
title: Web Vitest Changed-Suite Shallow CI Fix
status: Active
owner: Governance / CI / Web
last_reviewed: 2026-06-03
planning_type: mandatory
featureId: WEB-VITEST-CHANGED-SHALLOW-CI-20260603
---

# Web Vitest Changed-Suite Shallow CI Fix

## Current state

The Test Suite workflow fetches the pull-request base ref before running
`pnpm test:web:changed`, and passes `GIT_BASE` and `GIT_HEAD` into the web
changed-suite detector. The detector still attempted `git merge-base
origin/main HEAD` first. In shallow pull-request checkouts this can fail even
when both trees needed for the PR diff are available.

## Target state

`pnpm test:web:changed` must treat the workflow-provided `GIT_BASE` and
`GIT_HEAD` as the primary query input and use a direct tree diff first. The
`merge-base` path remains a local fallback for worktrees that do not provide a
CI head ref.

## Solution rationale

This keeps the web test surface affected-only without depending on deeper fetch
history. The detector remains conservative: if the direct CI range is diffable,
it uses that range; if not, it falls back to the historical merge-base behavior
and still includes staged, unstaged and untracked local files.

## Feature mechanization

```feature-mechanization
version: 1
featureId: WEB-VITEST-CHANGED-SHALLOW-CI-20260603
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/web-vitest-changed-shallow-ci-plan-20260603.md
componentGuides:
  - docs/guides/testing-and-ci-capabilities.md
userStories:
  - docs/planning/reviews/ci-and-delivery/20260328-lane-c-ai-efficiency-and-cost-review.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/guides/testing-and-ci-capabilities.md
allowedImplementationSurfaces:
  - apps/web/scripts/run-vitest-changed-suites.ts
  - apps/web/src/testing/vitestSuites.architecture.test.ts
  - docs/planning/proposals/mandatory/governance-and-docs/web-vitest-changed-shallow-ci-plan-20260603.md
forbiddenImplementationSurfaces:
  - apps/api/**
  - packages/@dvt/**
  - specs/contracts/**
  - tools/planning-db/**
commandQueryRails:
  - name: SelectWebVitestChangedSuites
    type: query
    dddOwner: WebVitestChangedSuitePlan
domainObjects:
  - name: WebVitestChangedSuitePlan
    type: read model
    owner: Web CI governance
  - name: WebVitestChangedSuiteDetector
    type: adapter
    owner: Web CI governance
fowlerSignals:
  - Introduce Parameter Object
  - Extract Function
  - Replace derived merge-base precondition with explicit CI input
architectureGuards:
  - pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing/vitestSuites.architecture.test.ts
  - pnpm test:web:changed
cypressFlows:
  - N/A - CI detector has architecture and command-level coverage
completionGate:
  - pnpm --filter @dvt/web typecheck
  - pnpm --filter @dvt/web lint
  - pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing/vitestSuites.architecture.test.ts
  - pnpm test:web:changed
  - pnpm verify:changed
  - pnpm verify:prepush
redGreenCycles:
  - id: shallow-pr-direct-diff
    redTest: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing/vitestSuites.architecture.test.ts
    expectedFailure: The detector requires git merge-base before reading the CI-provided diff range.
    patchSurfaces:
      - apps/web/scripts/run-vitest-changed-suites.ts
      - apps/web/src/testing/vitestSuites.architecture.test.ts
    greenTest: pnpm test:web:changed
symbols:
  - name: readChangedFiles
    path: apps/web/scripts/run-vitest-changed-suites.ts
    dddOwner: Web changed-suite detector
    cqRails: [SelectWebVitestChangedSuites]
    fowlerSignals: [Extract Function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing/vitestSuites.architecture.test.ts
    cypressCoverage: N/A - CI detector
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing/vitestSuites.architecture.test.ts]
  - name: GitOutputRunner
    path: apps/web/scripts/run-vitest-changed-suites.ts
    dddOwner: Web changed-suite detector
    cqRails: [SelectWebVitestChangedSuites]
    fowlerSignals: [Introduce Parameter Object]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing/vitestSuites.architecture.test.ts
    cypressCoverage: N/A - CI detector
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing/vitestSuites.architecture.test.ts]
  - name: ReadChangedFilesOptions
    path: apps/web/scripts/run-vitest-changed-suites.ts
    dddOwner: Web changed-suite detector
    cqRails: [SelectWebVitestChangedSuites]
    fowlerSignals: [Introduce Parameter Object]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing/vitestSuites.architecture.test.ts
    cypressCoverage: N/A - CI detector
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing/vitestSuites.architecture.test.ts]
  - name: tryGitOutput
    path: apps/web/scripts/run-vitest-changed-suites.ts
    dddOwner: Web changed-suite detector
    cqRails: [SelectWebVitestChangedSuites]
    fowlerSignals: [Extract Function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing/vitestSuites.architecture.test.ts
    cypressCoverage: N/A - CI detector
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing/vitestSuites.architecture.test.ts]
  - name: addChangedFiles
    path: apps/web/scripts/run-vitest-changed-suites.ts
    dddOwner: Web changed-suite detector
    cqRails: [SelectWebVitestChangedSuites]
    fowlerSignals: [Extract Function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing/vitestSuites.architecture.test.ts
    cypressCoverage: N/A - CI detector
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing/vitestSuites.architecture.test.ts]
```
