/** Owned concern: bind current Preview evidence and identity to the shared readiness policy. */
import type { PlanViewModel } from '../../types/plans';
import type { PlanPreviewOutcome } from '../../ports/plans';
import type { CanvasRunAdmission } from './canvasRuntimePolicy';
import { observePlanRunReadiness, type PlanRunReadinessEvaluation } from './canvasPlanReadiness';
import type { CanvasExecutionGraphEvaluation } from './canvasExecutionGraph';
import { isDbtProjectFilePreviewProvenanceCurrent } from './dbtProjectFileExecutionStrategy';
import { projectCanvasPreviewOutcome } from './canvasPreviewOutcomeProjection';

export type CanvasExecutionState = Readonly<{
  isCurrentPlanStale: boolean;
  isPreviewOutcomeStale: boolean;
  planRunReadiness: PlanRunReadinessEvaluation;
}>;

export function deriveCanvasExecutionState(
  args: Readonly<{
    graph: CanvasExecutionGraphEvaluation;
    runAdmission: CanvasRunAdmission;
    currentPlan: PlanViewModel | null;
    lastPlannedDraftSignature: string | null;
    latestPreviewOutcome: PlanPreviewOutcome | null;
  }>
): CanvasExecutionState {
  const { graph, currentPlan, lastPlannedDraftSignature } = args;
  const previewProvenanceMismatch =
    currentPlan != null &&
    graph.executionStrategy?.kind === 'dbt_project_file_preview' &&
    graph.canPlanGraph &&
    !isDbtProjectFilePreviewProvenanceCurrent(
      graph.executionStrategy,
      graph.selectedNodeIds,
      currentPlan.preview?.provenance
    );
  const isPreviewOutcomeStale =
    lastPlannedDraftSignature != null && lastPlannedDraftSignature !== graph.draftSignature;
  const isCurrentPlanStale =
    currentPlan != null && (previewProvenanceMismatch || isPreviewOutcomeStale);
  const outcome =
    args.latestPreviewOutcome == null || isPreviewOutcomeStale
      ? null
      : projectCanvasPreviewOutcome(args.latestPreviewOutcome);
  return {
    isCurrentPlanStale,
    isPreviewOutcomeStale,
    planRunReadiness: observePlanRunReadiness({
      runAdmission: args.runAdmission,
      currentPlan,
      isCurrentPlanStale,
      previewProvenanceMismatch,
      executionAvailable: graph.executionAvailable,
      graphFailure: isCurrentPlanStale ? null : graph.failure,
      previewRejection:
        outcome?.readinessBlocker == null
          ? null
          : {
              kind: 'preview',
              blocker: outcome.readinessBlocker,
              diagnostic: outcome.diagnostic,
            },
    }),
  };
}
