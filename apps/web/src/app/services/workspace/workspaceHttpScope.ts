/** Owned concern: project the granted session identity onto Workspace HTTP requests. */
import type { WorkspaceScopeIdentity } from '../../ports/workspaceScopeSelection';
import { readGrantedWorkspaceScope } from '../session/workspaceScopeSelectionPort';

export type WorkspaceHttpScope = Pick<
  WorkspaceScopeIdentity,
  'tenantId' | 'projectId' | 'environmentId'
>;

export function readGrantedWorkspaceHttpScope(): WorkspaceHttpScope {
  const { tenantId, projectId, environmentId } = readGrantedWorkspaceScope();
  return { tenantId, projectId, environmentId };
}
