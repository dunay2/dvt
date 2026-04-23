---
slice: docs-frontmatter-bom-governance-fix
date: 2026-04-23
last_reviewed: 2026-04-23
gap: maintenance
author: AI (Codex)
---

# Closeout: Docs frontmatter BOM governance fix

## Think-First

### Problem summary

`pnpm docs:ci` currently fails in `pnpm docs:gov:frontmatter` even though the
two cited evidence docs visibly contain YAML frontmatter blocks.

The failing files are:

- `docs/evidence/critical/ED-20260320-planner-r2-typed-graph-source-boundary.md`
- `docs/evidence/critical/ED-20260331-mvp-a1-backend-contractual-inventory.md`

### Root cause

Both files start with a UTF-8 BOM before the leading `---`.

The repository currently has two frontmatter splitters with different behavior:

- `scripts/sync-docs.cjs` strips a BOM before parsing frontmatter
- `tools/docs/lib/markdown.ts` requires the content to start exactly with `---`

`docs:gov:frontmatter` uses the second path, so it rejects BOM-prefixed docs as
if they had no frontmatter.

### Constraints and invariants

- `AGENTS.md` requires truthful evidence, no hidden debt, and
  `pnpm verify:prepush` before presenting the fix as ready.
- `docs/guides/ai-work-protocol.md` requires think-first material before code
  changes and a closeout for the slice.
- The fix must address the root cause, not merely rewrite two documents to hide
  the parser gap.
- The change must stay outside ARC-triggering package paths.

### Options considered

- Remove the BOM from the two failing evidence docs only.
- Make `tools/docs/lib/markdown.ts` BOM-aware so docs-governance tools honor the
  same frontmatter contract as `sync-docs`.

### Selected option and rationale

Make the shared docs-governance parser BOM-aware and add a regression test.

That fixes the actual inconsistency instead of masking it in two current files,
and it protects any future BOM-prefixed governed docs that enter the repo.

### Rejected alternatives

- Strip the BOM only from the two current files: rejected because it preserves
  the parser inconsistency and allows the same failure class to reappear.

## Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - add a failing regression test that proves BOM-prefixed frontmatter must be
    accepted by the docs-governance path
  - fix `tools/docs/lib/markdown.ts` so `splitFrontmatter` accepts BOM-prefixed
    YAML frontmatter
  - rerun `docs:ci` and the required closeout baseline
- Touched files or paths:
  - `tools/docs/lib/markdown.ts`
  - `tools/ci/*.test.mjs` for the regression test
  - this closeout file
- Expected outcome:
  - `pnpm docs:ci` no longer fails on the two evidence docs cited above
  - the parser behavior used by docs-governance tooling matches the existing
    BOM-aware contract already present in `sync-docs`
- Risks and mitigations:
  - risk: changing frontmatter parsing could alter existing ADR/evidence parsing
  - mitigation: keep the change minimal to BOM normalization at the start of
    content and prove it with a regression test
- Out of scope:
  - normalizing historical warning-only ADR and evidence metadata
  - broader docs-quality debt unrelated to the current red gate
- Validation plan:
  - targeted failing-then-passing regression test
  - `pnpm docs:ci`
  - `pnpm lint:md`
  - `pnpm verify:prepush`
- Test coverage plan:
  - prove that a BOM-prefixed YAML block is treated as frontmatter by the
    docs-governance parser path
- Libraries evaluated:
  - no new library is required

## Implementation Log

- Added `tools/ci/docs-frontmatter-bom.test.mjs` as a regression test that
  proves BOM-prefixed YAML frontmatter must be accepted by the
  docs-governance parser path.
- Updated `tools/docs/lib/markdown.ts` so `splitFrontmatter` strips a leading
  UTF-8 BOM and parses frontmatter with CRLF-safe matching before trimming the
  markdown body.
- Re-ran the full docs gate and fixed the next real blockers it exposed instead
  of stopping at the first green subcommand.
- Corrected a broken relative closeout link in
  `docs/planning/proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md`.
- Repaired stale test-path references in
  `docs/planning/status/canonical-doc-code-matrix.md` so governed docs point to
  the actual current test files.
- Updated `tools/docs/validate-planner-stage-1-1-manifest.ts` to the canonical
  manifest and schema paths now used by the repo.
- Updated
  `docs/planning/proposals/disposable/manifests/planner-stage-1-1-canonicalization.manifest.json`
  so its own artifact paths and archived review reference resolve correctly.
- Ran `docs:sync` after adding this closeout so the governed docs manifest and
  indexes reflect the new document and the corrected frontmatter metadata.

## Validation Evidence

- `node --test tools/ci/docs-frontmatter-bom.test.mjs`
  - first run: failed in red state because `pnpm docs:gov:frontmatter`
    rejected the two BOM-prefixed evidence docs as missing YAML frontmatter
  - second run after the parser fix: passed with `2/2` tests green
- `pnpm test:ci-tools`
  - passed with `54/54` tests green
- `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`
  - first run after the validator path fix: failed because the manifest JSON
    still referenced stale locations
  - second run after the manifest update: passed with `0 error(s)`
- `pnpm exec prettier --check tools/docs/lib/markdown.ts tools/docs/validate-planner-stage-1-1-manifest.ts tools/ci/docs-frontmatter-bom.test.mjs docs/planning/status/canonical-doc-code-matrix.md docs/planning/proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md docs/planning/proposals/disposable/manifests/planner-stage-1-1-canonicalization.manifest.json docs/planning/closeouts/20260423-docs-frontmatter-bom-governance-fix-closeout.md`
  - passed with all listed files formatted
- `pnpm lint:md`
  - passed with `0` markdownlint errors
- `pnpm docs:sync`
  - passed
- `pnpm docs:ci`
  - passed with exit `0`
  - emitted inherited warning-only findings for pre-existing docs metadata and
    non-English content outside this slice, but no blocking errors remained
- `pnpm verify:prepush`
  - passed with exit `0`

## Gain Evidence

- Root-cause gain:
  - docs-governance tooling now accepts the same BOM-prefixed frontmatter that
    `sync-docs` already handled, eliminating a parser inconsistency
- Immediate gate gain:
  - `pnpm docs:ci` now clears the BOM/frontmatter failure and the subsequent
    stale-link and stale-manifest blockers exposed behind it
- Repository integrity gain:
  - `docs/.manifest.json` now captures real title/status/date metadata for the
    previously misparsed evidence docs instead of null fields
- Preventive gain:
  - the new regression test keeps BOM-prefixed governed docs from silently
    regressing in future parser changes

## No-Debt / No-Stub Evidence

- No hooks were bypassed.
- No quality gate was removed or relaxed.
- No stub, placeholder, or fake success path was introduced.
- The fix addressed the shared parser contract and the newly exposed broken docs
  references instead of rewriting two docs to hide the defect.
