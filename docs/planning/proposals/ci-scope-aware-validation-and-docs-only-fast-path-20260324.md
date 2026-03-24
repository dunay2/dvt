---
title: CI Scope-Aware Validation And Docs-Only Fast Path
status: Proposed
owner: Core Architecture / Delivery / Docs / Engineering Productivity
last_reviewed: 2026-03-24
planning_type: proposal
---

# CI Scope-Aware Validation And Docs-Only Fast Path

## Proposal Set Context

This document belongs to the repository-governance proposal set and should be
read together with:

- [CI Workflow Deduplication Plan](ci-workflow-deduplication-plan-20260307.md)
- [Package Module Build Policy v2](package-module-build-policy-v2-20260317.md)
- [Documentation Usability Change Plan](documentation-usability-change-plan-20260308.md)
- [Repository Governance Proposal Set 2026-03-17](repository-governance-proposal-set-20260317.md)

This proposal is the next operational slice after CI deduplication:

- deduplication makes the workflow logic reusable
- this proposal makes the reusable logic scope-aware
- the end state is faster PR validation without weakening required checks

## Goal

Make repository CI behave differently for different change scopes while keeping
the merge gate strict:

- docs-only changes should run docs governance and metadata checks, but skip
  unrelated package tests and full type-check sweeps
- code changes should run affected package tests and shared gates that match the
  touched surface
- merge-critical workflows should continue to run the full required set on main
  and on explicit full-suite dispatches

## Problem Statement

The current CI model is only partially scope-aware.

- `test.yml` already filters package tests by changed paths, but it still
  couples some root-level config changes to broader execution.
- `pr-quality-gate.yml` always runs the documentation governance suite and a
  repo-wide type-check gate, even when the PR only changes docs.
- Several checks still rely on inline workflow policy instead of a shared,
  testable change-scope module.
- Local developer commands and CI behavior are not yet aligned by explicit
  scope families, which makes the merge gate harder to predict.

This creates two classes of waste:

1. docs-only PRs consume unnecessary CI time on code paths they cannot affect.
2. code PRs still duplicate scope knowledge across workflows, so policy drift is
   easy to introduce.

## Non-Goals

- Do not weaken required checks for code changes.
- Do not remove documentation governance checks.
- Do not replace the current `pnpm`-based monorepo execution model.
- Do not redesign GitHub Actions from scratch.
- Do not move repository governance out of tracked docs and scripts.

## Design Principles

1. Scope must be defined once and reused by workflows and local commands.
2. Docs-only changes should still be governed, but not by irrelevant code gates.
3. Workflow YAML should orchestrate; repository scripts should decide scope.
4. Required checks for merge safety must remain explicit and auditable.
5. Any optimization must preserve the current failure semantics for code changes.

## Proposed End State

The CI model should end up with three clearly separated execution classes:

1. `docs-only`
   - documentation sync
   - docs quality / doctor / canonical / status / capability checks
   - markdown location, frontmatter, and link validation
   - no package-level test fan-out unless docs touch code-sensitive surfaces

2. `code-changed`
   - affected workspace tests
   - relevant type-check subsets
   - contract or determinism gates when their scope matches the change
   - full docs governance only when docs or governance files were touched

3. `full-gate`
   - full test suite
   - full type-check / compile gates
   - manual dispatch and main-branch protection flows

## Proposal

Introduce a shared scope-policy layer under `tools/ci` and make both workflow
files consume it.

### 1. Shared Scope Classification

Add a canonical scope emitter that returns one of:

- `docs_only`
- `code_changed`
- `contracts_or_determinism`
- `adapter_temporal`
- `adapter_postgres`
- `api`
- `engine`
- `cli`
- `full_gate`

The scope emitter should be deterministic and testable from the command line.

### 2. Workflow Reuse

Refactor:

- [`.github/workflows/test.yml`](../../../.github/workflows/test.yml)
- [`.github/workflows/pr-quality-gate.yml`](../../../.github/workflows/pr-quality-gate.yml)

so they call the shared scope script instead of maintaining separate inline
scope policy.

### 3. Docs-Only Fast Path

For PRs that only touch docs/governance files:

- keep docs validation enabled
- skip package test fan-out
- skip broad type-check unless docs touched the build contract surface
- preserve merge blockers on structural docs failures

### 4. Code-Changed Fast Path

For PRs that touch code:

- run only affected package tests by default
- keep contract or determinism gates when relevant
- keep adapter integration checks when relevant
- maintain explicit fallback to full-suite dispatch for uncertain cases

### 5. Local/CI Parity Commands

Add root scripts that mirror the scope classes so contributors can reproduce CI
locally with the same decision boundaries.

Examples:

- `pnpm ci:scope`
- `pnpm ci:docs-only`
- `pnpm ci:code-changed`
- `pnpm ci:full`

## Workstreams

### WS1 - Scope Policy Module

Deliver a shared scope classifier in `tools/ci`.

Outputs:

- canonical scope detection logic
- testable scope emitters for workflows
- a small CLI contract for local debugging

### WS2 - Test Workflow Refactor

Refactor `test.yml` to use the shared scope policy.

Outputs:

- affected-package execution remains correct
- docs-only PRs skip irrelevant package tests
- push/main still supports full suite behavior

### WS3 - PR Quality Gate Refactor

Refactor `pr-quality-gate.yml` to use the same scope classifier.

Outputs:

- docs-only PRs keep doc governance checks
- type-check and integration gates become scope-aware
- quality behavior becomes predictable from the shared policy

### WS4 - Local Parity Scripts

Add root scripts for the same scope classes.

Outputs:

- one-command local reproduction for docs-only and code-changed PRs
- less guesswork when validating CI locally

### WS5 - Workflow Contract Tests

Add tests for the scope classifier and, where possible, workflow-parity tests.

Outputs:

- representative changed-file scenarios
- docs-only, code-only, and mixed-change coverage
- regression guard against accidental broadening or narrowing

## Dependencies

- Builds on [CI Workflow Deduplication Plan](ci-workflow-deduplication-plan-20260307.md)
- Requires stable doc-governance commands already present in `package.json`
- Depends on the current planning indexes and workflow scripts staying canonical
- Should be aligned with any future `docs:ci` aggregation or policy script
  consolidation work

## Risks

### Scope Drift

If the shared classifier misses a file pattern, CI may skip a required check.

Mitigation:

- centralize the path inventory once
- add fixture-based tests for representative file sets
- preserve fallback-to-full-gate behavior for ambiguous cases

### False Optimization

If docs-only detection is too aggressive, it may bypass checks that should
remain on.

Mitigation:

- keep merge-critical docs checks always enabled
- treat governance and contract files as conservative triggers

### Policy Duplication

If workflows keep their own inline exceptions, the shared policy will drift.

Mitigation:

- ban new inline path inventories in workflow YAML
- make workflow files consume the script output directly

### Local/CI Mismatch

If local scripts do not match workflow behavior, developers will not trust the
scopes.

Mitigation:

- add root scripts with the same names and semantics
- validate them in CI and in local closeout commands

## Acceptance Criteria

1. Docs-only PRs execute the docs governance path and skip unrelated package
   tests.
2. Code PRs run the affected tests for the touched workspace(s).
3. `test.yml` and `pr-quality-gate.yml` consume a shared scope classifier.
4. Local root scripts reproduce the same scope decisions as CI.
5. Scope classifier tests cover docs-only, code-only, mixed, and ambiguous
   inputs.
6. `pnpm verify:prepush` still passes after the refactor.

## Suggested Delivery Order

1. Add the shared scope classifier and tests.
2. Rewire `test.yml`.
3. Rewire `pr-quality-gate.yml`.
4. Add local parity scripts.
5. Validate against representative docs-only and code-only branches.

## Related Files

- [`.github/workflows/test.yml`](../../../.github/workflows/test.yml)
- [`.github/workflows/pr-quality-gate.yml`](../../../.github/workflows/pr-quality-gate.yml)
- [`package.json`](../../../package.json)
- [`tools/ci`](../../../tools/ci)
