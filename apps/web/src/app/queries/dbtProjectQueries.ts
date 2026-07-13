/** Owned concern: bind the dbt project graph query to workspace-scoped React Query state. */
import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import type { DbtProjectFilesAuthorityBinding } from '../ports/dbtProjectGraph';
import { useDbtProjectGraphQueryPort, useSessionContext } from '../services/AppServicesContext';
import { queryKeys } from './queryKeys';

export function useDbtProjectGraphQuery(
  authorityBinding: DbtProjectFilesAuthorityBinding,
  options: Readonly<{ enabled?: boolean }> = {}
) {
  const port = useDbtProjectGraphQueryPort();
  const sessionContext = useSessionContext();
  const scope = useSyncExternalStore(
    sessionContext.subscribeWorkspaceScope,
    sessionContext.getWorkspaceScopeSnapshot,
    sessionContext.getWorkspaceScopeSnapshot
  );

  return useQuery({
    enabled: options.enabled ?? true,
    queryKey: queryKeys.workspace.dbtProjectGraph(
      scope.tenantId,
      scope.projectId,
      scope.environmentId,
      authorityBinding.canvasId,
      authorityBinding.authority.projectRoot
    ),
    queryFn: () => port.getProjectGraph(authorityBinding),
    staleTime: 15_000,
  });
}
