/** Owned concern: define Canvas execution-action dependencies and results. */
import type { Dispatch, SetStateAction } from 'react';

import type { IPlansPort, PlanPreviewOutcome } from '../../ports/plans';
import type { IGraphDbtWorkspaceArtifactPublicationCommandPort } from '../../ports/graphDbtWorkspaceArtifactPublication';
import type { IGraphDbtModelCompilationQueryPort } from '../../ports/graphDbtModelCompilation';
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort, WorkspaceScope } from '../../ports/sessionContext';
import type { ShellFeedbackPort } from '../../ports/shellFeedback';
import type { IWorkspaceFilesQueryPort } from '../../ports/workspace';
import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { PlanViewModel } from '../../types/plans';
import type { PlanRunReadinessReadModel } from './canvasPlanReadiness';
import type { CanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';

export type CanvasExecutionDraftGraph =
  | {
      ok: true;
      canonicalNodes: readonly CanonicalNode[];
      canonicalEdges: readonly CanonicalEdge[];
      workspaceNodeIds: readonly string[];
    }
  | {
      ok: false;
      message: string;
    };

export type UseCanvasExecutionActionsParams = {
  graphDraftCanvasId: string | null;
  plansService: IPlansPort;
  runsService: IRunsPort;
  workspaceFilesQuery: IWorkspaceFilesQueryPort;
  graphDbtWorkspaceArtifactPublicationCommand: IGraphDbtWorkspaceArtifactPublicationCommandPort;
  graphDbtModelCompilationQuery: IGraphDbtModelCompilationQueryPort;
  executionStrategy: CanvasExecutionStrategy | null;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  selectionIntent: CanvasExecutionSelectionIntent;
  workspaceNodeIds: string[];
  flushDraftForExecution?: () => Promise<CanvasExecutionDraftGraph>;
  canPlan: boolean;
  canRun: boolean;
  sessionContext: SessionContextPort;
  executionEnvironmentId?: WorkspaceScope['environmentId'];
  shellFeedback: ShellFeedbackPort;
  bottomDrawerVisible: boolean;
  currentPlan: PlanViewModel | null;
  setCurrentPlan: (plan: PlanViewModel | null) => void;
  setBottomDrawerHeight: (height: number) => void;
  toggleBottomDrawer: () => void;
  onRunStarted: (runId: string) => void;
};

export type UseCanvasExecutionActionsResult = {
  planModalOpen: boolean;
  setPlanModalOpen: Dispatch<SetStateAction<boolean>>;
  canPlanGraph: boolean;
  canStartRun: boolean;
  isCurrentPlanStale: boolean;
  planRunReadiness: PlanRunReadinessReadModel;
  planStatusSummary: string;
  latestPreviewOutcome: PlanPreviewOutcome | null;
  handlePreviewExecutionPlan: () => Promise<void>;
  handleStartRun: () => Promise<void>;
};

export type SetLastPlannedDraftSignature = Dispatch<SetStateAction<string | null>>;
export type SetPlanModalOpen = Dispatch<SetStateAction<boolean>>;
