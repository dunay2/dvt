---
title: F-14 Frontend Test Governance Plan
status: Accepted
date: 2026-05-18
last_reviewed: 2026-05-18
owners:
  - apps/web
---

# F-14 Frontend Test Governance Plan

## Think-First Analysis

Problem summary: `@dvt/web` already has many Vitest files and a suite catalog,
but CI still makes the web test lane easy to miss because the web run is nested
inside the generic `Run Tests` job. Test support also needs explicit component
documentation so harnesses and doubles remain test-only infrastructure.

Root cause: suite partition work improved local commands, but the package-level
test command, CI job topology, docs, and planning language were not closed as
one component boundary.

Constraints and invariants:

- The suite catalog owns suite semantics.
- CI must use root commands from `package.json`.
- Test-support files are not production adapters.
- This slice cannot change product runtime behavior.

Options considered:

- Keep the existing generic `Run Tests` step only. Rejected because reviewers
  still cannot see web test status as a first-class frontend lane.
- Add ad hoc route-specific commands. Rejected because it duplicates suite
  taxonomy and undermines F-14-A.
- Add a named `Web Frontend Tests` job backed by `pnpm test:web:ci`. Selected
  because it exposes the web lane while preserving the existing suite catalog.

## Pre-Implementation Brief

Mode: Full.

Scope:

- Add semantic architecture guards for the web test governance boundary.
- Add the dedicated `Web Frontend Tests` CI job.
- Add local component and user-story docs.
- Update roadmap language that previously said the governed path was absent.

Out of scope:

- Changed-file-to-suite routing. That belongs to F-14-A.
- Cypress browser-lane refactoring.
- Product behavior changes.
- Changed-suite selection inside `@dvt/web`; this slice only routes governed
  web test governance docs to the existing web frontend test lane.

Validation plan:

- `pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts`
- `pnpm test:ci-tools`
- `node --test tools/ci/emit-scope.test.mjs`
- `pnpm --filter @dvt/web test:architecture`
- `pnpm lint:md:changed`
- `pnpm docs:feature-mechanization:implementation`
- `pnpm governance:refresh`
- `pnpm verify:prepush`

## Fowler Opportunity Matrix

<!-- markdownlint-disable MD060 -->

| Scenario                         | Opportunity              | Pattern                   | DDD owner                    | Rail                       | Tests                                |
| -------------------------------- | ------------------------ | ------------------------- | ---------------------------- | -------------------------- | ------------------------------------ |
| Web tests hidden in generic job  | Boundary drift           | Dedicated CI lane         | Frontend test governance     | WebVitestSuitePartition    | `vitestSuites.architecture.test.ts`  |
| Suite rules duplicated by config | Duplicate semantics      | Suite Catalog             | `WebVitestSuiteCatalog`      | WebVitestSuitePartition    | `test:architecture`, `test:ci-tools` |
| Harnesses look like source       | Test-support ambiguity   | Test Support Boundary     | `apps/web/src/testing/**`    | WebVitestSuitePartition    | Component-doc architecture guard     |
| Future suite routing risk        | Premature specialization | Extension point, not fork | F-14-A changed-suite routing | Future changed-suite query | Out of scope for this slice          |

<!-- markdownlint-enable MD060 -->

```feature-mechanization
version: 1
featureId: F14-FRONTEND-TEST-GOVERNANCE-20260518
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f14-frontend-test-governance-plan-20260518.md
componentGuides:
  - docs/architecture/components/web/frontend-test-governance-component.md
userStories:
  - docs/architecture/components/web/frontend-test-governance-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/guides/ai-work-protocol.md
allowedImplementationSurfaces:
  - .github/workflows/test.yml
  - apps/web/vitest*.ts
  - apps/web/src/testing/vitestSuites.architecture.test.ts
  - tools/ci/scope-config.mjs
  - tools/ci/emit-scope.test.mjs
  - buzon/20260518-f14-fowler-frontend-test-governance-analysis.md
  - docs/architecture/components/web/index.md
  - docs/architecture/components/web/frontend-test-governance-component.md
  - docs/architecture/components/web/frontend-test-governance-user-stories.md
  - docs/planning/closeouts/20260518-f14-frontend-test-governance-closeout.md
  - docs/planning/proposals/mandatory/frontend-and-ux/f14-frontend-test-governance-plan-20260518.md
  - docs/planning/proposals/nice-to-have/frontend-and-ux/frontend-roadmap-20260219.md
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
domainObjects:
  - name: WebVitestSuiteCatalog
    type: test execution catalog
    owner: apps/web
  - name: WebFrontendTestLane
    type: CI lane
    owner: .github/workflows/test.yml
fowlerSignals:
  - Boundary drift
  - Duplicate semantics
  - Test-only confidence
  - Documentation drift
architectureGuards:
  - pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
cypressFlows:
  - N/A - F-14 governs Vitest and CI lane topology only.
completionGate:
  - pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
  - pnpm test:ci-tools
  - pnpm --filter @dvt/web test:architecture
  - pnpm governance:refresh
  - pnpm verify:prepush
redGreenCycles:
  - id: f14-web-ci-lane
    redTest: pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
    expectedFailure: test.yml does not contain web-frontend-tests and docs are missing.
    patchSurfaces:
      - .github/workflows/test.yml
      - apps/web/src/testing/vitestSuites.architecture.test.ts
      - apps/web/vitest*.ts
      - docs/architecture/components/web/frontend-test-governance-component.md
      - docs/architecture/components/web/frontend-test-governance-user-stories.md
      - buzon/20260518-f14-fowler-frontend-test-governance-analysis.md
    greenTest: pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
  - id: f14-web-doc-scope
    redTest: node --test tools/ci/emit-scope.test.mjs
    expectedFailure: governed web test docs do not set any_test or web scope.
    patchSurfaces:
      - tools/ci/scope-config.mjs
      - tools/ci/emit-scope.test.mjs
    greenTest: node --test tools/ci/emit-scope.test.mjs
symbols:
  - name: WebFrontendTestLane
    path: .github/workflows/test.yml
    dddOwner: Frontend test governance
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
    cypressCoverage: N/A - CI topology only.
    unitTests: [pnpm test:ci-tools]
  - name: readRepoFile
    path: apps/web/src/testing/vitestSuites.architecture.test.ts
    dddOwner: Frontend test governance
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Documentation drift, Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
    cypressCoverage: N/A - architecture guard helper only.
    unitTests: [pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts]
  - name: WEB_FRONTEND_TEST_GOVERNANCE_PATTERNS
    path: tools/ci/scope-config.mjs
    dddOwner: Frontend test governance
    cqRails: [WebVitestSuitePartition]
    fowlerSignals: [Documentation drift, Boundary drift]
    architectureGuard: node --test tools/ci/emit-scope.test.mjs
    cypressCoverage: N/A - CI scope routing only.
    unitTests: [node --test tools/ci/emit-scope.test.mjs, pnpm test:ci-tools]
```
