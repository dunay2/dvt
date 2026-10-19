/** Owned concern: activate a created project only after server-granted context refresh. */
import {
  WORKSPACE_SCOPE_SELECTION_STATUS,
  type WorkspaceScopeIdentity,
  type WorkspaceScopeSelectionPort,
} from '../../ports/workspaceScopeSelection';
import { createApiClient, type ApiClient } from '../api/createApiClient';
import { resolveProtectedRouteSessionContext } from '../session/protectedRouteSessionContext';
import type { SessionContextPublication } from '../session/sessionContextPublication';
import { createWorkspaceScopeSelectionPort } from '../session/workspaceScopeSelectionPort';

type ActivateProjectWorkspaceDependencies = Readonly<{
  apiClient?: Pick<ApiClient, 'getJson'>;
  resolveSessionContext?: typeof resolveProtectedRouteSessionContext;
  workspaceScopeSelection?: WorkspaceScopeSelectionPort;
  signal?: AbortSignal;
}>;

export async function activateProjectWorkspace(
  workspace: WorkspaceScopeIdentity,
  dependencies: ActivateProjectWorkspaceDependencies = {}
): Promise<SessionContextPublication> {
  const apiClient = dependencies.apiClient ?? createApiClient();
  const resolveSessionContext =
    dependencies.resolveSessionContext ?? resolveProtectedRouteSessionContext;
  const workspaceScopeSelection =
    dependencies.workspaceScopeSelection ?? createWorkspaceScopeSelectionPort();

  const publication = await resolveSessionContext(apiClient, { signal: dependencies.signal });
  publication.assertCurrent();
  const result = workspaceScopeSelection.selectWorkspaceScope(workspace);
  publication.assertCurrent();
  if (result.status !== WORKSPACE_SCOPE_SELECTION_STATUS.selected) {
    throw new Error(result.reason);
  }
  return publication;
}
