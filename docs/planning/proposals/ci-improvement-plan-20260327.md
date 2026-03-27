---
title: CI Improvement Plan — Reliability, Scope-Awareness, And Deduplication
status: Active
owner: engineering
last_reviewed: 2026-03-27
planning_type: proposal
---

# CI Improvement Plan — Reliability, Scope-Awareness, And Deduplication

## Context

This document consolidated three prior CI improvement analyses produced on
2026-03-27 into a single actionable plan:

- structural deduplication analysis
- scope-aware validation and docs-only fast-path analysis
- reliability defects and coverage gaps analysis

Those analyses were working notes, not tracked proposal files. This document is
the single tracked artifact.

This plan belongs to the repository governance set:

- [Repository Governance Proposal Set 2026-03-17](repository-governance-proposal-set-20260317.md)
- [Package Module Build Policy v2](package-module-build-policy-v2-20260317.md)
- [Documentation Usability Change Plan](documentation-usability-change-plan-20260308.md)

---

## Execution Status

| Wave | Scope                                  | Status      |
| ---- | -------------------------------------- | ----------- |
| W1   | Immediate defect fixes                 | ✅ Complete |
| W2   | Post-merge coverage and supply chain   | ✅ Complete |
| W3   | Inline extraction and local parity     | ✅ Complete |
| W4   | Scope architecture (D1 centralization) | 🔵 Active   |

**Remaining open item:** D1 — shared scope detection module across all four
workflows. All other 13 issues are resolved.

---

## Problem Statement

### Structural problems (D1 remains open)

Change-scope detection is still implemented independently in `ci.yml`,
`test.yml`, `contracts.yml`, and `pr-quality-gate.yml`. Each workflow maintains
its own `dorny/paths-filter` blocks with overlapping paths. A new package, a new
path rule, or a new quality gate still requires edits in multiple files with
drift risk between local commands and merge-gate behavior.

~~Workflow YAML contains long inline shell and JavaScript blocks for schema
validation, determinism scans, PR metadata checks, and hash-scope detection.~~
**Resolved (D2):** inline policy logic extracted to `tools/ci/check-determinism.mjs`,
`tools/ci/check-pr-size.mjs`, and `tools/ci/check-pr-description.mjs`.

### Scope-awareness gaps (resolved)

~~The current CI model is only partially scope-aware~~:

- ✅ `ci.yml` has a `docs_only` fast-path (PR #633).
- ✅ `pr-quality-gate.yml` now applies the same filter — docs-only PRs skip the
  global type-check (S1).
- ✅ `test.yml` filters package tests by changed paths for PRs.

### Defects and gaps (all resolved)

1. ✅ **pnpm store cache path** — fixed in `setup-node-pnpm/action.yml` via `pnpm store path` (R1).
2. ✅ **`apps/api` tests** — added to `test.yml` scope detection and run matrix (R2).
3. ✅ **`adapter-postgres-smoke-guard` polling** — replaced with a self-contained postgres service job (R3).
4. ✅ **No post-merge gate** — `pr-quality-gate.yml` now triggers on `push: branches: [main]` (R4).
5. ✅ **`docs/decisions/**`dead filter** — removed from`contracts.yml` (R5).
6. ✅ **Actions pinned by mutable tag** — all actions pinned by commit SHA (R6).
7. ✅ **`npx --yes ajv-cli@5`** — `ajv-cli` moved to root devDependencies (R7).
8. ✅ **No coverage gate** — Vitest thresholds added to `vitest.config.ts`; `coverage` job added to `test.yml` (R8).
9. ✅ **`golden-paths.yml` orphaned** — file removed; golden validation lives in `contracts.yml` (R9).

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

### Structural (D1 pending)

- Shared scope detection module in `tools/ci/scope-config.mjs`. ✅ File exists.
- All four workflows (`ci.yml`, `test.yml`, `contracts.yml`,
  `pr-quality-gate.yml`) consume the shared module instead of maintaining
  independent path inventories. ⬜ Rewiring not yet done.
- Complex inline policy logic extracted to named scripts under `tools/ci`. ✅ Done (D2).

### Scope classes (achieved)

Three execution classes are in place:

1. **`docs-only`** — documentation sync, docs quality and governance checks,
   markdown location, frontmatter and link validation. No package-level test
   fan-out unless the docs touch code-sensitive surfaces.

2. **`code-changed`** — affected workspace tests and type-check subsets.
   Contract or determinism gates when the change scope matches. Full docs
   governance only when docs or governance files were also touched.

3. **`full-gate`** — full test suite, full type-check and compile gates. Used
   for push to main and manual workflow dispatch.

### Reliability (achieved)

- ✅ pnpm store cache resolves the correct path from `pnpm store path`.
- ✅ `apps/api` test runs are gated in `test.yml`.
- ✅ `adapter-postgres-smoke-guard` polling replaced by direct postgres service job.
- ✅ `pr-quality-gate.yml` runs on `push: branches: [main]`.
- ✅ All GitHub Actions pinned by commit SHA.
- ✅ `ajv-cli` is a root workspace devDependency.
- ✅ Coverage thresholds configured and enforced for `engine`.

---

## Issue Catalogue

| ID  | Issue                                                               | Severity | Effort  | Valor | Status    |
| --- | ------------------------------------------------------------------- | -------- | ------- | ----- | --------- |
| D1  | Scope detection duplicated across 4 workflows                       | Medium   | High    | Medio | 🔵 Active |
| D2  | Long inline policy blocks in YAML                                   | Medium   | Medium  | Medio | ✅ Done   |
| D3  | Local commands not aligned to CI scope classes                      | Low      | Medium  | Poco  | ✅ Done   |
| S1  | `pr-quality-gate.yml` runs full type-check on all PRs               | Medium   | Low     | Alto  | ✅ Done   |
| S2  | No local scripts for CI scope reproduction                          | Low      | Medium  | Poco  | ✅ Done   |
| R1  | pnpm store cache path wrong                                         | High     | Low     | Alto  | ✅ Done   |
| R2  | `apps/api` tests not run (web has no test script)                   | High     | Low     | Alto  | ✅ Done   |
| R3  | `smoke-guard` polling fragility                                     | Medium   | Medium  | Medio | ✅ Done   |
| R4  | No post-merge validation in `pr-quality-gate.yml`                   | Medium   | Low     | Medio | ✅ Done   |
| R5  | `docs/decisions/**` dead filter entry                               | Low      | Trivial | Poco  | ✅ Done   |
| R6  | Actions pinned by mutable tag                                       | Low      | Low     | Medio | ✅ Done   |
| R7  | `npx ajv-cli` runtime download                                      | Low      | Low     | Poco  | ✅ Done   |
| R8  | No coverage gate                                                    | Low      | Medium  | Alto  | ✅ Done   |
| R9  | `golden-paths.yml` orphaned — removed, real gate is `contracts.yml` | Medium   | Low     | Poco  | ✅ Done   |

---

## Implementation Plan

### Wave 1 — Immediate defect fixes ✅ Complete

1. **Fix pnpm cache path** (R1): `setup-node-pnpm/action.yml` resolves store
   path via `pnpm store path --silent` before caching.
2. **Add `apps/api` to `test.yml`** (R2): Scoped to changed paths on PRs;
   included in full-suite run on push.
3. **Remove dead `docs/decisions/**`filter** (R5): Deleted from`contracts.yml`.
4. **Add `docs_only` guard to type-check** (S1): `pr-quality-gate.yml` skips
   global type-check on docs-only PRs.
5. **Move `ajv-cli` to devDependencies** (R7): `pnpm exec ajv` replaces `npx
--yes ajv-cli@5` in `contracts.yml`.

### Wave 2 — Post-merge coverage and supply chain ✅ Complete

1. **Post-merge gate** (R4): `pr-quality-gate.yml` now triggers on `push:
branches: [main]`.
2. **Remove `golden-paths.yml`** (R9): Workflow file deleted; golden validation
   lives in `contracts.yml` `contract-hashes` job.
3. **Pin all GitHub Actions to commit SHA** (R6): All four workflows and
   `setup-node-pnpm/action.yml` pinned.

### Wave 3 — Inline extraction, coverage gate, and local parity ✅ Complete

1. **Extract determinism checks** (D2): Three inline grep steps in
   `contracts.yml` replaced by `tools/ci/check-determinism.mjs`.
2. **Extract PR size and description checks** (D2): Inline `actions/github-script`
   blocks in `pr-quality-gate.yml` replaced by `tools/ci/check-pr-size.mjs`
   and `tools/ci/check-pr-description.mjs`.
3. **Replace `adapter-postgres-smoke-guard` polling** (R3): Polling job removed;
   replaced with a self-contained `adapter-postgres-smoke` job that spins up a
   postgres service and runs the suite directly.
4. **Coverage thresholds and gate** (R8): `vitest.config.ts` thresholds added
   (statements/functions/lines: 65%, branches: 55%); `coverage` job added to
   `test.yml` with artifact upload.
5. **Local parity scripts** (D3, S2): `pnpm ci:docs`, `pnpm ci:code`, and
   `pnpm ci:full` added to root `package.json`.

### Wave 4 — Scope architecture 🔵 Active (D1 only)

Prerequisite: Waves 1–3 complete ✅.

1. **Shared scope module** (D1): `tools/ci/scope-config.mjs` already exists.
   Add or verify `tools/ci/emit-workspace-matrix.mjs` and `tools/ci/emit-scope.mjs`
   as the canonical interface for workflows.
2. **Rewire `ci.yml`** (D1): Replace inline `dorny/paths-filter` blocks with
   calls to the shared scope scripts. Preserve existing `docs_only` fast-path
   semantics.
3. **Rewire `test.yml`** (D1): Consume the shared scope policy.
4. **Rewire `contracts.yml`** (D1): Consume the shared scope policy for
   `contracts_relevant`, `determinism_relevant`, and `golden_relevant`.
5. **Rewire `pr-quality-gate.yml`** (D1): Consume the shared scope classifier.
   Remove remaining inline scope blocks.
6. **Add scope classifier tests** (D1): Representative fixture-based tests
   under `tools/ci` covering docs-only, code-only, mixed, and ambiguous inputs.

---

## Risks

### Scope regression (active — applies to D1)

If a path rule is omitted during centralization, CI may silently skip a required
check.

Mitigation: preserve current path inventories verbatim in the first
centralization pass. Validate with representative file-change scenarios before
removing old inline blocks.

### False docs-only classification (active — applies to D1)

If docs-only detection is too aggressive, checks that should remain active may
be bypassed.

Mitigation: keep merge-critical docs checks always enabled. Treat governance
and contract files as conservative triggers that widen the scope class.

### Local/CI mismatch (residual — monitor after D1)

If the rewired scope module does not match the current inline filter behavior,
contributors will see different results locally vs. CI.

Mitigation: scope classifier tests (item 19) must pass before removing inline
blocks. Validate `pnpm ci:code` and `pnpm ci:docs` against CI behavior on a
representative branch.

---

## Acceptance Criteria

| #   | Criterion                                                                                                  | Status        |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------- |
| 1   | Docs-only PRs execute documentation governance and skip unrelated package tests and global type-check      | ✅ Met        |
| 2   | Code PRs run affected workspace tests; contracts and determinism gates match the touched surface           | ✅ Met        |
| 3   | `apps/api` test runs are gated in CI                                                                       | ✅ Met        |
| 4   | pnpm store cache hits consistently (verified by cache stats in GitHub Actions logs)                        | ✅ Met        |
| 5   | `pr-quality-gate.yml` runs on `push: branches: [main]`                                                     | ✅ Met        |
| 6   | All four workflows consume a shared scope module; no workflow maintains its own independent path inventory | ⬜ Pending D1 |
| 7   | Scope classifier tests cover docs-only, code-only, mixed, and ambiguous inputs                             | ⬜ Pending D1 |
| 8   | Local parity scripts reproduce the same scope decisions as CI                                              | ✅ Met        |
| 9   | `pnpm verify:prepush` still passes after each wave                                                         | ✅ Maintained |
| 10  | No required check is lost or weakened through any refactoring step                                         | ✅ Maintained |

---

## Related Files

- [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml)
- [`.github/workflows/test.yml`](../../../.github/workflows/test.yml)
- [`.github/workflows/contracts.yml`](../../../.github/workflows/contracts.yml)
- [`.github/workflows/pr-quality-gate.yml`](../../../.github/workflows/pr-quality-gate.yml)
- [`.github/actions/setup-node-pnpm/action.yml`](../../../.github/actions/setup-node-pnpm/action.yml)
- [`package.json`](../../../package.json)
- [`tools/ci`](../../../tools/ci)
- [`tools/ci/check-determinism.mjs`](../../../tools/ci/check-determinism.mjs)
- [`tools/ci/check-pr-size.mjs`](../../../tools/ci/check-pr-size.mjs)
- [`tools/ci/check-pr-description.mjs`](../../../tools/ci/check-pr-description.mjs)
- [`vitest.config.ts`](../../../vitest.config.ts)
