---
title: Closeout - TF-C1 preview-persist convergence
status: Review
owner: API / Contracts / Web / Docs
last_reviewed: 2026-04-14
planning_type: closeout
slice: TF-C1-preview-persist-convergence
---

# Closeout: TF-C1 preview-persist convergence

## Think-First Analysis

### Problem summary

`TF-C1-A` and `TF-C1-B` were already closed, and the codebase now ships the
full SQL-first preview-persist boundary:

- `apps/api` validates explicit `previewProfile` intent and required Git
  provenance before planner build,
- successful preview persists canonical plan bytes and returns a real
  `PlanRef`, and
- the active Canvas caller emits the governed
  `transformation-sql-first-v1` request and uses the persisted `PlanRef` for
  run start.

The gap was no longer implementation. The gap was that the parent `TF-C1`
task and its dependent planning surfaces still described preview-persist
convergence as unfinished work.

### Root cause

The parent task stayed open because the repo closed the work in smaller slices:

1. route and persistence behavior under `TF-C1-A` and `TF-C1-B`,
2. provenance and caller-visible evidence under `TF-B1-B`,
3. contract and seam hardening under `TF-A1-C`, and
4. web anti-corruption plus active caller adoption under `TF-A1-D` and
   `TF-E1-B`.

Those slices landed, but the Lane C parent and the planning surfaces that still
pointed people at `TF-C1` were not reconciled afterward.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, repo-as-source-of-truth, no hidden
  debt, and concrete validation evidence in the closeout.
- `docs/guides/ai-work-protocol.md`: this is a `Slim` planning-truth slice
  because the implementation is already in mainline and the remaining work is
  status and closeout synchronization.
- `docs/planning/state/planning-control-tower.md`: closing implementation work
  requires the lane YAML, closeout surface, and changed status or roadmap
  surfaces to move together.
- `docs/planning/proposals/mandatory/runtime-and-contracts/transformation-flow-delivery-plan-20260405.md`:
  `TF-C1` is complete when preview is validate-plus-persist, returns the real
  `PlanRef`, and no longer infers provenance requirements from compiled step
  kinds.
- `docs/architecture/system-delivery-status.md`: current implementation truth
  already treats `TF-C3` as the next follow-up rather than leaving `TF-C1` as
  the main unresolved transformation blocker.

### Selected option and rationale

Close `TF-C1` now with a parent closeout and synchronized planning surfaces.

Reopening code would have been fake work. The truthful move is to record that
preview-persist convergence is already delivered and shift the remaining
runtime-mode work to `TF-C3`.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `docs/planning/closeouts/20260414-tf-c1-preview-persist-convergence-closeout.md`
  - `docs/planning/closeouts/index.md`
  - `docs/planning/domains/api-and-admission.md`
  - `docs/planning/state/agent-lane-c.yaml`
  - `docs/planning/state/agent-lane-e.yaml`
  - `docs/planning/state/domain-status-board.md`
  - `docs/planning/roadmap/roadmap-by-domain.md`
  - `docs/planning/roadmap/strategic-product-roadmap.md`
- Expected outcome:
  - `TF-C1` is marked `done` in Lane C with a parent closeout
  - planning surfaces stop pointing operators at `TF-C1` as the next admission
    blocker
  - dependent frontend-planning text no longer claims Lane A or Lane C closure
    is still missing
  - the next transformation follow-up is explicitly `TF-C3`
- Risks and mitigations:
  - Risk: overclaim completion if the active caller still used the generic
    preview path
  - Mitigation: verify the live Canvas path and current tests before changing
    status
  - Risk: planning drift if lane, domain, and roadmap surfaces are updated
    selectively
  - Mitigation: update the lane registry, domain board, domain reference, and
    roadmap overlays in one slice
- Out of scope:
  - new preview-route behavior
  - new web preview or run-start behavior
  - phase-2 dbt executor implementation under `TF-C3`

## Implementation Summary

- Verified that the active Canvas planning path already emits
  `transformation-sql-first-v1` with required Git provenance and consumes the
  persisted `PlanRef`.
- Added this parent closeout so `TF-C1` has a task-level closure artifact
  instead of only the earlier route and persistence subtask closeout.
- Marked `TF-C1` as `done` in Lane C and updated its evidence chain to point at
  the adoption work that landed afterward in Lanes A, B, and E.
- Updated Lane E wording so `TF-E1` no longer claims it is blocked on open
  `TF-A1` or `TF-C1` registry state.
- Updated the API/domain and roadmap surfaces so the next runtime-mode follow-up
  is `TF-C3`, not stale preview-persist convergence.

## Validation Run

- `pnpm docs:sync`
- `pnpm docs:workboard:generate`
- `pnpm docs:gov:links:changed`
- `pnpm verify:prepush`

## Residuals

- `TF-C3` remains the next runtime-mode expansion behind the same
  preview-persist-run contract.
- `TF-E1` still needs parent acceptance consolidation in Lane E even though the
  shipped authoring, preview, run-start, and result behavior is already live.
