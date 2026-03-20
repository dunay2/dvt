---
title: Closeout - Planning Archive Sweep
status: Review
owner: Architecture / Docs
last_reviewed: 2026-03-20
planning_type: closeout
slice: 20260320-planning-archive-sweep
---

# Closeout: Planning Archive Sweep

## Think-First Analysis

### Problem summary

`docs/planning/proposals/**` and `docs/planning/gaps/**` contain a mix of
active planning surfaces and historical execution artifacts. That makes the
active planning tree noisier than it should be and leaves obviously closed
material mixed with current entrypoints.

### Root cause

The repository has been good at producing planning artifacts and closeouts, but
not equally disciplined about reclassifying them after closure. As a result,
some `Implemented`, `Final`, or operationally closed trackers remain under live
planning folders instead of moving into the historical archive.

### Constraints and invariants

- `AGENTS.md`: inventory first, evidence-based closeout, no hidden debt, no
  fake completion
- `docs/planning/status/governance-document-rule-inventory.md`: planning,
  status, roadmap, and archive surfaces must remain distinct
- `docs/DOCS_README.md`: historical material should move to `docs/archive/**`
- `docs/planning/index.md`: gaps, proposals, reviews, and status are distinct
  planning surfaces
- `docs/planning/roadmap/index.md`: obsolete roadmap aliases should be removed
  instead of competing with active planning surfaces
- `docs/archive/index.md`: archived material is retained for reference, not as
  active governance
- `docs/guides/ai-work-protocol.md`: think-first, explicit scope, validation,
  and closeout are required

### Options considered

1. Broad delete sweep across old planning docs.
   Rejected because several "old-looking" docs still participate in the
   canonical matrix, active gap status, or subsystem roadmap navigation.
2. No-op and leave all material in place.
   Rejected because the live planning tree keeps accumulating closed trackers
   and implemented proposals, which blurs the distinction between active and
   historical surfaces.
3. Conservative archive sweep of low-risk historical candidates only.
   Selected because it reduces clutter without moving documents that still act
   as active canonical anchors.

### Selected option and rationale

Archive only documents with strong evidence of historical status and low active
surface ownership risk:

- closed AI execution trackers no longer acting as current pointers
- final QA/review artifacts for already closed gaps when the active status doc
  can point to them as historical material
- implemented proposals whose role is now historical reference rather than live
  planning

### Rejected alternatives

- Do not archive `G3`, `G4`, or `G8` canonical specs while they are still used
  by the canonical matrix and gap status surfaces.
- Do not perform a second-pass cleanup of `GAP_PARALLEL_EXECUTION_TRACKS.md` in
  this slice because it has wide active-link surface and deserves a dedicated
  refactor or archive pass.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - create an archive home for historical planning docs
  - move a conservative set of stale planning docs from active folders into
    `docs/archive/planning/**`
  - update active references that would otherwise break
  - add this closeout
- Touched files or paths:
  - `docs/archive/planning/**`
  - selected files under `docs/planning/proposals/**`
  - selected files under `docs/planning/gaps/**`
  - active refs that link to those files
  - this closeout file
- Expected outcome:
  - active planning folders contain less closed historical material
  - moved docs remain reachable under `docs/archive/planning/**`
  - no broken active links remain
- Risks and mitigations:
  - risk: moving a doc that still acts as an active canonical anchor
    mitigation: only move candidates after cross-checking `GAP_EXECUTION_PLANS`,
    `system-delivery-status`, `canonical-doc-code-matrix`, and live references
  - risk: broken links from historical docs and evidence docs
    mitigation: update active markdown links for every moved file and run docs
    validation plus `docs:sync`
- Out-of-scope items:
  - reclassifying every old planning artifact in the repository
  - rewriting canonical specs or status docs beyond the minimum link and
    classification changes required by the move
  - broad archive sweep of all legacy roadmap aliases
- Validation plan:
  - `pnpm docs:sync`
  - `pnpm docs:gov`
  - `pnpm docs:quality:check`
  - `pnpm docs:canonical:check`
  - `pnpm docs:doctor`
  - `pnpm verify:prepush`
- Test coverage plan:
  - docs-only slice; validate generated indexes, governance references, and
    changed-file gates
- Libraries evaluated:
  - None evaluated - documentation/governance task

## Final Closeout

### Governing sources used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/DOCS_README.md`
- `docs/planning/index.md`
- `docs/planning/roadmap/index.md`
- `docs/archive/index.md`
- `docs/guides/ai-work-protocol.md`

### Real work performed

- created an archive home under `docs/archive/planning/**`
- moved these historical gap artifacts out of active planning:
  - `docs/planning/gaps/G6-AI-EXECUTION-TRACKER.md`
  - `docs/planning/gaps/G8-AI-EXECUTION-TRACKER.md`
  - `docs/planning/gaps/G10-AI-EXECUTION-TRACKER.md`
  - `docs/planning/gaps/G4-T4-3-QA-ARCH-REVIEW.md`
- moved this implemented proposal out of active planning:
  - `docs/planning/proposals/ts-esm-monorepo-audit-and-migration-20260318.md`
- updated active references in:
  - `docs/planning/gaps/GAP_EXECUTION_PLANS.md`
  - `docs/planning/gaps/G4-TASK-SPECIFICATION.md`
  - `docs/planning/proposals/principal-architecture-review-execution-plan-20260317.md`
  - `docs/evidence/ED-20260312-g6-golden-schema-closeout.md`
  - `docs/evidence/ED-20260315-g10-closeout.md`
  - `docs/evidence/ED-20260319-ts-esm-monorepo-migration.md`
- corrected two stale code-path links for `attachCompiledCodeRefs` so changed-file
  governance checks still pass after the archive sweep
- regenerated generated navigation surfaces affected by the move:
  - `docs/planning/index.md`
  - `docs/planning/proposals/index.md`
  - `docs/archive/index.md`

### Validation evidence

Passed:

- `pnpm docs:sync`
- `pnpm docs:gov`
  - passed with `13` pre-existing ADR frontmatter warnings
- `pnpm docs:quality:check`
  - passed with pre-existing non-English-content warnings in unrelated docs
- `pnpm docs:canonical:check`
- `pnpm docs:doctor`
  - passed with pre-existing warnings about older closeouts missing
    `last_reviewed`
- `pnpm verify:prepush`
  - passed; changed-file checks passed

Not run:

- `pnpm exec markdownlint-cli2 ...`
  - not included in the required closeout baseline for this slice; the repo has
    also shown a local `fastq` resolution problem in previous turns

### No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No hidden TODO, shortcut, or undeclared downgrade was added.
- The archive sweep was conservative; active canonical specs and status anchors
  for `G3`, `G4`, `G7`, and `G8` were not moved.

### No-stub evidence

- No stub, placeholder, or fake implementation was added.
- Archived documents remain real historical artifacts with updated links and
  explicit archived status; they were not replaced with placeholders.
