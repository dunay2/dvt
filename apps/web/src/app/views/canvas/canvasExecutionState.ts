import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { PlanViewModel } from '../../types/plans';
import {
  buildPlanStatusSummary,
  hasPersistedPreviewProof,
  hasPlanRefHashMismatch,
} from './canvasPlanReadiness';
import {
  validateTransformationGraph,
  type TransformationGraphValidationResult,
} from './transformationGraphValidation';

type DeriveCanvasExecutionStateArgs = {
  canRun: boolean;
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
  planRefHashMismatch: boolean;
  isCurrentPlanStale: boolean;
  canStartRun: boolean;
  planStatusSummary: string;
};

export function deriveCanvasExecutionState({
  canRun,
  currentPlan,
  lastPlannedDraftSignature,
  canonicalNodes,
  canonicalEdges,
  selectedNodeIds,
  workspaceNodeIds,
}: DeriveCanvasExecutionStateArgs): CanvasExecutionState {
  const hasPersistedPlanForRun = hasPersistedPreviewProof(currentPlan);
  const planRefHashMismatch = hasPlanRefHashMismatch(currentPlan);
  const transformationValidation = validateTransformationGraph({
    nodes: canonicalNodes,
    edges: canonicalEdges,
    selectedNodeIds,
    workspaceNodeIds,
  });
  const isCurrentPlanStale =
    currentPlan != null &&
    lastPlannedDraftSignature != null &&
    lastPlannedDraftSignature !== transformationValidation.draftSignature;
  const canStartRun =
    canRun &&
    currentPlan != null &&
    hasPersistedPlanForRun &&
    transformationValidation.valid &&
    !isCurrentPlanStale;
  const planStatusSummary = buildPlanStatusSummary({
    canRun,
    currentPlan,
    isCurrentPlanStale,
    planRefHashMismatch,
    hasPersistedPlanForRun,
  });

  return {
    transformationValidation,
    hasPersistedPlanForRun,
    planRefHashMismatch,
    isCurrentPlanStale,
    canStartRun,
    planStatusSummary,
  };
}
