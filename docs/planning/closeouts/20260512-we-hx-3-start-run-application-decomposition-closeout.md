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
- Corrected the start-run protocol documentation so the adapter boundary matches
  the implemented `IProviderAdapter.startRun(planRef, context)` contract and
  runtime plan-material fetches revalidate `PlanRef.sha256`.
- Hardcut the duplicate DHM-named start-run decomposition artifacts so WE-HX-3
  remains the only active feature identity for this command path.
- Strengthened the architecture guard to parse structured
  `feature-mechanization` data instead of relying on proposal prose.
- Implemented the QA hardening plan in
  `buzon/20260515-codex-we-hx-3-qa-hardening-tasks.md`: extracted
  feature-mechanization parsing from the CLI script, split semantic architecture
  checks from documentation-pack checks, added a structured
  `component-doc-contract`, and removed stale manifest entries for the retired
  broad document assertions.
- Corrected the feature-mechanization implementation checker so symbols added
  and then removed inside the same branch diff do not require stale manifest
  entries in the final tree.

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
- QA/Fowler fix:
  `pnpm exec markdownlint-cli2 "docs/architecture/components/engine/contracts/engine/StartRunProtocol.v1.md"`,
  `pnpm docs:feature-mechanization:implementation`, and `git diff --check`
  passed after correcting the adapter-input wording.
- Hardcut guard:
  `pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts`
  failed red while both the previous DHM-named slice and the current WE-HX-3
  slice claimed start-run decomposition, then passed after removing the
  DHM-named active artifacts.
- QA hardening red/green:
  `node --test scripts/feature-mechanization-manifest.test.cjs` failed red when
  the parser module did not exist, then passed after adding the stable parser
  module and parser tests.
- QA documentation-pack red/green:
  `pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts`
  failed red while the component guide lacked the structured
  `component-doc-contract`, then passed after adding the contract and doc-pack
  guard.
- QA combined guards:
  `pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts`
  passed with semantic and documentation-pack responsibilities split.
- Feature-mechanization parser and manifest:
  `pnpm docs:feature-mechanization -- --feature WE-HX-3-START-RUN-DECOMPOSITION`
  and `pnpm docs:feature-mechanization:implementation` passed after the plan
  declared the new parser, documentation-pack guard, and stable doc contract
  symbols.

## ADR Decision

No new ADR is required. The slice preserves public contracts and implements the
existing ADR-backed direction for engine-owned execution semantics, event
sourcing, plan integrity, provider adapter ownership, and pre-dispatch intent
logging.

## No-Debt And No-Stub Evidence

- No public `IWorkflowEngine` or `StartRunBoundary` contract was changed.
- No compatibility alias or historic DHM restoration was added.
- No placeholder adapter, fake success path, or temporary bypass was added.
- No lint, type, test, docs, ARC, or hook rule was relaxed.
- No TODO/FIXME marker was added.
