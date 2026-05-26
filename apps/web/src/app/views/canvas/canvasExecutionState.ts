import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import type { PlanViewModel } from '../../types/plans';
import {
  buildPlanStatusSummary,
  hasPersistedPreviewProof,
  hasPersistedPreviewIdentityMismatch,
  observePlanRunReadiness,
} from './canvasPlanReadiness';
import {
  validateTransformationGraph,
  type TransformationGraphValidationResult,
} from './transformationGraphValidation';
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
  canPlanGraph: boolean;
  canStartRun: boolean;
  planStatusSummary: string;
};

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
  const planStatusSummary =
    executionStrategy == null || executionStrategy.kind === 'not_executable'
      ? observePlanRunReadiness({
          canRun,
          currentPlan,
          isCurrentPlanStale,
          persistedPreviewIdentityMismatch,
          hasPersistedPlanForRun,
          capabilityMismatch: true,
        }).summary
      : dbtPlannerGraphSource?.ok === false
        ? dbtPlannerGraphSource.message
        : buildPlanStatusSummary({
            canRun,
            currentPlan,
            isCurrentPlanStale,
            persistedPreviewIdentityMismatch,
            hasPersistedPlanForRun,
          });

  return {
    transformationValidation,
    hasPersistedPlanForRun,
    persistedPreviewIdentityMismatch,
    isCurrentPlanStale,
    canPlanGraph,
    canStartRun,
    planStatusSummary,
  };
}
