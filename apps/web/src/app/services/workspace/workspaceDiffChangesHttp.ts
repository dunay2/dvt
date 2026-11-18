/** Owned concern: centralize scoped workspace diff-change HTTP endpoints. */
import { readGrantedWorkspaceHttpScope, type WorkspaceHttpScope } from './workspaceHttpScope';

export const WORKSPACE_DIFF_CHANGES_ENDPOINT = '/workspace/diff/changes';

export type WorkspaceDiffChangesScope = WorkspaceHttpScope;

export function readWorkspaceDiffChangesScope(): WorkspaceDiffChangesScope {
  return readGrantedWorkspaceHttpScope();
}

export function buildWorkspaceDiffChangesEndpoint(scope: WorkspaceDiffChangesScope): string {
  return `${WORKSPACE_DIFF_CHANGES_ENDPOINT}?${new URLSearchParams(scope).toString()}`;
}
