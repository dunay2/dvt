import type { Dispatch, SetStateAction } from 'react';

import type { IPlansPort } from '../../ports/plans';
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { ShellFeedbackPort } from '../../ports/shellFeedback';
import type { IWorkspacePort } from '../../ports/workspace';
import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { PlanViewModel } from '../../types/plans';

export type UseCanvasExecutionActionsParams = {
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
  currentPlan: PlanViewModel | null;
  setCurrentPlan: (plan: PlanViewModel | null) => void;
  setConsolePanelHeight: (height: number) => void;
  toggleConsolePanel: () => void;
  onRunStarted: (runId: string) => void;
};

export type UseCanvasExecutionActionsResult = {
  planModalOpen: boolean;
  setPlanModalOpen: Dispatch<SetStateAction<boolean>>;
  canStartRun: boolean;
  isCurrentPlanStale: boolean;
  planStatusSummary: string;
  handlePlan: () => Promise<void>;
  handleStartRun: () => Promise<void>;
};

export type SetLastPlannedDraftSignature = Dispatch<SetStateAction<string | null>>;
export type SetPlanModalOpen = Dispatch<SetStateAction<boolean>>;
