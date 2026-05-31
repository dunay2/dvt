/** Owned concern: centralize workspace plugin catalog HTTP endpoint and scope projection. */
import type { Plugin } from '../../types/dbt';
import { readWorkspaceGraphDraftScope } from './workspaceGraphDraftHttp';

export const WORKSPACE_PLUGINS_ENDPOINT = '/workspace/plugins';

export type WorkspacePluginsResponse = Readonly<{
  plugins: readonly Plugin[];
}>;

export function readWorkspacePluginsScope(): {
  tenantId: string;
  projectId: string;
  environmentId: string;
} {
  return readWorkspaceGraphDraftScope();
}

export function buildWorkspacePluginsEndpoint(scope: {
  tenantId: string;
  projectId: string;
  environmentId: string;
}): string {
  const query = new URLSearchParams(scope);
  return `${WORKSPACE_PLUGINS_ENDPOINT}?${query.toString()}`;
}
