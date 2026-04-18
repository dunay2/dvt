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
  useSessionStore.getState().setSessionContext({
    tenantId: nb(scope.tenantId),
    projectId: nb(scope.projectId),
    environmentId: nb(scope.environmentId),
  });
}

export function installWorkspaceScopeHarness(): void {
  let initialWorkspaceScope = readWorkspaceScopeSnapshot();

  beforeEach(() => {
    initialWorkspaceScope = readWorkspaceScopeSnapshot();
  });

  afterEach(() => {
    useSessionStore.getState().setSessionContext({
      tenantId: nb(initialWorkspaceScope.tenantId),
      projectId: nb(initialWorkspaceScope.projectId),
      environmentId: nb(initialWorkspaceScope.environmentId),
    });
  });
}
