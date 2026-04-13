import { sha256HexUtf8 } from '@dvt/contracts';
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import type { IPlansPort, PlanPreviewProvenance } from '../../ports/plans';
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort, WorkspaceScope } from '../../ports/sessionContext';
import type { ShellFeedbackPort } from '../../ports/shellFeedback';
import type { IWorkspacePort } from '../../ports/workspace';
import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { ExecutionPlan } from '../../types/dbt';
import type { PlanRef } from '../../types/engine';
import {
  buildPreviewDesignGraphArtifactContent,
  buildPreviewGraphSource,
} from './previewGraphSource';
import { validateTransformationGraph } from './transformationGraphValidation';

type UseCanvasExecutionActionsParams = {
  plansService: IPlansPort;
  runsService: IRunsPort;
  workspaceService: IWorkspacePort;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  selectedNodeIds: string[];
  workspaceNodeIds: string[];
  canPlan: boolean;
  canRun: boolean;
  sessionContext: SessionContextPort;
  shellFeedback: ShellFeedbackPort;
  previewProvenanceConfig: Pick<
    WorkspaceBootstrapConfig,
    'gitBranch' | 'gitSha' | 'gitRepo' | 'graphArtifactPath'
  >;
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

type PreviewProvenanceResolution =
  | { ok: true; provenance?: PlanPreviewProvenance }
  | { ok: false; message: string };

function normalizeGitRef(branch: string): string {
  return branch.startsWith('refs/') ? branch : `refs/heads/${branch}`;
}

function hasExplicitGitRevision({
  gitBranch,
  gitSha,
}: Pick<WorkspaceBootstrapConfig, 'gitBranch' | 'gitSha'>): boolean {
  const normalizedBranch = gitBranch.trim();
  const normalizedSha = gitSha.trim();

  return (
    normalizedBranch.length > 0 &&
    normalizedBranch !== 'detached' &&
    normalizedBranch !== 'unknown' &&
    normalizedSha.length > 0 &&
    normalizedSha !== 'unknown'
  );
}

function resolveScopedTransformNode(
  nodes: readonly CanonicalNode[],
  scopedNodeIds: readonly string[]
): CanonicalNode | undefined {
  const scopedNodeIdSet = new Set(scopedNodeIds);
  return nodes.find((node) => scopedNodeIdSet.has(node.id) && node.role === 'transform');
}

function resolvePreviewArtifactContext(scope: WorkspaceScope): {
  tenantId: string;
  projectId: string;
  environmentId: string;
} {
  return {
    tenantId: scope.tenantId,
    projectId: scope.projectId,
    environmentId: scope.environmentId,
  };
}

async function resolvePreviewProvenance({
  canonicalNodes,
  canonicalEdges,
  scopedNodeIds,
  workspaceService,
  workspaceScope,
  previewProvenanceConfig,
  required,
}: {
  canonicalNodes: readonly CanonicalNode[];
  canonicalEdges: readonly CanonicalEdge[];
  scopedNodeIds: readonly string[];
  workspaceService: IWorkspacePort;
  workspaceScope: WorkspaceScope;
  previewProvenanceConfig: Pick<
    WorkspaceBootstrapConfig,
    'gitBranch' | 'gitSha' | 'gitRepo' | 'graphArtifactPath'
  >;
  required: boolean;
}): Promise<PreviewProvenanceResolution> {
  const transformNode = resolveScopedTransformNode(canonicalNodes, scopedNodeIds);
  if (!transformNode?.path) {
    if (!required) {
      return { ok: true };
    }
    return {
      ok: false,
      message:
        'Preview provenance requires one SQL transform node with a workspace file path before planning.',
    };
  }

  const { gitRepo, graphArtifactPath, gitBranch, gitSha } = previewProvenanceConfig;
  if (!gitRepo || !graphArtifactPath) {
    if (!required) {
      return { ok: true };
    }
    return {
      ok: false,
      message:
        'Preview provenance is not configured for this workspace. Set the Git repo and graph artifact path before planning.',
    };
  }
  if (!hasExplicitGitRevision({ gitBranch, gitSha })) {
    if (!required) {
      return { ok: true };
    }
    return {
      ok: false,
      message:
        'Preview provenance requires an explicit Git branch and commit before planning.',
    };
  }

  try {
    const sqlArtifactFile = await workspaceService.getFileContent(transformNode.path);
    const sqlArtifact = {
      repo: gitRepo,
      path: transformNode.path,
      ref: normalizeGitRef(gitBranch),
      commitSha: gitSha,
      contentSha256: sha256HexUtf8(sqlArtifactFile.content),
    } satisfies PlanPreviewProvenance['sqlArtifact'];
    const graphArtifactContent = buildPreviewDesignGraphArtifactContent({
      nodes: canonicalNodes,
      edges: canonicalEdges,
      scopedNodeIds,
      sqlArtifact,
      context: resolvePreviewArtifactContext(workspaceScope),
    });
    const graphArtifactFile = await workspaceService.saveFileContent(
      graphArtifactPath,
      graphArtifactContent
    );

    return {
      ok: true,
      provenance: {
        graphArtifact: {
          repo: gitRepo,
          path: graphArtifactPath,
          ref: normalizeGitRef(gitBranch),
          commitSha: gitSha,
          contentSha256: sha256HexUtf8(graphArtifactFile.content),
        },
        sqlArtifact,
      },
    };
  } catch (error) {
    if (!required) {
      return { ok: true };
    }
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : 'Preview provenance could not be resolved from the workspace files.',
    };
  }
}

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
  workspaceService,
  canonicalNodes,
  canonicalEdges,
  selectedNodeIds,
  workspaceNodeIds,
  canPlan,
  canRun,
  sessionContext,
  shellFeedback,
  previewProvenanceConfig,
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
      const context = sessionContext.buildRunContext(`run_ui_${Date.now()}`);
      const previewProvenance = await resolvePreviewProvenance({
        canonicalNodes,
        canonicalEdges,
        scopedNodeIds: selectedForPlan,
        workspaceService,
        workspaceScope: sessionContext.getWorkspaceScopeSnapshot(),
        previewProvenanceConfig,
        required: true,
      });
      if (!previewProvenance.ok) {
        shellFeedback.error(previewProvenance.message);
        return;
      }
      const plan = await plansService.previewPlan({
        previewProfile: 'transformation-sql-first-v1',
        graphSource,
        selectedNodeIds: selectedForPlan,
        context,
        ...(previewProvenance.provenance ? { provenance: previewProvenance.provenance } : {}),
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
    previewProvenanceConfig,
    selectedNodeIds,
    sessionContext,
    setCurrentPlan,
    shellFeedback,
    transformationValidation.draftSignature,
    transformationValidation.summary,
    transformationValidation.valid,
    workspaceService,
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
