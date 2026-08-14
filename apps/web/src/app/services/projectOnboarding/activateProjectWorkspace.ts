/** Owned concern: activate a created project only after server-granted context refresh. */
import {
  WORKSPACE_SCOPE_SELECTION_STATUS,
  type WorkspaceScopeIdentity,
  type WorkspaceScopeSelectionPort,
} from '../../ports/workspaceScopeSelection';
import { createApiClient, type ApiClient } from '../api/createApiClient';
import { resolveProtectedRouteSessionContext } from '../session/protectedRouteSessionContext';
import { createWorkspaceScopeSelectionPort } from '../session/workspaceScopeSelectionPort';

type ActivateProjectWorkspaceDependencies = Readonly<{
  apiClient?: Pick<ApiClient, 'getJson'>;
  resolveSessionContext?: typeof resolveProtectedRouteSessionContext;
  workspaceScopeSelection?: WorkspaceScopeSelectionPort;
}>;

export async function activateProjectWorkspace(
  workspace: WorkspaceScopeIdentity,
  dependencies: ActivateProjectWorkspaceDependencies = {}
): Promise<void> {
  const apiClient = dependencies.apiClient ?? createApiClient();
  const resolveSessionContext =
    dependencies.resolveSessionContext ?? resolveProtectedRouteSessionContext;
  const workspaceScopeSelection =
    dependencies.workspaceScopeSelection ?? createWorkspaceScopeSelectionPort();

  await resolveSessionContext(apiClient);
  const result = workspaceScopeSelection.selectWorkspaceScope(workspace);
  if (result.status !== WORKSPACE_SCOPE_SELECTION_STATUS.selected) {
    throw new Error(result.reason);
  }
}
