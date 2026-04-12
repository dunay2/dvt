import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import type { IPlansPort } from '../../ports/plans';
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { ShellFeedbackPort } from '../../ports/shellFeedback';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { ExecutionPlan } from '../../types/dbt';
import type { PlanRef } from '../../types/engine';
import { buildPreviewGraphSource } from './previewGraphSource';
import { validateTransformationGraph } from './transformationGraphValidation';

type UseCanvasExecutionActionsParams = {
  plansService: IPlansPort;
  runsService: IRunsPort;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  selectedNodeIds: string[];
  workspaceNodeIds: string[];
  canPlan: boolean;
  canRun: boolean;
  sessionContext: SessionContextPort;
  shellFeedback: ShellFeedbackPort;
  consolePanelVisible: boolean;
  currentPlan: ExecutionPlan | null;
  setCurrentPlan: (plan: ExecutionPlan | null) => void;
  setConsolePanelHeight: (height: number) => void;
  toggleConsolePanel: () => void;
  onRunStarted: (runId: string) => void;
};

type UseCanvasExecutionActionsResult = {
  planModalOpen: boolean;
  setPlanModalOpen: Dispatch<SetStateAction<boolean>>;
  canStartRun: boolean;
  isCurrentPlanStale: boolean;
  planStatusSummary: string;
  handlePlan: () => Promise<void>;
  handleStartRun: () => Promise<void>;
};

export function resolvePlanRefForStartRun(plan: ExecutionPlan): PlanRef | null {
  return plan.planRef ?? null;
}

function hasPersistedPreviewProof(plan: ExecutionPlan | null): boolean {
  if (!plan?.preview?.persisted || !plan.planRef) {
    return false;
  }

  const hasPersistenceRecord = Boolean(
    plan.preview.persisted.planRecordId && plan.preview.persisted.canonicalPlanSha256
  );
  if (!hasPersistenceRecord) {
    return false;
  }

  return plan.preview.persisted.canonicalPlanSha256 === plan.planRef.sha256;
}

function hasPersistedPreviewRecord(plan: ExecutionPlan | null): boolean {
  return Boolean(
    plan?.preview?.persisted?.planRecordId && plan.preview?.persisted?.canonicalPlanSha256
  );
}

function hasPlanRefHashMismatch(plan: ExecutionPlan | null): boolean {
  if (!plan?.planRef || !hasPersistedPreviewRecord(plan)) {
    return false;
  }

  const persistedSha = plan.preview?.persisted?.canonicalPlanSha256;
  if (!persistedSha) {
    return false;
  }

  return persistedSha !== plan.planRef.sha256;
}

export function useCanvasExecutionActions({
  plansService,
  runsService,
  canonicalNodes,
  canonicalEdges,
  selectedNodeIds,
  workspaceNodeIds,
  canPlan,
  canRun,
  sessionContext,
  shellFeedback,
  consolePanelVisible,
  currentPlan,
  setCurrentPlan,
  setConsolePanelHeight,
  toggleConsolePanel,
  onRunStarted,
}: UseCanvasExecutionActionsParams): UseCanvasExecutionActionsResult {
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [lastPlannedDraftSignature, setLastPlannedDraftSignature] = useState<string | null>(null);
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
  const planStatusSummary = !canRun
    ? 'Run start is unavailable in this context.'
    : currentPlan == null
      ? 'Preview required before running.'
      : isCurrentPlanStale
        ? 'Preview is stale. Re-run Plan before starting.'
        : !currentPlan?.planRef
          ? 'Plan reference is unavailable. Re-run Plan before starting.'
          : planRefHashMismatch
            ? 'Preview is not aligned with the active plan reference. Re-run Plan before starting.'
            : !hasPersistedPlanForRun
              ? 'Preview is not persisted. Re-run Plan to create a persisted plan.'
              : 'Preview is current and ready to run.';

  useEffect(() => {
    if (currentPlan == null) {
      setLastPlannedDraftSignature(null);
    }
  }, [currentPlan]);

  const handlePlan = useCallback(async () => {
    if (!canPlan) {
      shellFeedback.error('You do not have permission to create plans');
      return;
    }

    if (!transformationValidation.valid) {
      shellFeedback.error(transformationValidation.summary);
      return;
    }

    try {
      const selectedForPlan = selectedNodeIds.length > 0 ? selectedNodeIds : workspaceNodeIds;
      const graphSource = buildPreviewGraphSource(canonicalNodes, canonicalEdges, selectedForPlan);
      const plan = await plansService.previewPlan({
        previewProfile: 'planner-generic-v1',
        graphSource,
        selectedNodeIds: selectedForPlan,
        context: sessionContext.buildRunContext(`run_ui_${Date.now()}`),
        persist: true,
      });
      setCurrentPlan(plan);
      setLastPlannedDraftSignature(transformationValidation.draftSignature);
      setPlanModalOpen(true);
      shellFeedback.success('Execution plan created');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create execution plan';
      shellFeedback.error(message);
    }
  }, [
    canPlan,
    canonicalEdges,
    canonicalNodes,
    plansService,
    selectedNodeIds,
    sessionContext,
    setCurrentPlan,
    shellFeedback,
    transformationValidation.draftSignature,
    transformationValidation.summary,
    transformationValidation.valid,
    workspaceNodeIds,
  ]);

  const handleStartRun = useCallback(async () => {
    if (!canRun) {
      shellFeedback.error('You do not have permission to start runs');
      return;
    }

    if (!currentPlan) {
      shellFeedback.error('No execution plan available - run Plan first');
      return;
    }

    if (isCurrentPlanStale) {
      shellFeedback.error('Preview is stale. Re-run Plan before starting.');
      setPlanModalOpen(true);
      return;
    }

    const planRef = resolvePlanRefForStartRun(currentPlan);
    if (!planRef) {
      shellFeedback.error('Plan reference is unavailable for this mode');
      setPlanModalOpen(true);
      return;
    }

    if (!hasPersistedPlanForRun) {
      shellFeedback.error(
        'Run start requires a persisted preview plan bound to the current plan reference. Re-run Plan first.'
      );
      setPlanModalOpen(true);
      return;
    }

    setPlanModalOpen(false);

    try {
      const runId = `run_ui_${Date.now()}`;
      const context = sessionContext.buildRunContext(runId);
      const runRef = await runsService.startRun({ planRef, context });

      if (!consolePanelVisible) {
        toggleConsolePanel();
      } else {
        setConsolePanelHeight(160);
      }

      shellFeedback.success('Run started');
      onRunStarted(runRef.runId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start run';
      shellFeedback.error(message);
      setPlanModalOpen(true);
    }
  }, [
    canRun,
    consolePanelVisible,
    currentPlan,
    hasPersistedPlanForRun,
    isCurrentPlanStale,
    onRunStarted,
    runsService,
    sessionContext,
    setConsolePanelHeight,
    shellFeedback,
    toggleConsolePanel,
  ]);

  return {
    planModalOpen,
    setPlanModalOpen,
    canStartRun,
    isCurrentPlanStale,
    planStatusSummary,
    handlePlan,
    handleStartRun,
  };
}
