---
title: CI Improvement Plan — Reliability, Scope-Awareness, And Deduplication
status: Proposed
owner: engineering
last_reviewed: 2026-03-27
planning_type: proposal
---

# CI Improvement Plan — Reliability, Scope-Awareness, And Deduplication

## Context

This document consolidates three prior CI improvement proposals into a single
actionable plan:

- `ci-workflow-deduplication-plan-20260307.md` (structural deduplication)
- `ci-scope-aware-validation-and-docs-only-fast-path-20260324.md` (scope routing)
- `ci-reliability-and-coverage-gaps-20260327.md` (defects and coverage gaps)

The problems addressed form a single system: the CI pipeline has duplicated scope
logic, it is not fully scope-aware, and it has concrete reliability defects and
coverage gaps. Addressing them together produces a coherent target state rather
than three independent improvements applied in sequence.

This proposal belongs to the repository governance set:

- [Repository Governance Proposal Set 2026-03-17](repository-governance-proposal-set-20260317.md)
- [Package Module Build Policy v2](package-module-build-policy-v2-20260317.md)
- [Documentation Usability Change Plan](documentation-usability-change-plan-20260308.md)

---

## Problem Statement

### Structural problems

Change-scope detection is implemented independently in `ci.yml`, `test.yml`,
`contracts.yml`, and `pr-quality-gate.yml`. Each workflow maintains its own
`dorny/paths-filter` blocks with overlapping paths. A new package, a new path
rule, or a new quality gate requires edits in multiple files with drift risk
between local commands and merge-gate behavior.

Workflow YAML contains long inline shell and JavaScript blocks for schema
validation, determinism scans, PR metadata checks, and hash-scope detection.
These are hard to test, review, and evolve independently.

### Scope-awareness gaps

The current CI model is only partially scope-aware:

- `ci.yml` has a `docs_only` fast-path that skips package builds. (Implemented
  in PR #633.)
- `pr-quality-gate.yml` does not apply the same filter: it runs a full global
  `pnpm type-check` and all documentation governance checks on every PR,
  including pure documentation changes. This adds 3–5 minutes to docs-only PRs.
- `test.yml` filters package tests by changed paths for PRs but still re-runs
  the full suite on push without distinction.

### Defects and gaps

The following concrete defects exist in the current baseline regardless of
deduplication or scope routing:

1. **pnpm store cache path is wrong.** `setup-node-pnpm/action.yml` caches
   `~/.pnpm-store`. On pnpm 9+ / pnpm 10 running on Linux, the default store is
   `~/.local/share/pnpm/store/v3`. If the runner does not configure `store-dir`,
   the cache key never hits. Every CI job performs a full cold install.

2. **`apps/api` and `apps/web` tests are never executed.** `test.yml` covers
   `engine`, `contracts`, `adapter-temporal`, and `cli`. Both application
   workspaces are absent. Regressions in those packages cannot be caught before
   merge.

3. **`adapter-postgres-smoke-guard` uses polling instead of events.** The guard
   job polls the GitHub Checks API for up to 10 minutes waiting for the
   `Adapter Postgres Smoke` check from `test.yml`. If the job takes longer than
   10 minutes or the check name changes, the gate fails silently.

4. **`pr-quality-gate.yml` does not run on `push: branches: [main]`.** After
   merge, ARC policy validation, docs sync coherence, documentation quality, and
   global type-check are never re-run. There is no post-merge safety net.

5. **`docs/decisions/**`is a dead path in`contracts.yml`.** The ADR directory
is `docs/adr/`, not `docs/decisions/`. The filter entry matches nothing and
   adds confusion.

6. **GitHub Actions are pinned by mutable tags.** All workflow steps reference
   actions by tag (`@v6`, `@v5`, `@v4`). Tags can be redirected. The supply chain
   standard is to pin by commit SHA with the tag recorded in a comment.

7. **`npx --yes ajv-cli@5` installs a tool at runtime.** `contracts.yml` uses
   `npx --yes` to download `ajv-cli` on every run without a pinned patch version.
   This adds latency and supply chain surface.

8. **No test coverage gate.** `package.json` has `test:coverage` but no workflow
   invokes it. No minimum threshold is configured or enforced.

9. **`golden-paths.yml` provides no automatic validation.** It is
   `workflow_dispatch` only, depends on artifacts from a prior workflow run, and
   produces no blocking gate. The actual golden path validation runs inside
   `contracts.yml`.

---

## Non-Goals

- Replace `pnpm` with TurboRepo or a different monorepo orchestration tool.
- Redesign the repository CI policy from scratch.
- Remove existing required quality gates.
- Change the merge policy or PR process.

---

## Design Principles

1. One source of truth for change-scope definitions. No workflow maintains its
   own independent path inventory.
2. Workflow YAML orchestrates. Repository scripts under `tools/ci` implement
   decision logic.
3. Local commands and CI gates remain aligned. Every CI scope class must be
   reproducible locally.
4. Required checks remain semantically equivalent through all refactoring.
5. Changes are incremental and reviewable in small thematic PRs.
6. Docs-only changes are still governed, but not by irrelevant code gates.

---

## Target End State

### Structural

- Shared scope detection module in `tools/ci/scope-config.mjs`.
- All four workflows (`ci.yml`, `test.yml`, `contracts.yml`,
  `pr-quality-gate.yml`) consume the shared module instead of maintaining
  independent path inventories.
- Complex inline policy logic extracted to named scripts under `tools/ci` or
  `scripts/`.

### Scope classes

Three clearly separated execution classes:

1. **`docs-only`** — documentation sync, docs quality and governance checks,
   markdown location, frontmatter and link validation. No package-level test
   fan-out unless the docs touch code-sensitive surfaces.

2. **`code-changed`** — affected workspace tests and type-check subsets.
   Contract or determinism gates when the change scope matches. Full docs
   governance only when docs or governance files were also touched.

3. **`full-gate`** — full test suite, full type-check and compile gates. Used
   for push to main and manual workflow dispatch.

### Reliability

- pnpm store cache resolves the correct path from `pnpm store path`.
- `apps/api` and `apps/web` test runs are gated in `test.yml`.
- `adapter-postgres-smoke-guard` replaced by an event-driven or branch-protection
  approach.
- `pr-quality-gate.yml` added to `push: branches: [main]`.
- All GitHub Actions pinned by commit SHA.
- `ajv-cli` is a root workspace devDependency, not a runtime `npx` download.
- Coverage thresholds configured and enforced for `engine` and `contracts`.

---

## Issue Catalogue

| ID  | Issue                                                               | Severity | Effort  | Valor | Status  |
| --- | ------------------------------------------------------------------- | -------- | ------- | ----- | ------- |
| D1  | Scope detection duplicated across 4 workflows                       | Medium   | High    | Medio | Open    |
| D2  | Long inline policy blocks in YAML                                   | Medium   | Medium  | Medio | ✅ Done |
| D3  | Local commands not aligned to CI scope classes                      | Low      | Medium  | Poco  | ✅ Done |
| S1  | `pr-quality-gate.yml` runs full type-check on all PRs               | Medium   | Low     | Alto  | ✅ Done |
| S2  | No local scripts for CI scope reproduction                          | Low      | Medium  | Poco  | ✅ Done |
| R1  | pnpm store cache path wrong                                         | High     | Low     | Alto  | ✅ Done |
| R2  | `apps/api` tests not run (web has no test script)                   | High     | Low     | Alto  | ✅ Done |
| R3  | `smoke-guard` polling fragility                                     | Medium   | Medium  | Medio | ✅ Done |
| R4  | No post-merge validation in `pr-quality-gate.yml`                   | Medium   | Low     | Medio | ✅ Done |
| R5  | `docs/decisions/**` dead filter entry                               | Low      | Trivial | Poco  | ✅ Done |
| R6  | Actions pinned by mutable tag                                       | Low      | Low     | Medio | ✅ Done |
| R7  | `npx ajv-cli` runtime download                                      | Low      | Low     | Poco  | ✅ Done |
| R8  | No coverage gate                                                    | Low      | Medium  | Alto  | ✅ Done |
| R9  | `golden-paths.yml` orphaned — removed, real gate is `contracts.yml` | Medium   | Low     | Poco  | ✅ Done |

---

## Implementation Plan

### Wave 1 — Immediate defect fixes (single PR, no architectural change)

Addresses the highest-severity issues with minimal risk:

1. **Fix pnpm cache path** (R1): Update `setup-node-pnpm/action.yml` to resolve
   the store path via `pnpm store path --silent` before caching.

2. **Add `apps/api` and `apps/web` to `test.yml`** (R2): Add both packages to
   the `paths-filter` blocks and the full-suite run. Scope them the same way as
   `engine` and `contracts`.

3. **Remove dead `docs/decisions/**`filter** (R5): One-line deletion in`contracts.yml`.

4. **Add `docs_only` guard to `pnpm type-check` in `pr-quality-gate.yml`** (S1):
   Apply the same scope detection already present in `ci.yml` so that docs-only
   PRs skip the global type-check.

5. **Move `ajv-cli` to devDependencies** (R7): Add `ajv-cli` as an explicit root
   devDependency and replace the `npx --yes` call in `contracts.yml`.

### Wave 2 — Post-merge coverage and supply chain (one PR each)

6. **Add `push: branches: [main]` to `pr-quality-gate.yml`** (R4): Enable the
   ARC policy validation and documentation governance checks on main push. Add an
   ARC-aware guard that skips the ARC check on `push` events since there is no
   PR diff to evaluate.

7. **Decide and resolve `golden-paths.yml`** (R9): Either remove it and document
   that golden validation lives in `contracts.yml`, or promote it to a real gate
   that triggers on `contracts.yml` completion via `workflow_run`.

8. **Pin all GitHub Actions to commit SHA** (R6): Run `pin-github-actions` or
   equivalent and commit the result as a chore PR. Record the tag in a comment
   next to each SHA.

### Wave 3 — Scope architecture (each slice is a separate ARC-reviewed PR)

Prerequisite: Wave 1 and Wave 2 are complete.

9. **Shared scope module** (D1): Create `tools/ci/scope-config.mjs` with a
   canonical path inventory. Add `tools/ci/emit-workspace-matrix.mjs` and
   `tools/ci/emit-scope.mjs` so workflows can call scripts instead of maintaining
   inline filter blocks.

10. **Rewire `ci.yml`** (D1): Replace the inline `dorny/paths-filter` blocks with
    calls to the shared scope scripts. Preserve existing `docs_only` fast-path
    semantics.

11. **Rewire `test.yml`** (D1, S1): Consume the shared scope policy. Apply
    docs-only fast-path consistently.

12. **Rewire `contracts.yml`** (D1): Consume the shared scope policy for
    `contracts_relevant`, `determinism_relevant`, and `golden_relevant`.

13. **Rewire `pr-quality-gate.yml`** (D1, S1): Consume the shared scope
    classifier. Remove remaining inline scope blocks. Apply docs-only, code, and
    full-gate classes to select active steps.

14. **Add scope classifier tests** (D3): Add representative fixture-based tests
    under `tools/ci` covering docs-only, code-only, mixed, and ambiguous input
    sets.

### Wave 4 — Coverage investment

15. **Replace `adapter-postgres-smoke-guard` polling** (R3): Evaluate
    `workflow_run` trigger vs explicit branch-protection requirements. Implement
    the chosen approach.

16. **Configure coverage thresholds and add coverage gate** (R8): Add Vitest
    coverage thresholds to `vitest.config.ts` for `engine` and `contracts`. Add a
    coverage job to `test.yml` for those packages. Upload the report as an
    artifact.

17. **Add local parity scripts** (D3, S2): Add root scripts (`pnpm ci:scope`,
    `pnpm ci:docs-only`, `pnpm ci:code-changed`, `pnpm ci:full`) that mirror the
    CI scope classes for local reproduction.

---

## Risks

### Scope regression

If a path rule is omitted during centralization, CI may silently skip a required
check.

Mitigation: preserve current path inventories verbatim in the first
centralization pass. Validate with representative file-change scenarios before
removing old inline blocks.

### False docs-only classification

If docs-only detection is too aggressive, checks that should remain active may
be bypassed.

Mitigation: keep merge-critical docs checks always enabled. Treat governance
and contract files as conservative triggers that widen the scope class.

### Polling guard false failures

The `smoke-guard` fix (Wave 4) may produce a window of flakiness between the
old polling approach being removed and the new event-driven approach being
stable.

Mitigation: add the new approach in parallel before removing the old one.
Verify on a representative postgres-touching branch before removing the polling
guard.

### Local/CI mismatch

If root scripts do not match workflow behavior, contributors will not trust the
scope classes.

Mitigation: add tests for the scope classifier and validate root scripts in CI
and in local closeout commands.

---

## Acceptance Criteria

1. Docs-only PRs execute documentation governance and skip unrelated package
   tests and global type-check.
2. Code PRs run affected workspace tests; contracts and determinism gates match
   the touched surface.
3. `apps/api` and `apps/web` test runs are gated in CI.
4. pnpm store cache hits consistently (verified by cache stats in GitHub Actions
   logs).
5. `pr-quality-gate.yml` runs on `push: branches: [main]`.
6. All four workflows consume a shared scope module; no workflow maintains its
   own independent path inventory.
7. Scope classifier tests cover docs-only, code-only, mixed, and ambiguous
   inputs.
8. Local parity scripts reproduce the same scope decisions as CI.
9. `pnpm verify:prepush` still passes after each wave.
10. No required check is lost or weakened through any refactoring step.

---

## Related Files

- [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml)
- [`.github/workflows/test.yml`](../../../.github/workflows/test.yml)
- [`.github/workflows/contracts.yml`](../../../.github/workflows/contracts.yml)
- [`.github/workflows/pr-quality-gate.yml`](../../../.github/workflows/pr-quality-gate.yml)
- [`.github/actions/setup-node-pnpm/action.yml`](../../../.github/actions/setup-node-pnpm/action.yml)
- [`package.json`](../../../package.json)
- [`tools/ci`](../../../tools/ci)
