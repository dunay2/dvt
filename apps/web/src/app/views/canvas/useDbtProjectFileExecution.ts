/** Owned concern: bind file-authoritative dbt execution to shared Canvas command rails. */
import type { DbtProjectGraphProjection } from '@dvt/contracts';
import { useCallback, useMemo } from 'react';

import {
  useGraphDbtWorkspaceArtifactPublicationCommandPort,
  useGraphDbtModelCompilationQueryPort,
  usePlansService,
  useRunsService,
  useSessionContext,
  useShellFeedback,
  useWorkspaceFilesQueryPort,
} from '../../services/AppServicesContext';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { buildDbtProjectFileExecutionStrategy } from './dbtProjectFileExecutionStrategy';
import { useCanvasExecutionActions } from './useCanvasExecutionActions';
import { resolveCanvasRunAdmission } from './canvasRuntimePolicy';
import { useCanvasNavigationActions } from './useCanvasNavigationActions';
import type { CanvasStoreView } from './useCanvasStoreFacade';
import type { CanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';
import {
  buildCanvasExecutionSelectionRecoveryGraph,
  resolveCanvasExecutionSelectionLastPreviewRevision,
} from './canvasExecutionSelectionRecovery';
import {
  refreshCanvasExecutionSelectionAuthority,
  type CanvasAuthorityRefreshResult,
} from './canvasExecutionSelectionRecoveryAuthorityAdapter';
import { useCanvasExecutionSelectionRecovery } from './useCanvasExecutionSelectionRecovery';

type DbtProjectFileExecutionStore = Pick<
  CanvasStoreView,
  | 'currentPlan'
  | 'selectedEnvironment'
  | 'showBottomDrawer'
  | 'setCurrentPlan'
  | 'userPermissions'
  | 'setExecutionSelectionIntent'
>;

export function useDbtProjectFileExecution(args: {
  projection: DbtProjectGraphProjection | null;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  selectionIntent: CanvasExecutionSelectionIntent;
  workspaceNodeIds: string[];
  store: DbtProjectFileExecutionStore;
  refetchProjectGraph: () => Promise<CanvasAuthorityRefreshResult<DbtProjectGraphProjection>>;
}) {
  const plansService = usePlansService();
  const runsService = useRunsService();
  const sessionContext = useSessionContext();
  const shellFeedback = useShellFeedback();
  const workspaceFilesQuery = useWorkspaceFilesQueryPort();
  const graphDbtWorkspaceArtifactPublicationCommand =
    useGraphDbtWorkspaceArtifactPublicationCommandPort();
  const graphDbtModelCompilationQuery = useGraphDbtModelCompilationQueryPort();
  const navigation = useCanvasNavigationActions();
  const executionStrategy = useMemo(
    () => (args.projection == null ? null : buildDbtProjectFileExecutionStrategy(args.projection)),
    [args.projection]
  );
  const canPlan =
    args.store.userPermissions.canPlan && args.projection?.capabilities.canPreview === true;
  const runAdmission = resolveCanvasRunAdmission({
    permissionGranted: args.store.userPermissions.canRun,
    executionAvailable: args.projection?.capabilities.canRun === true,
    draftBarrier: null,
  });
  const canRun = runAdmission.allowed;
  const actions = useCanvasExecutionActions({
    graphDraftCanvasId: null,
    plansService,
    runsService,
    workspaceFilesQuery,
    graphDbtWorkspaceArtifactPublicationCommand,
    graphDbtModelCompilationQuery,
    executionStrategy,
    canonicalNodes: args.canonicalNodes,
    canonicalEdges: args.canonicalEdges,
    selectionIntent: args.selectionIntent,
    workspaceNodeIds: args.workspaceNodeIds,
    canPlan,
    runAdmission,
    sessionContext,
    executionEnvironmentId: args.store.selectedEnvironment,
    shellFeedback,
    currentPlan: args.store.currentPlan,
    setCurrentPlan: args.store.setCurrentPlan,
    showBottomDrawer: args.store.showBottomDrawer,
    onRunStarted: navigation.handleRunStarted,
  });
  const executionSelectableNodeIds = useMemo(
    () =>
      new Set(
        executionStrategy?.kind === 'dbt_project_file_preview'
          ? executionStrategy.plannerGraphSource.nodes.map((node) => node.nodeId)
          : []
      ),
    [executionStrategy]
  );
  const recoveryGraph = useMemo(
    () =>
      buildCanvasExecutionSelectionRecoveryGraph({
        canonicalNodes: args.canonicalNodes,
        canonicalEdges: args.canonicalEdges,
        workspaceNodeIds: args.workspaceNodeIds,
        plannerGraphSource:
          executionStrategy?.kind === 'dbt_project_file_preview'
            ? executionStrategy.plannerGraphSource
            : null,
      }),
    [args.canonicalNodes, args.canonicalEdges, args.workspaceNodeIds, executionStrategy]
  );
  const refreshAnalysis = useCallback(
    () =>
      refreshCanvasExecutionSelectionAuthority(
        args.refetchProjectGraph,
        (projection) => projection?.freshness === 'fresh'
      ),
    [args.refetchProjectGraph]
  );
  const executionSelectionRecovery = useCanvasExecutionSelectionRecovery({
    enabled: true,
    selectionIntent: args.selectionIntent,
    workspaceNodeIds: args.workspaceNodeIds,
    executableNodeIds: recoveryGraph.executableNodeIds,
    dependencyIdsByNodeId: recoveryGraph.dependencyIdsByNodeId,
    lastPreviewRevision: resolveCanvasExecutionSelectionLastPreviewRevision(args.store.currentPlan),
    canRefreshAnalysis: true,
    setSelectionIntent: args.store.setExecutionSelectionIntent,
    refreshAnalysis,
  });

  return {
    ...actions,
    canPlan,
    canRun,
    canSelectExecution: canPlan || canRun,
    executionStrategy,
    executionSelectableNodeIds,
    executionSelectionRecovery,
  };
}
