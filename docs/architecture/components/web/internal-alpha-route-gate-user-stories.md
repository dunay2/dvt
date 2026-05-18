---
title: Internal Alpha Route Gate User Stories
status: Review
owner: Product / Architecture / Frontend
last_reviewed: 2026-05-18
planning_type: user-stories
task_ids:
  - F-27
---

# Internal Alpha Route Gate User Stories

## Scope

These stories cover the route-level F-27 gate. Child slices still own their
own implementation details and tests.

- `US-F27-001`: as an internal tester, I need startup posture through
  `ObserveAppBootstrapRouteReadiness` with happy and fail-closed evidence.
- `US-F27-002`: as an internal tester, I need tenant, project, and environment
  context through `ObserveWorkspaceContext`.
- `US-F27-003`: as an internal tester, I need Canvas graph truth through
  `GetWorkspaceGraphDraft` and `SaveWorkspaceGraphDraft`.
- `US-F27-004`: as an internal tester, I need read-only Code inspection through
  `ListWorkspaceFiles` and `GetWorkspaceFileContent`.
- `US-F27-005`: as an internal tester, I need plan/run controls to explain
  enabled or blocked posture through `ObservePlanRunReadiness`.
- `US-F27-006`: as an internal tester, I need consistent recovery language
  through `MapRouteRecoveryState`.
- `US-F27-007`: as a product owner, I need alpha cadence with audience, entry
  date, duration, exit owner, and extension rule.
- `US-F27-008`: as an architecture reviewer, I need included and excluded route
  risks per route stage.
- `US-F27-009`: as a PR reviewer, I need child-only evidence to be rejected for
  alpha-full claims.
- `US-F27-010`: as a lane owner, I need `F-27` to remain route authority while
  child proposals remain stage authorities.
- `US-F27-011`: as a reviewer, I need one combined route fixture to traverse
  startup, workspace context, Canvas, Code, plan/run readiness, and recovery
  before any alpha-full candidate can move past review.

## Negative Stories

- `US-F27-N-001`: Code workbench proof exists but Canvas lacks proof. Alpha full
  remains blocked.
- `US-F27-N-002`: a stage has happy proof but no fail-closed proof. Alpha full
  remains blocked.
- `US-F27-N-003`: recovery copy differs for equivalent failures. The route
  returns to review until vocabulary is source-owned.
- `US-F27-N-004`: cadence lacks exit owner or extension rule. Alpha full remains
  blocked.
- `US-F27-N-005`: risk triage lists included risks only. Alpha full remains
  blocked until exclusion rationale exists.
- `US-F27-N-006`: the combined route fixture omits a stage fail-closed proof.
  Alpha full remains blocked and the missing stage is reported by name.
- `US-F27-N-007`: the combined route fixture omits a route stage or an owned
  command/query rail. Alpha full remains blocked and the missing stage or rail
  is reported by name.

## Traceability

- Route authority: `F-27`.
- Component guide:
  `docs/architecture/components/web/internal-alpha-route-gate-component.md`.
- Acceptance matrix:
  `docs/planning/reviews/architecture-and-governance/20260514-internal-alpha-route-acceptance-matrix.md`.
- Architecture guard:
  `apps/web/src/app/routes/internalAlphaRouteGate.architecture.test.ts`.
- Combined fixture:
  `apps/web/src/app/routes/internalAlphaRouteGate.test.fixtures.ts`.
