/** Owned concern: collect Canvas route environment ports and runtime state. */
import { useMemo } from 'react';

import { usePlatformHealthSnapshotQuery } from '../../../capabilities/platform-health';
import { getSourceImportContributions } from '../../plugins/registry';
import { useCapabilitiesQuery } from '../../queries/useCapabilitiesQuery';
import { resolveWorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import {
  useGraphDbtWorkspaceArtifactPublicationCommandPort,
  useGraphDbtModelCompilationQueryPort,
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
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

export function useCanvasControllerEnvironment() {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const { data: capabilities } = useCapabilitiesQuery();
  const platformHealthQuery = usePlatformHealthSnapshotQuery();
  const sourceImportContributions = useMemo(
    () => getSourceImportContributions(capabilities),
    [capabilities]
  );
  const hasAuthorizedSourceImportContribution = sourceImportContributions.length > 0;
  const workspaceFilesQuery = useWorkspaceFilesQueryPort();
  const workspaceFileContentCommand = useWorkspaceFileContentCommandPort();
  const graphDbtWorkspaceArtifactPublicationCommand =
    useGraphDbtWorkspaceArtifactPublicationCommandPort();
  const graphDbtModelCompilationQuery = useGraphDbtModelCompilationQueryPort();
  const workspaceGraphDraftAuthoringPort = useWorkspaceGraphDraftAuthoringPort();
  const plansService = usePlansService();
  const runsService = useRunsService();
  const sessionContext = useSessionContext();
  const shellFeedback = useShellFeedback();
  const workspaceBootstrapConfig = useMemo(() => resolveWorkspaceBootstrapConfig(), []);
  const navigationActions = useCanvasNavigationActions();
  const store = useCanvasStoreFacade();

  return {
    applicationLanguage,
    capabilities,
    platformHealthQuery,
    hasAuthorizedSourceImportContribution,
    workspaceFilesQuery,
    workspaceFileContentCommand,
    graphDbtWorkspaceArtifactPublicationCommand,
    graphDbtModelCompilationQuery,
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
