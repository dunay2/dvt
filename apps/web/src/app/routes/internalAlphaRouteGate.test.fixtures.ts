/** Owned concern: build the F-27 combined internal-alpha route proof fixture. */
import { existsSync } from 'node:fs';
import path from 'node:path';

export type InternalAlphaRouteStage =
  | 'Startup gate'
  | 'Workspace context'
  | 'Canvas workbench'
  | 'Code workbench'
  | 'Plan/run readiness'
  | 'Recovery states';

export type InternalAlphaFullBlocker = 'Alpha cadence' | 'Risk triage';

export type InternalAlphaRouteRail =
  | 'ObserveAppBootstrapRouteReadiness'
  | 'GetEffectiveWorkspaceContext'
  | 'GetWorkspaceGraphDraft'
  | 'SaveWorkspaceGraphDraft'
  | 'ListWorkspaceFiles'
  | 'GetWorkspaceFileContent'
  | 'SaveWorkspaceFileContent'
  | 'ObservePlanRunReadiness'
  | 'MapRouteRecoveryState';

export type InternalAlphaRecoveryState =
  'ready' | 'blocked' | 'unauthorized' | 'unavailable' | 'stale' | 'not-found';

export type InternalAlphaEvidenceAcceptance = 'planned' | 'accepted';

export interface InternalAlphaCombinedRouteStageProof {
  readonly stage: InternalAlphaRouteStage;
  readonly rails: readonly InternalAlphaRouteRail[];
  readonly evidenceRefs: readonly string[];
  readonly evidenceAcceptance?: InternalAlphaEvidenceAcceptance;
  readonly happyPathProof: string;
  readonly failClosedProof: string;
  readonly recoveryState: InternalAlphaRecoveryState;
  readonly recoveryStates: readonly InternalAlphaRecoveryState[];
}

export interface InternalAlphaCombinedRouteFixture {
  readonly routeAuthority: 'F-27';
  readonly claim: 'alpha-full-candidate';
  readonly stages: readonly InternalAlphaCombinedRouteStageProof[];
  readonly alphaFullClosureEvidenceRefs: readonly string[];
  readonly alphaFullBlockers: readonly InternalAlphaFullBlocker[];
}

export interface InternalAlphaCombinedRouteEvaluation {
  readonly missingAlphaFullClosureEvidenceRefs: readonly ['alpha-full'] | [];
  readonly missingEvidenceAcceptance: readonly InternalAlphaRouteStage[];
  readonly missingEvidenceRefs: readonly InternalAlphaRouteStage[];
  readonly missingFailClosedProof: readonly InternalAlphaRouteStage[];
  readonly missingHappyPathProof: readonly InternalAlphaRouteStage[];
  readonly missingRails: readonly InternalAlphaRouteRail[];
  readonly missingRecoveryStates: readonly InternalAlphaRecoveryState[];
  readonly missingStages: readonly InternalAlphaRouteStage[];
  readonly remainingAlphaFullBlockers: readonly InternalAlphaFullBlocker[];
  readonly routeAuthority: 'F-27';
  readonly routeDecision: 'blocked' | 'review' | 'accepted';
  readonly stagesWithoutRecoveryVocabulary: readonly InternalAlphaRouteStage[];
}

const requiredRouteStages: readonly InternalAlphaRouteStage[] = [
  'Startup gate',
  'Workspace context',
  'Canvas workbench',
  'Code workbench',
  'Plan/run readiness',
  'Recovery states',
];

const requiredRouteRails: readonly InternalAlphaRouteRail[] = [
  'ObserveAppBootstrapRouteReadiness',
  'GetEffectiveWorkspaceContext',
  'GetWorkspaceGraphDraft',
  'SaveWorkspaceGraphDraft',
  'ListWorkspaceFiles',
  'GetWorkspaceFileContent',
  'ObservePlanRunReadiness',
  'MapRouteRecoveryState',
];

const repoRoot = path.resolve(import.meta.dirname, '../../../../..');

function isResolvableEvidenceRef(evidenceRef: string): boolean {
  return (
    /^(docs|apps\/api|apps\/web)\//.test(evidenceRef) &&
    existsSync(path.join(repoRoot, evidenceRef))
  );
}

export const internalAlphaCombinedRouteFixture: InternalAlphaCombinedRouteFixture = {
  alphaFullBlockers: [],
  alphaFullClosureEvidenceRefs: [
    'docs/planning/closeouts/20260514-f27-alpha-route-acceptance-matrix-closeout.md',
    'docs/planning/reviews/architecture-and-governance/20260514-internal-alpha-route-acceptance-matrix.md',
    'docs/architecture/components/web/internal-alpha-route-gate-component.md',
    'docs/architecture/components/web/internal-alpha-route-gate-user-stories.md',
  ],
  claim: 'alpha-full-candidate',
  routeAuthority: 'F-27',
  stages: [
    {
      evidenceAcceptance: 'accepted',
      evidenceRefs: [
        'docs/architecture/components/web/appshell/protected-route-session-gate-component.md',
        'docs/planning/reviews/architecture-and-governance/20260514-internal-alpha-route-acceptance-matrix.md',
        'apps/web/src/app/Root.bootstrapFlow.test.tsx',
        'apps/web/src/app/bootstrap/routeBootstrapStartupReadiness.test.ts',
        'apps/web/cypress/e2e/shell/startup-route-readiness.cy.ts',
      ],
      failClosedProof: 'startup unavailable, timeout, or runtime-not-ready stays blocked',
      happyPathProof: 'route-ready startup after platform readiness settles',
      rails: ['ObserveAppBootstrapRouteReadiness'],
      recoveryState: 'ready',
      recoveryStates: ['ready', 'unavailable', 'blocked'],
      stage: 'Startup gate',
    },
    {
      evidenceAcceptance: 'accepted',
      evidenceRefs: [
        'docs/architecture/components/web/appshell/effective-workspace-context-component.md',
        'docs/architecture/components/web/appshell/effective-workspace-context-user-stories.md',
        'apps/web/src/app/services/session/protectedRouteSessionContext.test.ts',
        'apps/web/src/app/services/session/protectedRouteSessionContext.architecture.test.ts',
        'apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts',
      ],
      failClosedProof: 'missing, detached, unauthorized, or conflicted context stays blocked',
      happyPathProof: 'tenant, project, and environment context are visible',
      rails: ['GetEffectiveWorkspaceContext'],
      recoveryState: 'ready',
      recoveryStates: ['ready', 'unauthorized', 'blocked'],
      stage: 'Workspace context',
    },
    {
      evidenceAcceptance: 'accepted',
      evidenceRefs: [
        'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-component.md',
        'docs/contracts/planner/workspace-graph-draft-persistence-v1.md',
        'apps/web/src/app/views/canvas/canvasStartupBootstrapPublication.architecture.test.ts',
        'apps/web/src/app/views/canvas/canvasDraftRecoveryBoundary.architecture.test.ts',
        'apps/web/src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts',
        'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
        'apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts',
      ],
      failClosedProof:
        'draft read denial, failed save, stale draft, retry exhaustion, and read-only posture are explicit',
      happyPathProof:
        'authoritative draft loads, save feedback is visible, and reload restores persisted graph state',
      rails: ['GetWorkspaceGraphDraft', 'SaveWorkspaceGraphDraft'],
      recoveryState: 'ready',
      recoveryStates: ['ready', 'unavailable', 'stale', 'blocked'],
      stage: 'Canvas workbench',
    },
    {
      evidenceAcceptance: 'accepted',
      evidenceRefs: [
        'docs/architecture/components/web/code-workbench-workspace-files-component.md',
        'docs/planning/proposals/mandatory/frontend-and-ux/code-workbench-workspace-files-query-rail-plan-20260504.md',
        'apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts',
        'apps/web/src/app/services/workspace/workspacePorts.files.test.ts',
        'apps/web/src/app/views/CodeView.test.tsx',
        'apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts',
      ],
      failClosedProof:
        'empty, unavailable, unauthorized, not-found, traversal, oversize, unsupported binary-like file types, and revision conflicts are explicit',
      happyPathProof:
        'scoped authorized tree, first-file preview, and revision-guarded working-tree synchronization are covered through the canonical Canvas command for contextual Project Code',
      rails: ['ListWorkspaceFiles', 'GetWorkspaceFileContent', 'SaveWorkspaceFileContent'],
      recoveryState: 'ready',
      recoveryStates: ['ready', 'unauthorized', 'unavailable', 'not-found', 'stale'],
      stage: 'Code workbench',
    },
    {
      evidenceAcceptance: 'accepted',
      evidenceRefs: [
        'docs/architecture/components/web/graph/canvas-plan-run-readiness-component.md',
        'docs/architecture/components/web/graph/canvas-plan-run-readiness-user-stories.md',
        'docs/architecture/components/api/index.md',
        'docs/planning/proposals/mandatory/frontend-and-ux/internal-alpha-product-route-plan-20260505.md',
        'apps/web/src/app/views/canvas/canvasPlanReadiness.test.ts',
        'apps/web/src/app/views/canvas/useCanvasExecutionActions.runStartGuards.test.tsx',
        'apps/web/src/app/views/canvas/useCanvasExecutionActions.runStartSuccess.test.tsx',
        'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
      ],
      failClosedProof:
        'plan integrity, backpressure, capability mismatch, degraded adapter, and authorization denial stay distinct',
      happyPathProof: 'plan/run controls explain ready-to-run posture with source-owned reasons',
      rails: ['ObservePlanRunReadiness'],
      recoveryState: 'ready',
      recoveryStates: ['ready', 'unauthorized', 'unavailable', 'blocked'],
      stage: 'Plan/run readiness',
    },
    {
      evidenceAcceptance: 'accepted',
      evidenceRefs: [
        'docs/architecture/components/web/internal-alpha-route-gate-component.md',
        'docs/architecture/components/web/internal-alpha-route-gate-user-stories.md',
        'apps/web/src/app/routes/internalAlphaRouteGate.architecture.test.ts',
        'apps/web/cypress/e2e/shell/startup-route-readiness.cy.ts',
        'apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts',
        'apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts',
      ],
      failClosedProof:
        'unknown, unavailable, unauthorized, stale, and not-found states remain distinguishable',
      happyPathProof:
        'ready and fail-closed stages use one source-owned recovery vocabulary across stage coverage',
      rails: ['MapRouteRecoveryState'],
      recoveryState: 'ready',
      recoveryStates: ['ready', 'blocked', 'unauthorized', 'unavailable', 'stale', 'not-found'],
      stage: 'Recovery states',
    },
  ],
};

export function evaluateInternalAlphaCombinedRouteFixture(
  fixture: InternalAlphaCombinedRouteFixture
): InternalAlphaCombinedRouteEvaluation {
  const fixtureStages = new Set(fixture.stages.map((stage) => stage.stage));
  const fixtureRails = new Set(fixture.stages.flatMap((stage) => stage.rails));
  const fixtureRecoveryStates = new Set(fixture.stages.flatMap((stage) => stage.recoveryStates));
  const requiredRecoveryStates: readonly InternalAlphaRecoveryState[] = [
    'blocked',
    'unauthorized',
    'unavailable',
    'stale',
    'not-found',
  ];
  const missingStages = requiredRouteStages.filter((stage) => !fixtureStages.has(stage));
  const missingRails = requiredRouteRails.filter((rail) => !fixtureRails.has(rail));
  const missingRecoveryStates = requiredRecoveryStates.filter(
    (recoveryState) => !fixtureRecoveryStates.has(recoveryState)
  );
  const missingEvidenceRefs = fixture.stages
    .filter(
      (stage) =>
        stage.evidenceRefs.length === 0 ||
        stage.evidenceRefs.some((evidenceRef) => !isResolvableEvidenceRef(evidenceRef))
    )
    .map((stage) => stage.stage);
  const missingEvidenceAcceptance = fixture.stages
    .filter(
      (stage) => stage.evidenceAcceptance !== 'planned' && stage.evidenceAcceptance !== 'accepted'
    )
    .map((stage) => stage.stage);
  const stagesWithoutRecoveryVocabulary = fixture.stages
    .filter((stage) => !stage.recoveryStates.some((recoveryState) => recoveryState !== 'ready'))
    .map((stage) => stage.stage);
  const missingFailClosedProof = fixture.stages
    .filter((stage) => stage.failClosedProof.trim().length === 0)
    .map((stage) => stage.stage);
  const missingHappyPathProof = fixture.stages
    .filter((stage) => stage.happyPathProof.trim().length === 0)
    .map((stage) => stage.stage);
  const missingAlphaFullClosureEvidenceRefs: readonly ['alpha-full'] | [] =
    fixture.alphaFullBlockers.length === 0 &&
    (fixture.alphaFullClosureEvidenceRefs.length === 0 ||
      fixture.alphaFullClosureEvidenceRefs.some(
        (evidenceRef) => !isResolvableEvidenceRef(evidenceRef)
      ))
      ? ['alpha-full']
      : [];

  return {
    missingAlphaFullClosureEvidenceRefs,
    missingEvidenceAcceptance,
    missingEvidenceRefs,
    missingFailClosedProof,
    missingHappyPathProof,
    missingRails,
    missingRecoveryStates,
    missingStages,
    remainingAlphaFullBlockers: fixture.alphaFullBlockers,
    routeAuthority: fixture.routeAuthority,
    routeDecision:
      missingFailClosedProof.length > 0 ||
      missingAlphaFullClosureEvidenceRefs.length > 0 ||
      missingEvidenceAcceptance.length > 0 ||
      missingEvidenceRefs.length > 0 ||
      missingHappyPathProof.length > 0 ||
      missingRails.length > 0 ||
      missingRecoveryStates.length > 0 ||
      missingStages.length > 0 ||
      stagesWithoutRecoveryVocabulary.length > 0
        ? 'blocked'
        : fixture.alphaFullBlockers.length > 0
          ? 'review'
          : fixture.stages.every((stage) => stage.evidenceAcceptance === 'accepted')
            ? 'accepted'
            : 'review',
    stagesWithoutRecoveryVocabulary,
  };
}
