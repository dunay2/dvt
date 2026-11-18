/** Owned concern: centralize scoped workspace-file HTTP endpoints and reason tokens. */
import type { WorkspaceDirectoryRequest } from '@dvt/contracts';
import { readGrantedWorkspaceHttpScope, type WorkspaceHttpScope } from './workspaceHttpScope';

export const WORKSPACE_FILES_ENDPOINT = '/workspace/files';

export const WORKSPACE_FILES_HTTP_ERROR_REASON = Object.freeze({
  fileNotFound: 'workspace_file_not_found',
  invalidPath: 'invalid_workspace_path',
  revisionConflict: 'workspace_file_revision_conflict',
} as const);

export type WorkspaceFilesScope = WorkspaceHttpScope;

export function readWorkspaceFilesScope(): WorkspaceFilesScope {
  return readGrantedWorkspaceHttpScope();
}

export function buildWorkspaceFilesEndpoint(
  { tenantId, projectId, environmentId }: WorkspaceFilesScope,
  request?: WorkspaceDirectoryRequest
): string {
  const params = new URLSearchParams({ tenantId, projectId, environmentId });
  if (request) {
    params.set('directory', request.directory);
    if (request.cursor != null) params.set('cursor', request.cursor);
  }
  return `${WORKSPACE_FILES_ENDPOINT}?${params.toString()}`;
}

export function buildWorkspaceFileContentEndpoint(
  path: string,
  scope: WorkspaceFilesScope
): string {
  return `${WORKSPACE_FILES_ENDPOINT}/${encodeURIComponent(path)}?${new URLSearchParams(
    scope
  ).toString()}`;
}
