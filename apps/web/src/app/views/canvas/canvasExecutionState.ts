import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import type { PlanViewModel } from '../../types/plans';
import {
  hasPersistedPreviewProof,
  hasPersistedPreviewIdentityMismatch,
  observePlanRunReadiness,
  type PlanRunReadinessBlocker,
  type PlanRunReadinessReadModel,
} from './canvasPlanReadiness';
import {
  validateTransformationGraph,
  type TransformationGraphValidationResult,
} from './transformationGraphValidation';
import { formatTransformationGraphValidationSummary } from './canvasCopyFormatting';
import {
  buildDbtPlannerGraphSource,
  resolveDbtExecutionScopeNodeIds,
} from './canvasDbtPlannerGraphSource';

type DeriveCanvasExecutionStateArgs = {
  canRun: boolean;
  executionStrategy: CanvasExecutionStrategy | null;
  currentPlan: PlanViewModel | null;
  lastPlannedDraftSignature: string | null;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  selectedNodeIds: string[];
  workspaceNodeIds: string[];
};

export type CanvasExecutionState = {
  transformationValidation: TransformationGraphValidationResult;
  hasPersistedPlanForRun: boolean;
  persistedPreviewIdentityMismatch: boolean;
  isCurrentPlanStale: boolean;
  executableGraphFailureMessage: string | null;
  canPlanGraph: boolean;
  canStartRun: boolean;
  planRunReadiness: PlanRunReadinessReadModel;
  planStatusSummary: string;
};

function forcePlanIntegrityBlocker(
  readiness: PlanRunReadinessReadModel,
  summary: string
): PlanRunReadinessReadModel {
  const blockers: readonly PlanRunReadinessBlocker[] = readiness.blockers.includes('plan_integrity')
    ? readiness.blockers
    : [...readiness.blockers, 'plan_integrity'];

  return {
    ...readiness,
    blockers,
    status: 'blocked',
    summary,
  };
}

export function deriveCanvasExecutionState({
  canRun,
  executionStrategy,
  currentPlan,
  lastPlannedDraftSignature,
  canonicalNodes,
  canonicalEdges,
  selectedNodeIds,
  workspaceNodeIds,
}: DeriveCanvasExecutionStateArgs): CanvasExecutionState {
  const hasPersistedPlanForRun = hasPersistedPreviewProof(currentPlan);
  const persistedPreviewIdentityMismatch = hasPersistedPreviewIdentityMismatch(currentPlan);
  const transformationValidation = validateTransformationGraph({
    nodes: canonicalNodes,
    edges: canonicalEdges,
    selectedNodeIds,
    workspaceNodeIds,
  });
  const dbtPlannerGraphSource =
    executionStrategy?.kind === 'planner_generic_preview'
      ? buildDbtPlannerGraphSource({
          nodes: canonicalNodes,
          edges: canonicalEdges,
          scopedNodeIds: resolveDbtExecutionScopeNodeIds({
            nodes: canonicalNodes,
            edges: canonicalEdges,
            selectedNodeIds,
            workspaceNodeIds,
          }),
        })
      : null;
  const activeDraftSignature =
    dbtPlannerGraphSource?.ok === true
      ? dbtPlannerGraphSource.draftSignature
      : transformationValidation.draftSignature;
  const isExecutableGraphReady =
    executionStrategy?.kind === 'planner_generic_preview'
      ? dbtPlannerGraphSource?.ok === true
      : transformationValidation.valid;
  const canPlanGraph =
    executionStrategy != null &&
    executionStrategy.kind !== 'not_executable' &&
    isExecutableGraphReady;
  const isCurrentPlanStale =
    currentPlan != null &&
    lastPlannedDraftSignature != null &&
    lastPlannedDraftSignature !== activeDraftSignature;
  const canStartRun =
    canRun &&
    executionStrategy != null &&
    executionStrategy.kind !== 'not_executable' &&
    currentPlan != null &&
    hasPersistedPlanForRun &&
    isExecutableGraphReady &&
    !isCurrentPlanStale;
  const executableGraphFailureMessage =
    executionStrategy != null &&
    executionStrategy.kind !== 'not_executable' &&
    !isCurrentPlanStale &&
    !isExecutableGraphReady
      ? dbtPlannerGraphSource?.ok === false
        ? dbtPlannerGraphSource.message
        : formatTransformationGraphValidationSummary(transformationValidation.summaryCode)
      : null;
  const planRunReadinessSource = observePlanRunReadiness({
    canRun,
    currentPlan,
    isCurrentPlanStale,
    persistedPreviewIdentityMismatch,
    hasPersistedPlanForRun,
    capabilityMismatch: executionStrategy == null || executionStrategy.kind === 'not_executable',
  });
  const planRunReadiness =
    executableGraphFailureMessage != null
      ? forcePlanIntegrityBlocker(planRunReadinessSource, executableGraphFailureMessage)
      : planRunReadinessSource;

  return {
    transformationValidation,
    hasPersistedPlanForRun,
    persistedPreviewIdentityMismatch,
    isCurrentPlanStale,
    executableGraphFailureMessage,
    canPlanGraph,
    canStartRun,
    planRunReadiness,
    planStatusSummary: planRunReadiness.summary,
  };
}
