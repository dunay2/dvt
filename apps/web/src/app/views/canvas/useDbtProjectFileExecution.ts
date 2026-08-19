/** Owned concern: bind file-authoritative dbt execution to shared Canvas command rails. */
import type { DbtProjectGraphProjection } from '@dvt/contracts';
import { useMemo } from 'react';

import {
  useGraphDbtWorkspaceArtifactPublicationCommandPort,
  useGraphDbtModelCompilationQueryPort,
  usePlansService,
  useRunsService,
  useSessionContext,
  useShellFeedback,
  useWorkspaceFileContentCommandPort,
  useWorkspaceFilesQueryPort,
} from '../../services/AppServicesContext';
import { resolveWorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { buildDbtProjectFileExecutionStrategy } from './dbtProjectFileExecutionStrategy';
import { useCanvasExecutionActions } from './useCanvasExecutionActions';
import { useCanvasNavigationActions } from './useCanvasNavigationActions';
import type { CanvasStoreView } from './useCanvasStoreFacade';
import type { CanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';

type DbtProjectFileExecutionStore = Pick<
  CanvasStoreView,
  | 'bottomDrawerVisible'
  | 'currentPlan'
  | 'selectedEnvironment'
  | 'setBottomDrawerHeight'
  | 'setCurrentPlan'
  | 'toggleBottomDrawer'
  | 'userPermissions'
>;

export function useDbtProjectFileExecution(args: {
  projection: DbtProjectGraphProjection | null;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  selectionIntent: CanvasExecutionSelectionIntent;
  workspaceNodeIds: string[];
  store: DbtProjectFileExecutionStore;
}) {
  const plansService = usePlansService();
  const runsService = useRunsService();
  const sessionContext = useSessionContext();
  const shellFeedback = useShellFeedback();
  const workspaceFilesQuery = useWorkspaceFilesQueryPort();
  const workspaceFileContentCommand = useWorkspaceFileContentCommandPort();
  const graphDbtWorkspaceArtifactPublicationCommand =
    useGraphDbtWorkspaceArtifactPublicationCommandPort();
  const graphDbtModelCompilationQuery = useGraphDbtModelCompilationQueryPort();
  const navigation = useCanvasNavigationActions();
  const previewProvenanceConfig = useMemo(() => resolveWorkspaceBootstrapConfig(), []);
  const executionStrategy = useMemo(
    () => (args.projection == null ? null : buildDbtProjectFileExecutionStrategy(args.projection)),
    [args.projection]
  );
  const canPlan =
    args.store.userPermissions.canPlan && args.projection?.capabilities.canPreview === true;
  const canRun = args.store.userPermissions.canRun && args.projection?.capabilities.canRun === true;
  const actions = useCanvasExecutionActions({
    graphDraftCanvasId: null,
    plansService,
    runsService,
    workspaceFilesQuery,
    workspaceFileContentCommand,
    graphDbtWorkspaceArtifactPublicationCommand,
    graphDbtModelCompilationQuery,
    executionStrategy,
    canonicalNodes: args.canonicalNodes,
    canonicalEdges: args.canonicalEdges,
    selectionIntent: args.selectionIntent,
    workspaceNodeIds: args.workspaceNodeIds,
    canPlan,
    canRun,
    sessionContext,
    executionEnvironmentId: args.store.selectedEnvironment,
    shellFeedback,
    previewProvenanceConfig,
    bottomDrawerVisible: args.store.bottomDrawerVisible,
    currentPlan: args.store.currentPlan,
    setCurrentPlan: args.store.setCurrentPlan,
    setBottomDrawerHeight: args.store.setBottomDrawerHeight,
    toggleBottomDrawer: args.store.toggleBottomDrawer,
    onRunStarted: navigation.handleRunStarted,
  });

  return {
    ...actions,
    canPlan,
    canRun,
    canSelectExecution: canPlan || canRun,
    executionStrategy,
  };
}
