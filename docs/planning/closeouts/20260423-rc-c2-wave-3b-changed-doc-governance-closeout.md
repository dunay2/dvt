---
slice: rc-c2-wave-3b-changed-doc-governance
date: 2026-04-23
last_reviewed: 2026-04-23
gap: maintenance
author: AI (Codex)
---

# Closeout: RC-C2 wave 3B changed-doc governance

## Think-First

### Problem summary

`CDG-W3-1` made the docs manifest deterministic and governed, but the next docs
governance gap remains: changed docs do not yet have a dedicated fail-closed
gate for filename strictness and doc-class frontmatter posture.

The current behavior is split:

- `docs:gov:filenames` checks all docs, but strict kebab-case issues are warnings
  only and `--strict` is not wired into the aggregate docs gate.
- `docs:gov:frontmatter` validates ADR and evidence docs globally, but it has no
  changed-only mode that can be used as a focused pre-push gate.
- `docs:gov:locations -- --changed-only` already exists for Markdown under code
  trees, but its failure message does not yet make the canonical remediation
  path explicit.

### Root cause

The docs governance tools were added as full-repo hygiene checks first. That was
necessary to keep historical docs from blocking every change, but it leaves new
or changed docs with weaker local enforcement than the repository's current
governance model requires.

### Constraints and invariants

- `AGENTS.md` requires canonical governance sources, validation evidence, no
  hidden debt, and `pnpm verify:prepush` before presenting the slice as ready.
- `docs/guides/ai-work-protocol.md` requires think-first and
  pre-implementation material before code/config/docs changes land.
- `docs/planning/proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md`
  defines `CDG-W3-2` as changed-files fail-closed rules for new docs:
  filename strictness, doc-class frontmatter validation, and clearer placement
  failures.
- Historical docs warnings should not become global blocking errors in this
  slice; the fail-closed behavior must apply to changed docs.
- The slice must stay in docs governance tooling and planning/CI docs, outside
  ARC-triggering runtime, adapter, contract, planner, and engine code paths.

### Options considered

- Make full-repo `docs:gov:filenames:strict` blocking immediately.
- Add changed-only fail-closed checks for filename and frontmatter policy, then
  wire those checks into `docs:gov` and `verify:prepush`.
- Defer filename/frontmatter changed-only policy until all legacy docs warnings
  are cleaned up.

### Selected option and rationale

Add changed-only fail-closed checks and wire them into the local-friendly docs
gate and pre-push baseline.

This is the smallest truthful version of `CDG-W3-2`: it raises the bar for new
or changed docs without pretending the historical docs backlog has already been
normalized.

### Rejected alternatives

- Blocking full-repo strict filename mode now: rejected because it would convert
  inherited historical naming debt into an unrelated red gate.
- Deferring the slice: rejected because docs manifest governance is now stable
  enough for changed-doc policy to become the next guardrail.

## Pre-Implementation Brief

- Mode: `Full`
- Scope:
  - add changed-only strict filename enforcement for docs markdown files
  - add changed-only ADR/evidence frontmatter validation for docs markdown files
  - make changed-only placement failures name the canonical remediation path
  - wire the new changed-doc checks into `docs:gov` and `verify:prepush`
  - update canonical CI/testing and RC-C2 planning surfaces
- Touched files or paths:
  - `tools/docs/check-filenames.ts`
  - `tools/docs/check-frontmatter.ts`
  - `scripts/check-markdown-locations.cjs`
  - `tools/ci/*.test.mjs`
  - `package.json`
  - `docs/guides/testing-and-ci-capabilities.md`
  - `docs/planning/proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md`
  - `docs/planning/state/agent-lane-c.yaml`
  - this closeout file
- Expected outcome:
  - changed docs with non-canonical filenames fail locally instead of producing
    advisory warnings
  - changed ADR/evidence docs are validated through a focused changed-only gate
  - Markdown placement failures tell contributors to move governed docs into
    `docs/`
  - `docs:gov` and `verify:prepush` both exercise the changed-doc policy
- Risks and mitigations:
  - risk: inherited docs debt becomes blocking
  - mitigation: keep strict failure scoped to changed docs only
  - risk: changed-only logic becomes difficult to test without mutating git
  - mitigation: add a test override for changed-file lists while production
    behavior still uses git diff
  - risk: duplicate changed-file logic drifts across docs tools
  - mitigation: keep the first slice narrow and document the shared command
    contract; broader helper extraction can be a later cleanup if needed
- Out of scope:
  - full historical filename normalization
  - changing ADR/evidence frontmatter schemas
  - lifecycle-state planning policy (`CDG-W4-5` / `CDG-W4-6`)
  - single-writer generated docs policy (`CDG-W3-3`)
- Validation plan:
  - red/green CI-tool tests for changed-doc governance behavior
  - `pnpm test:ci-tools`
  - `pnpm docs:gov`
  - `pnpm docs:ci`
  - `pnpm lint:md`
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - non-kebab changed docs filename fails in changed-only strict mode
  - changed-only frontmatter ignores unlisted invalid fixtures and validates
    only the changed ADR/evidence file list
  - changed markdown under code-tree segments fails with a clear docs-placement
    remediation message
  - root scripts keep the changed-doc gates wired into `docs:gov` and pre-push
- Libraries evaluated:
  - no new library is required

## Implementation Log

- Added `tools/ci/docs-changed-governance-policy.test.mjs` with red/green
  coverage for the changed-doc policy.
- Extended `tools/docs/check-filenames.ts` with `--changed-only` support.
- Made strict filename policy fail closed for changed docs while preserving
  full-repo historical filename findings as warnings.
- Extended `tools/docs/check-frontmatter.ts` with `--changed-only` support for
  ADR and evidence docs.
- Made ADR/evidence warning-class metadata issues fail closed only when those
  docs are in the changed-doc set.
- Added a deterministic `DOCS_GOV_CHANGED_FILES` override for CI-tool tests so
  changed-file behavior can be tested without depending on local git history.
- Updated `scripts/check-markdown-locations.cjs` so changed-only tests can use
  the same override and so code-tree Markdown violations tell contributors to
  move governed documentation into `docs/`.
- Added `docs:gov:filenames:changed` and `docs:gov:frontmatter:changed` to
  `package.json`.
- Wired the two changed-doc gates into `docs:gov` and `verify:prepush`.
- Updated `docs/guides/testing-and-ci-capabilities.md` with the new commands and
  pre-push behavior.
- Updated the consolidated RC-C2 plan with the Wave 3B changed-doc policy slice.
- Updated Lane C state so RC-C2 evidence and status reason include this slice.
- Ran `docs:sync` and `docs:workboard:generate`; generated planning views
  remained deterministic and intentionally untracked.

## Validation Evidence

- `node --test tools/ci/docs-changed-governance-policy.test.mjs`
  - red run before implementation: failed `4/4` tests for missing command
    wiring, warning-only strict filename behavior, missing changed-only
    frontmatter behavior, and missing changed-only placement override
  - green run after implementation: passed `4/4` tests
- `pnpm test:ci-tools`
  - initial implementation run passed with `58/58` tests green
  - fresh pre-commit rerun exposed a test-fixture race: the changed-only
    frontmatter test briefly created an invalid evidence doc under
    `docs/evidence/`, while the concurrent BOM frontmatter test ran a full
    docs scan and failed `1/58`
  - fixed the test fixture location by moving it under `docs/evidence/.tmp`,
    which is excluded by the docs walker used for full scans
  - post-fix rerun passed with `58/58` tests green
- `pnpm docs:sync`
  - passed
  - regenerated local planning lane output for Lane C without adding tracked
    generated files
- `pnpm docs:workboard:generate`
  - passed
  - regenerated local workboard views without adding tracked generated files
- `pnpm docs:gov`
  - passed with exit `0`
  - `docs:gov:filenames:changed` passed against the branch diff
  - `docs:gov:frontmatter:changed` reported no changed ADR/evidence docs and
    skipped cleanly
  - inherited warning-only frontmatter and governance-reference findings
    remained warnings, not errors
- `pnpm docs:ci`
  - passed with exit `0`
  - inherited warning-only docs quality, docs doctor, frontmatter, and
    governance-reference findings remained non-blocking
- `pnpm lint:md`
  - passed with `0` markdownlint errors across `1275` files
- `pnpm verify:prepush`
  - passed with exit `0`
  - verified the real pre-push chain now runs
    `docs:gov:filenames:changed` and `docs:gov:frontmatter:changed`
- `pnpm exec tsc --noEmit --allowJs false --module NodeNext --moduleResolution NodeNext --target ES2022 --types node tools/docs/check-filenames.ts tools/docs/check-frontmatter.ts`
  - failed as a noncanonical standalone compile probe because existing
    `tools/docs/lib/walkDocs.ts` types do not compile cleanly under that
    ad-hoc command shape
  - this was not used as readiness evidence; the canonical repo gates above are
    the validation baseline for this slice

## Gain Evidence

- New or changed docs with non-kebab filenames now fail the changed-doc gate
  instead of only producing advisory warnings.
- Changed ADR/evidence docs now have a focused metadata gate that can fail
  closed without scanning unrelated historical invalid fixtures as blockers.
- Pre-push now checks changed Markdown placement, changed docs filename policy,
  and changed ADR/evidence frontmatter policy before heavier changed-file and
  type-check gates.
- Placement failures now name the canonical remediation path: move governed
  documentation into `docs/` and link code paths from there.
- The branch keeps historical docs metadata and filename backlog warning-only,
  avoiding hidden scope expansion.

## No-Debt / No-Stub Evidence

- No hooks were bypassed.
- No quality gate was removed or relaxed.
- No stub, placeholder, or fake pass path was introduced.
- No ARC-triggering runtime, adapter, contract, planner, or engine path was
  touched.
- The new test override is explicit and scoped to changed-file list injection;
  production behavior still uses git diff when the override is absent.
