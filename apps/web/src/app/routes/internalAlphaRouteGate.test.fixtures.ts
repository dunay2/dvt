/** Owned concern: build the F-27 combined internal-alpha route proof fixture. */

export type InternalAlphaRouteStage =
  | 'Startup gate'
  | 'Workspace context'
  | 'Canvas workbench'
  | 'Code workbench'
  | 'Plan/run readiness'
  | 'Recovery states';

export type InternalAlphaRouteRail =
  | 'ObserveAppBootstrapRouteReadiness'
  | 'ObserveWorkspaceContext'
  | 'GetWorkspaceGraphDraft'
  | 'SaveWorkspaceGraphDraft'
  | 'ListWorkspaceFiles'
  | 'GetWorkspaceFileContent'
  | 'ObservePlanRunReadiness'
  | 'MapRouteRecoveryState';

export type InternalAlphaRecoveryState =
  | 'ready'
  | 'blocked'
  | 'unauthorized'
  | 'unavailable'
  | 'stale'
  | 'not-found';

export interface InternalAlphaCombinedRouteStageProof {
  readonly stage: InternalAlphaRouteStage;
  readonly rails: readonly InternalAlphaRouteRail[];
  readonly happyPathProof: string;
  readonly failClosedProof: string;
  readonly recoveryState: InternalAlphaRecoveryState;
  readonly recoveryStates: readonly InternalAlphaRecoveryState[];
}

export interface InternalAlphaCombinedRouteFixture {
  readonly routeAuthority: 'F-27';
  readonly claim: 'alpha-full-candidate';
  readonly stages: readonly InternalAlphaCombinedRouteStageProof[];
}

export interface InternalAlphaCombinedRouteEvaluation {
  readonly missingFailClosedProof: readonly InternalAlphaRouteStage[];
  readonly missingHappyPathProof: readonly InternalAlphaRouteStage[];
  readonly missingRails: readonly InternalAlphaRouteRail[];
  readonly missingRecoveryStates: readonly InternalAlphaRecoveryState[];
  readonly missingStages: readonly InternalAlphaRouteStage[];
  readonly routeAuthority: 'F-27';
  readonly routeDecision: 'blocked' | 'review';
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
  'ObserveWorkspaceContext',
  'GetWorkspaceGraphDraft',
  'SaveWorkspaceGraphDraft',
  'ListWorkspaceFiles',
  'GetWorkspaceFileContent',
  'ObservePlanRunReadiness',
  'MapRouteRecoveryState',
];

export const internalAlphaCombinedRouteFixture: InternalAlphaCombinedRouteFixture = {
  claim: 'alpha-full-candidate',
  routeAuthority: 'F-27',
  stages: [
    {
      failClosedProof: 'startup unavailable, timeout, or runtime-not-ready stays blocked',
      happyPathProof: 'route-ready startup after platform readiness settles',
      rails: ['ObserveAppBootstrapRouteReadiness'],
      recoveryState: 'ready',
      recoveryStates: ['ready', 'unavailable', 'blocked'],
      stage: 'Startup gate',
    },
    {
      failClosedProof: 'missing, detached, unauthorized, or conflicted context stays blocked',
      happyPathProof: 'tenant, project, and environment context are visible',
      rails: ['ObserveWorkspaceContext'],
      recoveryState: 'ready',
      recoveryStates: ['ready', 'unauthorized', 'blocked'],
      stage: 'Workspace context',
    },
    {
      failClosedProof:
        'draft load failure, save denial, stale draft, or retry exhaustion is explicit',
      happyPathProof: 'authoritative draft loads and governed drag/save feedback is visible',
      rails: ['GetWorkspaceGraphDraft', 'SaveWorkspaceGraphDraft'],
      recoveryState: 'ready',
      recoveryStates: ['ready', 'unavailable', 'stale', 'blocked'],
      stage: 'Canvas workbench',
    },
    {
      failClosedProof:
        'empty, unavailable, unauthorized, not-found, traversal, oversize, binary, and freshness cases are explicit',
      happyPathProof: 'authorized tree and first-file preview load read-only',
      rails: ['ListWorkspaceFiles', 'GetWorkspaceFileContent'],
      recoveryState: 'ready',
      recoveryStates: ['ready', 'unauthorized', 'unavailable', 'not-found', 'stale'],
      stage: 'Code workbench',
    },
    {
      failClosedProof:
        'plan integrity, backpressure, capability mismatch, degraded adapter, and authorization denial stay distinct',
      happyPathProof: 'plan/run controls explain ready-to-run posture with source-owned reasons',
      rails: ['ObservePlanRunReadiness'],
      recoveryState: 'ready',
      recoveryStates: ['ready', 'unauthorized', 'unavailable', 'blocked'],
      stage: 'Plan/run readiness',
    },
    {
      failClosedProof:
        'unknown, unavailable, unauthorized, stale, and not-found states remain distinguishable',
      happyPathProof: 'equivalent failures use one route-owned recovery vocabulary',
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
  const stagesWithoutRecoveryVocabulary = fixture.stages
    .filter((stage) => !stage.recoveryStates.some((recoveryState) => recoveryState !== 'ready'))
    .map((stage) => stage.stage);
  const missingFailClosedProof = fixture.stages
    .filter((stage) => stage.failClosedProof.trim().length === 0)
    .map((stage) => stage.stage);
  const missingHappyPathProof = fixture.stages
    .filter((stage) => stage.happyPathProof.trim().length === 0)
    .map((stage) => stage.stage);

  return {
    missingFailClosedProof,
    missingHappyPathProof,
    missingRails,
    missingRecoveryStates,
    missingStages,
    routeAuthority: fixture.routeAuthority,
    routeDecision:
      missingFailClosedProof.length > 0 ||
      missingHappyPathProof.length > 0 ||
      missingRails.length > 0 ||
      missingRecoveryStates.length > 0 ||
      missingStages.length > 0 ||
      stagesWithoutRecoveryVocabulary.length > 0
        ? 'blocked'
        : 'review',
    stagesWithoutRecoveryVocabulary,
  };
}
