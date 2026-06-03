---
title: CI affected preflight test dedupe closeout
status: Accepted
owner: engineering
last_reviewed: 2026-06-02
planning_type: closeout
---

# CI Affected Preflight Test Dedupe Closeout

## Think-First Analysis

- Problem summary: ordinary pull requests with workspace changes were paying
  for affected package tests in `CI - Code Quality` through
  `pnpm preflight:affected` while `Test Suite` already owned package and
  dedicated test execution for the same pull request.
- Root cause: the local affected preflight command was reused as the remote
  Code Quality command after the repository moved PR tests into a scoped Test
  Suite workflow. That kept local operator convenience, but created remote test
  duplication.
- Constraints and invariants: GitHub workflows remain authoritative merge
  gates, ordinary PRs should prefer affected routing, local commands must keep a
  complete operator path, and Turbo-backed commands must stay governed by
  `turbo.json` plus CI tool contract tests.
- Options considered:
  - Remove `ci:affected:test` from `preflight:affected`: rejected because it
    would weaken the local one-command PR preflight.
  - Keep duplicated tests in Code Quality: rejected because it spends another
    Turbo test pass without adding a distinct remote gate.
  - Add a CI-only affected preflight command: selected because it removes the
    remote duplicate while preserving local test coverage and the Test Suite
    ownership model.
- Fowler opportunity matrix: duplicate semantics in CI orchestration; owner is
  CI governance; command surface is the repository package-script catalog;
  implementation surfaces are `package.json`, GitHub workflows, CI tool
  contracts, and the testing/CI guide; out of scope is weakening Test Suite,
  branch protection, or package test commands.

## Work Completed

- Added `pnpm preflight:affected:ci` for build/lint/type-check-only PR Code
  Quality routing.
- Kept `pnpm preflight:affected` as the full local affected build, lint,
  type-check, and test command.
- Updated `CI - Code Quality` to call `pnpm preflight:affected:ci`.
- Updated the adapter-postgres nightly dependency graph build to use the
  governed Turbo wrapper.
- Updated the mandatory AI CI preflight automation plan so the nightly workflow
  change is inside declared feature-mechanization surfaces.
- Updated CI contract tests and the repository command catalog.
- Updated the testing and CI guide to document the local/remote split.
- Added changed-slice routing for `tools/ci` source and test edits so one-file
  CI-tooling iterations run direct adjacent `node --test` suites instead of
  escalating to the broad `pnpm test:ci-tools` contract by default.
- Kept draft PRs cheap while adding `ready_for_review` Test Suite routing so
  draft-to-ready PRs regain affected package test coverage before merge.

## Validation Plan

- `node --test tools/ci/turbo-workspace-task-contract.test.mjs`
- `node --test tools/ci/workflow-pattern-parity.test.mjs`
- `node --test tools/ci/repository-command-catalog.test.mjs`
- `pnpm docs:sync`
- `pnpm governance:refresh`
- `node --test scripts/verify-changed.test.cjs`
- `node --test tools/ci/workflow-pattern-parity.test.mjs`
- `pnpm verify:prepush`

## No-Debt And No-Stub Evidence

- No checks were disabled or relaxed.
- No package test command was removed.
- No fake success path, placeholder, or TODO was added.
- Remote package tests remain covered by `Test Suite`; local affected preflight
  remains full.
