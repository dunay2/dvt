---
title: Docs Governance Tooling Future Tasks
status: Draft
owner: docs
last_reviewed: 2026-03-24
planning_type: proposal
---

# Docs Governance Tooling Future Tasks

## Purpose

The discarded governance-tooling branch contained one useful idea: keep
documentation governance executable, not aspirational.

This proposal turns that idea into a small set of future tasks that can be
implemented incrementally without reopening the old branch history.

## What Was Worth Keeping

The branch's useful surface was not product logic. It was the enforcement layer
around docs quality and repo governance:

- ADR catalog validation
- filename and frontmatter checks
- governance-reference checks
- link validation
- docs manifest generation
- CI and pre-push wiring so governance failures block merges early

Those are still the right primitives. What changed is the execution plan.

## Future Tasks

### DGT-1: Unified docs governance manifest

Create a single manifest that describes the repository's canonical docs
surfaces, validation rules, and ownership boundaries.

Expected outcomes:

- one machine-readable entry point for docs governance
- simpler CI gating for docs drift
- less duplication across scripts and Markdown indexes

Suggested implementation:

- extend `tools/docs/generate-docs-manifest.ts`
- emit a repo-level manifest artifact under `docs/planning/status/`
- make `docs:gov` consume the manifest rather than hardcoding scattered paths

Acceptance criteria:

- the manifest enumerates the active docs governance surfaces
- CI can diff the generated manifest against the checked-in version
- no manual index editing is required to register a new governed docs surface

### DGT-2: Strict docs location and naming gate

Make document placement rules fail closed by default.

Expected outcomes:

- non-canonical docs cannot silently drift into the wrong folder
- review and proposal files remain consistently named
- `docs:sync` no longer has to compensate for bad placement

Suggested implementation:

- harden `tools/docs/check-filenames.ts`
- add explicit location rules for planning, evidence, ADRs, and archived docs
- wire a changed-files mode into CI and pre-push

Acceptance criteria:

- invalid docs paths fail the governance gate
- the failure message points to the correct folder or naming policy
- the rule set is documented in the governance inventory

### DGT-3: ADR catalog and cross-link integrity

Keep the ADR catalog, status pages, and proposal references aligned.

Expected outcomes:

- ADRs cannot exist without being visible in the catalog
- references to ADRs or proposals cannot drift into dead links
- status pages stay consistent with the actual planning corpus

Suggested implementation:

- keep `tools/docs/check-adr-catalog.ts` as the canonical ADR inventory gate
- expand `tools/docs/check-governance-references.ts` to cover proposal cross-links
- keep `tools/docs/check-links.ts` focused on docs surfaces that are meant to be navigable

Acceptance criteria:

- every active ADR is catalogued
- every catalog entry resolves to an existing file
- stale references fail the docs governance gate before merge

### DGT-4: Frontmatter contract validation

Treat frontmatter as a contract, not metadata decoration.

Expected outcomes:

- documents declare ownership, status, and review date consistently
- proposal and review pages can be searched and classified reliably
- missing metadata is detected before it leaks into status surfaces

Suggested implementation:

- keep `tools/docs/check-frontmatter.ts` strict on required fields
- add doc-type-specific rules for proposals, reviews, runbooks, and status pages
- document which keys are required for each class of document

Acceptance criteria:

- required frontmatter keys are validated by doc class
- invalid or stale review dates are surfaced
- the policy is documented in the docs governance surface

### DGT-5: Docs CI as a single failure domain

Make docs governance fail in one place, not across many loosely connected jobs.

Expected outcomes:

- easier debugging when docs drift appears
- fewer partial successes where one docs gate passes and another silently diverges
- clearer pre-push and CI behavior for contributors

Suggested implementation:

- keep `docs:gov` as the concise entry point for repo docs enforcement
- have CI call the same gate as local pre-push
- avoid adding one-off docs checks that are not wired through the same path

Acceptance criteria:

- CI and pre-push exercise the same governance surface
- docs failures point to a single command to reproduce locally
- the governance inventory remains the source of truth for the enabled checks

## Non-Goals

- Recreating the discarded branch history
- Adding new product features
- Turning docs governance into a separate application

## Suggested Order

1. DGT-1, because the manifest gives the rest of the checks a stable anchor.
2. DGT-2 and DGT-4, because naming and metadata rules are the easiest drift vectors.
3. DGT-3, because integrity checks should remain hard-fail.
4. DGT-5, because the CI entry point should stay simple once the rules are stable.

## Notes For Future Planning

If this proposal is adopted, the next planning step should be to map each task
to the existing docs governance inventory and to the CI job that already owns
that surface. The goal is to extend the current enforcement model, not to add a
parallel one.
