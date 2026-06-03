---
title: Fowler analysis - AR-C1-T4 API snapshot fixture
status: Active
owner: codex
last_reviewed: 2026-05-14
---

# Fowler analysis - AR-C1-T4 API snapshot fixture

## Owned concern

`AR-C1-T4` removes duplicate API-test semantics for admin rebuild workflow
snapshots. The current owner is
`apps/api/test/fixtures/workflowSnapshotFixture.ts`.

## Opportunity

The root issue is not a missing helper. A generic fixture name allowed route and
contract tests to treat workflow snapshot shape construction as local knowledge.
That is `Duplicate semantics` and `Test-only confidence`: tests could pass while
future test files copied the snapshot contract shape directly or versioned it
away from the current contract constant.

## Fowler posture

- Refactoring: Replace generic test fixture API with an intention-revealing
  factory.
- Pattern: Test Data Builder with a single semantic owner.
- DDD owner: admin rebuild snapshot test fixture, backed by the engine
  maintenance port result type.
- Command/query rail: none - internal test fixture only. The external rail
  remains `POST /admin/runs/:runId/rebuild-snapshot`.
- Compatibility posture: hard cut. `makeWorkflowSnapshot` is removed rather
  than aliased.

## Planning matrix

| scenario                                                          | opportunity          | Fowler pattern                         | DDD owner                            | command/query rail                 | implementation surfaces                                                                                     | unit or package test                                                                                                                                                                                        | architecture test                                                                                 | user-flow test | out of scope                              |
| ----------------------------------------------------------------- | -------------------- | -------------------------------------- | ------------------------------------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------- |
| Admin route and contract tests need workflow snapshot test data   | Duplicate semantics  | Test Data Builder                      | admin rebuild snapshot fixture       | none - internal test fixture only  | `apps/api/test/fixtures/workflowSnapshotFixture.ts`, admin route tests, admin rebuild access contract tests | `pnpm --filter dvt-api test -- test/entrypoints/http/adminRoutes.test.ts test/contracts/adminRebuildSnapshotAccessContract.test.ts test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts` | `apps/api/test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts`                | none           | production route behavior                 |
| Future API tests must not construct `WorkflowSnapshot` shape data | Test-only confidence | Semantic architecture fitness function | admin rebuild snapshot fixture owner | none - internal architecture guard | `apps/api/test/architecture/workflowSnapshotFixtureSemantics.architecture.test.ts`                          | same as above                                                                                                                                                                                               | forbids `CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION` and `makeWorkflowSnapshot` outside the fixture | none           | integration database or Temporal behavior |

## Result

The slice introduces a hard-cut semantic fixture API:
`makeAdminRebuildWorkflowSnapshot`. No legacy alias is retained. The
architecture test guards both the owned-concern docblock and the absence of
local snapshot builders outside the fixture owner.
