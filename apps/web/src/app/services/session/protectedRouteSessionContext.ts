/** Owned concern: resolve protected route session and server-owned workspace context. */
import { asNonBlankString } from '@dvt/contracts';

import type { ApiClient } from '../api/createApiClient';
import { useSessionStore } from '../../stores/sessionStore';

type EffectiveWorkspaceContext = {
  readonly tenantId: string;
  readonly projectId: string;
  readonly environmentId: string;
};

type EffectiveWorkspaceContextResponse = {
  readonly effectiveWorkspace: EffectiveWorkspaceContext;
  readonly availableWorkspaces: readonly EffectiveWorkspaceContext[];
};

export async function resolveProtectedRouteSessionContext(apiClient: Pick<ApiClient, 'getJson'>) {
  await apiClient.getJson('/session', {
    includeSessionHeaders: false,
  });

  const workspaceContext = await apiClient.getJson<EffectiveWorkspaceContextResponse>(
    '/workspace/context',
    {
      includeSessionHeaders: false,
    }
  );

  useSessionStore.getState().setSessionContext({
    tenantId: asNonBlankString(workspaceContext.effectiveWorkspace.tenantId),
    projectId: asNonBlankString(workspaceContext.effectiveWorkspace.projectId),
    environmentId: asNonBlankString(workspaceContext.effectiveWorkspace.environmentId),
  });
}
