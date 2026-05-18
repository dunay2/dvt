import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import type { PlanViewModel } from '../../types/plans';
import {
  buildPlanStatusSummary,
  hasPersistedPreviewProof,
  hasPersistedPreviewIdentityMismatch,
  observePlanRunReadiness,
} from './canvasPlanReadiness';
import { canvasViewCopy } from './copy';
import {
  validateTransformationGraph,
  type TransformationGraphValidationResult,
} from './transformationGraphValidation';

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
  const isCurrentPlanStale =
    currentPlan != null &&
    lastPlannedDraftSignature != null &&
    lastPlannedDraftSignature !== transformationValidation.draftSignature;
  const canStartRun =
    canRun &&
    executionStrategy?.kind === 'transformation_preview' &&
    currentPlan != null &&
    hasPersistedPlanForRun &&
    transformationValidation.valid &&
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
    canStartRun,
    planStatusSummary,
  };
}
