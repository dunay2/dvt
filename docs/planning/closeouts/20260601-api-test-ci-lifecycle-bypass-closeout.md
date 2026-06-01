---
title: API Test CI Lifecycle Bypass Closeout
status: Draft
owner: ci
last_reviewed: 2026-06-01
planning_type: closeout
---

# API Test CI Lifecycle Bypass Closeout

## Think-First Analysis

- Problem summary: the `Test Suite` package matrix builds each affected
  workspace dependency graph before running package tests, but the API matrix
  command still runs `pnpm --filter dvt-api test`. That enters the package
  `pretest` lifecycle, which can rebuild the broad `dvt-api^...` dependency
  graph before a small API test set runs.
- Root cause: the test matrix has one generic command shape for every package:
  `pnpm --filter <pkg> test`. That is safe for local package contracts, but it
  is inefficient for CI jobs that already ran the governed Turbo dependency
  graph build step.
- Constraints and invariants: local `dvt-api test` must keep its pretest safety
  net for direct developer use. CI must keep the explicit Turbo build step
  before tests. The matrix command must remain generated through the governed
  scope code rather than hard-coded in workflow YAML. The change must not alter
  API runtime behavior or integration-test semantics.
- Options considered:
  - Remove API `pretest`: rejected because direct local package tests would lose
    their cold-worktree dependency preparation.
  - Set `DVT_CI=1` earlier and rely on `skip-pretest-if-ci`: rejected because
    the matrix command still advertises the local lifecycle path and remains
    easy to regress.
  - Add `test:ci` for API and route only the CI matrix entry to it: selected
    because it preserves local safety and makes CI intent explicit.
- Selected option and rationale: add `dvt-api` `test:ci` as the same Vitest
  invocation without a `pretest:ci` lifecycle, and specialize the test matrix
  command for `dvt-api` to use it after the workflow-level Turbo build step.
- Rejected alternatives: skipping the build step, changing all packages to
  `test:ci`, or moving package-specific command overrides into workflow YAML.

## Pre-Implementation Brief

- Mode: Slim.
- Scope: API package scripts, test matrix command generation, CI capability
  documentation, and contract tests.
- Touched files or paths:
  - `apps/api/package.json`
  - `tools/ci/scope-config.mjs`
  - `tools/ci/emit-test-matrix.test.mjs`
  - `docs/guides/testing-and-ci-capabilities.md`
  - `docs/planning/closeouts/20260601-api-test-ci-lifecycle-bypass-closeout.md`
- Expected outcome: local `pnpm --filter dvt-api test` still runs the API
  `pretest`, while CI package matrix entries for API run
  `pnpm --filter dvt-api test:ci` after the existing Turbo dependency build.
- Risks and mitigations:
  - Risk: CI could run API tests without built dependencies. Mitigation: keep
    `.github/workflows/test.yml` package-matrix build step unchanged and add a
    matrix contract test.
  - Risk: direct local API tests could lose dependency preparation. Mitigation:
    keep `pretest` unchanged and assert the package still exposes it.
- Out-of-scope items: changing API integration tests, removing local lifecycle
  guards from other packages, and measuring GitHub Actions durations before a
  PR run.
- Validation plan:
  - `node --test tools/ci/emit-test-matrix.test.mjs`
  - `pnpm --filter dvt-api test:ci`
  - `pnpm test:ci-tools`
  - `pnpm docs:sync`
  - `pnpm governance:refresh`
  - `pnpm verify:prepush`
- Test coverage plan: add contract assertions that API keeps its local
  `pretest`, exposes `test:ci`, and receives `test:ci` in the generated CI
  package matrix while the general package matrix remains covered.
- Libraries evaluated: None evaluated - no custom implementation.
- Command/query rail impact: none. This is CI command routing, not product
  command/query behavior.
- Fowler planning impact: removes duplicate dependency-build semantics from the
  CI API package-test path while preserving local safety.

## Closeout Evidence

### Implementation

- Added `apps/api/package.json` `test:ci` as the same Vitest unit command as
  `test`, without adding a `pretest:ci` lifecycle.
- Updated `tools/ci/scope-config.mjs` so only the `dvt-api` package matrix
  entry runs `pnpm --filter dvt-api test:ci`; other generated package entries
  keep `pnpm --filter <pkg> test`.
- Added `tools/ci/emit-test-matrix.test.mjs` coverage proving API keeps local
  `pretest`, exposes `test:ci`, and receives the CI lifecycle-bypass command in
  the generated matrix.
- Updated `docs/guides/testing-and-ci-capabilities.md` with the API CI test
  command and the pipeline rationale.

### Validation

- `node --test tools/ci/emit-test-matrix.test.mjs` failed before
  implementation because `dvt-api` did not expose `test:ci`.
- `node --test tools/ci/emit-test-matrix.test.mjs` passed after
  implementation.
- `pnpm --filter dvt-api test:ci` failed when run cold without the CI build
  phase, proving the command no longer performs local dependency preparation.
- `node scripts/run-turbo-workspace-task.cjs build --filter=dvt-api` passed
  with 18 successful Turbo build tasks.
- `pnpm --filter dvt-api test:ci` passed after the Turbo build phase with
  138 files passed, 1 skipped; 685 tests passed, 19 skipped.
- `pnpm docs:sync` passed.
- `pnpm test:ci-tools` passed with 174 tests.
- `pnpm governance:refresh` passed; generated surfaces stabilized after two
  passes and the final `governance:db:import`, `governance:db:check`, and
  `governance:db:export:check` succeeded.
- `pnpm verify:prepush` initially failed on Prettier formatting for
  `apps/api/package.json`, `tools/ci/emit-test-matrix.test.mjs`, and
  `tools/ci/scope-config.mjs`.
- `pnpm fix:changed` passed and normalized the changed-file formatting.
- `node --test tools/ci/emit-test-matrix.test.mjs` passed again after
  formatting.
- `pnpm verify:prepush` passed after formatting.

### No-Debt / No-Stub Evidence

- No workflow checks, hooks, lint rules, or quality gates were disabled.
- No stub, placeholder, fake adapter, TODO, or unfinished branch was added.
- No product command/query rail changed; this is CI command routing only.
