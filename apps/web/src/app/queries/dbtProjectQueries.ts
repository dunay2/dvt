/** Owned concern: bind the dbt project graph query to workspace-scoped React Query state. */
import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import type { DbtProjectFilesAuthorityBinding } from '../ports/dbtProjectGraph';
import { useDbtProjectGraphQueryPort, useSessionContext } from '../services/AppServicesContext';
import { hasDbtProjectQueryContext, queryKeys } from './queryKeys';

export function useDbtProjectGraphQuery(
  authorityBinding: DbtProjectFilesAuthorityBinding | undefined,
  options: Readonly<{ enabled?: boolean; revisionToken?: string }> = {}
) {
  const port = useDbtProjectGraphQueryPort();
  const sessionContext = useSessionContext();
  const scope = useSyncExternalStore(
    sessionContext.subscribeWorkspaceScope,
    sessionContext.getWorkspaceScopeSnapshot,
    sessionContext.getWorkspaceScopeSnapshot
  );
  const context = {
    ...scope,
    canvasId: authorityBinding?.canvasId,
    projectRoot: authorityBinding?.authority.projectRoot,
    revisionToken: options.revisionToken,
  };
  const hasContext = hasDbtProjectQueryContext(context);

  return useQuery({
    enabled: hasContext && (options.enabled ?? true),
    retry: false,
    queryKey: queryKeys.workspace.dbtProjectGraph(context),
    queryFn: function loadAcceptedProjectGraph() {
      if (!hasContext || authorityBinding === undefined) {
        throw new Error('ProjectDbtGraphFromFiles requires an accepted file authority binding.');
      }
      return port.getProjectGraph(authorityBinding);
    },
    staleTime: options.revisionToken === undefined ? 15_000 : 0,
  });
}
