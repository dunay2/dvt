import type { WorkspaceGraphDraftRecord as ProtectedWorkspaceGraphDraftRecord } from '@dvt/contracts';
import type { Mock } from 'vitest';

import type { IPlansPort } from '../../ports/plans';
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { ShellFeedbackPort } from '../../ports/shellFeedback';
import type { IWorkspaceGraphDraftAuthoringPort } from '../../ports/workspaceGraphDraftAuthoring';
import type {
  IWorkspaceFileContentCommandPort,
  IWorkspaceFilesQueryPort,
} from '../../ports/workspace';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { PlanViewModel } from '../../types/plans';
import type { CanvasAuthoringDraftReadModel } from './canvasDraftReadModel';
import type { PlanRunReadinessReadModel } from './canvasPlanReadiness';

export type OverlayDecoration = { borderColor?: string; dimmed?: boolean } | null;

export type MockFn = Mock;

export type CanvasHarnessState = {
  graphData: { nodes: Array<{ id: string }>; edges: Array<{ id: string }> };
  remoteDraftRecord: ProtectedWorkspaceGraphDraftRecord | null;
  graphDraftQueryData: CanvasAuthoringDraftReadModel | undefined;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  overlayDecorations: Map<string, OverlayDecoration>;
  currentPlan: PlanViewModel | null;
  services: {
    workspaceFilesQuery: IWorkspaceFilesQueryPort;
    workspaceFileContentCommand: IWorkspaceFileContentCommandPort;
    workspaceGraphDraftAuthoringPort: IWorkspaceGraphDraftAuthoringPort;
    plansService: IPlansPort;
    runsService: IRunsPort;
    sessionContext: SessionContextPort;
    shellFeedback: ShellFeedbackPort;
  };
  store: {
    setCanvasViewport: MockFn;
    setCanvasNodePositions: MockFn;
    setInspectorNode: MockFn;
    setSelectedNodes: MockFn;
    setExecutionSelectionIntent: MockFn;
  } & Record<string, unknown>;
  queryClient: {
    cancelQueries: MockFn;
    fetchQuery: MockFn;
    invalidateQueries: MockFn;
    setQueryData: MockFn;
  };
  graphHandlersResult: {
    handleDrop: MockFn;
    onConnect: MockFn;
  } & Record<string, unknown>;
  executionActionsResult: {
    canStartRun: boolean;
    planRunReadiness: PlanRunReadinessReadModel;
    planStatusSummary: string;
    handlePreviewExecutionPlan: MockFn;
    handleStartRun: MockFn;
  } & Record<string, unknown>;
  navigationActionsResult: {
    handleRunStarted: MockFn;
  } & Record<string, unknown>;
};

export type CanvasHarnessMocks = {
  useQuery: MockFn;
  useQueryClient: MockFn;
  getGraphNodeCardStrategies: MockFn;
  findCanvasGraphStrategy: MockFn;
  findCanvasRuntimeRegistration: MockFn;
  resolveCanvasGraphStrategy: MockFn;
  useAuthorizationStore: MockFn;
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
  getPluginPortMap: MockFn;
  getSourceImportContributions: MockFn;
  buildCanvasNodeInteractionPresentation: MockFn;
  useCanvasExecutionActions: MockFn;
  useCanvasGraphHandlers: MockFn;
  useCanvasNavigationActions: MockFn;
};
