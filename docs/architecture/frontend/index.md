---
title: Frontend Architecture
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-03-31
---

# Frontend Architecture

This page is the canonical landing page for frontend documentation inside
`docs/`.

The detailed product and implementation notes still live under `apps/web/`, but
they are not allowed to behave like a parallel documentation root. Start here,
then go to the linked local frontend docs.

Concept anchors for this page:

- [Glossary](../../concepts/glossary.md) for `run`, `artifact`, `status`, and
  `runtime`
- [Domain Language](../../concepts/domain-language.md) for the distinction
  between DVT, engine, planner, adapter, and status

## Current Reality

- `apps/web` is a real UI codebase, not just a mock folder.
- It is still only partially connected to backend reality.
- Mock data still dominates large parts of the surface.
- There are automated tests under `apps/web`, but coverage is still narrow and
  uneven across capabilities.

Current implementation posture now has one canonical source:
[Frontend Current Reality Matrix](review/frontend-current-reality-matrix.md).

That means the frontend exists, but its documentation must be explicit about the
gap between visual breadth and production-backed behavior.

## What This Section Covers

- shell structure and routing;
- the target DDD architecture for the frontend;
- the canonical shared-kernel contracts for selection, tabs, and layout;
- the canonical ACL ownership map across capability boundaries;
- the canonical frontend state ownership and persistence policy;
- the canonical current-reality matrix for target-versus-current drift;
- the canonical frontend architecture guardrails for drift prevention;
- the saved product componentization plan for the workbench core;
- the intended Canvas -> Plan -> Run -> Monitor interaction path;
- the current backend boundary the UI is allowed to rely on;
- the coverage map of what is already architecturally decided and what remains open;
- the execution-oriented work plan for the next five architecture-deepening actions;
- documentation quality and architectural remediation priorities;
- phased frontend architecture execution order;
- where local frontend docs live;
- which commands verify the client surface today.

## Canonical Reading Order

1. [Frontend Documentation Quality Review And Remediation Plan](review/frontend-documentation-quality-review-and-remediation-plan.md)
2. [DVT+ Frontend Architecture Introduction](dvt-frontend-architecture-introduction.md)
3. [Frontend DDD Target Architecture](frontend-ddd-target-architecture.md)
4. [Frontend Architecture Execution Plan](frontend-architecture-execution-plan.md)
5. [Frontend Coverage Map And Open Decision Register](review/frontend-coverage-map-and-open-decision-register.md)
6. [Frontend Architecture Deepening Work Plan](review/frontend-architecture-deepening-work-plan.md)
7. [Frontend ACL Ownership Map](frontend-acl-ownership-map.md)
8. [Frontend State Ownership And Persistence Policy](frontend-state-ownership-and-persistence-policy.md)
9. [Frontend Current Reality Matrix](review/frontend-current-reality-matrix.md)
10. [Frontend Architecture Guardrails](frontend-architecture-guardrails.md)
11. [Frontend Workbench Core Product Componentization Plan](review/frontend-workbench-core-product-componentization-plan.md)
12. [Frontend Workbench WP-01A Composition Root Spec](review/frontend-workbench-wp01a-composition-root-spec.md)
13. [Frontend Workbench WP-01B Shell Layout Spec](review/frontend-workbench-wp01b-shell-layout-spec.md)
14. [App Shell](appshell/app-shell.md)
15. [Workspace Domain Specification](workspace/workspace-domain-specification.md)
16. [Workspace Session Model Specification](workspace/session/workspace-session-model-specification.md)
17. [Selection Context Model Specification](workspace/selection-context-model-specification.md)
18. [Workspace Tab Model Specification](workspace/workspace-tab-model-specification.md)
19. [Workspace Layout Model Specification](workspace/workspace-layout-model-specification.md)
20. [Workspace Orchestration - Cross-Feature Coordination Mechanism](workspace/workspace-orchestration.md)
21. [Workflow / Graph Workbench - Surfaces and Operating Modes](views/workflow/workflow-graph-workbench-surfaces-and-operating-modes.md)
22. [Frontend Architecture - Planning Capability](planning/frontend-planning-capability-architecture.md)
23. [Runs Frontend Architecture](runs/dvt-runs-frontend-architecture.md)
24. [Frontend Architecture Review and Critical Action Plan](review/frontend-architecture-review-and-critical-action-plan.md)

## Current Reality Reading

When the question is "what exists in code today", read these before assuming
the target architecture is implemented:

1. [Frontend Current Reality Matrix](review/frontend-current-reality-matrix.md)
2. [apps/web/README.md](../../../apps/web/README.md)
3. [apps/web/FRONTEND_PLAN_BACK_ALIGNMENT.md](../../../apps/web/FRONTEND_PLAN_BACK_ALIGNMENT.md)
4. [apps/web/DOCUMENTATION_INDEX.md](../../../apps/web/DOCUMENTATION_INDEX.md)
5. [System Delivery Status](../system-delivery-status.md)

## Reference-Only Notes

These files are still useful context, but they should not be treated as the
canonical frontend baseline:

- `docs/architecture/frontend/dvt_frontend_architecture_blueprint.md`
- `docs/architecture/frontend/astproposal.md`

## Primary Code Anchors

- App bootstrap:
  [apps/web/src/main.tsx](../../../apps/web/src/main.tsx)
- App shell:
  [apps/web/src/app/App.tsx](../../../apps/web/src/app/App.tsx)
- Route map:
  [apps/web/src/app/routes.ts](../../../apps/web/src/app/routes.ts)
- Top application bar:
  [apps/web/src/app/components/TopAppBar.tsx](../../../apps/web/src/app/components/TopAppBar.tsx)
- Current mock-heavy data sources:
  [apps/web/src/app/data/mockData.ts](../../../apps/web/src/app/data/mockData.ts)
  and
  [apps/web/src/app/data/mockDbtData.ts](../../../apps/web/src/app/data/mockDbtData.ts)

## Architectural Position

### UI scope

The frontend is the operator-facing and editor-facing surface for DVT. It is
responsible for navigation, visualization, selection, and status display. It is
not allowed to become a hidden orchestration engine.

### Backend boundary

The current stable backend boundary is still narrow:

- health and readiness;
- version and db readiness;
- protected runtime endpoints growing behind the API auth boundary.

Do not document the UI as if plan, run, lineage, cost, and artifact contracts
were already production-complete unless the API actually exposes them.

### Documentation rule

When a frontend-local doc is important, this page must link to it. The local
doc must not be the only place where the topic is discoverable.

## Verification

- `pnpm --filter @dvt/web typecheck`
- `pnpm --filter @dvt/web build`

## Open Gaps

- Frontend tests exist, but there is still no broad capability-level coverage
  baseline.
- Mock-data paths still shape the main UX.
- Guardrail policy now exists, but the staged ESLint rollout and allow-list
  burn-down still have to be implemented in code/config.
- Several frontend architecture docs still need metadata and editorial
  normalization.
- The product boundary is still ahead of the implementation in several views.

If this page becomes stale, frontend documentation becomes misleading again very
quickly because local docs in `apps/web/` are richer than the published surface.
