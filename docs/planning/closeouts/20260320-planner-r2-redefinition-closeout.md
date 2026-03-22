---
title: Closeout - Planner R2 Redefinition
status: Review
owner: Architecture / Planner / Docs
last_reviewed: 2026-03-20
planning_type: closeout
slice: 20260320-planner-r2-redefinition
---

# Closeout: Planner R2 Redefinition

## Think-First Analysis

### Problem summary

The planner roadmap still described `R2` / `S10` as "typed dbt manifest
input". That wording makes DBT look like the intended long-term public planner
boundary, which conflicts with the planner's declared target architecture:
generic core, explicit extension seams, and DBT as one extension rather than
the semantic contract of the subsystem.

### Root cause

The roadmap language drifted from an implementation symptom (`DbtManifestLike =
Record<string, unknown>`) into a target-state goal. That is backwards:
DBT-shaped input is the current debt, not the architectural destination.

### Constraints and invariants

- `AGENTS.md`: governance inventory first, evidence-based closeout, no hidden
  debt, no fake completion
- `docs/planning/status/governance-document-rule-inventory.md`: status and
  proposal surfaces must stay distinct
- `docs/guides/ai-work-protocol.md`: think-first, explicit pre-implementation
  scope, validation, and closeout are required
- `docs/planning/roadmap/index.md`: roadmap-like changes must be reflected in
  the classified roadmap surfaces
- `docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md`: planner
  owner is the semantic author for public planner contract changes

### Options considered

1. Keep `S10` as "typed dbt manifest input" and only treat genericity as a
   later refactor.
   Rejected because it bakes the current DBT coupling into the roadmap target.
2. Remove `S10` entirely and jump straight to runtime lifecycle work.
   Rejected because the boundary contradiction would remain unresolved.
3. Redefine `S10` / `R2` as a typed graph-source boundary with DBT behind an
   implementation seam.
   Selected because it aligns the roadmap with the intended architecture while
   preserving the same execution wave and rough scope.

### Selected option and rationale

Redefine `R2` / `S10` in the canonical planning docs so the next slice is:

- interface-driven graph-source ingestion
- planner core consumption of normalized graph input
- DBT support as an implementation behind that seam

This keeps the planner roadmap aligned with the "generic core + dbt extension"
direction already visible in the code review and architecture assessment.

### Rejected alternatives

- Do not let the implementation symptom (`DbtManifestLike`) become the target
  architecture.
- Do not update only one doc; the redefinition must land in both the planner
  roadmap and the broader Phase 2 roadmap plus the planner status artifact.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - redefine `R2` in the planner roadmap
  - redefine `S10` in the Phase 2 roadmap
  - update the planner assessment so the open boundary debt uses the corrected
    framing
  - create this closeout
- Touched files or paths:
  - `docs/planning/proposals/planner-target-state-roadmap-20260320.md`
  - `docs/planning/proposals/phase2-arch-debt-roadmap-20260315.md`
  - `docs/planning/status/planner-current-state-assessment-20260320.md`
  - this closeout file
- Expected outcome:
  - the next planner slice is defined as a generic graph-source boundary
    instead of a DBT-shaped public contract hardening
- Risks and mitigations:
  - risk: changing planning language without changing code could be mistaken
    for implementation closure
    mitigation: keep the status artifact explicit that the code is still
    DBT-centric today
  - risk: proposal mismatch across planning surfaces
    mitigation: update both roadmap surfaces and the current assessment
- Out-of-scope items:
  - implementing the graph-source interface
  - changing planner code or contracts in this turn
  - introducing a new ADR
- Validation plan:
  - `pnpm docs:sync`
  - `pnpm docs:gov`
  - `pnpm docs:quality:check`
  - `pnpm docs:canonical:check`
  - `pnpm docs:doctor`
  - `pnpm verify:prepush`
- Test coverage plan:
  - docs-only slice; validate governance, generated indexes, and pre-push gate
- Libraries evaluated:
  - None evaluated - documentation/governance task

## Final Closeout

### Governing sources used

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/planning/proposals/planner-target-state-roadmap-20260320.md`
- `docs/planning/proposals/phase2-arch-debt-roadmap-20260315.md`
- `docs/planning/status/planner-current-state-assessment-20260320.md`
- `docs/planning/roadmap/index.md`
- `docs/guides/ai-work-protocol.md`
- `docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md`

### Real work performed

- redefined `R2` in the planner roadmap from "typed manifest boundary" to
  "typed graph-source boundary"
- redefined `S10` in the Phase 2 roadmap from "dbt Manifest Typed Input" to
  "Typed Graph-Source Boundary"
- updated the planner assessment so the open boundary debt is described as a
  DBT-centric public boundary problem rather than a missing DBT contract
  hardening task
- created this closeout

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
  - passed; `check-changed.cjs` reported no changed files for format/lint in the
    tracked baseline used by that script

### No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No hidden TODO, shortcut, or undeclared downgrade was added.

### No-stub evidence

- No stub, placeholder, or fake implementation was added.
- The work redefines planning scope only; it does not pretend code closure that
  has not happened yet.
