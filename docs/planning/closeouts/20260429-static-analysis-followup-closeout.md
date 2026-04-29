---
title: Static Analysis Follow-Up Closeout
status: Accepted
date: 2026-04-29
owners:
  - Frontend
  - Engine
  - Architecture
planning_type: closeout
---

# Static Analysis Follow-Up Closeout

## Think-First Analysis

Problem summary: the static-analysis panel still reports a mixed set of issues:
some are stale in the current branch, while others identify real local
structure problems in architecture tests, projection tests, and engine
application helpers.

Root cause: the previous cleanup focused on bootstrap presentation separation.
The review surface is broader than that slice and includes old warnings from
before the branch plus active warnings in nearby web and engine files.

Constraints and invariants:

- `AGENTS.md` requires governance-first execution, validation evidence, no
  hidden debt, and no hook bypasses.
- `docs/guides/ai-work-protocol.md` classifies this as Slim maintenance unless
  a touched path triggers ARC-2.
- `docs/architecture/reference-architecture.md` requires explicit boundaries
  and one runtime truth per boundary.
- `.arc-policy.yaml` and `AGENTS.md` require ARC-2 evidence and risk updates if
  this slice touches `packages/@dvt/engine/**`.

Options considered:

- Patch every warning shown in the screenshot literally. Rejected because
  several `appBootstrapScreen.test.ts` warnings are stale in the current branch:
  the file already uses `replaceAll`, `String.raw`, `RegExp.exec`, and
  `.dataset` where the screenshot points.
- Limit the slice to bootstrap. Rejected because the repeated screenshot asks
  for the active panel, not just the original bootstrap file.
- Verify each path and fix only active, code-backed issues. Selected because it
  avoids fake churn while still closing real static-analysis debt.

Selected option and rationale: keep stale warnings documented as verified,
then refactor active warnings through semantic helpers, smaller tests, and
typed parameter objects without changing runtime behavior.

## Pre-Implementation Brief

Mode: Slim with ARC-2 evidence if engine files are changed.

Scope:

- Verify stale bootstrap warnings against the current branch.
- Reduce active web static-analysis findings in architecture/projection tests.
- If engine findings remain active after verification, refactor with typed
  request objects and add ARC-2 evidence/risk records.

Out of scope:

- Changing product behavior.
- Relaxing static-analysis, lint, type, or test rules.
- Adding compatibility shims or placeholder implementations.

Validation plan:

- Targeted web tests for changed web architecture/projection files.
- Targeted engine tests if `packages/@dvt/engine/**` changes.
- Package typechecks for touched workspaces.
- `pnpm docs:status:generate` and `pnpm docs:sync` for new docs/source files.
- `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs` if engine
  paths are touched.
- `pnpm lint`
- `pnpm verify:prepush`

## Implementation Outcome

- Verified the repeated `appBootstrapScreen.test.ts` findings as stale in the
  current branch. The file already uses `replaceAll`, `String.raw`,
  `RegExp.exec`, and `.dataset` for the locations shown by the panel.
- Split high-complexity architecture-test regexes into smaller named patterns
  and helper functions in `queryKeyPolicy.architecture.test.ts`.
- Moved the large canonical semantic graph expectation out of the test body in
  `workspaceGraphDraftProjection.test.ts`, keeping the test method focused on
  the behavior under test.
- Normalized the retired-route term patterns in
  `canvasStartupAndDraftRecovery.architecture.test.ts` to consistently use
  `String.raw`.
- Changed `IRunRecoveryService` to accept a typed `RecoverRunServiceRequest`
  while preserving the public `WorkflowEngine.recoverRun(sourceRunId, planRef,
context)` facade.
- Split default engine error-message rendering into named renderer functions
  behind the existing exhaustive renderer registry.

## Validation Evidence

- `pnpm --filter @dvt/web typecheck`: passed.
- `pnpm --filter @dvt/engine typecheck`: passed.
- `pnpm --filter @dvt/web test -- queryKeyPolicy.architecture.test.ts workspaceGraphDraftProjection.test.ts canvasStartupAndDraftRecovery.architecture.test.ts appBootstrapScreen.test.ts appBootstrapPresentation.test.ts`:
  passed with 38 tests.
- `pnpm --filter @dvt/engine test -- WorkflowEngine.test.ts WorkflowEngine.planRef.test.ts errorI18n.contract.test.ts`:
  passed with 36 tests.
- `pnpm --filter @dvt/web test`: passed. The suite still emits existing React
  `act(...)` warnings around React Flow/MiniMap and CanvasContent, but no test
  failed.
- `pnpm --filter @dvt/engine test`: passed with 42 files and 363 tests.

## ARC-2 Evidence

- Updated `docs/evidence/ed-20260429-engine-static-analysis-cleanup.md`.
- Updated `docs/risk-register/quality/R-20260429-ENGINE-STATIC-ANALYSIS-CLEANUP.yaml`.

## No-Debt Statement

No stubs, placeholders, TODO/FIXME markers, fake implementations, hook bypasses,
or rule relaxations were introduced.

## 2026-04-29 Editor Panel Follow-Up

### Think-First Analysis

Problem summary: after PR #1048 landed, the editor static-analysis panel still
shows 14 warnings. Several point to line numbers that no longer exist on
`main`, while a smaller subset still maps to real code in web and
temporal-worker files.

Root cause: the panel mixes stale diagnostics from the pre-merge branch state
with current findings. Treating the screenshot literally would rework already
integrated engine code and create churn; treating it as a verification queue
allows the active warnings to be fixed without touching unrelated boundaries.

Constraints and invariants:

- `AGENTS.md` requires governance-first execution, no hidden debt, and real
  validation evidence.
- `docs/guides/ai-work-protocol.md` classifies this as Slim maintenance because
  the selected fixes do not alter public behavior.
- `.arc-policy.yaml` only triggers ARC-2 for package engine, contracts,
  planner, state, or adapter paths. This follow-up avoids those stale package
  diagnostics unless code reality shows they are still active.

Options considered:

- Reopen engine and adapter package files for every screenshot warning.
  Rejected because the current files no longer match those line numbers or
  shapes after PR #1048 and the Temporal refactor already in `main`.
- Clear only editor cache. Rejected because some warnings are still code-backed.
- Fix only active code-backed warnings in web and temporal-worker. Selected
  because it reduces real static-analysis noise without introducing behavioral
  drift.

Selected option and rationale: refactor current web test assertions into named
semantic helpers, replace a promise truthiness check with explicit nullish
handling, and remove an unnecessary generic assertion from viewport comparison.

### Pre-Implementation Brief

Mode: Slim.

Scope:

- `apps/temporal-worker/src/runtime/temporalWorkerLifecycle.ts`
- `apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts`
- `apps/web/src/app/bootstrap/appBootstrapScreen.test.ts`

Out of scope:

- Reworking package engine files whose warnings are stale on current `main`.
- Changing runtime behavior or public APIs.
- Relaxing lint, type, test, or static-analysis rules.

Validation plan:

- Targeted web bootstrap and viewport tests.
- Temporal-worker typecheck.
- Web typecheck.
- `pnpm lint`
- `pnpm verify:prepush`

### Implementation Outcome

- Verified `createTemporalWorkerRuntime.ts`, `StartRunAdmissionGuard.ts`,
  `RecoverRunApplicationService.ts`, and `errorMessages.ts` against current
  `main`; the screenshot line numbers no longer match those files after the
  integrated PRs, so those diagnostics are stale editor state.
- Replaced promise truthiness in `temporalWorkerLifecycle.ts` with an explicit
  nullish check before awaiting pending startup.
- Replaced the generic array assertion in `useCanvasViewportGraphModel.ts` with
  a checked ordered-array lookup helper.
- Split the two long bootstrap DOM contract tests into named helper assertions
  so the tests express semantic contracts rather than large inline DOM scripts.

### Validation Evidence

- `pnpm --filter @dvt/web test -- appBootstrapScreen.test.ts useCanvasViewportGraphModel.test.ts useCanvasViewportGraphModel.architecture.test.ts`:
  passed with 3 files and 16 tests.
- `pnpm --filter dvt-temporal-worker test -- createTemporalWorkerRuntime.test.ts createTemporalWorkerRuntime.srp.architecture.test.ts`:
  passed with 2 files and 12 tests.
- `pnpm --filter @dvt/web typecheck`: passed after adding the checked
  ordered-array lookup helper.
- `pnpm --filter dvt-temporal-worker typecheck`: passed.
- `pnpm --filter @dvt/web test`: passed. The existing React `act(...)`
  warnings around React Flow/MiniMap and CanvasContent still appear, but no test
  failed.
- `pnpm --filter dvt-temporal-worker test`: passed with 5 files and 22 tests.
- `pnpm lint`: passed with `--max-warnings 0`.
