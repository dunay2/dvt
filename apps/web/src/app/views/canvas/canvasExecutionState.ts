/**
 * Owned concern: evaluate execution admission from graph and Preview evidence.
 */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import type { PlanViewModel } from '../../types/plans';
import {
  hasPersistedPreviewProof,
  hasPersistedPreviewIdentityMismatch,
  observePlanRunReadiness,
  type PlanRunReadinessBlocker,
  type PlanRunReadinessEvaluation,
} from './canvasPlanReadiness';
import {
  validateTransformationGraph,
  type TransformationGraphValidationResult,
} from './transformationGraphValidation';
import { buildCanvasDbtExecutionProjection } from './canvasDbtExecutionProjection';
import { buildProtectedDvtPreviewProjection } from './canvasDvtPreviewProjection';
import { isDbtProjectFilePreviewProvenanceCurrent } from './dbtProjectFileExecutionStrategy';
import type { CanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';
import type { PlanPreviewOutcome } from '../../ports/plans';
import {
  projectCanvasPreviewOutcome,
  type CanvasPreviewOutcomeDiagnostic,
} from './canvasPreviewOutcomeProjection';
import type { ObjectFilePostgresExecutionScope } from './objectFilePostgresAuthoringModel';

type DeriveCanvasExecutionStateArgs = {
  graphDraftCanvasId?: string | null;
  runAdmission: import('./canvasRuntimePolicy').CanvasRunAdmission;
  executionStrategy: CanvasExecutionStrategy | null;
  currentPlan: PlanViewModel | null;
  lastPlannedDraftSignature: string | null;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  selectionIntent: CanvasExecutionSelectionIntent;
  workspaceNodeIds: string[];
  latestPreviewOutcome: PlanPreviewOutcome | null;
  executionScope?: ObjectFilePostgresExecutionScope;
};

export type CanvasExecutableGraphFailure =
  | Readonly<{ kind: 'projection'; message: string }>
  | Readonly<{
      kind: 'transformation';
      summaryCode: TransformationGraphValidationResult['summaryCode'];
    }>;

export type CanvasExecutionState = {
  transformationValidation: TransformationGraphValidationResult;
  hasPersistedPlanForRun: boolean;
  persistedPreviewIdentityMismatch: boolean;
  isCurrentPlanStale: boolean;
  isPreviewOutcomeStale: boolean;
  executableGraphFailure: CanvasExecutableGraphFailure | null;
  canPlanGraph: boolean;
  canStartRun: boolean;
  planRunReadiness: PlanRunReadinessEvaluation;
  readinessDiagnostic:
    | Readonly<{
        kind: 'preview';
        blocker: PlanRunReadinessBlocker;
        diagnostic: CanvasPreviewOutcomeDiagnostic | null;
      }>
    | Readonly<{ kind: 'graph' }>
    | null;
};

function forceReadinessBlocker(
  readiness: PlanRunReadinessEvaluation,
  blocker: PlanRunReadinessBlocker
): PlanRunReadinessEvaluation {
  const blockers: readonly PlanRunReadinessBlocker[] = readiness.blockers.includes(blocker)
    ? readiness.blockers
    : [...readiness.blockers, blocker];

  return {
    ...readiness,
    blockers,
    status: 'blocked',
  };
}

export function deriveCanvasExecutionState({
  graphDraftCanvasId,
  runAdmission,
  executionStrategy,
  currentPlan,
  lastPlannedDraftSignature,
  canonicalNodes,
  canonicalEdges,
  selectionIntent,
  workspaceNodeIds,
  latestPreviewOutcome,
  executionScope,
}: DeriveCanvasExecutionStateArgs): CanvasExecutionState {
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
  const usesProtectedDvtPreview = executionStrategy?.kind === 'dvt_protected_preview';
  const dvtPreviewProjection = usesProtectedDvtPreview
    ? buildProtectedDvtPreviewProjection({
        canvasId: graphDraftCanvasId ?? null,
        canonicalNodes,
        canonicalEdges,
        selectionIntent,
        workspaceNodeIds,
      })
    : null;
  const activeDraftSignature =
    dbtPlannerProjection?.ok === true
      ? dbtPlannerProjection.draftSignature
      : dvtPreviewProjection?.ok === true
        ? dvtPreviewProjection.draftSignature
        : transformationValidation.draftSignature;
  const isPreviewOutcomeStale =
    lastPlannedDraftSignature != null && lastPlannedDraftSignature !== activeDraftSignature;
  const previewOutcomeProjection =
    latestPreviewOutcome == null || isPreviewOutcomeStale
      ? null
      : projectCanvasPreviewOutcome(latestPreviewOutcome);
  const isExecutableGraphReady = usesDbtPlanner
    ? dbtPlannerProjection?.ok === true
    : usesProtectedDvtPreview
      ? dvtPreviewProjection?.ok === true
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
    runAdmission.allowed &&
    executionStrategy != null &&
    executionStrategy.kind !== 'not_executable' &&
    currentPlan != null &&
    hasPersistedPlanForRun &&
    isExecutableGraphReady &&
    !isCurrentPlanStale &&
    previewOutcomeProjection?.readinessBlocker == null;
  const executableGraphFailure: CanvasExecutableGraphFailure | null =
    executionStrategy != null &&
    executionStrategy.kind !== 'not_executable' &&
    !isCurrentPlanStale &&
    !isExecutableGraphReady
      ? dbtPlannerProjection?.ok === false
        ? { kind: 'projection', message: dbtPlannerProjection.message }
        : dvtPreviewProjection?.ok === false
          ? { kind: 'projection', message: dvtPreviewProjection.message }
          : { kind: 'transformation', summaryCode: transformationValidation.summaryCode }
      : null;
  const planRunReadinessSource = observePlanRunReadiness({
    runAdmission,
    currentPlan,
    isCurrentPlanStale,
    persistedPreviewIdentityMismatch,
    hasPersistedPlanForRun,
    capabilityMismatch: executionStrategy == null || executionStrategy.kind === 'not_executable',
  });
  const readinessDiagnostic: CanvasExecutionState['readinessDiagnostic'] =
    previewOutcomeProjection?.readinessBlocker != null
      ? {
          kind: 'preview',
          blocker: previewOutcomeProjection.readinessBlocker,
          diagnostic: previewOutcomeProjection.diagnostic,
        }
      : executableGraphFailure != null
        ? { kind: 'graph' }
        : null;
  const planRunReadiness =
    readinessDiagnostic?.kind === 'preview'
      ? forceReadinessBlocker(planRunReadinessSource, readinessDiagnostic.blocker)
      : readinessDiagnostic?.kind === 'graph'
        ? forceReadinessBlocker(planRunReadinessSource, 'plan_integrity')
        : planRunReadinessSource;

  return {
    transformationValidation,
    hasPersistedPlanForRun,
    persistedPreviewIdentityMismatch,
    isCurrentPlanStale,
    isPreviewOutcomeStale,
    executableGraphFailure,
    canPlanGraph,
    canStartRun,
    planRunReadiness,
    readinessDiagnostic,
  };
}
