---
title: CI Remote Turbo Cache Closeout
status: Draft
owner: ci
last_reviewed: 2026-06-01
planning_type: closeout
---

# CI Remote Turbo Cache Closeout

## Think-First Analysis

- Problem summary: CI already uses Turborepo for root and affected workspace
  build lanes, but remote Turbo cache cannot participate because the GitHub
  workflows do not expose `TURBO_TOKEN` and `TURBO_TEAM`, and some cacheable
  dependency graph builds in `Test Suite` still use direct `pnpm --filter`
  commands.
- Root cause: the first Turbo adoption slice established the local wrapper,
  task contracts, and `.turbo` restore cache, but it intentionally left remote
  cache activation to repository secret owners. Subsequent test lanes kept some
  package-manager build commands for dependency preparation, leaving parallel
  CI semantics for the same cacheable build intent.
- Constraints and invariants: `AGENTS.md`, the governance inventory, and the AI
  work protocol require CI changes to follow the tracked command registry,
  workflow contracts, documentation surfaces, and validation gates. The Testing
  and CI Capabilities guide is the canonical CI capability map. GitHub
  workflows remain authoritative merge gates. Secret-backed remote cache must
  degrade safely when secrets are unavailable, especially for pull requests from
  forks.
- Options considered:
  - Keep only `.turbo` actions/cache restore: rejected because it does not share
    task artifacts across runners and PRs as effectively as remote Turbo cache.
  - Enable remote cache only for root `pnpm build`: rejected because affected
    lanes and test dependency builds already route through the same build
    graph intent.
  - Convert every test command to Turbo immediately: rejected because Vitest,
    Cypress, integration, coverage, and service-backed lanes have different
    determinism and runtime-state concerns.
  - Scope this slice to remote cache secrets plus cacheable build graph
    preparation: selected because it improves the known bottleneck while
    preserving test and integration command authority.
- Selected option and rationale: expose optional remote cache environment at
  workflow scope, convert only dependency graph build preparation steps to the
  governed Turbo wrapper, keep test/integration commands unchanged, and update
  CI documentation and contract tests so the behavior remains measurable and
  guarded.
- Rejected alternatives: introducing a second Turbo wrapper, adding
  repo-specific secrets to the composite action only, cache-enabling
  service-backed integration commands, and relying on manual review without CI
  contract tests.

## Pre-Implementation Brief

- Mode: Slim.
- Scope: CI workflow environment, `Test Suite` cacheable dependency graph build
  steps, Turbo task inputs, CI capability documentation, and CI contract tests.
- Touched files or paths:
  - `.github/workflows/ci.yml`
  - `.github/workflows/test.yml`
  - `.github/actions/setup-node-pnpm/action.yml`
  - `turbo.json`
  - `tools/ci/turbo-workspace-task-contract.test.mjs`
  - `docs/guides/testing-and-ci-capabilities.md`
  - `docs/planning/closeouts/20260601-ci-remote-turbo-cache-closeout.md`
- Expected outcome: CI jobs that use Turbo can authenticate to remote cache
  when repository secrets are present, while fork PRs and repositories without
  secrets continue to run with local/cache-restore behavior. Cacheable build
  graph preparation in `Test Suite` uses the same governed Turbo wrapper as
  affected workspace CI.
- Risks and mitigations:
  - Secret absence could break fork PRs. Mitigation: secrets are exposed as
    optional environment values; Turbo keeps running without remote credentials.
  - Dependency-only build filters could accidentally include target app builds.
    Mitigation: preserve existing `^...` dependency-only filters where they are
    already used.
  - Service-backed integration behavior could be hidden by task cache.
    Mitigation: leave integration/test commands uncached and unchanged.
- Out-of-scope items: creating GitHub repository secrets, measuring real PR
  before/after durations inside this local slice, consolidating job matrices,
  changing branch protection, and cache-enabling Cypress, Postgres, Temporal,
  coverage, or full test execution.
- Validation plan:
  - `node --test tools/ci/turbo-workspace-task-contract.test.mjs`
  - `pnpm docs:sync`
  - `pnpm governance:refresh`
  - `pnpm verify:prepush`
- Test coverage plan: add contract assertions that workflows expose remote
  Turbo cache variables, that cacheable `Test Suite` build graph steps use the
  governed Turbo wrapper, and that service-backed test commands remain outside
  the build-cache conversion.
- Libraries evaluated: None evaluated - no custom implementation.
- Command/query rail impact: none. This is CI orchestration, not externally
  observable product behavior.
- Fowler planning impact: removes duplicate build orchestration semantics in
  CI by reusing the existing Turbo wrapper; leaves broader job consolidation as
  a separate measurement-driven opportunity.

## Closeout Evidence

### Governing Sources Used

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/guides/testing-and-ci-capabilities.md`
- `.github/workflows/ci.yml`
- `.github/workflows/test.yml`
- `.github/actions/setup-node-pnpm/action.yml`
- `turbo.json`
- `package.json`
- `tools/ci/turbo-workspace-task-contract.test.mjs`

### Real Work Performed

- Exposed optional `TURBO_TOKEN` and `TURBO_TEAM` workflow environment values
  in `CI - Code Quality` and `Test Suite`.
- Converted cacheable `Test Suite` dependency graph build preparation for
  adapter-temporal, web, adapter-postgres, determinism/replay, and coverage
  lanes to `node scripts/run-turbo-workspace-task.cjs build`.
- Left test, integration, coverage, and service-backed commands as explicit
  package commands.
- Added the shared GitHub Actions setup action to `turbo.json`
  `globalDependencies` so cache key behavior follows setup-action changes.
- Added CI contract coverage for remote Turbo cache environment wiring and
  dedicated-lane build graph wrapper usage.
- Updated the Testing and CI Capabilities guide to document the new cache
  posture and the remaining measurement responsibility.

### Validation Evidence

- `node --test tools/ci/turbo-workspace-task-contract.test.mjs`
  - First run: failed as expected before implementation because workflows did
    not expose remote Turbo cache variables and dedicated-lane build graph
    steps still used direct `pnpm --filter` commands.
  - Final run: passed, 5/5 tests.
- `pnpm docs:sync`
  - Passed.
- `pnpm governance:refresh`
  - Passed.
- `pnpm test:ci-tools`
  - Passed, 173/173 tests.
- `pnpm verify:prepush`
  - Run after this closeout update so the final gate validates the final
    worktree state.

### No-Debt Evidence

- No new debt entry was created.
- No lint, type, test, CI, or governance rule was disabled or relaxed.
- No hook bypass was used.
- No checks were hidden; remaining PR-runtime measurement requires 2-3 real PRs
  after repository owners populate `TURBO_TOKEN` and `TURBO_TEAM`.

### No-Stub Evidence

- No stub, placeholder, fake adapter, fake success path, TODO/FIXME marker, or
  unfinished branch was added.
