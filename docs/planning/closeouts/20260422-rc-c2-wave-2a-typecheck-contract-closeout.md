---
slice: rc-c2-wave-2a-typecheck-contract
date: 2026-04-22
last_reviewed: 2026-04-22
gap: maintenance
author: AI (Codex)
---

# Closeout: RC-C2 wave 2A package typecheck contract normalization

## Think-First

### Problem summary

Wave 1 reduced avoidable local and CI cost, but the repository still cannot
truthfully claim a package-level `typecheck` graph:

- the root `ci:affected:typecheck` command only runs `typecheck` where it
  exists and silently skips the rest
- most TypeScript package workspaces still expose `build` without a canonical
  `typecheck` script
- the integrated Wave 2 plan explicitly blocks Turbo `typecheck` adoption until
  this script ownership is made explicit

That means the repo has the shape of affected type-check routing, but not yet
the package-script contract required to trust it.

### Root cause

The repository grew with mixed local conventions:

- some workspaces added `typecheck` once they needed a dedicated no-emit or
  test-TS check
- others stayed on `build` only because their compile command already used
  `tsc`
- the root `type-check` script retained a top-level `tsc --noEmit` fallback,
  which masked the missing package-level ownership and reduced pressure to
  normalize workspace scripts

This left the graph operational but semantically inconsistent.

### Constraints and invariants

- `AGENTS.md` requires canonical planning surfaces, no hidden debt, and
  `pnpm verify:prepush` before the slice is presented as ready.
- `docs/guides/ai-work-protocol.md` requires think-first and a
  pre-implementation brief before code/config changes.
- `docs/planning/proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md`
  defines the Wave 2 guardrail: no Turbo `typecheck` adoption until the
  package-script contract is explicit.
- `package.json` already routes affected type-checking through
  `pnpm -r --filter "...[origin/main]" --if-present run typecheck`, so missing
  workspace scripts are real blind spots rather than theoretical drift.
- This slice may touch `packages/@dvt/contracts/**`,
  `packages/@dvt/adapter-temporal/**`, and `packages/@dvt/engine/**`; ARC-2
  evidence and risk updates are therefore a future PR requirement if this
  worktree is later prepared for PR creation.

### Options considered

- keep the current mixed script contract and defer all normalization to the
  future Turbo rollout
- add a CI-tool test that documents the requirement but defer package fixes
- normalize the package contract now for TypeScript build workspaces, then let
  the existing affected `typecheck` command start covering them honestly

### Selected option and rationale

Normalize the package contract now for the current TypeScript build workspaces.

The repo already has a clear dominant pattern: the missing workspaces build with
`tsc -p tsconfig.json` or `tsc -b tsconfig.json`. Adding a canonical
no-emit `typecheck` script to those packages is low-risk, makes the current
affected-workspace command truthful, and clears the specific Wave 2 blocker
without prematurely changing Turbo or root orchestration semantics.

### Rejected alternatives

- defer everything to the Turbo rollout: rejected because it would preserve a
  known blind spot and let a later Turbo change claim a graph the repo does not
  yet own
- test-only enforcement without package fixes: rejected because it creates
  governed red output without delivering the actual contract normalization this
  wave is supposed to achieve

## Pre-Implementation Brief

- Mode: `Full`
- Scope:
  - add a CI-tool regression test that fails when a workspace with `build`
    lacks a canonical `typecheck` script
  - add `typecheck` scripts to the current TypeScript package workspaces that
    already build through `tsc`
  - preserve any stricter package-specific behavior that already exists
  - update the canonical CI/testing guide and Lane C / closeout surfaces for
    this Wave 2A slice
- Touched files or paths:
  - `tools/ci/*.test.mjs`
  - package manifests under `packages/@dvt/*/package.json` for the affected
    TypeScript build workspaces
  - `docs/guides/testing-and-ci-capabilities.md`
  - `docs/planning/state/agent-lane-c.yaml`
  - `docs/planning/proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md`
  - this closeout file
- Expected outcome:
  - affected workspace type-check routing stops silently skipping the current
    TypeScript package build workspaces
  - the repo has an explicit package-level `typecheck` contract for the
    workspaces that are obvious candidates for Wave 2
  - Turbo `typecheck` remains out of scope, but its main guardrail is reduced
    by one real blocker
- Risks and mitigations:
  - risk: a package `typecheck` script diverges from the package’s current
    build semantics
  - mitigation: limit this slice to workspaces whose `build` already runs
    TypeScript directly and mirror that command with `--noEmit`
  - risk: test-only or integration-only TS configs remain out of contract
  - mitigation: preserve stricter package-local follow-on scripts where they
    already exist and keep this slice scoped to the minimum truthful baseline
  - risk: root `type-check` remains broader than package `typecheck`
  - mitigation: treat that as a later Wave 2 follow-up instead of claiming it
    is solved here
- Out of scope:
  - Turbo `typecheck`
  - Turbo `test`
  - root `type-check` script refactoring
  - TypeScript project references
  - coverage threshold changes
- Validation plan:
  - red/green run for the new CI-tool contract test
  - `pnpm test:ci-tools`
  - targeted `pnpm --filter <pkg> typecheck` checks for touched representative
    packages
  - docs validation for the updated canonical guide and planning closeout
  - `pnpm verify:prepush`
- Test coverage plan:
  - fail when a workspace with `build` lacks `typecheck`
  - stay green for workspaces that already expose a compliant `typecheck`
  - use the real workspace inventory from tracked `package.json` files rather
    than a mocked list
- Libraries evaluated:
  - no new library is required

## Implementation Log

- Added `tools/ci/workspace-typecheck-contract.test.mjs` as a CI-tool
  regression test that fails whenever a workspace exposes `build` without a
  canonical `typecheck` script.
- Drove the slice through a red/green cycle before changing package manifests:
  the first test run failed with the current list of 16 package workspaces that
  still had `build` but no `typecheck`.
- Added canonical `typecheck` scripts to the current TypeScript package
  workspaces that previously only exposed `build`:
  - `@dvt/adapter-temporal`
  - `@dvt/artifacts`
  - `@dvt/crypto`
  - `@dvt/cli`
  - `@dvt/contracts`
  - `@dvt/delivery`
  - `@dvt/dsl`
  - `@dvt/engine`
  - `@dvt/observability`
  - `@dvt/observability-otel`
  - `@dvt/plan-interpreter`
  - `@dvt/plan-verifier`
  - `@dvt/planner`
  - `@dvt/planner-contracts`
  - `@dvt/run-domain`
  - `@dvt/state-store`
- Added package-local `pretypecheck` hooks only where the package already
  relied on built workspace outputs or an existing dependency-build hook:
  - `@dvt/adapter-temporal`
  - `@dvt/delivery`
  - `@dvt/engine`
  - `@dvt/observability-otel`
  - `@dvt/planner`
  - `@dvt/run-domain`
  - `@dvt/state-store`
- Kept root orchestration intentionally out of scope. This slice does not
  change root `type-check`, Turbo task ownership, or the root command graph; it
  only makes the package-level `typecheck` contract explicit enough for the
  existing affected-workspace command to become truthful.
- Updated `docs/guides/testing-and-ci-capabilities.md` so the canonical guide
  now states that every current buildable workspace exposes `typecheck` and
  explains why some packages keep `pretypecheck`.
- Updated the integrated CI/delivery proposal and Lane C planning state so the
  Wave 2A contract-normalization slice is recorded as a real RC-C2 continuation.

## Validation Evidence

- `node --test tools/ci/workspace-typecheck-contract.test.mjs`
  - first run: failed in red state and listed 16 workspaces with `build` but no
    `typecheck`
  - second run after manifest normalization: passed
- `pnpm test:ci-tools`
  - passed with `39/39` tests green
- `pnpm --filter @dvt/contracts typecheck`
  - passed
- `pnpm --filter @dvt/engine typecheck`
  - passed
  - verified the new `pretypecheck` hook builds the existing dependency graph
    before `tsc --noEmit`
- `pnpm --filter @dvt/adapter-temporal typecheck`
  - passed
  - verified the package-level `typecheck` command includes the existing
    `typecheck:test` coverage
- `pnpm ci:affected:typecheck`
  - first run: timed out under the local command timeout, without a code
    failure classification
  - second run with an extended timeout: passed
  - the passing run exercised `typecheck` across `24/25` workspace projects and
    confirmed the current affected-workspace route no longer skips the newly
    normalized packages
- `pnpm docs:sync`
  - passed
- `pnpm docs:workboard:generate`
  - passed
- `pnpm lint:md`
  - passed with `0` markdownlint errors across `1269` files
- `pnpm docs:gov:locations`
  - passed with `OK`
- `pnpm docs:quality:check`
  - passed with `OK`
  - emitted inherited non-blocking warnings for pre-existing non-English docs
    outside this slice
- `pnpm exec eslint --max-warnings 0 tools/ci/workspace-typecheck-contract.test.mjs`
  - passed
- `pnpm exec prettier --check tools/ci/workspace-typecheck-contract.test.mjs docs/guides/testing-and-ci-capabilities.md docs/planning/proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md docs/planning/state/agent-lane-c.yaml docs/planning/closeouts/20260422-rc-c2-wave-2a-typecheck-contract-closeout.md packages/@dvt/adapter-temporal/package.json packages/@dvt/artifacts/package.json packages/@dvt/canonical/package.json packages/@dvt/cli/package.json packages/@dvt/contracts/package.json packages/@dvt/delivery/package.json packages/@dvt/dsl/package.json packages/@dvt/engine/package.json packages/@dvt/observability/package.json packages/@dvt/observability-otel/package.json packages/@dvt/plan-interpreter/package.json packages/@dvt/plan-verifier/package.json packages/@dvt/planner/package.json packages/@dvt/planner-contracts/package.json packages/@dvt/run-domain/package.json packages/@dvt/state-store/package.json`
  - passed after one corrective `prettier --write` pass on the manually edited
    manifests and planning files
- `pnpm verify:prepush`
  - passed with exit `0`
  - note: as in Wave 1, this command uses changed-only diff logic against the
    current git base and did not see the uncommitted worktree changes in this
    local execution, so the explicit lint/format/typecheck/docs commands above
    are the real validation evidence for the slice

## No-Debt / No-Stub Evidence

- No quality gate was removed or relaxed.
- No exception allowlist was added to hide missing workspaces from the new
  contract test.
- No stub, placeholder, or fake `typecheck` command was introduced; every new
  script executes a real `tsc --noEmit` path, and `@dvt/adapter-temporal`
  preserves its existing stricter test type-check.
- No Turbo `typecheck` claim was made. The root/task-graph follow-on work
  remains explicitly out of scope until the broader Wave 2 contract is ready.
- No hooks were bypassed.
- This slice is implementation-complete and locally validated, but it is not
  yet PR-complete for ARC purposes: because it touches
  `packages/@dvt/contracts/**`, `packages/@dvt/adapter-temporal/**`, and
  `packages/@dvt/engine/**` package manifests, a later PR-preparation pass for
  this worktree must still add the required ARC-2 evidence and risk files
  before opening a PR.
