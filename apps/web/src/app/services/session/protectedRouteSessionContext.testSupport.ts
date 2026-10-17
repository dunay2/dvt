/** Owned concern: control session transport completion without replacing publication semantics. */
import type { WorkspaceContextResponse } from '@dvt/contracts';
import type { ApiClient, ApiRequestInit } from '../api/createApiClient';

export function workspaceResponse(projectId: string): WorkspaceContextResponse {
  const workspace = { tenantId: 'tenant', projectId, projectName: projectId, environmentId: 'dev' };
  return {
    defaultWorkspace: workspace,
    availableWorkspaces: [workspace],
    deploymentScope: { targetAdapter: 'temporal', availableTargetAdapters: ['temporal'] },
  };
}

export function controlledSessionClient() {
  const requests: Array<{
    endpoint: string;
    init: Omit<ApiRequestInit, 'method'> | undefined;
    resolve(value: unknown): void;
    reject(error: unknown): void;
  }> = [];
  const client: Pick<ApiClient, 'getJson'> = {
    getJson: <T>(endpoint: string, init?: Omit<ApiRequestInit, 'method'>) =>
      new Promise<T>((resolve, reject) => {
        requests.push({ endpoint, init, resolve: (value) => resolve(value as T), reject });
      }),
  };
  return { client, requests };
}

export function grantedSessionClient(
  projectId: string,
  canRun = false
): Pick<ApiClient, 'getJson'> {
  return {
    getJson: async <T>(endpoint: string) => {
      if (endpoint === '/session') return { permissions: { canRun } } as T;
      if (endpoint === '/workspace/context') return workspaceResponse(projectId) as T;
      throw new Error(`Unexpected session endpoint: ${endpoint}`);
    },
  };
}
