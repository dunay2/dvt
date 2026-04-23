import type { WorkspaceGraphDraftRecord as ProtectedWorkspaceGraphDraftRecord } from '@dvt/contracts';
import { vi } from 'vitest';

import type { IPlansPort } from '../../ports/plans';
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { ShellFeedbackPort } from '../../ports/shellFeedback';
import type { IWorkspaceGraphDraftAuthoringPort } from '../../ports/workspaceGraphDraftAuthoring';
import type { IWorkspacePort, WorkspaceGraphDraftRecord } from '../../ports/workspace';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { PlanViewModel } from '../../types/plans';
import type { CanvasDraftReadModel } from './canvasDraftReadModel';

export type OverlayDecoration = { borderColor?: string; dimmed?: boolean } | null;

export type MockFn = ReturnType<typeof vi.fn>;

export type CanvasHarnessState = {
  graphData: { nodes: Array<{ id: string }>; edges: Array<{ id: string }> };
  remoteDraftRecord: ProtectedWorkspaceGraphDraftRecord | null;
  graphDraftQueryData: CanvasDraftReadModel | undefined;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  overlayDecorations: Map<string, OverlayDecoration>;
  currentPlan: PlanViewModel | null;
  services: {
    workspaceService: IWorkspacePort;
    workspaceGraphDraftAuthoringPort: IWorkspaceGraphDraftAuthoringPort;
    plansService: IPlansPort;
    runsService: IRunsPort;
    sessionContext: SessionContextPort;
    shellFeedback: ShellFeedbackPort;
  };
  store: {
    setCanvasViewport: MockFn;
    setCanvasNodePositions: MockFn;
  } & Record<string, unknown>;
  queryClient: {
    cancelQueries: MockFn;
    fetchQuery: MockFn;
    invalidateQueries: MockFn;
    setQueryData: MockFn;
  };
  graphHandlersResult: {
    handleDrop: MockFn;
    confirmEdgeCreation: MockFn;
  } & Record<string, unknown>;
  executionActionsResult: {
    canStartRun: boolean;
    planStatusSummary: string;
    handlePlan: MockFn;
    handleStartRun: MockFn;
  } & Record<string, unknown>;
  navigationActionsResult: {
    handleRunStarted: MockFn;
  } & Record<string, unknown>;
};

export type CanvasHarnessMocks = {
  useQuery: MockFn;
  useQueryClient: MockFn;
  resolveCanvasGraphStrategy: MockFn;
  useCanvasInteractionStore: MockFn;
  useExecutionStore: MockFn;
  useSessionStore: MockFn;
  useUiLayoutStore: MockFn;
  useCapabilitiesQuery: MockFn;
  buildOverlayContext: MockFn;
  buildNodeDecorations: MockFn;
  mapCanonicalNodeToCanvasNode: MockFn;
  mapCanonicalEdgeToCanvasEdge: MockFn;
  getAllOverlays: MockFn;
  getAllCanvasKinds: MockFn;
  getRegisteredPluginIds: MockFn;
  buildNodesWithImpact: MockFn;
  useCanvasExecutionActions: MockFn;
  useCanvasGraphHandlers: MockFn;
  useCanvasNavigationActions: MockFn;
};
