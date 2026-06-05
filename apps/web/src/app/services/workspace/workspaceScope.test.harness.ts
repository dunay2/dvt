import { afterEach, beforeEach } from 'vitest';

import { useSessionStore } from '../../stores/sessionStore';
import { nb } from '../../testing/contractTestUtils';

export type WorkspaceScope = {
  tenantId: string;
  projectId: string;
  environmentId: string;
};

export function buildWorkspaceScope(overrides: Partial<WorkspaceScope> = {}): WorkspaceScope {
  return {
    tenantId: 'tenant-a',
    projectId: 'project-a',
    environmentId: 'env-a',
    ...overrides,
  };
}

function readWorkspaceScopeSnapshot(): WorkspaceScope {
  const { tenantId, projectId, environmentId } = useSessionStore.getState();
  return {
    tenantId,
    projectId,
    environmentId,
  };
}

export function setWorkspaceScope(scope: WorkspaceScope): void {
  const selectedScope = {
    tenantId: nb(scope.tenantId),
    projectId: nb(scope.projectId),
    environmentId: nb(scope.environmentId),
  };
  useSessionStore.getState().setWorkspaceScopeSelectionContext({
    selectedScope,
    availableWorkspaces: [selectedScope],
  });
}

export function clearGrantedWorkspaceScope(): void {
  useSessionStore.setState({
    availableWorkspaces: [],
    workspaceScopeSelectionStatus: 'unresolved',
    workspaceScopeSelectionRejectionReason: undefined,
    rejectedWorkspaceScope: undefined,
  });
}

export function installWorkspaceScopeHarness(): void {
  let initialWorkspaceScope = readWorkspaceScopeSnapshot();
  let initialAvailableWorkspaces = useSessionStore.getState().availableWorkspaces;
  let initialSelectionStatus = useSessionStore.getState().workspaceScopeSelectionStatus;
  let initialRejectionReason = useSessionStore.getState().workspaceScopeSelectionRejectionReason;
  let initialRejectedWorkspaceScope = useSessionStore.getState().rejectedWorkspaceScope;

  beforeEach(() => {
    initialWorkspaceScope = readWorkspaceScopeSnapshot();
    initialAvailableWorkspaces = useSessionStore.getState().availableWorkspaces;
    initialSelectionStatus = useSessionStore.getState().workspaceScopeSelectionStatus;
    initialRejectionReason = useSessionStore.getState().workspaceScopeSelectionRejectionReason;
    initialRejectedWorkspaceScope = useSessionStore.getState().rejectedWorkspaceScope;
  });

  afterEach(() => {
    useSessionStore.setState({
      tenantId: nb(initialWorkspaceScope.tenantId),
      projectId: nb(initialWorkspaceScope.projectId),
      environmentId: nb(initialWorkspaceScope.environmentId),
      availableWorkspaces: initialAvailableWorkspaces,
      workspaceScopeSelectionStatus: initialSelectionStatus,
      workspaceScopeSelectionRejectionReason: initialRejectionReason,
      rejectedWorkspaceScope: initialRejectedWorkspaceScope,
    });
  });
}
