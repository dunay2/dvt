/** Owned concern: centralize scoped workspace file-history HTTP endpoints. */
import type { WorkspaceFilesScope } from './workspaceFilesHttp';

export const WORKSPACE_FILE_HISTORY_ENDPOINT = '/workspace/file-history';

export function buildWorkspaceFileHistoryEndpoint(
  path: string,
  scope: WorkspaceFilesScope
): string {
  const query = new URLSearchParams({
    tenantId: scope.tenantId,
    projectId: scope.projectId,
    environmentId: scope.environmentId,
  });
  return `${WORKSPACE_FILE_HISTORY_ENDPOINT}/${encodeURIComponent(path)}?${query.toString()}`;
}
