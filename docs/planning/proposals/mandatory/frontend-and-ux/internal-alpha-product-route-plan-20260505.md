---
title: Internal Alpha Product Route Plan 2026-05-05
status: Accepted
owner: Product / Architecture / Frontend / Runtime Safety
last_reviewed: 2026-09-12
planning_type: proposal
lane: E
task_ids:
  - F-27
---

# Internal Alpha Product Route Plan 2026-05-05

## Closure Disposition

`F-27` is closed. The authoritative closure evidence is
`docs/planning/closeouts/20260514-f27-alpha-route-acceptance-matrix-closeout.md`,
which records no remaining alpha-full blockers.

This file remains at its original path because feature-mechanization manifests,
architecture tests, component docs, and historical reviews still reference that
exact path. The frontend proposal classification already lists it under
`superseded/`; physical movement is deferred to the dedicated link-migration
slice described by `docs/planning/proposals/mandatory/frontend-and-ux/index.md`.

The route rails, fixtures, acceptance matrix, and F-27 identifier below are
retained as proof of the closed route-gate decision. They are not a current task
queue. GitHub Issues owns any new executable task lifecycle; Planning DB owns
architecture and mechanization records. Historical Lane/Control-Tower wording is
not task authority after this disposition.

## Purpose

This plan recorded the internal alpha route planning, routing, and proof model.
It fixed the prior coupling where the Code workbench workspace-files child slice
carried route-level alpha context inside a closed child-slice manifest.

The route-level gate was accepted through F-27; child slices remain
stage-specific architecture/evidence owners and cannot retroactively redefine
the alpha-full decision.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/github-mvp-issue-workflow.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/reference-architecture.md`
- `docs/planning/reviews/architecture-and-governance/20260504-internal-alpha-evolution-route.md`
- `docs/planning/reviews/architecture-and-governance/20260505-internal-alpha-architecture-view-review.md`
- `docs/planning/reviews/architecture-and-governance/20260505-alpha-evolution-route-v3-critique.md`
- `docs/planning/reviews/architecture-and-governance/20260514-internal-alpha-route-acceptance-matrix.md`
- `docs/planning/closeouts/20260514-f27-alpha-route-acceptance-matrix-closeout.md`
- `docs/architecture/components/web/internal-alpha-route-gate-component.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/code-workbench-workspace-files-query-rail-plan-20260504.md`

## Historical Scope

The closed slice covered:

- one route-level internal-alpha gate identified by `F-27`;
- runtime-safety dependency visibility for protected runtime and plan/run
  readiness inputs;
- explicit separation between route-level alpha proof and child-slice
  workspace-files authority;
- route-level closure requirements for startup, context, Canvas, Code,
  plan/run readiness, recovery, cadence, and risk triage.

It did not cover:

- implementing new startup, Canvas, Code, or plan/run UI behavior;
- adding new API routes, contracts, adapters, or packages;
- declaring launch, beta, public availability, or GTM cadence;
- changing the already closed workspace-files child-slice evidence.

## Route Evidence Model

| Surface                   | Evidence role                         | Rule                                                                                                        |
| ------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| This plan                 | Accepted route-proof record           | Records the closed `F-27` route model and alpha closure prerequisites.                                      |
| F-27 closeout             | Closure authority                     | Records that the parent alpha-full gate is closed with no remaining blockers.                               |
| GitHub Issues             | Executable task lifecycle             | Owns any follow-up implementation status, ownership, blockers, evidence, and closure.                       |
| Planning DB               | Architecture/mechanization governance | Owns architecture, capabilities, relations, command/query rails, and governed mechanization.                |
| Internal alpha review     | Route review and gap evidence         | Records the route stages and proof posture that led to closure.                                             |
| Architecture view         | Route boundary lens                   | Explains route, rail, state, evidence, and risk boundaries without creating a backlog.                      |
| Critique v3               | Accepted intake history               | Records source-grounded findings absorbed into the closed route proof.                                      |
| Workspace-files component | Child-slice implementation authority  | Owns `ListWorkspaceFiles`, `GetWorkspaceFileContent`, and revision-guarded `SaveWorkspaceFileContent` work. |

## Command And Query Rail Binding

No route stage may implement externally observable behavior without a governing
command or query rail.

| Rail                                | Type    | Owning bounded context               | DDD owner                              | Route stage        |
| ----------------------------------- | ------- | ------------------------------------ | -------------------------------------- | ------------------ |
| `ObserveAppBootstrapRouteReadiness` | query   | Web Shell / App Bootstrap            | `RouteBootstrapStartupReadinessState`  | Startup gate       |
| `GetEffectiveWorkspaceContext`      | query   | Workspace context                    | `EffectiveWorkspaceContext read model` | Context selection  |
| `GetWorkspaceGraphDraft`            | query   | Workspace graph drafting             | `WorkspaceGraphDraft` read boundary    | Canvas             |
| `SaveWorkspaceGraphDraft`           | command | Workspace graph drafting             | `WorkspaceGraphDraft` aggregate        | Canvas             |
| `ListWorkspaceFiles`                | query   | Operational evidence read models     | `WorkspaceFileTree`                    | Code tab           |
| `GetWorkspaceFileContent`           | query   | Operational evidence read models     | `WorkspaceFileContent`                 | Code tab           |
| `SaveWorkspaceFileContent`          | command | Project workspace I/O                | `WorkspaceFileContent` aggregate       | Code tab           |
| `ObservePlanRunReadiness`           | query   | Runtime admission and plan readiness | `PlanRunReadinessReadModel`            | Plan/run readiness |
| `MapRouteRecoveryState`             | query   | Web route presentation               | `RouteRecoveryState` read model        | Recovery states    |

These rails are retained as the published language of the accepted route proof.
New implementation work must reuse current rails or update the governed rail
catalog before code; this closed plan does not create new executable tasks.

## Fowler Opportunity Matrix

| Opportunity          | Route risk                                                       | Required correction                                                    |
| -------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Boundary drift       | Child slices can become route authority.                         | Keep route proof bounded and child behavior in child owners.           |
| Duplicate semantics  | Recovery and readiness copy can diverge by stage.                | Keep one source-owned recovery/readiness vocabulary.                   |
| Test-only confidence | Cypress can prove Code while startup or plan/run stays unproven. | Retain the route-level fixture matrix as closure evidence.             |
| Documentation drift  | Historical review and accepted closure can disagree.             | Treat the closeout as lifecycle truth and this plan as accepted proof. |
| Stage saturation     | One route review can absorb too much child detail.               | Child slices keep depth; this plan preserves only route proof.         |

## Closed Child-Slice Requirements

| Stage              | Proof owner / dependency                             | Minimum closure evidence                                                                                                              |
| ------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Startup gate       | Web shell with runtime readiness input               | Stable startup terminal and blocker states plus browser proof.                                                                        |
| Workspace context  | Workspace context with protected runtime scope input | Tenant, project, and environment visible and fail-closed.                                                                             |
| Canvas             | Canvas with protected draft input                    | Draggable graph, draft retry/recovery, and no local persistence authority.                                                            |
| Code tab           | Workspace-files component plus ADR-0060              | Tree, preview, revision-guarded synchronization, conflict, empty, unavailable, unauthorized, not-found, and filesystem safety proofs. |
| Plan/run readiness | Frontend plus runtime/planner readiness inputs       | Distinct copy for integrity, backpressure, capability, adapter, and authorization blockers.                                           |
| Recovery states    | Web route presentation                               | Source-owned vocabulary and tests across startup, Canvas, Code, and plan/run.                                                         |
| Alpha cadence      | Product / Architecture                               | Tester audience, duration, entry date, exit owner, and extension rules.                                                               |
| Risk triage        | Architecture / Docs                                  | Route-stage triage of `docs/risk-register/quality/**` with inclusion/exclusion rationale.                                             |

## Historical Implementation Order

The completed route followed this sequence:

1. Establish the F-27 route plan and route-level proof boundary.
2. Close route-risk triage and cadence before any alpha-full claim.
3. Bind startup, context, recovery, and plan/run readiness to exact rails and
   component owners.
4. Route each child implementation through its own mandatory proposal or
   existing child plan.
5. Add the route-level fixture matrix after child rails were named.
6. Accept alpha full only after route smoke, child proofs, negative paths,
   `traceability:adr0`, and `pnpm verify:prepush` passed.

Any new executable follow-up now starts in GitHub Issues rather than reopening
this sequence.

## Route Acceptance Matrix

The route-level fixture and acceptance evidence is
`docs/planning/reviews/architecture-and-governance/20260514-internal-alpha-route-acceptance-matrix.md`.
It owns the stage-by-stage proof that supported F-27 closure. The corresponding
closeout records that alpha-full is accepted and that the parent gate has no
remaining blockers.

## Feature Mechanization Scope

This manifest records the closed planning-authority correction and the
combined route proof fixture. It does not implement product route behavior and
it does not create a current task authority.

```feature-mechanization
version: 1
featureId: INTERNAL-ALPHA-PRODUCT-ROUTE-PLAN
mechanizationStatus: closed
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/internal-alpha-product-route-plan-20260505.md
componentGuides:
  - docs/planning/reviews/architecture-and-governance/20260504-internal-alpha-evolution-route.md
  - docs/planning/reviews/architecture-and-governance/20260505-internal-alpha-architecture-view-review.md
  - docs/architecture/components/web/internal-alpha-route-gate-component.md
  - docs/architecture/components/web/appshell/protected-route-session-gate-component.md
  - docs/planning/reviews/architecture-and-governance/20260514-internal-alpha-route-acceptance-matrix.md
userStories:
  - docs/planning/proposals/mandatory/frontend-and-ux/internal-alpha-product-route-plan-20260505.md
  - docs/architecture/components/web/internal-alpha-route-gate-user-stories.md
  - docs/architecture/components/web/appshell/protected-route-session-gate-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/planning/state/github-mvp-issue-workflow.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/closeouts/20260514-f27-alpha-route-acceptance-matrix-closeout.md
allowedImplementationSurfaces:
  - docs/.manifest.json
  - docs/**/index.md
  - docs/planning/proposals/mandatory/frontend-and-ux/internal-alpha-product-route-plan-20260505.md
  - docs/planning/proposals/mandatory/frontend-and-ux/code-workbench-workspace-files-query-rail-plan-20260504.md
  - docs/planning/proposals/portfolio-map-20260403.md
  - docs/planning/reviews/architecture-and-governance/20260504-internal-alpha-evolution-route.md
  - docs/planning/reviews/architecture-and-governance/20260505-internal-alpha-architecture-view-review.md
  - docs/planning/reviews/architecture-and-governance/20260505-alpha-evolution-route-v3-critique.md
  - docs/planning/reviews/architecture-and-governance/20260514-internal-alpha-route-acceptance-matrix.md
  - docs/planning/roadmap/index.md
  - docs/planning/roadmap/roadmap-by-domain.md
  - docs/architecture/components/web/internal-alpha-route-gate-component.md
  - docs/architecture/components/web/internal-alpha-route-gate-user-stories.md
  - docs/architecture/components/web/graph/canvas-plan-run-readiness-component.md
  - docs/architecture/components/web/graph/canvas-plan-run-readiness-user-stories.md
  - docs/architecture/components/web/appshell/protected-route-session-gate-component.md
  - docs/architecture/components/web/appshell/protected-route-session-gate-user-stories.md
  - docs/planning/closeouts/20260514-f27-alpha-route-acceptance-matrix-closeout.md
  - buzon/20260518-codex-fowler-f27-plan-run-readiness-analysis.md
  - buzon/20260514-codex-fowler-f27-alpha-route-gate-analysis.md
  - buzon/20260515-codex-fowler-f27-session-gate-runtime-unavailable-analysis.md
  - apps/web/src/app/routes.test.tsx
  - apps/web/src/app/routes/internalAlphaRouteGate.architecture.test.ts
  - apps/web/src/app/routes/internalAlphaRouteGate.test.fixtures.ts
  - apps/web/src/app/views/canvas/canvasExecutionState.ts
  - apps/web/src/app/views/canvas/CanvasToolbar.tsx
  - apps/web/src/app/views/canvas/PlanRunReadinessPanel.tsx
  - apps/web/src/app/views/canvas/PlanRunReadinessPanel.test.tsx
  - apps/web/src/app/views/canvas/canvasPlanReadiness.ts
  - apps/web/src/app/views/canvas/canvasPlanReadiness.test.ts
  - docs/planning/status/**
forbiddenImplementationSurfaces:
  - packages/**
  - scripts/**
  - specs/**
commandQueryRails:
  - name: ObserveAppBootstrapRouteReadiness
    type: query
    dddOwner: RouteBootstrapStartupReadinessState read model
  - name: GetEffectiveWorkspaceContext
    type: query
    dddOwner: EffectiveWorkspaceContext read model
  - name: GetWorkspaceGraphDraft
    type: query
    dddOwner: WorkspaceGraphDraft read boundary
  - name: SaveWorkspaceGraphDraft
    type: command
    dddOwner: WorkspaceGraphDraft aggregate
  - name: ListWorkspaceFiles
    type: query
    dddOwner: WorkspaceFileTree
  - name: GetWorkspaceFileContent
    type: query
    dddOwner: WorkspaceFileContent
  - name: SaveWorkspaceFileContent
    type: command
    dddOwner: WorkspaceFileContent
  - name: ObservePlanRunReadiness
    type: query
    dddOwner: PlanRunReadinessReadModel
  - name: MapRouteRecoveryState
    type: query
    dddOwner: RouteRecoveryState read model
domainObjects:
  - name: InternalAlphaRouteGate
    type: route gate
    owner: Product / Architecture / Frontend
  - name: RouteStageProof
    type: evidence model
    owner: Product / Architecture
  - name: RouteRecoveryState
    type: read model
    owner: Web route presentation
  - name: PlanRunReadinessReadModel
    type: read model
    owner: Runtime admission and plan readiness
  - name: AlphaCadenceDecision
    type: planning decision
    owner: Product / Architecture
  - name: InternalAlphaCombinedRouteFixture
    type: test fixture
    owner: InternalAlphaRouteGate architecture guard
fowlerSignals:
  - Boundary drift
  - Duplicate semantics
  - Test-only confidence
  - Documentation drift
  - Stage saturation
architectureGuards:
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - closed route-proof governance slice; product Cypress lives with child behavior.
completionGate:
  - pnpm docs:feature-mechanization:implementation
  - pnpm docs:sync
  - pnpm verify:prepush
redGreenCycles:
  - id: alpha-route-planning-authority
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: Route-level alpha review and critique are outside their own allowed implementation surface before this plan exists.
    patchSurfaces:
      - docs/planning/proposals/mandatory/frontend-and-ux/internal-alpha-product-route-plan-20260505.md
      - docs/planning/reviews/architecture-and-governance/20260504-internal-alpha-evolution-route.md
      - docs/planning/reviews/architecture-and-governance/20260505-internal-alpha-architecture-view-review.md
      - docs/planning/reviews/architecture-and-governance/20260505-alpha-evolution-route-v3-critique.md
      - docs/planning/roadmap/index.md
      - docs/planning/roadmap/roadmap-by-domain.md
      - docs/planning/proposals/portfolio-map-20260403.md
      - docs/planning/status/**
    greenTest: pnpm docs:feature-mechanization:implementation
symbols:
  - name: InternalAlphaProductRoutePlan
    path: docs/planning/proposals/mandatory/frontend-and-ux/internal-alpha-product-route-plan-20260505.md
    dddOwner: InternalAlphaRouteGate accepted route-proof evidence
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - GetEffectiveWorkspaceContext
      - GetWorkspaceGraphDraft
      - SaveWorkspaceGraphDraft
      - ListWorkspaceFiles
      - GetWorkspaceFileContent
      - ObservePlanRunReadiness
      - MapRouteRecoveryState
    fowlerSignals:
      - Boundary drift
      - Documentation drift
      - Stage saturation
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - accepted route-proof evidence only.
    unitTests:
      - pnpm docs:feature-mechanization:implementation
  - name: InternalAlphaProductRouteReview
    path: docs/planning/reviews/architecture-and-governance/20260504-internal-alpha-evolution-route.md
    dddOwner: InternalAlphaRouteGate review model
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - GetEffectiveWorkspaceContext
      - ObservePlanRunReadiness
      - MapRouteRecoveryState
    fowlerSignals:
      - Boundary drift
      - Test-only confidence
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - review-only surface.
    unitTests:
      - pnpm docs:feature-mechanization:implementation
  - name: InternalAlphaArchitectureViewReview
    path: docs/planning/reviews/architecture-and-governance/20260505-internal-alpha-architecture-view-review.md
    dddOwner: InternalAlphaRouteGate architecture boundary lens
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - GetEffectiveWorkspaceContext
      - GetWorkspaceGraphDraft
      - SaveWorkspaceGraphDraft
      - ListWorkspaceFiles
      - GetWorkspaceFileContent
      - ObservePlanRunReadiness
      - MapRouteRecoveryState
    fowlerSignals:
      - Boundary drift
      - Hidden authority
      - Test-only confidence
      - Documentation drift
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - architecture review surface.
    unitTests:
      - pnpm docs:feature-mechanization:implementation
  - name: AlphaEvolutionRouteV3Critique
    path: docs/planning/reviews/architecture-and-governance/20260505-alpha-evolution-route-v3-critique.md
    dddOwner: InternalAlphaRouteGate accepted intake history
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - GetEffectiveWorkspaceContext
      - ObservePlanRunReadiness
      - MapRouteRecoveryState
    fowlerSignals:
      - Documentation drift
      - Stage saturation
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - critique intake only.
    unitTests:
      - pnpm docs:feature-mechanization:implementation
  - name: REPO_ROOT
    path: apps/web/src/app/routes/internalAlphaRouteGate.architecture.test.ts
    dddOwner: InternalAlphaRouteGate architecture guard
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - GetEffectiveWorkspaceContext
      - ObservePlanRunReadiness
      - MapRouteRecoveryState
    fowlerSignals:
      - Test-only confidence
      - Documentation drift
    architectureGuard: pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: N/A - architecture guard only.
    unitTests:
      - pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
  - name: readRepoFile
    path: apps/web/src/app/routes/internalAlphaRouteGate.architecture.test.ts
    dddOwner: InternalAlphaRouteGate architecture guard
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - GetEffectiveWorkspaceContext
      - ObservePlanRunReadiness
      - MapRouteRecoveryState
    fowlerSignals:
      - Test-only confidence
      - Documentation drift
    architectureGuard: pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: N/A - architecture guard only.
    unitTests:
      - pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
  - name: routeStages
    path: apps/web/src/app/routes/internalAlphaRouteGate.architecture.test.ts
    dddOwner: InternalAlphaRouteGate architecture guard
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - GetEffectiveWorkspaceContext
      - ObservePlanRunReadiness
      - MapRouteRecoveryState
    fowlerSignals:
      - Test-only confidence
      - Documentation drift
    architectureGuard: pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: N/A - architecture guard only.
    unitTests:
      - pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
  - name: InternalAlphaRouteStage
    path: apps/web/src/app/routes/internalAlphaRouteGate.test.fixtures.ts
    dddOwner: InternalAlphaRouteGate combined route proof fixture
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - GetEffectiveWorkspaceContext
      - GetWorkspaceGraphDraft
      - SaveWorkspaceGraphDraft
      - ListWorkspaceFiles
      - GetWorkspaceFileContent
      - ObservePlanRunReadiness
      - MapRouteRecoveryState
    fowlerSignals:
      - Test-only confidence
      - Boundary drift
    architectureGuard: pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: N/A - test-only route proof fixture.
    unitTests:
      - pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
  - name: InternalAlphaRouteRail
    path: apps/web/src/app/routes/internalAlphaRouteGate.test.fixtures.ts
    dddOwner: InternalAlphaRouteGate combined route proof fixture
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - GetEffectiveWorkspaceContext
      - GetWorkspaceGraphDraft
      - SaveWorkspaceGraphDraft
      - ListWorkspaceFiles
      - GetWorkspaceFileContent
      - ObservePlanRunReadiness
      - MapRouteRecoveryState
    fowlerSignals:
      - Test-only confidence
      - Boundary drift
    architectureGuard: pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: N/A - test-only route proof fixture.
    unitTests:
      - pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
  - name: InternalAlphaRecoveryState
    path: apps/web/src/app/routes/internalAlphaRouteGate.test.fixtures.ts
    dddOwner: InternalAlphaRouteGate combined route proof fixture
    cqRails:
      - MapRouteRecoveryState
    fowlerSignals:
      - Test-only confidence
      - Duplicate semantics
    architectureGuard: pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: N/A - test-only route proof fixture.
    unitTests:
      - pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
  - name: InternalAlphaFullBlocker
    path: apps/web/src/app/routes/internalAlphaRouteGate.test.fixtures.ts
    dddOwner: InternalAlphaRouteGate alpha-full blocker model
    cqRails:
      - ObservePlanRunReadiness
      - MapRouteRecoveryState
    fowlerSignals:
      - Test-only confidence
      - Documentation drift
    architectureGuard: pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: N/A - test-only route proof fixture.
    unitTests:
      - pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
  - name: InternalAlphaEvidenceAcceptance
    path: apps/web/src/app/routes/internalAlphaRouteGate.test.fixtures.ts
    dddOwner: InternalAlphaRouteGate combined route proof fixture
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - GetEffectiveWorkspaceContext
      - GetWorkspaceGraphDraft
      - SaveWorkspaceGraphDraft
      - ListWorkspaceFiles
      - GetWorkspaceFileContent
      - ObservePlanRunReadiness
      - MapRouteRecoveryState
    fowlerSignals:
      - Test-only confidence
      - Documentation drift
    architectureGuard: pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: N/A - test-only route proof fixture.
    unitTests:
      - pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
  - name: InternalAlphaCombinedRouteStageProof
    path: apps/web/src/app/routes/internalAlphaRouteGate.test.fixtures.ts
    dddOwner: InternalAlphaRouteGate combined route proof fixture
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - GetEffectiveWorkspaceContext
      - GetWorkspaceGraphDraft
      - SaveWorkspaceGraphDraft
      - ListWorkspaceFiles
      - GetWorkspaceFileContent
      - ObservePlanRunReadiness
      - MapRouteRecoveryState
    fowlerSignals:
      - Test-only confidence
      - Boundary drift
    architectureGuard: pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: N/A - test-only route proof fixture.
    unitTests:
      - pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
  - name: InternalAlphaCombinedRouteFixture
    path: apps/web/src/app/routes/internalAlphaRouteGate.test.fixtures.ts
    dddOwner: InternalAlphaRouteGate combined route proof fixture
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - GetEffectiveWorkspaceContext
      - GetWorkspaceGraphDraft
      - SaveWorkspaceGraphDraft
      - ListWorkspaceFiles
      - GetWorkspaceFileContent
      - ObservePlanRunReadiness
      - MapRouteRecoveryState
    fowlerSignals:
      - Test-only confidence
      - Boundary drift
    architectureGuard: pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: N/A - test-only route proof fixture.
    unitTests:
      - pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
  - name: InternalAlphaCombinedRouteEvaluation
    path: apps/web/src/app/routes/internalAlphaRouteGate.test.fixtures.ts
    dddOwner: InternalAlphaRouteGate combined route proof fixture
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - GetEffectiveWorkspaceContext
      - GetWorkspaceGraphDraft
      - SaveWorkspaceGraphDraft
      - ListWorkspaceFiles
      - GetWorkspaceFileContent
      - ObservePlanRunReadiness
      - MapRouteRecoveryState
    fowlerSignals:
      - Test-only confidence
      - Boundary drift
    architectureGuard: pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: N/A - test-only route proof fixture.
    unitTests:
      - pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
  - name: requiredRouteStages
    path: apps/web/src/app/routes/internalAlphaRouteGate.test.fixtures.ts
    dddOwner: InternalAlphaRouteGate combined route proof fixture
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - GetEffectiveWorkspaceContext
      - GetWorkspaceGraphDraft
      - SaveWorkspaceGraphDraft
      - ListWorkspaceFiles
      - GetWorkspaceFileContent
      - ObservePlanRunReadiness
      - MapRouteRecoveryState
    fowlerSignals:
      - Test-only confidence
      - Boundary drift
    architectureGuard: pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: N/A - test-only route proof fixture.
    unitTests:
      - pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
  - name: requiredRouteRails
    path: apps/web/src/app/routes/internalAlphaRouteGate.test.fixtures.ts
    dddOwner: InternalAlphaRouteGate combined route proof fixture
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - GetEffectiveWorkspaceContext
      - GetWorkspaceGraphDraft
      - SaveWorkspaceGraphDraft
      - ListWorkspaceFiles
      - GetWorkspaceFileContent
      - ObservePlanRunReadiness
      - MapRouteRecoveryState
    fowlerSignals:
      - Test-only confidence
      - Boundary drift
    architectureGuard: pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: N/A - test-only route proof fixture.
    unitTests:
      - pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
  - name: repoRoot
    path: apps/web/src/app/routes/internalAlphaRouteGate.test.fixtures.ts
    dddOwner: InternalAlphaRouteGate combined route proof fixture
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - GetEffectiveWorkspaceContext
      - GetWorkspaceGraphDraft
      - SaveWorkspaceGraphDraft
      - ListWorkspaceFiles
      - GetWorkspaceFileContent
      - ObservePlanRunReadiness
      - MapRouteRecoveryState
    fowlerSignals:
      - Test-only confidence
      - Documentation drift
    architectureGuard: pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: N/A - test-only route proof fixture.
    unitTests:
      - pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
  - name: isResolvableEvidenceRef
    path: apps/web/src/app/routes/internalAlphaRouteGate.test.fixtures.ts
    dddOwner: InternalAlphaRouteGate combined route proof fixture
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - GetWorkspaceGraphDraft
      - SaveWorkspaceGraphDraft
      - ListWorkspaceFiles
      - GetWorkspaceFileContent
      - ObservePlanRunReadiness
      - MapRouteRecoveryState
    fowlerSignals:
      - Test-only confidence
      - Documentation drift
    architectureGuard: pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: N/A - test-only route proof fixture.
    unitTests:
      - pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
  - name: internalAlphaCombinedRouteFixture
    path: apps/web/src/app/routes/internalAlphaRouteGate.test.fixtures.ts
    dddOwner: InternalAlphaRouteGate combined route proof fixture
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - GetEffectiveWorkspaceContext
      - GetWorkspaceGraphDraft
      - SaveWorkspaceGraphDraft
      - ListWorkspaceFiles
      - GetWorkspaceFileContent
      - ObservePlanRunReadiness
      - MapRouteRecoveryState
    fowlerSignals:
      - Test-only confidence
      - Boundary drift
    architectureGuard: pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: N/A - test-only route proof fixture.
    unitTests:
      - pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
  - name: evaluateInternalAlphaCombinedRouteFixture
    path: apps/web/src/app/routes/internalAlphaRouteGate.test.fixtures.ts
    dddOwner: InternalAlphaRouteGate combined route proof fixture
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - GetEffectiveWorkspaceContext
      - GetWorkspaceGraphDraft
      - SaveWorkspaceGraphDraft
      - ListWorkspaceFiles
      - GetWorkspaceFileContent
      - ObservePlanRunReadiness
      - MapRouteRecoveryState
    fowlerSignals:
      - Test-only confidence
      - Boundary drift
    architectureGuard: pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: N/A - test-only route proof fixture.
    unitTests:
      - pnpm --filter @dvt/web test -- internalAlphaRouteGate.architecture.test.ts
  - name: PlanRunReadinessBlocker
    path: apps/web/src/app/views/canvas/canvasPlanReadiness.ts
    dddOwner: PlanRunReadinessReadModel
    cqRails:
      - ObservePlanRunReadiness
    fowlerSignals:
      - Primitive obsession
      - Duplicate semantics
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/routes/internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts
    unitTests:
      - pnpm --filter @dvt/web test -- canvasPlanReadiness.test.ts
  - name: PlanRunReadinessReadModel
    path: apps/web/src/app/views/canvas/canvasPlanReadiness.ts
    dddOwner: Runtime admission and plan readiness read model
    cqRails:
      - ObservePlanRunReadiness
    fowlerSignals:
      - Boundary drift
      - Primitive obsession
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/routes/internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts
    unitTests:
      - pnpm --filter @dvt/web test -- canvasPlanReadiness.test.ts
  - name: observePlanRunReadiness
    path: apps/web/src/app/views/canvas/canvasPlanReadiness.ts
    dddOwner: PlanRunReadinessReadModel
    cqRails:
      - ObservePlanRunReadiness
    fowlerSignals:
      - Boundary drift
      - Duplicate semantics
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/routes/internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts
    unitTests:
      - pnpm --filter @dvt/web test -- canvasPlanReadiness.test.ts
  - name: buildPlanRunReadinessSummary
    path: apps/web/src/app/views/canvas/canvasPlanReadiness.ts
    dddOwner: PlanRunReadinessReadModel
    cqRails:
      - ObservePlanRunReadiness
    fowlerSignals:
      - Duplicate semantics
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/routes/internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts
    unitTests:
      - pnpm --filter @dvt/web test -- canvasPlanReadiness.test.ts
  - name: PlanRunReadinessPanel
    path: apps/web/src/app/views/canvas/PlanRunReadinessPanel.tsx
    dddOwner: PlanRunReadinessReadModel presentation
    cqRails:
      - ObservePlanRunReadiness
    fowlerSignals:
      - Passive View
      - Duplicate semantics
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/routes/internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts
    unitTests:
      - pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/PlanRunReadinessPanel.test.tsx
  - name: PlanRunReadinessPanelProps
    path: apps/web/src/app/views/canvas/PlanRunReadinessPanel.tsx
    dddOwner: PlanRunReadinessReadModel presentation contract
    cqRails:
      - ObservePlanRunReadiness
    fowlerSignals:
      - Boundary drift
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/routes/internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts
    unitTests:
      - pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/PlanRunReadinessPanel.test.tsx
  - name: blockerLabels
    path: apps/web/src/app/views/canvas/PlanRunReadinessPanel.tsx
    dddOwner: PlanRunReadinessBlocker presentation copy
    cqRails:
      - ObservePlanRunReadiness
    fowlerSignals:
      - Primitive obsession
      - Duplicate semantics
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/routes/internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts
    unitTests:
      - pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/PlanRunReadinessPanel.test.tsx
  - name: forcePlanIntegrityBlocker
    path: apps/web/src/app/views/canvas/canvasExecutionState.ts
    dddOwner: PlanRunReadinessReadModel integrity adapter
    cqRails:
      - ObservePlanRunReadiness
    fowlerSignals:
      - Boundary drift
      - Duplicate semantics
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/routes/internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts
    unitTests:
      - pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/canvasPlanReadiness.test.ts
  - name: buildReadiness
    path: apps/web/src/app/views/canvas/PlanRunReadinessPanel.test.tsx
    dddOwner: PlanRunReadinessPanel test fixture
    cqRails:
      - ObservePlanRunReadiness
    fowlerSignals:
      - Test-only confidence
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/routes/internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: N/A - component test fixture only.
    unitTests:
      - pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/PlanRunReadinessPanel.test.tsx
  - name: buildPlanRunReadiness
    path: apps/web/src/app/views/canvas/CanvasToolbar.test.tsx
    dddOwner: Canvas toolbar readiness test fixture
    cqRails:
      - ObservePlanRunReadiness
    fowlerSignals:
      - Test-only confidence
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/routes/internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: N/A - component test fixture only.
    unitTests:
      - pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasToolbar.test.tsx
  - name: buildPlanRunReadiness
    path: apps/web/src/app/views/canvas/CanvasShell.test.tsx
    dddOwner: Canvas shell readiness test fixture
    cqRails:
      - ObservePlanRunReadiness
    fowlerSignals:
      - Test-only confidence
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/routes/internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: N/A - shell test fixture only.
    unitTests:
      - pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasShell.test.tsx
  - name: REPO_ROOT
    path: apps/web/src/app/routes/internalAlphaRouteGate.architecture.test.ts
    dddOwner: Canvas plan/run readiness architecture guard
    cqRails:
      - ObservePlanRunReadiness
    fowlerSignals:
      - Test-only confidence
      - Documentation drift
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/routes/internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: N/A - architecture guard only.
    unitTests:
      - pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/routes/internalAlphaRouteGate.architecture.test.ts
  - name: readRepoFile
    path: apps/web/src/app/routes/internalAlphaRouteGate.architecture.test.ts
    dddOwner: Canvas plan/run readiness architecture guard
    cqRails:
      - ObservePlanRunReadiness
    fowlerSignals:
      - Test-only confidence
      - Documentation drift
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/routes/internalAlphaRouteGate.architecture.test.ts
    cypressCoverage: N/A - architecture guard only.
    unitTests:
      - pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/routes/internalAlphaRouteGate.architecture.test.ts
  - name: stubMissingSessionRouteFetch
    path: apps/web/src/app/routes.test.tsx
    dddOwner: InternalAlphaRouteGate protected-session negative fixture
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - GetEffectiveWorkspaceContext
      - MapRouteRecoveryState
    fowlerSignals:
      - Test-only confidence
      - Documentation drift
    architectureGuard: pnpm --filter @dvt/web test -- src/app/routes.test.tsx
    cypressCoverage: N/A - route negative fixture covered by unit route tests.
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/routes.test.tsx
```

## Completion Criteria

- `F-27` closure is recorded by
  `docs/planning/closeouts/20260514-f27-alpha-route-acceptance-matrix-closeout.md`.
- The route acceptance matrix names every stage, rail or owner, happy-path
  fixture, fail-closed fixture, evidence source, risk decision, and alpha exit
  impact.
- The architecture view records route, rail, state, evidence, and risk
  boundaries without creating a parallel work queue.
- The workspace-files child-slice manifest no longer owns the alpha critique or
  route review as implementation surfaces.
- The critique v3 file is retained only as accepted intake history.
- This proposal is classified under the frontend superseded/closed view and is
  not presented as current Mandatory work in the portfolio or roadmap.
- GitHub Issues owns any new executable task lifecycle; no Lane or retired
  Control-Tower surface is a current task authority.
- `pnpm docs:feature-mechanization:implementation` and `pnpm verify:prepush`
  pass after generated governance files are refreshed.
