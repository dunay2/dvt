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
- `pnpm lint`: passed with `--max-warnings 0`.
- `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs`: passed with
  effective `ARC-2`; evidence and risk updates were required and present.
- `pnpm verify:prepush`: passed. The gate validated changed ARC evidence,
  changed Markdown, changed files, forbidden tracked files, and selected the
  root `pnpm type-check` path for the branch diff.

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

## 2026-04-29 Presentation Boundary Follow-Up

### Think-First Analysis

Problem summary: the current Code Health review still identifies mixed
responsibilities in the latest web graph slice. The most visible issue is that
the tab-strip React component still coordinates replacement dialog state and
command dispatch while sitting next to JSX presentation, and the workspace
draft projection still owns both the canonical semantic graph and DBT snapshot
read-model projection.

Root cause: the previous pass extracted passive templates and locale-backed
copy, but stopped at the first presentation boundary. That left controller
logic in the React component and left a route-facing semantic projector with
DBT-specific read-model rules. Both choices are small locally, but they weaken
SRP and make the next feature likely to place more policy beside rendering.

Constraints and invariants:

- `AGENTS.md` requires governance-first execution, no hidden debt, no stubs,
  and real validation evidence.
- `docs/guides/ai-work-protocol.md` classifies this as Slim maintenance:
  public behavior stays the same while component ownership is corrected.
- `docs/architecture/reference-architecture.md` requires explicit boundaries
  and replaceable layers behind stable ports.
- The Canvas component guide requires passive templates, locale-backed view
  state, explicit command policy, and semantic architecture tests.

Options considered:

- Leave the current split because templates are already extracted. Rejected
  because the component still owns controller decisions and the projection file
  still mixes canonical graph semantics with DBT read-model presentation.
- Move all tab-strip code into the template. Rejected because that would put
  command policy in the presentation layer.
- Add a presenter hook for tab-strip coordination and a DBT snapshot projection
  module for read-model rules. Selected because it keeps JSX passive, keeps
  command policy testable without HTML, and keeps semantic graph projection
  separate from DBT-specific read-model rendering.

Selected option and rationale: extract the remaining presentation-controller
coordination into a named presenter seam, move DBT snapshot projection into its
own service module, and update architecture tests and docs so SRP, DDD naming,
and hexagonal read-model boundaries are mechanically checked.

### Pre-Implementation Brief

Mode: Slim.

Scope:

- `apps/web/src/app/views/canvas/CanvasPlaygroundTabStrip.tsx`
- `apps/web/src/app/views/canvas/useCanvasPlaygroundTabStripPresenter.ts`
- `apps/web/src/app/views/canvas/canvasPlaygroundTabStripModel.ts`
- `apps/web/src/app/services/workspace/workspaceGraphDraftProjection.ts`
- `apps/web/src/app/services/workspace/workspaceGraphDraftSnapshotProjection.ts`
- web graph architecture tests and component documentation

Out of scope:

- Product behavior changes.
- New endpoints or contract changes.
- Engine, adapter, planner, or contract ARC-triggered paths.
- Compatibility barrels or duplicate exports for the old internal shape.

Validation plan:

- Targeted web projection, tab-strip, and architecture tests.
- `pnpm --filter @dvt/web typecheck`
- `pnpm docs:status:generate` if source inventory changes.
- `pnpm lint`
- `pnpm verify:prepush`

### Implementation Outcome

- Split DBT-shaped snapshot projection out of
  `workspaceGraphDraftProjection.ts` into
  `workspaceGraphDraftSnapshotProjection.ts`. The original projection module
  now owns only protected draft to route-facing draft and canonical semantic
  graph projection.
- Updated `workspaceService.api.ts` to consume the snapshot-specific projector
  instead of importing DBT read-model rules from the semantic projection module.
- Converted `CanvasPlaygroundTabStrip.tsx` into a thin presentation-boundary
  mount. Replacement state, callback wiring, command dispatch, and locale
  resolution now live in `useCanvasPlaygroundTabStripPresenter.ts`.
- Kept JSX in `CanvasPlaygroundTabStrip.templates.tsx`; the template receives
  already-resolved view state and does not import copy catalogs or command
  policy.
- Split create/replace canvas command responsibilities:
  `canvasCreateCanvasDocumentCommandPolicy.ts` owns CAS eligibility and blank
  draft input construction, while `canvasCreateCanvasDocumentSaveResult.ts`
  owns cache/session/save-status effects.
- Added a negative snapshot-projection test for denied protected draft reads.
- Updated the local Canvas component guide and semantic architecture tests to
  enforce presenter/template/model/projection boundaries.
- Regenerated `docs/planning/status/generated-code-state.md` after adding web
  source and test modules.

### Validation Evidence

- `pnpm --filter @dvt/web typecheck`: passed.
- `pnpm --filter @dvt/web test -- workspaceGraphDraftSnapshotProjection.test.ts CanvasPlaygroundTabStrip.test.tsx canvasStartupAndDraftRecovery.architecture.test.ts canvasPlaygroundTabState.architecture.test.ts canvasCreateCanvasDocumentCommand.test.ts`:
  passed with 5 files and 23 tests.
- `pnpm --filter @dvt/web test`: passed. The suite still emits existing React
  `act(...)` warnings around React Flow/MiniMap and CanvasContent, but no test
  failed.
- `pnpm docs:status:generate`: passed and updated
  `docs/planning/status/generated-code-state.md`.
- `pnpm lint:md:changed`: passed with 0 markdown errors.
- `pnpm lint`: passed with `--max-warnings 0`.
- `pnpm verify:prepush`: passed. The gate validated changed Markdown,
  generated-doc policy, changed-file checks, forbidden tracked files, and the
  selected root `pnpm type-check` path.

### No-Debt Statement

No stubs, placeholders, TODO/FIXME markers, fake implementations, hook
bypasses, rule relaxations, or compatibility barrels were introduced.

## 2026-04-29 Branch Fowler Review And User-Story TDD Follow-Up

### Think-First Analysis

Problem summary: the branch has materially improved startup and Canvas
authoring boundaries, but the review evidence is still split between closeout
notes, an older mailbox review, and component docs. That creates a documentation
drift risk: the branch promises SRP, i18n, passive templates, protected draft
projection, and semantic architecture tests, but one governed artifact does not
yet trace the full branch scope, user scenarios, and TDD expectations.

Root cause: the implementation work advanced through multiple small review
corrections. Each pass improved a local smell, but the aggregate branch story
was not consolidated after the final presentation-boundary extraction.

Constraints and invariants:

- `AGENTS.md` requires governance-first execution, no hidden debt, and real
  validation evidence.
- `docs/guides/ai-work-protocol.md` requires think-first material and
  solution rationale before implementation when architecture or behavior
  posture changes.
- `docs/architecture/reference-architecture.md` requires explicit boundaries,
  replaceable adapters behind ports, and one source of runtime truth per
  concern.
- The Canvas component guide requires public API, invariants, transitions,
  consumers, diagrams, owned-concern docblocks, and architecture tests that
  validate semantics rather than only barrel thinness.

Options considered:

- Create a new ADR for the branch. Rejected for this pass because the branch
  applies existing hexagonal, DDD, presentation-model, and protected-read-model
  decisions; it does not create a new cross-system contract or public policy.
- Leave the existing closeout and component guide as sufficient. Rejected
  because user-story coverage and branch-level Fowler comparison are not
  mechanically required by the current architecture guard.
- Add a branch-level mailbox analysis, add a user-story coverage doc, link both
  from the component guide, and extend the semantic architecture test to enforce
  those artifacts. Selected because it fixes drift without changing runtime
  behavior or adding a speculative ADR.

Selected option and rationale: document the branch as a mature-system
comparison and scenario catalog, then use TDD to make documentation coverage a
semantic architecture requirement for the Canvas startup and draft-recovery
component.

### Pre-Implementation Brief

Mode: Full documentation and architecture-test follow-up.

Scope:

- Branch-level Fowler architecture review in `buzon/`.
- Component guide update for current branch API, invariants, transitions,
  consumers, diagrams, and user-story traceability.
- Dedicated local user-story coverage document for Canvas startup and draft
  recovery scenarios.
- A red/green architecture test that validates the semantic documentation
  artifacts, not only code shape.

Out of scope:

- Product behavior changes.
- New public contracts, endpoints, or multi-canvas aggregate semantics.
- Engine, adapter, planner, or contract ARC-triggered changes.
- Compatibility barrels or transitional duplicate APIs.

Validation plan:

- First run the targeted Canvas architecture test red after adding the missing
  documentation expectation.
- Add/update docs and rerun the targeted test green.
- Run `pnpm docs:sync` because a documentation file is added.
- Run web typecheck, changed markdown lint, root lint, and
  `pnpm verify:prepush`.

### Implementation Outcome

- Added the branch-level Fowler review in
  `buzon/20260429-codex-static-analysis-followup-fowler-architecture-review.md`.
- Added
  `docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-user-stories.md`
  with Canvas startup, draft, presentation, architecture, and TDD scenarios.
- Updated the Canvas startup and draft-recovery component guide with
  user-story traceability and an additional semantic guard diagram.
- Updated the Graph docs index so the local user-story guide is discoverable
  from the component architecture pack.
- Strengthened `canvasStartupAndDraftRecovery.architecture.test.ts` so it
  fails when the branch Fowler review, user stories, or component-guide
  traceability drift out of the branch.
- Confirmed no ADR is required for this branch because the work applies
  existing reference architecture and component guidance without introducing a
  new public contract, endpoint, event, or persistence model.

### TDD Evidence

- Red: `pnpm --filter @dvt/web test -- canvasStartupAndDraftRecovery.architecture.test.ts`
  failed because
  `buzon/20260429-codex-static-analysis-followup-fowler-architecture-review.md`
  and the user-story guide did not exist.
- Green: the same command passed after adding the review, user stories, guide
  link, and documentation traceability assertions.

### Validation Evidence

- `pnpm --filter @dvt/web test -- canvasStartupAndDraftRecovery.architecture.test.ts`:
  passed with 9 tests after the green implementation.
- `pnpm docs:sync`: passed after adding the documentation file and again after
  updating the Graph docs index.
- `pnpm --filter @dvt/web typecheck`: passed.
- `pnpm lint:md:changed`: passed before staging tracked Markdown updates.
- `pnpm --filter @dvt/web test`: passed. Existing React `act(...)` warnings
  still appear around React Flow/MiniMap and CanvasContent, but no test failed.
- `pnpm lint`: passed with `--max-warnings 0`.
- `pnpm exec markdownlint-cli2 --ignore-path .markdownlintignore "docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-user-stories.md" "buzon/20260429-codex-static-analysis-followup-fowler-architecture-review.md"`:
  passed with 0 Markdown errors for the new untracked files before staging.
- `pnpm verify:prepush`: passed. The gate validated docs policy, changed
  Markdown, changed files, forbidden tracked files, and the selected root
  `pnpm type-check` path.

### No-Debt Statement

No stubs, placeholders, TODO/FIXME markers, fake implementations, hook
bypasses, rule relaxations, transition shims, or duplicate APIs
were introduced.

## 2026-04-29 Branch-Wide Component Guide Follow-Up

### Think-First Analysis

Problem summary: the previous Fowler consolidation fixed Canvas startup and
draft-recovery traceability, but the full branch also changed engine admission,
traceability compiled-code-ref extraction, and Temporal adapter activity test
setup. Those branch-adjacent components were mentioned in the mailbox review,
but they still lacked a shared branch-level semantic guard and local component
guides with public API, invariants, transitions, consumers, and diagrams.

Root cause: the branch evolved from static-analysis corrections. The frontend
slice had active component guides and architecture tests ready to extend; the
engine, traceability, and adapter follow-ups were smaller code-health fixes and
therefore only received evidence/risk updates plus mailbox summary.

Constraints and invariants:

- `AGENTS.md` requires governance-first execution, no hidden debt, no stubs,
  and real validation evidence.
- `docs/guides/ai-work-protocol.md` requires doc-driven work before changing
  architecture or behavior posture.
- `docs/architecture/reference-architecture.md` requires explicit boundaries,
  replaceable ports, and one runtime truth per boundary.
- `ADR-0032` governs `compiledCodeRef` ownership and keeps event payload
  references lightweight while traceability resolves compiled SQL downstream.
- The branch must not create new public contracts or endpoints without ADR.

Options considered:

- Leave branch-adjacent components covered only by the mailbox review. Rejected
  because the user explicitly asked for local component guides and semantic
  architecture tests, not only review prose.
- Add separate package-local tests in engine, traceability, and adapter
  packages. Rejected for this pass because the drift is branch-level
  traceability across components, and package-local behavioral tests already
  cover the runtime behavior.
- Add one repo-level semantic architecture guard plus targeted local guides for
  the branch-adjacent components. Selected because it enforces the branch
  promises without changing runtime behavior.

Selected option and rationale: add a branch-level architecture test under
`tools/ci`, create local component guides for start-run admission and
compiled-code-ref lineage extraction, enrich Temporal step plugin docs with the
named test setup boundary, add the missing owned-concern docblock on
`StartRunAdmissionGuard.ts`, and keep ADR status unchanged.

### Pre-Implementation Brief

Mode: Full documentation and architecture-test follow-up.

Scope:

- `tools/ci/static-analysis-followup-branch-architecture.test.mjs`
- `docs/architecture/components/engine/architecture/start-run-admission-component.md`
- `docs/architecture/components/lineage-worker/compiled-code-ref-lineage-extraction-component.md`
- `docs/architecture/components/engine/adapters/temporal/temporal-step-plugin-profile.md`
- component index pages for discoverability
- `packages/@dvt/engine/src/application/StartRunAdmissionGuard.ts`

Out of scope:

- Runtime behavior changes.
- Contract changes, endpoint changes, or new ADRs.
- Reworking existing package-local behavioral tests.
- Introducing compatibility or transition shims.

Validation plan:

- Red: run the new repo-level architecture test before docs/docblock exist.
- Green: rerun the same test after adding docs and the owned-concern docblock.
- Run focused engine, traceability, adapter, and CI-tool tests.
- Run `pnpm docs:sync`, `pnpm docs:status:generate`, lint/type gates, and
  `pnpm verify:prepush`.

### Implementation Outcome

Applied changes:

- Added `tools/ci/static-analysis-followup-branch-architecture.test.mjs` as a
  branch-level semantic guard for non-Canvas branch-adjacent components.
- Added the local component guide
  `docs/architecture/components/engine/architecture/start-run-admission-component.md`
  with public API, invariants, transitions, consumers, and diagrams.
- Added the local component guide
  `docs/architecture/components/lineage-worker/compiled-code-ref-lineage-extraction-component.md`
  with public API, invariants, transitions, consumers, and diagrams.
- Linked the new guides from their component indexes and from the mailbox
  Fowler review.
- Documented the Temporal named activity setup boundary in the Temporal step
  plugin profile.
- Added an owned-concern docblock to
  `packages/@dvt/engine/src/application/StartRunAdmissionGuard.ts`.

No ADR was created in this follow-up because the work clarifies existing
architecture and guards existing branch decisions. It does not introduce a new
contract, architectural decision, endpoint, persistence model, or compatibility
transition.

### Validation Evidence

Executed validation:

- `node --test tools/ci/static-analysis-followup-branch-architecture.test.mjs`
  - Red before implementation: failed on missing component guides, missing
    `StartRunAdmissionGuard.ts` owned-concern docblock, and missing mailbox
    guide links.
  - Green after implementation: passed, 4 subtests.
- `pnpm docs:sync` - passed.
- `pnpm docs:status:generate` - passed; generated code state already up to
  date.
- `pnpm test:ci-tools` - passed, 77 subtests.
- `pnpm --filter @dvt/engine test -- test/services/RunExecutionContextAdmissionPolicy.srp.architecture.test.ts test/services/RunExecutionContextAdmissionPolicy.acceptance.test.ts test/services/RunExecutionContextAdmissionPolicy.plugin-requirements.test.ts test/services/RunExecutionContextAdmissionPolicy.provenance.test.ts test/services/RunExecutionContextAdmissionPolicy.compatibility.test.ts`
  - passed, 5 files and 24 tests.
- `pnpm --filter @dvt/traceability-service test -- test/lineage/compiledCodeRef.test.ts`
  - passed, 1 file and 4 tests.
- `pnpm --filter @dvt/adapter-temporal test -- test/activities.test.ts`
  - passed, 25 files and 214 tests through the adapter test script.
- `pnpm --filter @dvt/engine typecheck` - passed.
- `pnpm --filter @dvt/traceability-service typecheck` - passed.
- `pnpm --filter @dvt/adapter-temporal typecheck` - passed.
- `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs` - passed;
  branch remains ARC-2 with existing evidence and risk coverage.
- `pnpm lint:md:changed` - passed for tracked changed markdown.
- `pnpm exec markdownlint-cli2 "docs/architecture/components/engine/architecture/start-run-admission-component.md" "docs/architecture/components/lineage-worker/compiled-code-ref-lineage-extraction-component.md"`
  - passed for the newly added component guides.
- `pnpm lint` - passed.

Final pre-push validation is intentionally run after staging so changed-file
governance includes the newly added docs and CI-tool test file.

### No-Debt And No-Stub Evidence

No stubs, placeholders, TODO/FIXME markers, fake implementations,
compatibility shims, hook bypasses, lint/type/test relaxations, or undeclared
process changes were introduced.
