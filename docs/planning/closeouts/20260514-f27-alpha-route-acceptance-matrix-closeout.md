---
title: F-27 Alpha Route Acceptance Matrix Closeout
status: Accepted
owner: Product / Architecture / Frontend
last_reviewed: 2026-05-18
planning_type: closeout
task_ids:
  - F-27
---

# F-27 Alpha Route Acceptance Matrix Closeout

## Scope

This closeout accepts the F-27 route-acceptance-matrix slice and the final
internal alpha full route gate. It closes the parent F-27 route-level gate while
keeping child slices as their own implementation authorities.

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
- Accepted the cadence decision with named audience, entry date, duration, exit
  owner, and extension rule.
- Accepted route-stage risk triage with included and excluded risk rationale.
- Added alpha-full closure evidence references to the combined fixture so an
  empty blocker list alone cannot accept the route.

## Red/Green Evidence

- RED:
  `pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts`
  failed because component guide, user stories, and acceptance matrix were
  missing.
- GREEN:
  `pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts`
  passed with 3 tests.
- RED:
  `pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/routes/internalAlphaRouteGate.architecture.test.ts`
  failed because cadence/risk still appeared as remaining alpha-full blockers
  and the matrix lacked the accepted alpha-full result.
- GREEN:
  `pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/routes/internalAlphaRouteGate.architecture.test.ts`
  passed after the fixture required resolvable alpha-full closure evidence and
  the matrix recorded cadence/risk as accepted.

## Accepted Invariants

- F-27 remains the only route-level internal alpha authority.
- Child slices cannot declare alpha full.
- Every route stage must name happy-path and fail-closed proof.
- Alpha full stays blocked while cadence or risk triage evidence is missing.
- Alpha full stays blocked when closure evidence references are removed even if
  `alphaFullBlockers` is empty.
- Alpha full is accepted only when startup, workspace context, Canvas, Code,
  plan/run readiness, recovery, cadence, and risk triage are all accepted.
- Architecture guard coverage is semantic, not a barrel-thin import check.

## Remaining Work

F-27 has no remaining alpha-full blockers. Follow-up work moves to the next
Lane E task and must keep route authority in F-27 rather than using child-slice
evidence as a shortcut.
