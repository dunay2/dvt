---
slice: rc-c2-wave-2b-turbo-affected-task-routing
date: 2026-04-23
last_reviewed: 2026-04-23
gap: maintenance
author: AI (Codex)
---

# Closeout: RC-C2 wave 2B Turbo affected task routing

## Think-First

### Problem summary

Wave 2A normalized the package-level `typecheck` contract, but the repository
still does not actually route affected `typecheck` or `test` work through the
existing Turbo graph:

- `ci:affected:build`, `ci:affected:typecheck`, and `ci:affected:test` still
  use recursive `pnpm` commands rather than a governed task graph
- `CI - Code Quality` still builds and type-checks affected workspaces through
  raw package commands, so it cannot reuse a declared Turbo task contract for
  those lanes
- `turbo.json` still only declares `build`, which means any future
  `turbo run typecheck` or `turbo run test` call fails immediately instead of
  routing through an explicit, reviewable contract

That leaves the repo in a half-finished state: the script-ownership blocker is
removed, but the affected-work reuse path still does not consume the graph that
the repo is now able to define honestly.

### Root cause

The earlier Turbo slice was intentionally narrow:

- the 2026-04-18 orchestrator rollout stopped at root `build`
- Wave 1 focused on Node baseline, determinism scoping, and CI cache reuse
- Wave 2A fixed package `typecheck` ownership first so Turbo would not claim a
  graph it did not yet own

That sequencing was correct, but it also means the repository now has the
prerequisites for governed Turbo `typecheck` and `test` tasks without yet
having the wiring that would let local affected commands or the lightweight CI
matrix consume them.

### Constraints and invariants

- `AGENTS.md` requires truthful closeout evidence, no hidden debt, and
  `pnpm verify:prepush` before presenting the slice as ready.
- `docs/guides/ai-work-protocol.md` requires think-first and a
  pre-implementation brief before code/config changes land.
- `docs/planning/proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md`
  defines Wave 2 as package-contract normalization first, then governed Turbo
  adoption for `typecheck` and `test`.
- `docs/planning/closeouts/20260418-rc-c2-turbo-build-orchestrator-closeout.md`
  established the direct-package invariant: `pnpm --filter <pkg> build` must
  remain safe outside Turbo, so this slice must not break package-local
  fallback behavior.
- `docs/planning/closeouts/20260422-rc-c2-wave-2a-typecheck-contract-closeout.md`
  made package `typecheck` ownership explicit for the current workspace graph;
  this slice may now consume that contract, but it must not over-claim root
  `type-check` convergence.
- The slice should stay outside ARC-triggering package paths if the same gain
  can be achieved through root tooling, workflow, and documentation wiring.

### Options considered

- Keep the current recursive `pnpm` affected commands and stop after Wave 2A.
- Move the full-root `type-check` and full-root `test` contracts to Turbo now.
- Add governed Turbo `typecheck` and `test` tasks, then rewire only the
  affected local commands and the lightweight CI matrix lanes that can safely
  consume them.

### Selected option and rationale

Add governed Turbo `typecheck` and `test` tasks, then rewire only the affected
local commands and the `CI - Code Quality` workspace matrix lanes that can
safely consume them.

This is the smallest truthful follow-up after Wave 2A:

- it creates explicit Turbo task ownership instead of relying on an undeclared
  graph
- it gives local affected commands and the code-quality matrix a reusable
  orchestrated path
- it avoids prematurely rewriting the full-root `type-check` or the more
  complex `Test Suite` workflow lanes, which still have bespoke package/test
  routing and integration behavior

### Rejected alternatives

- stop after Wave 2A: rejected because the package contract would remain
  normalized but underused
- full-root Turbo migration now: rejected because it would batch together a
  truthful affected-work improvement with a broader root-command contract
  rewrite that has not been designed yet

## Pre-Implementation Brief

- Mode: `Full`
- Scope:
  - extend `turbo.json` with governed `typecheck` and `test` task contracts
  - add a root wrapper that runs Turbo workspace tasks with an explicit
    orchestrated environment and a reproducible filter contract
  - rewire `ci:affected:build`, `ci:affected:typecheck`, and
    `ci:affected:test` to that wrapper
  - rewire the `CI - Code Quality` affected-workspace matrix `build` and
    `typecheck` steps to the same wrapper with explicit package filters
  - add CI-tool regression coverage for the new Turbo task and wrapper
    contract
  - update the canonical CI/testing guide and active RC-C2 planning surfaces
- Touched files or paths:
  - `turbo.json`
  - `package.json`
  - `.github/workflows/ci.yml`
  - new wrapper under `scripts/`
  - new or updated CI-tool test under `tools/ci/`
  - `scripts/README.md`
  - `docs/guides/testing-and-ci-capabilities.md`
  - `docs/planning/proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md`
  - `docs/planning/state/agent-lane-c.yaml`
  - this closeout file
- Expected outcome:
  - Turbo owns explicit `build`, `typecheck`, and `test` task definitions
  - local affected commands route through Turbo instead of raw recursive `pnpm`
  - the `CI - Code Quality` matrix can reuse the same orchestrated task path
    for affected build/typecheck lanes
  - direct package `build`, `typecheck`, and `test` commands remain safe when
    run outside Turbo
- Risks and mitigations:
  - risk: the wrapper skips package-local dependency builds without Turbo owning
    the graph correctly
  - mitigation: keep task dependencies explicit in `turbo.json` and restrict
    the wrapper to governed tasks only
  - risk: the code-quality matrix loses visibility into which phase failed
  - mitigation: keep separate build and typecheck steps in `ci.yml`, even when
    both route through the same wrapper
  - risk: Turbo `test` semantics diverge from the current full-root test suite
  - mitigation: limit workflow rewiring to the affected local command and keep
    `Test Suite` package-specific lanes out of scope
- Out of scope:
  - rewriting root `type-check`
  - rewriting full-root `pnpm test`
  - migrating the PR `Test Suite` package test matrix to Turbo
  - Turbo remote cache rollout beyond the already-shipped `.turbo` restore
  - TypeScript project references
- Validation plan:
  - CI-tool regression tests for the wrapper/task contract
  - targeted `turbo` dry-run or task execution checks on representative
    packages
  - `pnpm ci:affected:typecheck`
  - `pnpm ci:affected:test`
  - `pnpm test:ci-tools`
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm lint:md`
  - `pnpm docs:gov:locations`
  - `pnpm docs:quality:check`
  - `pnpm verify:prepush`
- Test coverage plan:
  - reject unsupported wrapper task names
  - verify the wrapper defaults to the `origin/main` affected filter
  - verify the wrapper injects the orchestrated environment needed to skip
    redundant package-local pre-hooks
  - verify `turbo.json` declares governed `typecheck` and `test` tasks instead
    of leaving them implicit
- Libraries evaluated:
  - no new library is required

## Implementation Log

- Added governed `typecheck` and `test` task contracts to `turbo.json` while
  preserving the existing `build` graph.
- Added `scripts/run-turbo-workspace-task.cjs` as the canonical wrapper for
  governed Turbo workspace tasks. The wrapper allows only `build`,
  `typecheck`, and `test`, defaults to the affected-work filter
  `...[origin/main]`, and accepts an explicit `--filter` override for CI matrix
  package targets.
- Rewired the root `ci:affected:build`, `ci:affected:typecheck`, and
  `ci:affected:test` commands to the wrapper instead of raw recursive `pnpm`
  execution.
- Rewired the `CI - Code Quality` affected-workspace matrix `build` and
  `typecheck` steps to the same wrapper, so local affected commands and the
  lightweight CI matrix now share one Turbo-backed path.
- Added `tools/ci/turbo-workspace-task-contract.test.mjs` to lock the wrapper,
  task-definition, global-dependency, and workflow-wiring contract.
- Added `tools/ci/skip-pretest-if-ci-contract.test.mjs` and updated
  `scripts/skip-pretest-if-ci.cjs` so `pretest` and `pretypecheck` now skip
  redundant dependency builds when `TURBO_HASH` proves Turbo already owns the
  graph, not only when `DVT_CI` is set.
- During validation, discovered that Turbo `envMode: strict` does not make the
  wrapper's shell env sufficient on its own for package-local lifecycle hooks.
  Kept the wrapper simple and fixed the actual root cause by teaching the
  helper to respect `TURBO_HASH`.
- During forced revalidation, discovered that `skip-pretest-if-ci.cjs` was not
  part of Turbo's hash inputs. Added it to `turbo.json.globalDependencies` so
  helper changes invalidate cached `typecheck` and `test` results instead of
  replaying stale logs.
- Updated `scripts/README.md`, the canonical CI/testing guide, the integrated
  CI/delivery plan, Lane C state, and this closeout so the new orchestration
  path and its boundaries are discoverable.

## Gain Evidence

- `pnpm ci:affected:build` now routes through the Turbo graph and completed
  with `24` successful tasks, `5` of them restored from cache in the current
  worktree.
- `pnpm ci:affected:typecheck` now routes through governed Turbo `typecheck`
  tasks and completed with `40` successful tasks, `17` of them restored from
  cache after the affected build pass.
- `pnpm ci:affected:test` now routes through governed Turbo `test` tasks and
  completed with `39` successful tasks, `16` of them restored from cache while
  preserving the existing package test commands.
- `pnpm exec turbo run typecheck --filter=@dvt/engine --force` showed the
  package `pretypecheck` hook no longer cascades into
  `pnpm --filter "@dvt/engine^..." build` when Turbo already owns the graph;
  the hook returns immediately and the task proceeds directly to
  `tsc --noEmit`.
- `pnpm exec turbo run test --filter=@dvt/planner-contracts --dry=json`
  confirmed the one workspace without a `test` script does not break the
  governed `test` graph; Turbo schedules only the dependency build contract and
  exits cleanly.

## Validation Evidence

- `pnpm test:ci-tools`
  - passed twice during the slice
  - final green run: `45/45` tests
- `pnpm exec eslint --max-warnings 0 tools/ci/turbo-workspace-task-contract.test.mjs tools/ci/skip-pretest-if-ci-contract.test.mjs scripts/run-turbo-workspace-task.cjs scripts/skip-pretest-if-ci.cjs`
  - passed
- `pnpm exec prettier --check turbo.json package.json .github/workflows/ci.yml scripts/run-turbo-workspace-task.cjs scripts/skip-pretest-if-ci.cjs tools/ci/turbo-workspace-task-contract.test.mjs tools/ci/skip-pretest-if-ci-contract.test.mjs scripts/README.md docs/guides/testing-and-ci-capabilities.md docs/planning/proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md docs/planning/state/agent-lane-c.yaml docs/planning/closeouts/20260423-rc-c2-wave-2b-turbo-affected-task-routing-closeout.md`
  - passed after one corrective `prettier --write turbo.json`
- `node scripts/run-turbo-workspace-task.cjs build --filter=@dvt/contracts`
  - passed
- `node scripts/run-turbo-workspace-task.cjs test --filter=@dvt/contracts`
  - passed
- `node scripts/run-turbo-workspace-task.cjs test --filter=@dvt/planner-contracts`
  - passed
  - verified the missing package-local `test` script path exits cleanly under
    the governed graph
- `pnpm exec turbo run typecheck --filter=@dvt/engine --force`
  - passed
  - verified the `TURBO_HASH`-aware helper prevents redundant nested dependency
    builds inside `pretypecheck`
- `pnpm ci:affected:build`
  - passed
  - `24/24` tasks successful, `5` cached
- `pnpm ci:affected:typecheck`
  - passed
  - `40/40` tasks successful, `17` cached
- `pnpm ci:affected:test`
  - passed
  - `39/39` tasks successful, `16` cached
- `pnpm docs:sync`
  - passed
- `pnpm docs:workboard:generate`
  - passed
- `pnpm lint:md`
  - passed with `0` markdownlint errors across `1270` files
- `pnpm docs:gov:locations`
  - passed with `OK`
- `pnpm docs:quality:check`
  - passed with `OK`
  - emitted inherited non-blocking warnings for pre-existing non-English docs
    outside this slice
- `pnpm verify:prepush`
  - passed with exit `0`
  - this run exercised the repository's current root `type-check` gate as part
    of the pre-push baseline, which remains intentionally out of scope of this
    slice's Turbo migration

## No-Debt / No-Stub Evidence

- No ARC-triggering package path was modified; this slice stayed inside root
  tooling, workflow wiring, tests, and governed docs.
- No rule, hook, or quality gate was removed or relaxed.
- No stub, placeholder, or fake implementation was introduced.
- The slice did not rewrite the full-root `type-check` or `test` contracts and
  does not claim those broader migrations are complete.
