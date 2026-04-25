import { useMemo } from 'react';

import { usePlatformHealthSnapshotQuery } from '../../../capabilities/platform-health';
import { resolveCanvasGraphStrategy } from '../../plugins/graphStrategyRegistry';
import { useCapabilitiesQuery } from '../../queries/useCapabilitiesQuery';
import { resolveWorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import { resolveWorkspaceServiceCapabilities } from '../../services/workspace/workspaceService';
import {
  useAppDataSourceMode,
  usePlansService,
  useRunsService,
  useSessionContext,
  useShellFeedback,
  useWorkspaceGraphDraftAuthoringPort,
  useWorkspaceService,
} from '../../services/AppServicesContext';
import { useCanvasNavigationActions } from './useCanvasNavigationActions';
import { useCanvasStoreFacade } from './useCanvasStoreFacade';

export function useCanvasControllerEnvironment() {
  const dataSourceMode = useAppDataSourceMode();
  const { data: capabilities } = useCapabilitiesQuery();
  const platformHealthQuery = usePlatformHealthSnapshotQuery();
  const graphStrategy = useMemo(() => resolveCanvasGraphStrategy(), []);
  const canvasAuthoringMode = graphStrategy.authoringPolicy.canvasKind;
  const workspaceServiceCapabilities = useMemo(
    () => resolveWorkspaceServiceCapabilities(dataSourceMode),
    [dataSourceMode]
  );
  const workspaceService = useWorkspaceService();
  const workspaceGraphDraftAuthoringPort = useWorkspaceGraphDraftAuthoringPort();
  const plansService = usePlansService();
  const runsService = useRunsService();
  const sessionContext = useSessionContext();
  const shellFeedback = useShellFeedback();
  const workspaceBootstrapConfig = useMemo(() => resolveWorkspaceBootstrapConfig(), []);
  const navigationActions = useCanvasNavigationActions();
  const store = useCanvasStoreFacade();

  return {
    dataSourceMode,
    capabilities,
    platformHealthQuery,
    graphStrategy,
    canvasAuthoringMode,
    workspaceServiceCapabilities,
    workspaceService,
    workspaceGraphDraftAuthoringPort,
    plansService,
    runsService,
    sessionContext,
    shellFeedback,
    workspaceBootstrapConfig,
    navigationActions,
    store,
  };
}
