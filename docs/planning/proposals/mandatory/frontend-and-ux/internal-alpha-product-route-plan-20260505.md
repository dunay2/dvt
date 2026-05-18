---
title: Internal Alpha Product Route Plan 2026-05-05
status: Active
owner: Product / Architecture / Frontend / Runtime Safety
last_reviewed: 2026-05-05
planning_type: proposal
lane: E
task_ids:
  - F-27
---

# Internal Alpha Product Route Plan 2026-05-05

## Purpose

This plan gives the internal alpha route its own planning authority. It fixes
the prior coupling where the Code workbench workspace-files child slice carried
route-level alpha context inside a closed child-slice manifest.

This plan does not declare alpha complete. It governs the planning, routing,
and proof model that future implementation slices must use before expanding the
route beyond the already planned child slices.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/planning-control-tower.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/reference-architecture.md`
- `docs/planning/reviews/architecture-and-governance/20260504-internal-alpha-evolution-route.md`
- `docs/planning/reviews/architecture-and-governance/20260505-internal-alpha-architecture-view-review.md`
- `docs/planning/reviews/architecture-and-governance/20260505-alpha-evolution-route-v3-critique.md`
- `docs/planning/reviews/architecture-and-governance/20260514-internal-alpha-route-acceptance-matrix.md`
- `docs/architecture/components/web/internal-alpha-route-gate-component.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/code-workbench-workspace-files-query-rail-plan-20260504.md`

## Scope

In scope:

- one route-level alpha task in Lane E;
- Lane C dependency visibility for protected runtime and plan/run readiness
  inputs;
- explicit separation between route-level alpha authority and child-slice
  workspace-files authority;
- review-board and roadmap links so the route is discoverable;
- route-level closure requirements for startup, context, Canvas, Code,
  plan/run readiness, recovery, cadence, and risk triage.

Out of scope:

- implementing new startup, Canvas, Code, or plan/run UI behavior;
- adding new API routes, contracts, adapters, or packages;
- declaring internal alpha full complete;
- changing the already closed workspace-files child-slice evidence.

## Route Authority Model

| Surface               | Role                                 | Rule                                                                                   |
| --------------------- | ------------------------------------ | -------------------------------------------------------------------------------------- |
| This plan             | Route-level planning authority       | Owns `F-27` routing and alpha closure prerequisites.                                   |
| Internal alpha review | Route review and gap model           | Names the route stages, current proof posture, and remaining gaps.                     |
| Architecture view     | Route boundary lens                  | Explains route, rail, state, evidence, and risk boundaries without creating a backlog. |
| Critique v3           | Accepted intake history              | Records source-grounded findings already absorbed into the route review and this plan. |
| Workspace-files plan  | Child-slice implementation authority | Owns only `ListWorkspaceFiles` and `GetWorkspaceFileContent` work.                     |
| Lane E YAML           | Primary execution registry           | Owns the user-visible route closure task.                                              |
| Lane C YAML           | Runtime safety dependency registry   | Names protected runtime and admission inputs consumed by the route.                    |

## Command And Query Rail Binding

No route stage may implement externally observable behavior without a governing
command or query rail.

| Rail                                | Type    | Owning bounded context               | DDD owner                             | Route stage        |
| ----------------------------------- | ------- | ------------------------------------ | ------------------------------------- | ------------------ |
| `ObserveAppBootstrapRouteReadiness` | query   | Web Shell / App Bootstrap            | `RouteBootstrapStartupReadinessState` | Startup gate       |
| `ObserveWorkspaceContext`           | query   | Workspace context                    | `WorkspaceContextReadModel`           | Context selection  |
| `GetWorkspaceGraphDraft`            | query   | Workspace graph drafting             | `WorkspaceGraphDraft` read boundary   | Canvas             |
| `SaveWorkspaceGraphDraft`           | command | Workspace graph drafting             | `WorkspaceGraphDraft` aggregate       | Canvas             |
| `ListWorkspaceFiles`                | query   | Operational evidence read models     | `WorkspaceFileTree`                   | Code tab           |
| `GetWorkspaceFileContent`           | query   | Operational evidence read models     | `WorkspaceFileContent`                | Code tab           |
| `ObservePlanRunReadiness`           | query   | Runtime admission and plan readiness | `PlanRunReadinessReadModel`           | Plan/run readiness |
| `MapRouteRecoveryState`             | query   | Web route presentation               | `RouteRecoveryState` read model       | Recovery states    |

`ObserveWorkspaceContext`, `ObservePlanRunReadiness`, and
`MapRouteRecoveryState` are route-level planning rails until their owning child
slices bind them to exact code ports and tests. Implementation must either
reuse existing rails or update the catalog before code.

## Fowler Opportunity Matrix

| Opportunity          | Route risk                                                       | Required correction                                                   |
| -------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| Boundary drift       | Child slices can become route authority.                         | Keep route gate in this plan and child behavior in child plans.       |
| Duplicate semantics  | Recovery and readiness copy can diverge by stage.                | Add one source-owned recovery/readiness vocabulary before UI closure. |
| Test-only confidence | Cypress can prove Code while startup or plan/run stays unproven. | Require a route-level fixture matrix before alpha full.               |
| Documentation drift  | Accepted critique and active review can disagree.                | Mark critique as accepted intake and point active truth to this plan. |
| Stage saturation     | One route review can absorb too much child detail.               | Child slices keep depth; this plan owns sequencing and gate posture.  |

## Required Child-Slice Closure

| Stage              | Required owner before implementation                   | Minimum closure evidence                                                                    |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Startup gate       | Lane E, with runtime readiness input from Lane C       | Stable startup terminal and blocker states plus browser proof.                              |
| Workspace context  | Lane E, with protected runtime scope input from Lane C | Tenant, project, and environment visible and fail-closed.                                   |
| Canvas             | Lane E, with `TF-C4` protected draft input             | Draggable graph, draft retry/recovery, and no local persistence authority.                  |
| Code tab           | Existing workspace-files child plan                    | Tree, preview, empty, unavailable, unauthorized, not-found, and filesystem safety proofs.   |
| Plan/run readiness | Lane E plus Lane C/A inputs                            | Distinct copy for integrity, backpressure, capability, adapter, and authorization blockers. |
| Recovery states    | Lane E                                                 | Source-owned vocabulary and tests across startup, Canvas, Code, and plan/run.               |
| Alpha cadence      | Product / Architecture                                 | Tester audience, duration, entry date, exit owner, and extension rules.                     |
| Risk triage        | Architecture / Docs                                    | Route-stage triage of `docs/risk-register/quality/**` with inclusion/exclusion rationale.   |

## Implementation Order

1. Keep this route plan and Lane E `F-27` entry as the route authority.
2. Close route-risk triage and cadence before any alpha-full claim.
3. Bind startup, context, recovery, and plan/run readiness to exact rails and
   component owners.
4. Route each child implementation through its own mandatory proposal or
   existing child plan.
5. Add the route-level fixture matrix after child rails are named.
6. Close alpha full only after route smoke, child proofs, negative paths,
   `traceability:adr0`, and `pnpm verify:prepush` pass.

## Route Acceptance Matrix

The route-level fixture and acceptance surface is now
`docs/planning/reviews/architecture-and-governance/20260514-internal-alpha-route-acceptance-matrix.md`.
It owns the stage-by-stage acceptance table for F-27 and keeps alpha-full
blocked while any route stage lacks happy-path proof, fail-closed proof,
cadence, or risk triage. Child slices may close their own behavior, but they
cannot declare alpha full.

## Feature Mechanization Scope

This manifest mechanizes the planning-authority correction and the test-only
combined route proof fixture. It does not implement product route behavior and
does not close the alpha full gate.

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
  - docs/planning/state/planning-control-tower.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
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
  - docs/planning/reviews/review-status-board.md
  - docs/planning/roadmap/index.md
  - docs/planning/roadmap/roadmap-by-domain.md
  - docs/architecture/components/web/internal-alpha-route-gate-component.md
  - docs/architecture/components/web/internal-alpha-route-gate-user-stories.md
  - docs/architecture/components/web/appshell/protected-route-session-gate-component.md
  - docs/architecture/components/web/appshell/protected-route-session-gate-user-stories.md
  - docs/planning/closeouts/20260514-f27-alpha-route-acceptance-matrix-closeout.md
  - buzon/20260514-codex-fowler-f27-alpha-route-gate-analysis.md
  - buzon/20260515-codex-fowler-f27-session-gate-runtime-unavailable-analysis.md
  - apps/web/src/app/routes.test.tsx
  - apps/web/src/app/routes/internalAlphaRouteGate.architecture.test.ts
  - apps/web/src/app/routes/internalAlphaRouteGate.test.fixtures.ts
  - docs/planning/state/agent-lane-c.yaml
  - docs/planning/state/agent-lane-e.yaml
  - docs/planning/status/**
forbiddenImplementationSurfaces:
  - packages/**
  - scripts/**
  - specs/**
commandQueryRails:
  - name: ObserveAppBootstrapRouteReadiness
    type: query
    dddOwner: RouteBootstrapStartupReadinessState read model
  - name: ObserveWorkspaceContext
    type: query
    dddOwner: WorkspaceContextReadModel
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
  - pnpm docs:workboard:generate
cypressFlows:
  - N/A - planning-authority correction only; route-level Cypress is a child closure prerequisite.
completionGate:
  - pnpm docs:feature-mechanization:implementation
  - pnpm docs:workboard:generate
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
      - docs/planning/state/agent-lane-e.yaml
      - docs/planning/state/agent-lane-c.yaml
      - docs/planning/reviews/review-status-board.md
      - docs/planning/roadmap/index.md
      - docs/planning/roadmap/roadmap-by-domain.md
      - docs/planning/proposals/portfolio-map-20260403.md
      - docs/planning/status/**
    greenTest: pnpm docs:feature-mechanization:implementation
symbols:
  - name: InternalAlphaProductRoutePlan
    path: docs/planning/proposals/mandatory/frontend-and-ux/internal-alpha-product-route-plan-20260505.md
    dddOwner: InternalAlphaRouteGate planning authority
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - ObserveWorkspaceContext
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
    cypressCoverage: N/A - planning-authority correction only.
    unitTests:
      - pnpm docs:feature-mechanization:implementation
  - name: InternalAlphaProductRouteReview
    path: docs/planning/reviews/architecture-and-governance/20260504-internal-alpha-evolution-route.md
    dddOwner: InternalAlphaRouteGate review model
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - ObserveWorkspaceContext
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
      - ObserveWorkspaceContext
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
      - ObserveWorkspaceContext
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
      - ObserveWorkspaceContext
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
      - ObserveWorkspaceContext
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
      - ObserveWorkspaceContext
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
      - ObserveWorkspaceContext
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
      - ObserveWorkspaceContext
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
  - name: InternalAlphaCombinedRouteStageProof
    path: apps/web/src/app/routes/internalAlphaRouteGate.test.fixtures.ts
    dddOwner: InternalAlphaRouteGate combined route proof fixture
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - ObserveWorkspaceContext
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
      - ObserveWorkspaceContext
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
      - ObserveWorkspaceContext
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
      - ObserveWorkspaceContext
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
      - ObserveWorkspaceContext
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
      - ObserveWorkspaceContext
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
      - ObserveWorkspaceContext
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
      - ObserveWorkspaceContext
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
      - ObserveWorkspaceContext
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
  - name: stubMissingSessionRouteFetch
    path: apps/web/src/app/routes.test.tsx
    dddOwner: InternalAlphaRouteGate protected-session negative fixture
    cqRails:
      - ObserveAppBootstrapRouteReadiness
      - ObserveWorkspaceContext
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

- `F-27` exists in Lane E and names the route-level plan.
- The route acceptance matrix names every stage, rail or owner, happy-path
  fixture, fail-closed fixture, evidence source, risk decision, and alpha exit
  impact.
- Lane C notes name the runtime safety dependencies consumed by alpha.
- The review status board and roadmap surfaces route readers to this plan.
- The architecture view records route, rail, state, evidence, and risk
  boundaries without creating a parallel work queue.
- The workspace-files child-slice manifest no longer owns the alpha critique or
  route review as implementation surfaces.
- The critique v3 file is retained only as accepted intake history.
- `pnpm docs:feature-mechanization:implementation` and `pnpm verify:prepush`
  pass after generated governance files are refreshed.
