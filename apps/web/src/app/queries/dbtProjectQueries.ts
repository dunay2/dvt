/** Owned concern: bind the dbt project graph query to workspace-scoped React Query state. */
import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import type { DbtProjectFilesAuthorityBinding } from '../ports/dbtProjectGraph';
import { useDbtProjectGraphQueryPort, useSessionContext } from '../services/AppServicesContext';
import { queryKeys } from './queryKeys';

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
  const hasContext = Boolean(
    scope.tenantId.trim() &&
    scope.projectId.trim() &&
    scope.environmentId.trim() &&
    authorityBinding?.canvasId.trim() &&
    authorityBinding.authority.projectRoot.trim()
  );

  return useQuery({
    enabled: hasContext && (options.enabled ?? true),
    queryKey: queryKeys.workspace.dbtProjectGraph(
      scope.tenantId,
      scope.projectId,
      scope.environmentId,
      authorityBinding?.canvasId,
      authorityBinding?.authority.projectRoot,
      options.revisionToken
    ),
    queryFn: () => {
      if (!hasContext || authorityBinding === undefined) {
        throw new Error('ProjectDbtGraphFromFiles requires an accepted file authority binding.');
      }
      return port.getProjectGraph(authorityBinding);
    },
    staleTime: options.revisionToken === undefined ? 15_000 : 0,
  });
}
