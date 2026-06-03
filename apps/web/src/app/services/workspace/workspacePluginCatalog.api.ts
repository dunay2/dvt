/** Owned concern: adapt the workspace plugin catalog query port to the protected API. */
import type { IWorkspacePluginCatalogQueryPort } from '../../ports/workspace';
import type { Plugin } from '../../types/dbt';
import type { ApiClient } from '../api/createApiClient';
import {
  buildWorkspacePluginsEndpoint,
  readWorkspacePluginsScope,
  type WorkspacePluginsResponse,
} from './workspacePluginsHttp';

export function createApiWorkspacePluginCatalogQueryPort(
  apiClient: ApiClient
): IWorkspacePluginCatalogQueryPort {
  return {
    getPlugins: async (): Promise<Plugin[]> => {
      const response = await apiClient.getJson<WorkspacePluginsResponse>(
        buildWorkspacePluginsEndpoint(readWorkspacePluginsScope())
      );
      return [...response.plugins];
    },
  };
}
