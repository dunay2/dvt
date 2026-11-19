/** Owned concern: centralize scoped workspace file-history HTTP endpoints. */
import type { WorkspaceFilesScope } from './workspaceFilesHttp';

export const WORKSPACE_FILE_HISTORY_ENDPOINT = '/workspace/file-history';

export function buildWorkspaceFileHistoryEndpoint(
  path: string,
  scope: WorkspaceFilesScope,
  selection: Readonly<{ before?: string; revision?: string }> = {}
): string {
  const query = new URLSearchParams({
    tenantId: scope.tenantId,
    projectId: scope.projectId,
    environmentId: scope.environmentId,
  });
  if (selection.before) query.set('before', selection.before);
  const suffix = selection.revision ? `/${encodeURIComponent(selection.revision)}` : '';
  return `${WORKSPACE_FILE_HISTORY_ENDPOINT}/${encodeURIComponent(path)}${suffix}?${query.toString()}`;
}
