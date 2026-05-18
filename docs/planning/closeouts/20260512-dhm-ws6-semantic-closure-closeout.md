---
title: DHM-WS6 semantic closure closeout
status: Accepted
owner: Architecture / Engine
last_reviewed: 2026-05-12
planning_type: closeout
---

# DHM-WS6 Semantic Closure Closeout

## Think-First Analysis

DHM-WS6 closes the final modularization stream after WS2, WS3, and WS4 landed.
The preceding slices improved runtime composition, start-run phase ownership,
and cancel/signal role separation. The residual gap was not another runtime
behavior extraction. It was semantic encapsulation: the branch needed one
component record, owned concern headers, and a semantic architecture guard that
could detect future drift across the full modularization stream.

## Root Cause

The previous slices were implemented correctly but locally. Each had a focused
guide and test. That left a cross-slice review cost: a maintainer had to read
multiple files to understand which component owned API composition, facade
adaptation, start-run phases, runtime control, and compatibility delegation.

## Selected Option

Add a DHM-WS6 semantic closure layer:

- module-owned concern headers on composition and compatibility seams;
- one component guide with API, invariants, transitions, consumers, diagrams,
  and drift guards;
- one user story set covering all closure scenarios;
- one semantic architecture guard that validates owned concerns, runtime
  authority placement, documentation, and mailbox evidence.

## TDD Evidence

- RED:
  `pnpm --filter @dvt/engine exec vitest run test/architecture/workflowEngineSemanticClosure.architecture.test.ts`
  failed because `intentReconcilerRuntime.ts` did not declare `@ownedConcern`
  and the DHM-WS6 component guide did not exist.
- GREEN:
  `pnpm --filter @dvt/engine exec vitest run test/architecture/workflowEngineSemanticClosure.architecture.test.ts`
  passed with 1 file and 3 tests after adding owned-concern headers, the
  semantic closure component guide, user stories, mailbox analysis, and the
  closeout record.

## Work Performed

- Added `workflowEngineSemanticClosure.architecture.test.ts` as a cross-slice
  semantic architecture guard.
- Added owned concern headers to API composition and engine compatibility
  surfaces that previously relied on filename context.
- Clarified command and signal role-interface owned concerns.
- Added the DHM-WS6 Fowler mailbox analysis.
- Added the WorkflowEngine semantic closure component guide with API,
  invariants, transitions, consumers, component grouping, diagrams, and drift
  guards.
- Added DHM-WS6 user stories and scenario coverage.
- Added ARC-2 evidence and a risk-register entry for the engine-scope change.
- Updated the WorkflowEngine architecture index and hexagonal derivation plan.

## Validation Evidence

- `pnpm --filter @dvt/engine exec vitest run test/architecture/workflowEngineSemanticClosure.architecture.test.ts`
  - RED first, then GREEN with 1 file and 3 tests.
- `pnpm --filter @dvt/engine exec vitest run test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts test/architecture/workflowEngineStartRunDecomposition.architecture.test.ts test/architecture/startRunApplicationDecomposition.architecture.test.ts test/architecture/workflowEngineSemanticClosure.architecture.test.ts`
  - Passed with 4 files and 13 tests.
- `pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts`
  - Passed with 1 file and 3 tests.
- `pnpm --filter @dvt/engine typecheck`
  - Passed.
- `pnpm --filter dvt-api typecheck`
  - Passed.
- `pnpm docs:feature-mechanization -- --feature DHM-WS6-SEMANTIC-CLOSURE`
  - Passed.
- `pnpm docs:feature-mechanization:implementation`
  - Passed.
- `pnpm lint`
  - Passed.
- `pnpm lint:md:changed`
  - Failed first on extra blank lines in new Markdown files, then passed after
    cleanup.
- `pnpm docs:arc:evidence:check`
  - Passed.
- `pnpm docs:status:generate`
  - Passed and updated generated code state.
- `pnpm docs:sync`
  - Passed and regenerated evidence/risk indexes.
- `pnpm governance:refresh`
  - Passed and stabilized generated governance surfaces after two passes.

## Command And Query Rail Impact

No new externally observable command or query rail is introduced. DHM-WS6
documents and guards the existing rails:

- API runtime composition command rail for engine/reconciler construction.
- `IWorkflowEngine.startRun` command rail.
- runtime cancel command rail through `IRunCommandService`.
- runtime signal command rail through `IRunSignalService`.
- status query rail through `IRunStatusQueryService`.

## Debt And Stub Evidence

No planned debt, placeholders, fake adapters, fake success paths, TODO markers,
or rule downgrades are part of this slice.

## 2026-05-18 Hardening Addendum

After `DHM-WS2` was integrated, the reconciler runtime split became stricter:
`intentReconcilerRuntime.ts` is now only the public facade and
`intentReconcilerRuntimeComposition.ts` owns concrete API-side assembly. The
first DHM-WS6 guard failed because it still expected concrete assembly in the
facade. This closeout is accepted with the hardening pass that updated the
guard, component guide, user stories, evidence, risk register, and mailbox
analysis to match the current system.

Additional validation evidence for the addendum:

- RED:
  `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineSemanticClosure.architecture.test.ts`
  failed because the guard still expected composition ownership in
  `intentReconcilerRuntime.ts`.
- GREEN:
  `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineSemanticClosure.architecture.test.ts`
  passed after the guard and docs modeled the facade/composition split.
