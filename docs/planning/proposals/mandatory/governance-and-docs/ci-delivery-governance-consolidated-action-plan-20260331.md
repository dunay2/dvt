---
title: CI Delivery Governance Consolidated Action Plan
status: Active
owner: engineering
last_reviewed: 2026-03-31
planning_type: proposal
---

# CI Delivery Governance Consolidated Action Plan

## Purpose

This is the single active proposal for repository delivery-process hardening.
It replaces the former audit prompt with an executable plan and absorbs the
still-relevant work from prior CI/docs proposals and reviews, including:

- [CI Performance Review And Action Plan](../../../reviews/ci-and-delivery/20260330-ci-performance-review-and-action-plan.md)
- [CI, Prepush & PR Process - Observations and Improvement Log](../../../reviews/ci-and-delivery/20260330-ci-prepush-pr-process-observations.md)

This document does not reopen already-closed fixes. It carries forward only the
residual gaps that are still visible in the repository wiring on 2026-03-31.

## Superseded Proposal Set

The superseded CI/docs planning lines are now removed from active proposals.
This plan is the only active execution surface for CI governance in
`docs/planning/proposals`.

The review documents remain as evidence inputs, not active competing plans.

## Repository-Grounded Current Model

The current delivery chain is already substantial and mostly coherent:

1. Bootstrap: `prepare` runs `scripts/setup-git-hooks.cjs`.
2. Pre-commit: `.husky/pre-commit` runs `pnpm precommit`, which executes
   `lint-staged` plus `pnpm lint:determinism`.
3. Commit message: `.husky/commit-msg` runs `pnpm exec commitlint --edit`.
4. Pre-push: `.husky/pre-push` selects either a docs-only fast path or
   `pnpm verify:prepush`.
5. PR and branch CI: `.github/workflows/ci.yml`,
   `.github/workflows/pr-quality-gate.yml`, `.github/workflows/test.yml`, and
   `.github/workflows/contracts.yml`.
6. Merge and release: `.github/workflows/release.yml` runs Release Please.

The repository also versions several generated and governance-sensitive
artifacts:

- docs indexes and navigation surfaces via `pnpm docs:sync`
- planning lane markdown via `pnpm docs:planning:lanes:generate`
- workboard views via `pnpm docs:workboard:generate`
- generated code status via `pnpm docs:status:generate`
- generated capability coverage via `pnpm docs:capability:generate`

## Closed Items Not Reopened

The following lines of work are already implemented and should not be reopened
as open proposals:

- `ci.yml` already gates markdown lint on docs-relevant scope.
- `pr-quality-gate.yml` already scopes docs checks and skips global type-check
  on docs-only PRs.
- `.github/actions/setup-node-pnpm/action.yml` already has pnpm-store and
  `node_modules` caching.
- PR title, size, description, and ARC evidence checks are already wired.
- `docs:ci` already has local-friendly regenerate-and-validate semantics.
- GitHub Actions updates are already covered by [Dependabot](../../../../../.github/dependabot.yml).

The backlog below therefore focuses on residual drift, maintainability, and
parallel-work safety.

## Residual Problem Set

### CDG-1: Scope authority is still split across workflows, hooks, and scripts

Current scope decisions are distributed across:

- inline `dorny/paths-filter` blocks in [`ci.yml`](../../../../../.github/workflows/ci.yml)
- inline `dorny/paths-filter` blocks in [`test.yml`](../../../../../.github/workflows/test.yml)
- inline `dorny/paths-filter` blocks in [`contracts.yml`](../../../../../.github/workflows/contracts.yml)
- grep-based scope detection in [`.husky/pre-push`](../../../../../.husky/pre-push)
- separate diff resolution in [`scripts/check-changed.cjs`](../../../../../scripts/check-changed.cjs)
- partial centralization in [`tools/ci/scope-config.mjs`](../../../../../tools/ci/scope-config.mjs),
  [`tools/ci/emit-scope.mjs`](../../../../../tools/ci/emit-scope.mjs), and
  [`tools/ci/emit-workspace-matrix.mjs`](../../../../../tools/ci/emit-workspace-matrix.mjs)

Why this matters:

- change-scope drift is still possible between local hooks and CI
- docs-only and code-only classifications are harder to trust than they should
  be
- every new package or governance-sensitive path still risks N-way edits

### CDG-2: Local and CI reproduction paths are still fragmented

The repo now distinguishes `docs:ci` from strict drift checks, but the overall
delivery contract still has three separate local stories:

- `pnpm docs:ci` for local-friendly docs validation
- `pnpm ci:docs` for strict docs cleanliness
- `.husky/pre-push` for a custom docs-only fast path plus `pnpm verify:prepush`

Why this matters:

- contributors need tribal knowledge to know which command matches which gate
- pre-push remains heavier than necessary for many small code changes
- hook failure messages point to multiple local recovery paths

### CDG-3: The docs manifest capability exists but is not deterministic or enforced

The repo already ships [`tools/docs/generate-docs-manifest.ts`](../../../../../tools/docs/generate-docs-manifest.ts)
and `pnpm docs:gov:manifest`, but:

- `docs:gov` does not call it
- CI does not call it
- the generated output includes `generatedAt: new Date().toISOString()`
- the output target is `docs/.manifest.json`, which is unsuitable as a stable
  checked-in drift artifact in its current form

Why this matters:

- the useful idea from the docs-governance proposal exists only as a latent tool
- the manifest cannot currently become a trustworthy committed source of truth
- governance logic stays scattered across scripts instead of converging on one
  machine-readable inventory

### CDG-4: Generated docs surfaces are still merge hotspots

Several high-fan-in files are committed and regenerated from unrelated work:

- [docs/index.md](../../../../index.md)
- [Proposal Portfolio Map](../../portfolio-map-20260403.md)
- [Review Status Board](../../../reviews/review-status-board.md)
- [Generated Planning Surfaces Extraction Plan](./generated-planning-surfaces-extraction-plan-20260403.md)
- [Agent Lane A YAML](../../../state/agent-lane-a.yaml)
- [Agent Lane B YAML](../../../state/agent-lane-b.yaml)
- [Agent Lane C YAML](../../../state/agent-lane-c.yaml)
- [Agent Lane D YAML](../../../state/agent-lane-d.yaml)
- [Agent Lane E YAML](../../../state/agent-lane-e.yaml)
- [docs/planning/status/generated-code-state.md](../../../status/generated-code-state.md)
- [docs/planning/status/generated-capability-coverage.md](../../../status/generated-capability-coverage.md)

Why this matters:

- independent branches and agents still converge on shared generated outputs
- docs structure changes and code structure changes produce unrelated conflicts
- single-writer discipline exists conceptually, but the merge burden remains high

### CDG-5: Hook and changed-file coverage is incomplete for repo tooling

The current `lint-staged` config in [`package.json`](../../../../../package.json) does
not cover `scripts/**/*.{js,cjs,mjs}` or `tools/ci/**/*.{js,cjs,mjs}`.

Why this matters:

- CI helper changes can bypass the same local hygiene applied to TypeScript and
  Markdown changes
- hook logic and scope tools are precisely the files where silent formatting or
  lint drift is most expensive

### CDG-6: CI tool tests and parity tests are not merge-gated

The repository already has `pnpm test:ci-tools` and tests such as:

- [`tools/ci/workflow-pattern-parity.test.mjs`](../../../../../tools/ci/workflow-pattern-parity.test.mjs)
- [`tools/ci/check-run-guard.test.mjs`](../../../../../tools/ci/check-run-guard.test.mjs)

But no current workflow invokes `pnpm test:ci-tools`.

Why this matters:

- the repo has executable evidence for CI policy logic, but does not enforce it
- workflow-script drift can land without exercising the parity tests that were
  added to catch it

### CDG-7: `verify:prepush` is still broader and less reusable than necessary

`verify:prepush` currently runs:

- full `pnpm type-check`
- `pnpm docs:gov:locations -- --changed-only`
- `pnpm docs:arc:evidence:check -- --changed-only`
- `node scripts/check-changed.cjs`

And `.husky/pre-push` uses its own 2-dot diff plus grep-based fast path before
calling it.

Why this matters:

- a small code push still pays the full repository type-check cost
- diff semantics differ across local tooling (`..`, `...`, upstream fallback)
- local pre-push policy remains harder to reason about than the central CI scope
  model

### CDG-8: Governance routes are not consistently fail-closed

Some governance paths still tolerate missing canonical files or stale references
without hard failure:

- `docs-quality-check` now fails closed when a required canonical surface is
  missing, instead of silently skipping it.
- active governance inventories now point to `docs/planning/gaps/index.md` as
  the current gap hub, with archived gap docs retained separately.

Why this matters:

- broken canonical references can survive as "quiet skips"
- contributors cannot trust quality checks to enforce the declared source of
  truth

### CDG-9: Planning index generation is not status-aware

`sync-docs` planning indexes are generated from `planning_type` and current file
presence, not from lifecycle state like `status: Superseded`.

Why this matters:

- superseded planning docs can reappear in active indexes
- proposal lifecycle policy is not reflected in generated navigation

### CDG-10: Superseded lifecycle policy is not automated end-to-end

The repository lacks an explicit automated policy for how superseded planning
docs transition out of active proposal surfaces.

Why this matters:

- status metadata alone does not guarantee removal from active surfaces
- repeated manual cleanup is required and drift reappears over time

## Target End State

The target model is not "more CI." It is a single coherent delivery system with
these properties:

1. One authoritative scope model for local hooks and GitHub Actions.
2. One clear distinction between local-friendly validation and strict drift
   enforcement.
3. Deterministic generated governance artifacts only.
4. High-fan-in generated docs treated explicitly as shared outputs with a
   branch-safe regeneration policy.
5. Executable tests for CI policy and workflow parity included in the merge
   gates.
6. No required quality gate removed; only scope, ownership, and trust are
   improved.

## 2026-04-22 Integrated Execution Overlay

This proposal also absorbs the
[20260422 Environment Configuration Audit](../../../reviews/ci-and-delivery/20260422-environment-configuration-audit-review.md)
as the current CI/delivery efficiency overlay.

Do not create a parallel proposal for that audit. This section is the canonical
execution route for the verified residual items.

### Think-First Analysis

- Problem summary:
  the repository now has partial delivery-efficiency improvements, but they are
  split across already-closed slices. Root `build` is Turbo-backed, shared
  preflight and first-red triage are shipped, and workflow scope policy is more
  centralized than before, yet the active operator pain still spans:
  - Node baseline drift between local development, `engines.node`, and CI
  - unconditional `lint:determinism` cost on irrelevant commits
  - no CI cache layer for the existing root Turbo build path
  - no governed follow-on path yet for Turbo-backed `test` / `typecheck`
  - no design-ready rollout posture yet for TypeScript project references
- Root cause:
  the repo hardening work intentionally landed in narrow slices with explicit
  out-of-scope boundaries. That kept prior changes safe, but it also left no
  single active wave plan connecting the 2026-04-22 audit findings to the
  ongoing `RC-C2` work.
- Constraints and invariants:
  - `AGENTS.md` requires canonical planning surfaces, validation evidence, and
    no hidden debt
  - `docs/guides/ai-work-protocol.md` requires think-first and
    pre-implementation material before config/code changes land
  - `docs/planning/state/planning-control-tower.md` requires active proposal
    changes to update the linked lane registry
  - [20260418 RC-C2 turbo build orchestrator closeout](../../../closeouts/20260418-rc-c2-turbo-build-orchestrator-closeout.md)
    explicitly kept Turbo `test`, Turbo `typecheck`, remote cache, and
    TypeScript project references out of scope of that shipped slice
  - [Determinism Tooling](../../../../architecture/components/engine/dev/determinism-tooling.md)
    keeps deterministic-runtime guards as a mandatory engineering baseline, so
    pre-commit savings must come from scoping, not from removing the guard
  - `RC-C2` is not closed by new tooling alone; its adoption-cycle gate remains
    authoritative
- Options considered:
  - execute the full audit in one branch
  - create a second proposal dedicated to the audit
  - absorb the audit into the active CI/delivery proposal and execute the
    lowest-risk wave first
- Selected option and rationale:
  absorb the audit into this proposal and execute the lowest-risk/highest-ROI
  wave first. That preserves one canonical plan, keeps prior closeouts true,
  and avoids mixing low-risk config alignment with more invasive compiler-graph
  work.
- Rejected alternatives:
  - full-audit one-branch execution: rejected because it mixes hook behavior,
    CI cache wiring, Turbo task ownership, coverage policy, and compiler-graph
    changes into one high-blast-radius slice
  - parallel proposal: rejected because this file is already the active
    CI/delivery action plan of record

### Integrated Gain Model

The goal is not generic "cleanup". It is measurable reduction of avoidable
delivery cost while keeping the existing governance and runtime guarantees
intact.

Primary gains to record by wave:

- baseline drift removed:
  local Node selection, `engines.node`, and CI no longer advertise different
  expectations
- avoided local commit waste:
  docs-only, test-only, and unrelated UI commits no longer rebuild
  determinism-sensitive dependencies before every commit
- avoided CI rebuild waste:
  the existing Turbo-backed root `build` path can reuse `.turbo` outputs across
  CI runs
- future-wave throughput:
  Turbo `test` / `typecheck` adoption and package-script normalization are
  executed only after the script contract is explicit enough to avoid fake wins

### Integrated Wave Structure

| Wave     | Scope                                                                                                                                                                                     | Execution posture                           | Expected gain                                                                        |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------ |
| `INT-W0` | Record baseline commands and current friction points for the execute-now slice.                                                                                                           | Execute as part of Wave 1 closeout.         | Comparable before/after evidence instead of narrative-only claims.                   |
| `INT-W1` | Align Node 22 locally, scope the deterministic-runtime pre-commit guard to relevant changes, and add CI cache support for the existing Turbo root build path.                             | Execute now.                                | Immediate reduction of avoidable commit/CI cost with low integration risk.           |
| `INT-W2` | Normalize package-level `typecheck` ownership, then expand Turbo to governed `test` / package `typecheck` tasks and rewire affected local or CI entrypoints that can consume them safely. | Execute after Wave 1 is green and measured. | Affected test/typecheck reuse without ambiguous script ownership.                    |
| `INT-W3` | Coverage-threshold uplift and TypeScript project-references spike or rollout.                                                                                                             | Design first; do not batch into Wave 1.     | Hardening and incremental-compiler gains after infrastructure ownership is explicit. |

### Wave 1 Pre-Implementation Brief

- Mode: `Full`
- Scope:
  - add local Node pin files that match the actual CI/runtime baseline
  - align root `engines.node` with the real Node 22 baseline
  - scope the deterministic-runtime pre-commit gate to files that actually
    affect the engine or Temporal workflow determinism surface
  - add `.turbo` cache support to the shared CI setup for the already-shipped
    root Turbo `build` path
  - update the canonical docs that describe the affected local/CI command
    contract
- Touched files or paths:
  - `.node-version`
  - `.nvmrc`
  - `package.json`
  - `.github/actions/setup-node-pnpm/action.yml`
  - new helper under `scripts/` for staged-file determinism scope detection
  - `docs/guides/testing-and-ci-capabilities.md`
  - linked closeout/planning surfaces created or updated by the shipped slice
- Expected outcome:
  - local contributors get a repo-pinned Node 22 baseline
  - `package.json` no longer claims a broader Node baseline than the CI/runtime
    path actually uses
  - pre-commit still blocks determinism-sensitive changes, but it stops paying
    the full determinism build/lint cost for unrelated changes
  - the CI shared setup can restore the root Turbo local cache across runs
- Risks and mitigations:
  - risk: pre-commit scoping misses a determinism-sensitive path
  - mitigation: start from the current `lint:determinism` ownership and keep the
    guard fail-closed for engine and adapter-temporal workflow code
  - risk: `.turbo` cache adds complexity without measurable reuse
  - mitigation: keep the change limited to the existing Turbo root build path
    and record the before/after command evidence in closeout
  - risk: Node pin drift moves to docs instead of code
  - mitigation: update the canonical testing/CI guide in the same slice
- Out of scope:
  - Turbo `test`
  - Turbo `typecheck`
  - package-wide `typecheck` script rollout
  - coverage-threshold changes
  - TypeScript project references
- Validation plan:
  - targeted helper tests for the new staged-file scope helper
  - `pnpm lint:md`
  - `pnpm docs:sync`
  - `pnpm verify:prepush`
  - targeted smoke checks for the new pre-commit scope helper and the shared CI
    setup action wiring
- Test coverage plan:
  - unit coverage for the staged-file scope helper covering
    engine-sensitive, Temporal-workflow-sensitive, and irrelevant-file cases
  - no fake timing claims: any performance gain reported in closeout must come
    from recorded command evidence or from an explicit avoided-work explanation
    tied to the new scope rules
- Libraries evaluated:
  - no new library is required for Wave 1
  - Turbo remains the existing orchestrator; this slice only improves the
    contract around it

### Wave 2 Guardrail

Do not execute Turbo `typecheck` adoption until the package-script contract is
explicit. Today, the repo still mixes:

- real package `typecheck` scripts in selected workspaces
- build-as-typecheck behavior in others
- root `type-check` orchestration that still includes a final `tsc --noEmit`

That means Wave 2 must first decide which workspaces own a canonical
package-level `typecheck` command before Turbo can claim that graph honestly.

### Wave 2A Minimum Slice

The first truthful Wave 2 step is package-contract normalization, not Turbo
adoption:

- every workspace that currently exposes `build` must also expose a canonical
  package-level `typecheck`
- workspaces whose no-emit typecheck depends on built workspace declarations
  may keep package-local `pretypecheck` hooks
- the existing affected command (`pnpm ci:affected:typecheck`) should become
  more truthful through script normalization before any root or Turbo
  orchestration changes are claimed as a gain

This slice is intentionally smaller than Turbo `typecheck` rollout. It removes
the current script-ownership blind spot without pretending the broader root
`type-check` contract or Turbo task graph are already settled.

### Wave 2B Safe Consumer Slice

Once Wave 2A is green, the next truthful follow-up is to wire the now-explicit
package contract into the smallest safe Turbo consumers:

- declare governed Turbo `typecheck` and `test` tasks in `turbo.json`
- route affected local commands through a single wrapper that sets the
  orchestrated environment explicitly
- rewire the lightweight `CI - Code Quality` build/typecheck matrix to that
  same wrapper instead of maintaining a parallel raw-package path
- keep full-root `pnpm test`, root `pnpm type-check`, and the broader PR test
  suite out of scope until their contracts are designed as first-class slices

This keeps Wave 2 honest: package ownership is explicit first, then only the
consumers that can safely reuse that ownership move to Turbo.

## Executable Action Plan

### Wave 1 - Scope Authority Convergence

| Task       | Files / surfaces                                                                                   | Action                                                                                                                                      | Validation                                                                                 | Exit criteria                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `CDG-W1-1` | `ci.yml`, `tools/ci/emit-workspace-matrix.mjs`, `tools/ci/scope-config.mjs`                        | Rewire `detect-affected` in `ci.yml` to use `emit-workspace-matrix.mjs` instead of maintaining inline workspace inventories.                | `pnpm test:ci-tools`, targeted workflow parity tests, `pnpm verify:prepush`                | `ci.yml` no longer owns a separate workspace path inventory.                                      |
| `CDG-W1-2` | `test.yml`, `contracts.yml`, `tools/ci/emit-scope.mjs`, `tools/ci/scope-config.mjs`                | Move remaining inline PR scope definitions into shared scope modules. Preserve the adapter-postgres policy JSON as the canonical exception. | `pnpm test:ci-tools`, `pnpm verify:prepush`                                                | `test.yml` and `contracts.yml` read scope from shared tooling rather than duplicating path rules. |
| `CDG-W1-3` | `.husky/pre-push`, `scripts/check-changed.cjs`, new local scope helper under `tools/ci/` if needed | Replace grep-based hook scope classification with the same underlying scope policy used by CI. Standardize diff-base fallback order.        | `pnpm test:ci-tools`, manual docs-only and code-change smoke checks, `pnpm verify:prepush` | Hook and workflow scope decisions are derived from the same source of truth.                      |

### Wave 2 - Local / CI Contract Cleanup

| Task       | Files / surfaces                                                                | Action                                                                                                                                                                                | Validation                                                                             | Exit criteria                                                                             |
| ---------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `CDG-W2-1` | `package.json`, `docs/guides/testing-and-ci-capabilities.md`, `.husky/pre-push` | Make the local command contract explicit: local-friendly commands regenerate, strict commands diff against `HEAD`, hook messages point to one reproducible command per failure class. | `pnpm docs:ci`, `pnpm ci:docs`, `pnpm verify:prepush`                                  | Contributors can tell which command reproduces which failure without reading shell logic. |
| `CDG-W2-2` | `package.json`, hook scripts, CI docs                                           | Make `verify:prepush` scope-aware for code changes while preserving strictness for governance-sensitive files.                                                                        | `pnpm verify:prepush`, changed-file smoke tests, affected package type-check/test runs | Pre-push no longer pays full-repo cost for every small code change.                       |
| `CDG-W2-3` | `package.json` lint-staged config                                               | Add `scripts/**/*.{js,cjs,mjs}` and `tools/ci/**/*.{js,cjs,mjs}` to staged-file lint and format enforcement.                                                                          | `pnpm verify:prepush`, commit smoke on changed script files                            | Repo tooling receives the same local hygiene enforcement as application code.             |

### Wave 2C Remaining Scope Slice

Wave 2A and 2B are now live, and the staged-file tooling coverage from
`CDG-W2-3` has already been absorbed into the shipped pre-commit hardening.

The remaining Wave 2 gap is the strict pre-push type-check selector:

- workspace-local TypeScript changes should reuse
  `pnpm ci:affected:typecheck`
- root config and other cross-workspace TypeScript graph changes should remain
  on full `pnpm type-check`
- the selected path should be explicit in local output so contributors can tell
  why the stricter full-root gate was or was not used

### Wave 3 - Docs Governance Convergence

### Wave 3A Immediate Determinism Slice

The first truthful Wave 3 step is not filename policy expansion. It is making
the existing docs manifest path stable enough to become a governed artifact.

That slice should:

- remove timestamp and traversal-order noise from the manifest generator
- create a tracked `docs/.manifest.json` output that stays byte-stable on an
  unchanged worktree
- keep local-friendly regeneration under `docs:gov`
- add an explicit strict drift gate for the tracked manifest in `ci:docs`

This converts the existing helper into a real machine-readable docs inventory
without reopening the broader docs-governance rollout.

### Wave 3B Immediate Changed-Doc Policy Slice

With the deterministic manifest path live, the next truthful `CDG-W3-2` step is
to make changed docs fail closed on the policy surfaces that are safe to enforce
without normalizing all historical docs debt first.

That slice should:

- add changed-only strict filename enforcement for docs Markdown files
- add changed-only ADR/evidence frontmatter validation
- keep historical filename and metadata backlog warning-only in the full-repo
  scan
- improve changed Markdown placement failures so contributors are told to move
  governed documentation into `docs/`
- wire the changed-doc gates into both `docs:gov` and `verify:prepush`

This keeps Wave 3 honest: new or changed docs must meet the current governance
contract, while legacy cleanup remains a separate backlog instead of becoming
an unrelated red gate.

| Task       | Files / surfaces                                                          | Action                                                                                                                                                                   | Validation                                                                          | Exit criteria                                                                     |
| ---------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `CDG-W3-1` | `tools/docs/generate-docs-manifest.ts`, `package.json`, `docs:gov` wiring | Refactor the manifest generator so the committed output is deterministic. Remove or externalize timestamp noise, then wire the manifest into `docs:gov`.                 | `pnpm docs:gov:manifest`, `pnpm docs:gov`, `pnpm docs:ci`, `pnpm verify:prepush`    | The manifest becomes a real governance artifact instead of a dormant helper.      |
| `CDG-W3-2` | docs governance tools and docs inventory                                  | Introduce changed-files fail-closed rules for new docs: strict filenames for new/changed docs, doc-class frontmatter validation, and clearer placement failure messages. | `pnpm docs:gov`, `pnpm docs:gov:locations -- --changed-only`, `pnpm verify:prepush` | New docs cannot silently land in non-canonical paths or naming patterns.          |
| `CDG-W3-3` | `docs/DOCS_README.md`, planning docs, generator scripts                   | Document and enforce single-writer discipline for generated docs: source file, generator command, and manual-edit policy per artifact class.                             | `pnpm docs:sync`, `pnpm docs:gov`, `pnpm docs:ci`                                   | Contributors can identify canonical source vs. generated output without guessing. |

### Wave 4 - Merge-Hotspot And Trust Hardening

### Wave 4A Immediate Trust Slice

Now that the shared scope modules and Turbo affected-task routing are live, the
next smallest trust-hardening move is to make `pnpm test:ci-tools` merge-gated
inside an already-required workflow rather than leaving it as local-only
evidence.

That slice should:

- run `pnpm test:ci-tools` in `CI - Code Quality`
- keep workflow parity tests asserting that wiring remains present
- avoid introducing a brand-new workflow surface for the same capability

This closes the gap where CI policy tests exist but are not yet exercised by a
real PR/push gate.

| Task       | Files / surfaces                                                             | Action                                                                                                                                                                 | Validation                                                                      | Exit criteria                                                            |
| ---------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `CDG-W4-1` | `tools/ci/*.test.mjs`, workflows                                             | Add `pnpm test:ci-tools` to a required workflow and expand parity coverage to the scope contracts that still matter after Wave 1.                                      | `pnpm test:ci-tools`, workflow run on PR                                        | CI helper logic becomes merge-gated, not advisory.                       |
| `CDG-W4-2` | docs generators and planning state surfaces                                  | Reduce merge fan-in where practical: split or defer regeneration of broad shared outputs, or formalize a final-branch regeneration rule where splitting is not viable. | `pnpm docs:sync`, `pnpm docs:planning:lanes:generate`, `pnpm docs:ci`           | Shared generated outputs stop behaving like incidental merge traps.      |
| `CDG-W4-3` | `contracts.yml`, supporting scripts                                          | Remove permissive "pass in stub mode" behavior from critical contract checks and fail closed on invalid repository states.                                             | `pnpm validate:contracts`, `pnpm test:contracts:compile`, `pnpm verify:prepush` | Green CI means the intended invariant was actually checked.              |
| `CDG-W4-4` | `scripts/docs-quality-check.cjs`, planning status docs, governance inventory | Replace missing-file `continue` behavior in canonical governance checks with explicit fail-closed handling for declared required planning surfaces.                    | `pnpm docs:quality:check`, `pnpm docs:gov`, `pnpm docs:ci`                      | Declared required canonical files are enforced, not skipped.             |
| `CDG-W4-5` | `scripts/sync-docs.cjs`, planning proposal metadata policy                   | Make generated planning indexes exclude `status: Superseded` (and optionally `status: Archived`) by rule, not by manual deletion only.                                 | `pnpm docs:sync`, `pnpm docs:sync:check`, `pnpm docs:ci`                        | Superseded proposals no longer appear in active planning indexes.        |
| `CDG-W4-6` | docs governance policy docs and checks                                       | Define and enforce lifecycle transitions for planning docs (`Active`, `Draft`, `Superseded`, `Archived`) with explicit expected location and index behavior.           | `pnpm docs:gov`, `pnpm docs:quality:check`, `pnpm docs:ci`                      | Lifecycle state changes become deterministic and automatically enforced. |

## Sequencing

Recommended order:

1. `CDG-W1-1` through `CDG-W1-3`
2. `CDG-W4-1`
3. `CDG-W2-1` through `CDG-W2-3`
4. `CDG-W3-1` through `CDG-W3-3`
5. `CDG-W4-2` and `CDG-W4-3`

Rationale:

- scope authority has to converge before local/CI parity can become trustworthy
- CI tool tests should become blocking as soon as the shared scope modules own
  more of the real policy
- docs-manifest work should wait until the generator is made deterministic
- merge-hotspot reduction should happen after ownership rules are explicit

## Acceptance Criteria For The Consolidated Plan

This proposal is considered executed only when all of the following are true:

1. Workflow and hook scope detection share one rule authority.
2. `pnpm test:ci-tools` is part of a required merge gate.
3. `verify:prepush` is scope-aware and its messages point to canonical local
   reproduction commands.
4. The docs manifest is deterministic and enforced through `docs:gov`.
5. The repo documents which generated artifacts are canonical outputs and which
   files are the editable sources.
6. Parallel docs or code work no longer causes avoidable conflicts in broad
   aggregate outputs at the current rate.

## Non-Goals

- replacing `pnpm` with another monorepo tool
- removing existing docs governance or ARC enforcement
- weakening required merge gates
- moving generated docs to CI-only output without explicit governance and
  source-of-truth rules

## Evidence Base

This plan is grounded in the current tracked repo wiring, especially:

- [`package.json`](../../../../../package.json)
- [`.husky/pre-commit`](../../../../../.husky/pre-commit)
- [`.husky/pre-push`](../../../../../.husky/pre-push)
- [`.husky/commit-msg`](../../../../../.husky/commit-msg)
- [`scripts/setup-git-hooks.cjs`](../../../../../scripts/setup-git-hooks.cjs)
- [`scripts/check-changed.cjs`](../../../../../scripts/check-changed.cjs)
- [`.github/workflows/ci.yml`](../../../../../.github/workflows/ci.yml)
- [`.github/workflows/pr-quality-gate.yml`](../../../../../.github/workflows/pr-quality-gate.yml)
- [`.github/workflows/test.yml`](../../../../../.github/workflows/test.yml)
- [`.github/workflows/contracts.yml`](../../../../../.github/workflows/contracts.yml)
- [`.github/workflows/release.yml`](../../../../../.github/workflows/release.yml)
- [`tools/ci/scope-config.mjs`](../../../../../tools/ci/scope-config.mjs)
- [`tools/ci/emit-scope.mjs`](../../../../../tools/ci/emit-scope.mjs)
- [`tools/ci/emit-workspace-matrix.mjs`](../../../../../tools/ci/emit-workspace-matrix.mjs)
- [`tools/ci/workflow-pattern-parity.test.mjs`](../../../../../tools/ci/workflow-pattern-parity.test.mjs)
- [`tools/docs/generate-docs-manifest.ts`](../../../../../tools/docs/generate-docs-manifest.ts)
- [Testing and CI Capabilities](../../../../guides/testing-and-ci-capabilities.md)
