/** Owned concern: centralize scoped workspace-file HTTP endpoints and reason tokens. */
import { readGrantedWorkspaceScope } from '../session/workspaceScopeSelectionPort';
import type { WorkspaceDirectoryRequest } from '@dvt/contracts';

export const WORKSPACE_FILES_ENDPOINT = '/workspace/files';

export const WORKSPACE_FILES_HTTP_ERROR_REASON = Object.freeze({
  fileNotFound: 'workspace_file_not_found',
  invalidPath: 'invalid_workspace_path',
  revisionConflict: 'workspace_file_revision_conflict',
} as const);

export type WorkspaceFilesScope = {
  readonly tenantId: string;
  readonly projectId: string;
  readonly environmentId: string;
};

export function readWorkspaceFilesScope(): WorkspaceFilesScope {
  const { tenantId, projectId, environmentId } = readGrantedWorkspaceScope();
  return { tenantId, projectId, environmentId };
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
