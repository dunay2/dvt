---
title: Web Vitest Changed Suite Router User Stories
status: Active
owner: Frontend / CI
last_reviewed: 2026-05-20
planning_type: architecture
---

# Web Vitest Changed Suite Router User Stories

## US-1 Local Canvas Change

As a frontend developer changing Canvas code, I want a local command to run the
Canvas focus suite so that I do not need the full web Vitest loop for every
small Canvas iteration.

Acceptance:

- Given a changed file under `apps/web/src/app/views/canvas/**`
- When I run `pnpm --filter @dvt/web test:changed`
- Then the command routes to the narrow Canvas suite that matches the changed
  file type.

## US-2 Presentation Change

As a frontend developer changing non-Canvas TSX presentation code, I want the
changed-suite router to run the presentation suite so that route or component
work gets feedback from the relevant presentation lane.

Acceptance:

- Given a changed non-Canvas `.tsx` file under `apps/web/src/**`
- When the changed-suite plan is resolved
- Then the selected command is `test:presentation:run`.

## US-2A Canvas Presentation Change

As a frontend developer changing Canvas TSX code, I want the changed-suite
router to run the Canvas presentation focus suite so that I do not pay for the
full Canvas test loop.

Acceptance:

- Given a changed `.tsx` file under `apps/web/src/app/views/canvas/**`
- When the changed-suite plan is resolved
- Then the selected command is `test:canvas-presentation:run`.

## US-3 Unit Change

As a frontend developer changing non-Canvas TypeScript model code, I want the
changed-suite router to run the unit suite so that pure model and service
changes do not require presentation tests by default.

Acceptance:

- Given a changed non-Canvas `.ts` file under `apps/web/src/**`
- When the changed-suite plan is resolved
- Then the selected command is `test:unit:run`.

## US-3A Canvas Unit Change

As a frontend developer changing Canvas model code, I want the changed-suite
router to run the Canvas unit focus suite so that pure Canvas model changes do
not run Canvas presentation tests by default.

Acceptance:

- Given a changed non-architecture `.ts` file under
  `apps/web/src/app/views/canvas/**`
- When the changed-suite plan is resolved
- Then the selected command is `test:canvas-unit:run`.

## US-4 Governance Change

As a reviewer changing suite catalog, config, or component documentation, I want
the router to run the architecture suite so that command drift is caught without
guessing which guard owns the change.

Acceptance:

- Given a changed suite governance file
- When the changed-suite plan is resolved
- Then the selected command is `test:architecture:run`.

## US-4A Canvas Architecture Change

As a reviewer changing Canvas architecture guards, I want the changed-suite
router to run only the Canvas architecture focus suite so that the local proof
stays bounded to Canvas governance.

Acceptance:

- Given a changed `*.architecture.test.*` file under
  `apps/web/src/app/views/canvas/**`
- When the changed-suite plan is resolved
- Then the selected command is `test:canvas-architecture:run`.

## US-5 No Relevant Web Change

As a developer working outside `@dvt/web`, I want the web changed-suite command
to skip cleanly so that it can be used in broader local workflows.

Acceptance:

- Given no web-relevant changed files
- When the command runs
- Then it exits successfully and reports that no web suite was selected.

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
