---
title: Closeout - Planning gaps governance refresh
status: Review
owner: Architecture / Delivery / Docs
last_reviewed: 2026-04-17
planning_type: closeout
slice: 20260417-planning-gaps-governance-refresh
---

# Closeout: Planning gaps governance refresh

## Think-First Analysis

### Problem summary

`docs/planning/gaps/` still contains one active tactical register, but that
surface had drifted from the current planning model:

- the folder index did not clearly route readers to the live lane and review
  surfaces
- the runtime gap register contained a second standalone architecture document
  appended after the active register

That made the `gaps` folder look like a second active planning and review
surface instead of a narrow tactical reference.

### Root cause

The repository retired the legacy `G1` through `G10` gap program and moved
howst planning truth into the lane registry, review board, roadmap, and closeout
surfaces. The `gaps` folder was only partially normalized afterward, so an
older embedded review remained inside the active runtime register and the index
no longer explained the correct routing to live planning truth.

### Constraints and invariants

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/planning-control-tower.md`
- `docs/planning/roadmap/index.md`
- `docs/DOCS_README.md`
- `docs/index.md`

Key invariants for this slice:

- `docs/planning/gaps/**` must stay limited to open tactical gap registers
- live execution truth belongs to lane YAML, reviews, roadmap, and status docs
- active planning surfaces must not carry a second embedded document with its
  own frontmatter and title
- the task must close with regenerated planning/docs surfaces plus
  `pnpm verify:prepush`

### Options considered

1. Leave `gaps/` as-is.
   Rejected because the active register still mixed two documents and the index
   still under-explained the current planning route.
2. Keep all content in `gaps/` and only remove the duplicate frontmatter.
   Rejected because it would preserve review-style material inside an active
   gap register and keep the folder semantically broad.
3. Reassert `gaps/` as a tactical reference surface, clean the active register,
   and route readers to the current lane and review anchors.
   Selected because it fixes the governance problem without inventing another
   planning surface or changing task sequencing.

### Selected option and rationale

Refresh the `gaps` index and runtime register so they:

- state the correct role of the folder
- route live readers to the lane registry, review board, and current
  architecture reviews
- remove the embedded standalone document from the active register

### Rejected alternatives

- Do not create a second active review or roadmap document under `gaps/`.
- Do not mutate lane YAML just to manufacture task movement when no sequencing
  or blocker truth changed.
- Do not leave the malformed embedded document in place as an appendix.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - refresh `docs/planning/gaps/index.md`
  - clean `docs/planning/gaps/runtime-architecture-gap-register-20260331.md`
  - add the required closeout for this planning/docs slice
  - regenerate docs navigation and planning-derived surfaces affected by the
    new closeout
- Touched files or paths:
  - `docs/planning/gaps/index.md`
  - `docs/planning/gaps/runtime-architecture-gap-register-20260331.md`
  - `docs/planning/closeouts/20260417-planning-gaps-governance-refresh-closeout.md`
  - generated index surfaces refreshed by `pnpm docs:sync`
- Expected outcome:
  - `gaps/` reads as a tactical reference surface, not as a parallel review
    board
  - the runtime gap register contains only one active document
  - readers can find the current lane and review anchors directly from the
    `gaps` folder
- Risks and mitigations:
  - risk: remove useful context from the embedded second document
    mitigation: keep the active register focused on tactical gap truth and
    route readers to the current canonical review surfaces instead of leaving
    stale mixed content in place
  - risk: create planning drift by changing docs without task truth updates
    mitigation: keep lane YAML unchanged and state explicitly that no task
    sequencing or blocker posture changed in this slice
- Out-of-scope items:
  - re-verifying every runtime gap against current code
  - introducing new review artifacts or roadmap slices
  - changing lane ownership, dependencies, or progress values
- Validation plan:
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - docs-only slice; use docs generation and pre-push gates rather than code
    tests
- Libraries evaluated:
  - None evaluated - documentation/governance task

## Final Closeout

### Governing sources used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/planning-control-tower.md`
- `docs/planning/roadmap/index.md`
- `docs/DOCS_README.md`
- `docs/index.md`

### Real work performed

- refreshed `docs/planning/gaps/index.md` so the folder now states its role as
  a tactical reference surface and routes readers to:
  - `Planning Control Tower`
  - `Review Status Board`
  - `Agent Lane C YAML`
  - `Roadmap Of Record`
  - `System Delivery Status`
- cleaned `docs/planning/gaps/runtime-architecture-gap-register-20260331.md`
  so it now contains only the active gap register plus current routing anchors
- removed the embedded standalone architecture document from the active gap
  register because active review material belongs under `docs/planning/reviews/**`
- added this closeout as the required task-closure artifact
- updated `docs/planning/closeouts/index.md` so the new closeout is discoverable
  from the canonical closeouts landing page
- made no lane YAML changes because this slice did not change task sequencing,
  blockers, ownership, or execution progress

### Validation evidence

Passed:

- `pnpm docs:sync`
- `pnpm docs:workboard:generate`
- `pnpm verify:prepush`
  - passed, but the `--changed-only` and `type-check-prepush` substeps reported
    no changed files because this docs-only slice was still uncommitted on
    `main`, so `origin/main...HEAD` did not include the working-tree diff
- `pnpm lint:md`
- `pnpm docs:quality:check`
  - passed with pre-existing non-English-content warnings in unrelated archive,
    proposal, review, and generated planning docs
- `pnpm docs:canonical:check`

### No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No hidden planning surface was created.
- No lane/task truth was silently edited to justify the docs cleanup.

### No-stub evidence

- No stub, placeholder, or fake implementation was added.
- The refreshed `gaps` docs route to existing canonical planning surfaces
  rather than to placeholder future docs.
