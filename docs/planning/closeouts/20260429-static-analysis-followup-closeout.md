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

## 2026-04-29 Code Health Follow-Up

### Think-First Analysis

Problem summary: the latest editor and Code Health panels mix three categories
of feedback: active web static-analysis warnings, stale engine warnings whose
line shapes no longer match the branch, and code-health signals where the
current implementation can still be made more semantically explicit.

Root cause: the prior cleanup removed the largest bootstrap and engine smells,
but some public helper APIs still expose optional/positional primitive shapes,
some tests still keep fixture construction close to assertions, and one engine
admission policy still accepts a multi-argument command instead of a named
admission request.

Constraints and invariants:

- `AGENTS.md` requires governance-first execution, real validation evidence,
  no hidden debt, and no hook bypasses.
- `docs/guides/ai-work-protocol.md` classifies this as Slim maintenance unless
  ARC-triggered package paths are touched.
- `docs/architecture/reference-architecture.md` requires explicit boundaries
  and typed runtime truth at the boundary.
- `.arc-policy.yaml` requires ARC-2 evidence and a risk update when touching
  `packages/@dvt/engine/**` or `packages/@dvt/adapter-*/**`.

Options considered:

- Treat every screenshot line as current truth. Rejected because several
  diagnostics point to code shapes that no longer exist on the branch.
- Limit the slice to frontend warnings. Rejected because Code Health identifies
  a real engine admission API smell that can be fixed without changing
  behavior.
- Fix verified active items and explicitly document stale diagnostics. Selected
  because it reduces real drift while keeping ARC-triggered changes governed.

Selected option and rationale: normalize active web warnings, move bootstrap
command optionality to concrete factory output, split test fixture setup behind
named request objects, extract compiled-code-ref payload candidates, and convert
run-execution-context admission to a named request object.

### Pre-Implementation Brief

Mode: Slim with ARC-2 evidence/risk update for engine and adapter paths.

Scope:

- `apps/web/src/app/AppRouteErrorBoundary.tsx`
- `apps/web/src/app/bootstrap/appBootstrapCommands.ts`
- `apps/web/src/app/services/workspace/workspaceGraphDraft.test.fixtures.ts`
- `apps/web/src/app/services/workspace/workspaceGraphDraftProjection.test.ts`
- `packages/@dvt/adapter-temporal/test/activities.test.ts`
- `packages/@dvt/engine/src/application/StartRunAdmissionGuard.ts`
- `packages/@dvt/engine/src/services/startRun/RunExecutionContextAdmissionPolicy.ts`
- `packages/@dvt/engine/test/services/runExecutionContextAdmissionPolicy.fixtures.ts`
- `packages/@dvt/traceability-service/src/lineage/compiledCodeRef.ts`

Out of scope:

- Runtime behavior changes.
- Clearing stale editor cache entries by moving unrelated code.
- Introducing compatibility shims for the previous internal helper shapes.

Validation plan:

- Targeted web, engine, adapter-temporal, and traceability tests.
- Package typecheck for touched workspaces.
- ARC policy check after engine/adapter changes.
- `pnpm docs:sync` and `pnpm docs:status:generate` if generated indexes or
  source inventory change.
- `pnpm lint`
- `pnpm verify:prepush`

### Implementation Outcome

- Replaced the route-error-boundary `break-words` utility with the canonical
  `wrap-break-word` class.
- Removed redundant `? | undefined` command typing from app-bootstrap command
  DTOs while keeping factory output and startup behavior unchanged.
- Moved the large expected workspace semantic graph out of the projection test
  body and into the workspace draft test fixture builder.
- Split `compiledCodeRef` extraction into named payload candidates:
  `stepArtifactRef` compiled-SQL artifacts first, direct `compiledCodeRef`
  second.
- Converted `RunExecutionContextAdmissionPolicy.assertAllowed` to accept a
  named `RunExecutionContextAdmissionRequest` object and updated the guard and
  fixtures.
- Replaced positional `setupActivities(undefined, undefined, ...)` test calls
  in the Temporal adapter with named setup options.
- Updated ARC-2 evidence and risk entries to cover both engine and Temporal
  adapter paths touched by this follow-up.

### Validation Evidence

- `pnpm --filter @dvt/web typecheck`: passed.
- `pnpm --filter @dvt/engine typecheck`: passed.
- `pnpm --filter @dvt/adapter-temporal typecheck`: passed.
- `pnpm --filter @dvt/traceability-service typecheck`: passed.
- `pnpm --filter @dvt/web test -- appBootstrapCommands.test.ts workspaceGraphDraftProjection.test.ts canvasStartupAndDraftRecovery.architecture.test.ts`:
  passed with 15 tests.
- `pnpm --filter @dvt/traceability-service test -- compiledCodeRef.test.ts`:
  passed with 4 tests.
- `pnpm --filter @dvt/engine test -- RunExecutionContextAdmissionPolicy.acceptance.test.ts RunExecutionContextAdmissionPolicy.plugin-requirements.test.ts RunExecutionContextAdmissionPolicy.provenance.test.ts RunExecutionContextAdmissionPolicy.compatibility.test.ts`:
  passed with 20 tests.
- `pnpm --filter @dvt/adapter-temporal test -- activities.test.ts`: passed.
  The package script executed the non-integration Temporal adapter suite with
  25 files and 214 tests.
- `pnpm --filter @dvt/web test`: passed. The suite still emits existing React
  `act(...)` warnings around React Flow/MiniMap and CanvasContent, but no test
  failed.
- `pnpm --filter @dvt/engine test`: passed with 46 files and 370 tests.
- `pnpm --filter @dvt/traceability-service test`: passed with 11 files and 49
  tests.
- `pnpm docs:sync`: passed and regenerated
  `docs/risk-register/quality/index.md`.
- `pnpm docs:status:generate`: passed; generated code state was already up to
  date.

## 2026-04-29 Command API And Editor Panel Follow-Up

### Think-First Analysis

Problem summary: the editor still shows 21 warnings after the first local
follow-up. A direct source check shows the panel still includes stale
diagnostics, but it also identifies one real design smell in the bootstrap DOM
adapter API: startup state was published through positional string arguments.

Root cause: the bootstrap adapter was already split from the presentation model,
but its public command surface still exposed primitive string tuples. That kept
the call sites coupled to argument order and made tests repeat procedural DOM
scripts instead of named bootstrap commands.

Constraints and invariants:

- Keep the pre-React startup state machine behavior unchanged.
- Keep Canvas/workspace projection semantics unchanged.
- Do not touch ARC-triggered engine paths unless the current source proves the
  warning is active and worth the ARC-2 overhead.
- Keep documentation aligned with the new public component API.

Options considered:

- Clear all warnings by moving code around mechanically. Rejected because that
  would hide the root cause and risk moving smells into new files.
- Touch engine files from the screenshot. Rejected for this pass because the
  current engine files no longer match the screenshot line shapes; those
  diagnostics are stale relative to this branch.
- Convert bootstrap writes to typed command objects and simplify active web test
  helpers. Selected because it improves API semantics without behavior change.

### Pre-Implementation Brief

Mode: Slim.

Scope:

- `apps/web/src/app/bootstrap/appBootstrapScreen.ts`
- Bootstrap publishers in `main.tsx`, `AppProviders.tsx`, `Root.tsx`, and
  `AppRouteErrorBoundary.tsx`
- Active web static-analysis helpers in bootstrap/query/projection tests
- `docs/architecture/components/web/app-bootstrap-screen-component.md`

Out of scope:

- Engine ARC-2 refactors from stale editor diagnostics.
- Product behavior changes.
- Compatibility shims for the previous positional bootstrap API.

Validation plan:

- Targeted web typecheck.
- Targeted bootstrap/query/projection/canvas architecture tests.
- Root lint.
- Final `pnpm verify:prepush` after commit.

### Implementation Outcome

- Replaced positional `setBootstrapStepStatus(step, status, detail)` with a
  typed `BootstrapStepStatusCommand`.
- Replaced positional `showBootstrapFailure(message)` with a typed
  `BootstrapFailureCommand`.
- Added `appBootstrapCommands.ts` as the bootstrap domain-command owner. Shell
  publishers now emit named commands instead of assembling localized details or
  relying on tuple order.
- Added `appBootstrapCopy.ts` as the locale catalog for bootstrap titles,
  details, progress labels, and publisher fallback messages.
- Updated `appBootstrapPresentation.ts` so state transitions and progress
  snapshots consume copy instead of owning user-facing strings.
- Updated `bootstrapProgressBar.ts` so progress kicker, list label, and count
  copy come from the presentation snapshot instead of hardcoded English.
- Added `appRouteErrorBoundaryCopy.ts` so the route error boundary modified by
  the command API does not keep English UI copy in the component.
- Updated all bootstrap publishers and tests to use the typed command API.
- Removed the regex-heavy CSS selector escape helper from
  `appBootstrapScreen.test.ts`.
- Replaced the complex raw-capabilities fetch regex with whitespace-normalized
  string matching in `queryKeyPolicy.architecture.test.ts`.
- Removed unnecessary workspace projection casts by adding a `PluginNodeKind`
  guard and record-based DBT column validation.
- Updated the local bootstrap component guide to document copy, command, model,
  and DOM-adapter ownership.
- Regenerated `docs/planning/status/generated-code-state.md` after adding web
  source/test modules.

### Review Correction Evidence

- SRP: copy, commands, presentation rules, DOM mutation, and React publishers
  now live in separate modules with explicit owned-concern docblocks.
- DDD: shell publishers use named domain commands
  (`createHealthFailedBootstrapCommand`, `createRouteBootstrapStepCommand`,
  and related factories) rather than primitive string tuples.
- I18n: bootstrap copy and the touched route-error-boundary copy resolve through
  locale catalogs, with Spanish coverage in tests.

### Validation Evidence

- `pnpm --filter @dvt/web typecheck`: passed.
- `pnpm --filter @dvt/web test -- appBootstrapCommands.test.ts appBootstrapPresentation.test.ts appBootstrapScreen.test.ts AppProviders.test.tsx Root.bootstrapFlow.test.tsx appRouteErrorBoundaryCopy.test.ts queryKeyPolicy.architecture.test.ts workspaceGraphDraftProjection.test.ts canvasStartupAndDraftRecovery.architecture.test.ts`:
  passed with 9 files and 53 tests.
- `pnpm docs:status:generate`: passed and updated
  `docs/planning/status/generated-code-state.md`.
- `pnpm lint:md:changed`: passed with 0 markdown errors.
- `pnpm lint`: passed with `--max-warnings 0`.
