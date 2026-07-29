/** Owned concern: collect Canvas route environment ports and runtime state. */
import { useMemo } from 'react';

import { usePlatformHealthSnapshotQuery } from '../../../capabilities/platform-health';
import { getSourceImportContributions } from '../../plugins/registry';
import { useCapabilitiesQuery } from '../../queries/useCapabilitiesQuery';
import { resolveWorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import { resolveWorkspacePortCapabilities } from '../../services/workspace/workspacePorts';
import {
  useAppDataSourceMode,
  useGraphDbtWorkspaceArtifactPublicationCommandPort,
  usePlansService,
  useRunsService,
  useSessionContext,
  useShellFeedback,
  useWorkspaceFileContentCommandPort,
  useWorkspaceFilesQueryPort,
  useWorkspaceGraphDraftAuthoringPort,
} from '../../services/AppServicesContext';
import { useCanvasNavigationActions } from './useCanvasNavigationActions';
import { useCanvasStoreFacade } from './useCanvasStoreFacade';

export function useCanvasControllerEnvironment() {
  const dataSourceMode = useAppDataSourceMode();
  const { data: capabilities } = useCapabilitiesQuery();
  const platformHealthQuery = usePlatformHealthSnapshotQuery();
  const workspacePortTransportCapabilities = useMemo(() => resolveWorkspacePortCapabilities(), []);
  const sourceImportContributions = useMemo(
    () => getSourceImportContributions(capabilities),
    [capabilities]
  );
  const workspacePortCapabilities = useMemo(
    () => ({
      ...workspacePortTransportCapabilities,
      sourceImportAvailable:
        workspacePortTransportCapabilities.sourceImportAvailable &&
        sourceImportContributions.length > 0,
    }),
    [sourceImportContributions.length, workspacePortTransportCapabilities]
  );
  const workspaceFilesQuery = useWorkspaceFilesQueryPort();
  const workspaceFileContentCommand = useWorkspaceFileContentCommandPort();
  const graphDbtWorkspaceArtifactPublicationCommand =
    useGraphDbtWorkspaceArtifactPublicationCommandPort();
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
    workspacePortCapabilities,
    workspaceFilesQuery,
    workspaceFileContentCommand,
    graphDbtWorkspaceArtifactPublicationCommand,
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
