/** Owned concern: centralize scoped workspace diff-change HTTP endpoints. */
import { useSessionStore } from '../../stores/sessionStore';

export const WORKSPACE_DIFF_CHANGES_ENDPOINT = '/workspace/diff/changes';

export type WorkspaceDiffChangesScope = {
  readonly tenantId: string;
  readonly projectId: string;
  readonly environmentId: string;
};

export function readWorkspaceDiffChangesScope(): WorkspaceDiffChangesScope {
  const { tenantId, projectId, environmentId } = useSessionStore.getState();
  return { tenantId, projectId, environmentId };
}

export function buildWorkspaceDiffChangesEndpoint(scope: WorkspaceDiffChangesScope): string {
  return `${WORKSPACE_DIFF_CHANGES_ENDPOINT}?${new URLSearchParams(scope).toString()}`;
}
