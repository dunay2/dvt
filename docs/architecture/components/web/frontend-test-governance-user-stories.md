---
title: Frontend Test Governance User Stories
status: Active
owner: Frontend / CI
last_reviewed: 2026-05-18
planning_type: architecture
---

# Frontend Test Governance User Stories

## F-14 Stories

### Story 1 - Local frontend developer runs targeted suites

As a frontend developer, I want named web test suites so that I can run the
smallest meaningful Vitest lane without guessing file globs.

Acceptance:

- `pnpm --filter @dvt/web test:unit` runs TypeScript unit tests.
- `pnpm --filter @dvt/web test:presentation` runs TSX presentation tests.
- `pnpm --filter @dvt/web test:architecture` runs semantic architecture tests.
- Each command uses `test:deps` before raw Vitest execution.

### Story 2 - Reviewer sees a dedicated web check

As a reviewer, I want a `Web Frontend Tests` check so that frontend test status
is visible without opening the generic `Run Tests` log.

Acceptance:

- `.github/workflows/test.yml` contains a `web-frontend-tests` job.
- The job runs `pnpm test:web:ci` when web files or root-build-sensitive files
  change.
- The generic affected-package job no longer owns the web test step.

### Story 3 - Test support remains test-only

As a maintainer, I want harnesses and doubles to be documented as test support
so that they are not mistaken for production adapters.

Acceptance:

- `apps/web/src/testing/**` is documented by the component guide.
- Test doubles remain consumers of test files, not product services.
- Architecture tests fail if the component guide disappears.

### Story 4 - Suite drift is rejected

As a CI owner, I want suite classification to fail closed so that new test files
cannot bypass the governed web lanes.

Acceptance:

- Every `apps/web/src/**/*.{test,spec}.{ts,tsx}` file maps to one primary suite.
- Focus suites may overlap only through explicit focus-suite registration.
- Architecture tests assert package scripts, config files, docs, and workflow
  wiring together.

### Story 5 - Future suite partitioning has a safe extension point

As the owner of F-14-A, I want this boundary to be stable so that changed-file
routing can later pick the smallest safe suite without changing product code.

Acceptance:

- F-14 does not introduce changed-file routing.
- F-14-A can extend `WebVitestSuiteCatalog` and CI tooling without inventing a
  second frontend test taxonomy.
