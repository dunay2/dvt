---
title: Web Vitest Changed Suite Router User Stories
status: Active
owner: Frontend / CI
last_reviewed: 2026-10-04
planning_type: architecture
---

# Web Vitest Changed Suite Router User Stories

For every source-edit scenario below, the behavioral lane is accompanied by
one complete `test:architecture:run`. Filesystem-reading architecture guards
cross focus boundaries, so a paired test cannot replace that evidence.
Test-only changes remain exact; a complete architecture run absorbs exact and
Canvas architecture batches through the existing suite normalization.

## US-1 Local Canvas Change

As a frontend developer changing Canvas code, I want a local command to run the
Canvas focus suite so that I do not need the full web Vitest loop for every
small Canvas iteration.

Acceptance:

- Given a changed file under `apps/web/src/app/views/canvas/**`,
  `apps/web/src/app/components/canvas/**`,
  `apps/web/src/app/components/inspector/**`, or
  `apps/web/src/app/components/InspectorPanel.tsx`
- When I run `pnpm --filter @dvt/web test:changed`
- Then the command routes to the narrow Canvas suite that matches the changed
  file type.

## US-2 Presentation Change

As a frontend developer changing non-Canvas and non-shell-session TSX
presentation code, I want the changed-suite router to run the presentation suite
so that route or component work gets feedback from the relevant presentation
lane.

Acceptance:

- Given a changed non-Canvas and non-shell-session `.tsx` file under
  `apps/web/src/**`
- When the changed-suite plan is resolved
- Then the selected command is `test:presentation:run`.

## US-2A Canvas Presentation Change

As a frontend developer changing Canvas TSX code, I want the changed-suite
router to run the Canvas presentation focus suite so that I do not pay for the
full Canvas test loop.

Acceptance:

- Given a changed `.tsx` file under `apps/web/src/app/views/canvas/**`,
  `apps/web/src/app/components/canvas/**`,
  `apps/web/src/app/components/inspector/**`, or
  `apps/web/src/app/components/InspectorPanel.tsx`
- When the changed-suite plan is resolved
- Then the selected command is `test:canvas-presentation:run`.

## US-3 Unit Change

As a frontend developer changing non-Canvas and non-shell-session TypeScript
model code, I want the changed-suite router to run the unit suite so that pure
model and service changes do not require presentation tests by default.

Acceptance:

- Given a changed non-Canvas and non-shell-session `.ts` file under
  `apps/web/src/**`
- When the changed-suite plan is resolved
- Then the selected command is `test:unit:run`.

## US-3A Canvas Unit Change

As a frontend developer changing Canvas model code, I want the changed-suite
router to run the Canvas unit focus suite so that pure Canvas model changes do
not run Canvas presentation tests by default.

Acceptance:

- Given a changed non-architecture `.ts` file under
  `apps/web/src/app/views/canvas/**`, `apps/web/src/app/components/canvas/**`,
  or `apps/web/src/app/components/inspector/**`
- When the changed-suite plan is resolved
- Then the selected command is `test:canvas-unit:run`.

## US-4 Governance Change

As a reviewer changing suite catalog, config, or component documentation, I want
the router to run the owning router architecture guard so that command drift is
caught without executing unrelated architecture tests.

Acceptance:

- Given a changed suite governance file
- When the changed-suite plan is resolved
- Then one direct Vitest batch runs all current
  `src/testing/vitestSuites*.architecture.test.ts` guards, including behavioral
  routing and catalog checks, not just the original documentation guard.

## US-4A Canvas Architecture Change

As a reviewer changing Canvas architecture guards, I want the changed-suite
router to run only the Canvas architecture focus suite so that the local proof
stays bounded to Canvas governance.

Acceptance:

- Given a changed `*.architecture.test.*` file under
  `apps/web/src/app/views/canvas/**`, `apps/web/src/app/components/canvas/**`,
  or `apps/web/src/app/components/inspector/**`
- When the changed-suite plan is resolved
- Then the selected command is `test:canvas-architecture:run`.

## US-4B Monaco Surface Change

As a frontend developer changing Code or shared Monaco editor/viewer surfaces, I
want the changed-suite router to run the Monaco focus suite so a two-file editor
change does not execute the whole presentation suite.

Acceptance:

- Given a changed file under `apps/web/src/app/components/monaco/**`
- Or a changed Code route file under `apps/web/src/app/views/CodeView.tsx`
- When the changed-suite plan is resolved
- Then the selected command is `test:monaco:run`.

## US-4C Shell Session Surface Change

As a frontend developer changing app shell, session context, workspace-scope
selection, session store, API-client context propagation, service composition,
or their shared test doubles, I want the changed-suite router to run the shell
session focus suite so a one-scope context change does not execute the full unit
or presentation lanes.

Acceptance:

- Given a changed file under `apps/web/src/app/components/shell/**`,
  `apps/web/src/app/services/session/**`, `apps/web/src/app/services/composition/**`,
  or a changed workspace-scope/session shell support surface
- When the changed-suite plan is resolved
- Then the selected command is `test:shell-session:run`.

## US-5 No Relevant Web Change

As a developer working outside `@dvt/web`, I want the web changed-suite command
to skip cleanly so that it can be used in broader local workflows.

Acceptance:

- Given no web-relevant changed files
- When the command runs
- Then it exits successfully and reports that no web suite was selected.

## US-5A Paired Source And Test Change

As a frontend developer changing a small source module and its directly paired
test, I want the changed-suite router to execute that exact test file so that a
one-module fix does not pay for the whole unit or presentation lane.

Acceptance:

- Given `apps/web/src/app/views/cost/costViewModel.ts` and
  `apps/web/src/app/views/cost/costViewModel.test.ts` are both changed
- When the changed-suite plan is resolved
- Then the selected command is a direct `vitest run` for
  `src/app/views/cost/costViewModel.test.ts`.
- Given only the source file is changed
- When the changed-suite plan is resolved
- Then the router falls back to the governed suite for that file type.
- Given another changed source has no directly paired changed test
- Then that source's complete suite remains required even if the diff contains
  an unrelated exact test from the same suite; the complete suite includes that
  exact test without running it a second time.

## US-5B Canvas Component With Explicit Focus Tests

As a reviewer of a small Canvas component or Inspector patch, I want exact
changed tests to stay inside Canvas focus configs so the router does not run the
full presentation lane only because the component lives outside
`views/canvas`.

Acceptance:

- Given changed Canvas/Inspector component files and their directly paired
  changed exact Canvas focus tests, without another unpaired source in that lane
- When the changed-suite plan is resolved
- Then the selected commands are direct `vitest run` batches using
  `vitest.canvas-unit.config.ts`, `vitest.canvas-presentation.config.ts`, or
  `vitest.canvas-architecture.config.ts`.
- Then the selected suites do not include the full `unit` or `presentation`
  primary suite unless another file also selects one. Source edits still
  require complete architecture coverage.

## US-5C Mixed Canvas And General Changes

As a developer changing Canvas and general Web code together, I want complete
primary coverage to run once instead of repeating its equivalent Canvas subset.

Acceptance:

- Given both a complete primary suite and its equivalent Canvas focus suite
  are required
- Then the primary run includes all focus tests with the same environment and
  isolation, without a second focus process.
- Given only exact primary tests are selected
- Then a required complete Canvas focus suite remains in the plan.
- Monaco, Shell and Workspace focus contexts are not discarded when their
  execution environment differs from primary coverage.

## US-6 Pull-Request Web Change

As a reviewer of an ordinary web-only pull request, I want the `Web Frontend
Tests` job to run the changed-suite router so that a two-file change does not
execute every web Vitest file.

Acceptance:

- Given a pull request with web-relevant files and no root-build-sensitive
  changes
- When the `Web Frontend Tests` job runs
- Then it executes `pnpm test:web:changed` with the pull-request base ref.
- Given a push to `main`, a manual run, or a root-build-sensitive pull request
- When the `Web Frontend Tests` job runs
- Then it executes `pnpm test:web:ci`.
