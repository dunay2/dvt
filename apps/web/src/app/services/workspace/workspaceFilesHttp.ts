/** Owned concern: centralize scoped workspace-file HTTP endpoints and reason tokens. */
import { useSessionStore } from '../../stores/sessionStore';

export const WORKSPACE_FILES_ENDPOINT = '/workspace/files';

export const WORKSPACE_FILES_HTTP_ERROR_REASON = Object.freeze({
  fileNotFound: 'workspace_file_not_found',
  invalidPath: 'invalid_workspace_path',
} as const);

export type WorkspaceFilesScope = {
  readonly tenantId: string;
  readonly projectId: string;
  readonly environmentId: string;
};

export function readWorkspaceFilesScope(): WorkspaceFilesScope {
  const { tenantId, projectId, environmentId } = useSessionStore.getState();
  return { tenantId, projectId, environmentId };
}

export function buildWorkspaceFilesEndpoint(scope: WorkspaceFilesScope): string {
  return `${WORKSPACE_FILES_ENDPOINT}?${new URLSearchParams(scope).toString()}`;
}

export function buildWorkspaceFileContentEndpoint(
  path: string,
  scope: WorkspaceFilesScope
): string {
  return `${WORKSPACE_FILES_ENDPOINT}/${encodeURIComponent(path)}?${new URLSearchParams(
    scope
  ).toString()}`;
}
