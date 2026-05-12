---
title: WE-HX-3 start-run application decomposition closeout
status: Accepted
owner: Architecture / Engine
last_reviewed: 2026-05-12
planning_type: closeout
---

# WE-HX-3 Start-Run Application Decomposition Closeout

## Governing Sources

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md`
- `docs/architecture/components/engine/contracts/engine/StartRunProtocol.v1.md`
- `docs/architecture/components/engine/architecture/workflow-engine-target-architecture.v1.md`
- `ADR-0003`, `ADR-0004`, `ADR-0012`, `ADR-0014`, `ADR-0030`, `ADR-0034`

## Think-First Analysis

`WE-HX-3` is a decomposition slice, not a public contract change. The root
problem was that `StartRunApplicationService` still mixed phase orchestration
with two phase implementations: scoped plan integrity wiring and deterministic
intent creation. Mature service-layer systems keep the coordinator thin and
make each phase independently testable.

The command rail remains the existing engine start-run command:
`IWorkflowEngine.startRun(planRef, context)`. No parallel command, query, route,
service name, or public DTO is introduced.

## Planning Matrix

| Scenario                      | Opportunity             | Fowler pattern                 | DDD owner                           | Command/query rail                          | Implementation surfaces                     | Unit/package test                          | Architecture test                                       | Out of scope                  |
| ----------------------------- | ----------------------- | ------------------------------ | ----------------------------------- | ------------------------------------------- | ------------------------------------------- | ------------------------------------------ | ------------------------------------------------------- | ----------------------------- |
| pre-dispatch admission        | responsibility overload | Service Layer + Policy Object  | start-run admission phase           | existing `IWorkflowEngine.startRun` command | `StartRunAdmissionService`                  | `StartRunApplicationDecomposition.test.ts` | `startRunApplicationDecomposition.architecture.test.ts` | provider seam standardization |
| deterministic intent creation | hidden authority        | Domain Service / Policy Object | start-run intent phase              | existing `IWorkflowEngine.startRun` command | `StartRunIntentService`                     | `StartRunApplicationDecomposition.test.ts` | `startRunApplicationDecomposition.architecture.test.ts` | intent-store schema changes   |
| dispatch and failure routing  | duplicate semantics     | Service Layer delegation       | dispatch and failure phase services | existing `IWorkflowEngine.startRun` command | `StartRunApplicationService`                | existing start-run service tests           | `startRunApplicationDecomposition.architecture.test.ts` | new runtime behavior          |
| documentation and drift guard | documentation drift     | Architecture fitness function  | engine architecture pack            | none - documentation/fitness only           | component guide, stories, mailbox, closeout | n/a                                        | `startRunApplicationDecomposition.architecture.test.ts` | new ADR                       |

## Work Performed

- Added `StartRunAdmissionService` for pre-dispatch admission, provider
  resolution, scoped plan integrity, and capability checks.
- Added `StartRunIntentService` for deterministic pre-dispatch intent creation.
- Updated `StartRunApplicationService` to orchestrate named phases instead of
  implementing scoped plan integrity and intent creation directly.
- Added behavior tests proving admission and intent creation are independently
  testable.
- Added a semantic architecture test that rejects ownership drift back into the
  application coordinator and requires docs/stories/buzon coverage.
- Added component guide, user stories, and Fowler mailbox analysis for WE-HX-3.
- Added owned-concern module headers for start-run phase modules.

## Validation Evidence

- Red:
  `pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts test/services/StartRunApplicationDecomposition.test.ts`
  failed because the new phase services, docs, and semantic split were missing.
- Green behavior:
  `pnpm --filter @dvt/engine test -- test/services/StartRunApplicationDecomposition.test.ts`
  passed with 2 tests.
- Green architecture:
  `pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts`
  passed with 3 tests.
- Combined new tests:
  `pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts test/services/StartRunApplicationDecomposition.test.ts`
  passed with 5 tests.
- Typecheck:
  `pnpm --filter @dvt/engine typecheck` passed.
- Engine package:
  `pnpm --filter @dvt/engine test` passed with 51 test files and 395 tests.
- Focused lint:
  `pnpm exec eslint <touched engine TypeScript files> --max-warnings 0`
  passed.
- Docs:
  `pnpm docs:status:check`, `pnpm docs:arc:evidence:check`, and
  `pnpm docs:quality:check` passed. `docs:quality:check` emitted existing
  non-English-content warnings unrelated to this slice.

## ADR Decision

No new ADR is required. The slice preserves public contracts and implements the
existing ADR-backed direction for engine-owned execution semantics, event
sourcing, plan integrity, provider adapter ownership, and pre-dispatch intent
logging.

## No-Debt And No-Stub Evidence

- No public `IWorkflowEngine` or `StartRunBoundary` contract was changed.
- No placeholder adapter, fake success path, or temporary bypass was added.
- No lint, type, test, docs, ARC, or hook rule was relaxed.
- No TODO/FIXME marker was added.
