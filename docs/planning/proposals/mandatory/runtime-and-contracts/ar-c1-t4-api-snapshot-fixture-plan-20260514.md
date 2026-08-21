---
title: AR-C1-T4 API Snapshot Fixture Plan
status: Active
owner: Runtime / API / Docs
last_reviewed: 2026-05-14
planning_type: mandatory-proposal
---

# AR-C1-T4 API Snapshot Fixture Plan

## Think-First Analysis

`AR-C1-T4` asks the API tests to stop embedding local `WorkflowSnapshot`
builders. The root problem is duplicate semantic authority in tests: route and
contract tests can accidentally encode the snapshot schema shape instead of
using one owned fixture. That is a Fowler `Duplicate semantics` and
`Test-only confidence` signal.

The selected option is a hard cut. The fixture exposes only
`makeAdminRebuildWorkflowSnapshot`; the generic `makeWorkflowSnapshot` name is
removed instead of aliased. No new product command/query rail is introduced
because this is internal test data construction. The external rail remains
`POST /admin/runs/:runId/rebuild-snapshot`.

## Corrective Workflow Note

The first implementation pass reached `pnpm verify:prepush` before this
mechanization manifest existed. The gate caught the drift. This proposal is the
corrective canonical declaration for the slice and the implementation gate is
rerun after the manifest is present.

## Fowler Matrix

| Scenario                                                      | Opportunity          | Fowler pattern                         | DDD owner                      | Command/query rail                 | Implementation surfaces                  | Architecture test                                       | Out of scope              |
| ------------------------------------------------------------- | -------------------- | -------------------------------------- | ------------------------------ | ---------------------------------- | ---------------------------------------- | ------------------------------------------------------- | ------------------------- |
| Admin rebuild tests need current workflow snapshot data       | Duplicate semantics  | Test Data Builder                      | admin rebuild snapshot fixture | none - internal test fixture only  | API test fixture and admin rebuild tests | `workflowSnapshotFixtureSemantics.architecture.test.ts` | production route behavior |
| Future tests must not rebuild workflow snapshot shape locally | Test-only confidence | Semantic architecture fitness function | admin rebuild snapshot fixture | none - internal architecture guard | API architecture test                    | `workflowSnapshotFixtureSemantics.architecture.test.ts` | integration DB behavior   |

## Feature Mechanization

```feature-mechanization
version: 1
featureId: AR-C1-T4-API-SNAPSHOT-FIXTURE
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/ar-c1-t4-api-snapshot-fixture-plan-20260514.md
componentGuides:
  - apps/api/test/fixtures/workflowSnapshotFixture.ts
userStories:
  - buzon/20260514-codex-fowler-ar-c1-t4-snapshot-fixture-analysis.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/proposals/mandatory/runtime-and-contracts/lane-c-review-state-reconciliation-20260506.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/runtime-and-contracts/ar-c1-t4-api-snapshot-fixture-plan-20260514.md
  - docs/planning/index.md
  - docs/planning/proposals/index.md
  - apps/api/test/fixtures/workflowSnapshotFixture.ts
  - apps/api/test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
  - apps/api/test/entrypoints/http/adminRoutes.test.ts
  - apps/api/test/contracts/adminRebuildSnapshotAccessContract.test.ts
  - buzon/20260514-codex-fowler-ar-c1-t4-snapshot-fixture-analysis.md
forbiddenImplementationSurfaces:
  - apps/api/src/**
  - apps/web/**
  - packages/**
  - specs/**
  - tools/**
  - scripts/**
commandQueryRails:
  - name: AdminRebuildSnapshotTestFixture
    type: query
    dddOwner: admin rebuild snapshot fixture
domainObjects:
  - name: AdminRebuildSnapshotFixture
    type: test data builder
    owner: apps/api/test/fixtures/workflowSnapshotFixture.ts
fowlerSignals:
  - Duplicate semantics
  - Test-only confidence
architectureGuards:
  - pnpm --filter dvt-api test -- test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - API test fixture only
completionGate:
  - pnpm docs:feature-mechanization -- --feature AR-C1-T4-API-SNAPSHOT-FIXTURE
  - pnpm --filter dvt-api test -- test/entrypoints/http/adminRoutes.test.ts test/contracts/adminRebuildSnapshotAccessContract.test.ts test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
  - pnpm --filter dvt-api typecheck
  - pnpm verify:prepush
redGreenCycles:
  - id: workflow-snapshot-fixture-semantic-owner
    redTest: pnpm --filter dvt-api test -- test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
    expectedFailure: fixture lacks owned concern and still exports makeWorkflowSnapshot
    patchSurfaces:
      - apps/api/test/fixtures/workflowSnapshotFixture.ts
      - apps/api/test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
    greenTest: pnpm --filter dvt-api test -- test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
  - id: admin-rebuild-tests-use-current-fixture-api
    redTest: pnpm --filter dvt-api test -- test/entrypoints/http/adminRoutes.test.ts test/contracts/adminRebuildSnapshotAccessContract.test.ts test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
    expectedFailure: admin route and contract tests still import makeWorkflowSnapshot
    patchSurfaces:
      - apps/api/test/entrypoints/http/adminRoutes.test.ts
      - apps/api/test/contracts/adminRebuildSnapshotAccessContract.test.ts
      - apps/api/test/fixtures/workflowSnapshotFixture.ts
    greenTest: pnpm --filter dvt-api test -- test/entrypoints/http/adminRoutes.test.ts test/contracts/adminRebuildSnapshotAccessContract.test.ts test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
symbols:
  - name: API_TEST_ROOT
    path: apps/api/test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
    dddOwner: AdminRebuildSnapshotFixture
    cqRails: [AdminRebuildSnapshotTestFixture]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter dvt-api test -- test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
    cypressCoverage: N/A - API test fixture only
    unitTests: [pnpm --filter dvt-api test -- test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts]
  - name: SNAPSHOT_FIXTURE_PATH
    path: apps/api/test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
    dddOwner: AdminRebuildSnapshotFixture
    cqRails: [AdminRebuildSnapshotTestFixture]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter dvt-api test -- test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
    cypressCoverage: N/A - API test fixture only
    unitTests: [pnpm --filter dvt-api test -- test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts]
  - name: ARCHITECTURE_TEST_PATH
    path: apps/api/test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
    dddOwner: AdminRebuildSnapshotFixture
    cqRails: [AdminRebuildSnapshotTestFixture]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter dvt-api test -- test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
    cypressCoverage: N/A - API test fixture only
    unitTests: [pnpm --filter dvt-api test -- test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts]
  - name: SNAPSHOT_SCHEMA_IMPORT
    path: apps/api/test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
    dddOwner: AdminRebuildSnapshotFixture
    cqRails: [AdminRebuildSnapshotTestFixture]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter dvt-api test -- test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
    cypressCoverage: N/A - API test fixture only
    unitTests: [pnpm --filter dvt-api test -- test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts]
  - name: CANONICAL_FACTORY_NAME
    path: apps/api/test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
    dddOwner: AdminRebuildSnapshotFixture
    cqRails: [AdminRebuildSnapshotTestFixture]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter dvt-api test -- test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
    cypressCoverage: N/A - API test fixture only
    unitTests: [pnpm --filter dvt-api test -- test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts]
  - name: LEGACY_FACTORY_NAME
    path: apps/api/test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
    dddOwner: AdminRebuildSnapshotFixture
    cqRails: [AdminRebuildSnapshotTestFixture]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter dvt-api test -- test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
    cypressCoverage: N/A - API test fixture only
    unitTests: [pnpm --filter dvt-api test -- test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts]
  - name: collectTypeScriptTestFiles
    path: apps/api/test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
    dddOwner: AdminRebuildSnapshotFixture
    cqRails: [AdminRebuildSnapshotTestFixture]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter dvt-api test -- test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
    cypressCoverage: N/A - API test fixture only
    unitTests: [pnpm --filter dvt-api test -- test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts]
  - name: testPath
    path: apps/api/test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
    dddOwner: AdminRebuildSnapshotFixture
    cqRails: [AdminRebuildSnapshotTestFixture]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter dvt-api test -- test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
    cypressCoverage: N/A - API test fixture only
    unitTests: [pnpm --filter dvt-api test -- test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts]
  - name: makeAdminRebuildWorkflowSnapshot
    path: apps/api/test/fixtures/workflowSnapshotFixture.ts
    dddOwner: AdminRebuildSnapshotFixture
    cqRails: [AdminRebuildSnapshotTestFixture]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter dvt-api test -- test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts
    cypressCoverage: N/A - API test fixture only
    unitTests: [pnpm --filter dvt-api test -- test/entrypoints/http/adminRoutes.test.ts test/contracts/adminRebuildSnapshotAccessContract.test.ts test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts]
```
