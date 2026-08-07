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
import { buildCanvasDbtExecutionProjection } from './canvasDbtExecutionProjection';
import { isDbtProjectFilePreviewProvenanceCurrent } from './dbtProjectFileExecutionStrategy';
import type { CanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';
import type { PlanPreviewOutcome } from '../../ports/plans';
import { projectCanvasPreviewOutcome } from './canvasPreviewOutcomeProjection';
import type { ObjectFilePostgresExecutionScope } from './objectFilePostgresAuthoringModel';

type DeriveCanvasExecutionStateArgs = {
  canRun: boolean;
  executionStrategy: CanvasExecutionStrategy | null;
  currentPlan: PlanViewModel | null;
  lastPlannedDraftSignature: string | null;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  selectionIntent: CanvasExecutionSelectionIntent;
  workspaceNodeIds: string[];
  latestPreviewOutcome: PlanPreviewOutcome | null;
  executionScope?: ObjectFilePostgresExecutionScope;
  applicationLanguage?: string;
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

function forceReadinessBlocker(
  readiness: PlanRunReadinessReadModel,
  blocker: PlanRunReadinessBlocker,
  summary: string
): PlanRunReadinessReadModel {
  const blockers: readonly PlanRunReadinessBlocker[] = readiness.blockers.includes(blocker)
    ? readiness.blockers
    : [...readiness.blockers, blocker];

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
  selectionIntent,
  workspaceNodeIds,
  latestPreviewOutcome,
  executionScope,
  applicationLanguage,
}: DeriveCanvasExecutionStateArgs): CanvasExecutionState {
  const previewOutcomeProjection =
    latestPreviewOutcome == null ? null : projectCanvasPreviewOutcome(latestPreviewOutcome);
  const hasPersistedPlanForRun = hasPersistedPreviewProof(currentPlan);
  const persistedPlanIdentityMismatch = hasPersistedPreviewIdentityMismatch(currentPlan);
  const transformationValidation = validateTransformationGraph({
    nodes: canonicalNodes,
    edges: canonicalEdges,
    selectedNodeIds: selectionIntent.nodeIds,
    workspaceNodeIds,
  });
  const usesDbtPlanner =
    executionStrategy?.kind === 'planner_generic_preview' ||
    executionStrategy?.kind === 'dbt_project_file_preview';
  const dbtPlannerProjection = usesDbtPlanner
    ? buildCanvasDbtExecutionProjection({
        strategy: executionStrategy,
        canonicalNodes,
        canonicalEdges,
        selectionIntent,
        workspaceNodeIds,
        executionScope,
      })
    : null;
  const activeDraftSignature =
    dbtPlannerProjection?.ok === true
      ? dbtPlannerProjection.draftSignature
      : transformationValidation.draftSignature;
  const isExecutableGraphReady = usesDbtPlanner
    ? dbtPlannerProjection?.ok === true
    : transformationValidation.valid;
  const canPlanGraph =
    executionStrategy != null &&
    executionStrategy.kind !== 'not_executable' &&
    isExecutableGraphReady;
  const dbtProjectFilePreviewIdentityMismatch =
    currentPlan != null &&
    executionStrategy?.kind === 'dbt_project_file_preview' &&
    dbtPlannerProjection?.ok === true &&
    !isDbtProjectFilePreviewProvenanceCurrent(
      executionStrategy,
      dbtPlannerProjection.selection.nodeIds,
      currentPlan.preview?.provenance
    );
  const persistedPreviewIdentityMismatch =
    persistedPlanIdentityMismatch || dbtProjectFilePreviewIdentityMismatch;
  const isCurrentPlanStale =
    currentPlan != null &&
    (dbtProjectFilePreviewIdentityMismatch ||
      (lastPlannedDraftSignature != null && lastPlannedDraftSignature !== activeDraftSignature));
  const canStartRun =
    canRun &&
    executionStrategy != null &&
    executionStrategy.kind !== 'not_executable' &&
    currentPlan != null &&
    hasPersistedPlanForRun &&
    isExecutableGraphReady &&
    !isCurrentPlanStale &&
    previewOutcomeProjection?.readinessBlocker == null;
  const executableGraphFailureMessage =
    executionStrategy != null &&
    executionStrategy.kind !== 'not_executable' &&
    !isCurrentPlanStale &&
    !isExecutableGraphReady
      ? dbtPlannerProjection?.ok === false
        ? dbtPlannerProjection.message
        : formatTransformationGraphValidationSummary(
            transformationValidation.summaryCode,
            applicationLanguage
          )
      : null;
  const planRunReadinessSource = observePlanRunReadiness({
    canRun,
    currentPlan,
    isCurrentPlanStale,
    persistedPreviewIdentityMismatch,
    hasPersistedPlanForRun,
    capabilityMismatch: executionStrategy == null || executionStrategy.kind === 'not_executable',
    locale: applicationLanguage,
  });
  const authoritativePreviewReason = previewOutcomeProjection?.diagnostic?.reason;
  const planRunReadiness =
    previewOutcomeProjection?.readinessBlocker != null
      ? forceReadinessBlocker(
          planRunReadinessSource,
          previewOutcomeProjection.readinessBlocker,
          authoritativePreviewReason ?? planRunReadinessSource.summary
        )
      : executableGraphFailureMessage != null
        ? forceReadinessBlocker(
            planRunReadinessSource,
            'plan_integrity',
            executableGraphFailureMessage
          )
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
