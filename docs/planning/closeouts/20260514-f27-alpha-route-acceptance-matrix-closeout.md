---
title: F-27 Alpha Route Acceptance Matrix Closeout
status: Accepted
owner: Product / Architecture / Frontend
last_reviewed: 2026-05-14
planning_type: closeout
task_ids:
  - F-27
---

# F-27 Alpha Route Acceptance Matrix Closeout

## Scope

This closeout accepts the F-27 route-acceptance-matrix slice. It does not
declare internal alpha full complete and does not close the whole F-27 parent
task.

## Work Performed

- Added the internal alpha route gate component guide:
  `docs/architecture/components/web/internal-alpha-route-gate-component.md`.
- Added route-level user stories:
  `docs/architecture/components/web/internal-alpha-route-gate-user-stories.md`.
- Added the F-27 route acceptance matrix:
  `docs/planning/reviews/architecture-and-governance/20260514-internal-alpha-route-acceptance-matrix.md`.
- Updated the route plan and architecture view to point at the matrix as the
  current route-level acceptance artifact.
- Added the semantic architecture guard:
  `apps/web/src/app/routes/internalAlphaRouteGate.architecture.test.ts`.
- Saved Fowler analysis in:
  `buzon/20260514-codex-fowler-f27-alpha-route-gate-analysis.md`.

## Red/Green Evidence

- RED:
  `pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts`
  failed because component guide, user stories, and acceptance matrix were
  missing.
- GREEN:
  `pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts`
  passed with 3 tests.

## Accepted Invariants

- F-27 remains the only route-level internal alpha authority.
- Child slices cannot declare alpha full.
- Every route stage must name happy-path and fail-closed proof.
- Alpha full stays blocked while cadence or risk triage is missing.
- Architecture guard coverage is semantic, not a barrel-thin import check.

## Remaining Work

F-27 remains open for executable stage proof: startup/context, Canvas,
plan/run readiness, source-owned recovery vocabulary, route risk triage, and
cadence decision.
