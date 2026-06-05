import { asNonBlankString } from '@dvt/contracts';

import type { SessionContextPort, WorkspaceScope } from '../../ports/sessionContext';
import { useSessionStore, type SessionState } from '../../stores/sessionStore';
import { readGrantedWorkspaceScope } from './workspaceScopeSelectionPort';

function readWorkspaceScope(
  state: Pick<SessionState, 'tenantId' | 'projectId' | 'environmentId' | 'targetAdapter'>
): WorkspaceScope {
  const { tenantId, projectId, environmentId, targetAdapter } = state;
  return {
    tenantId,
    projectId,
    environmentId,
    targetAdapter,
  };
}

function areWorkspaceScopesEqual(left: WorkspaceScope, right: WorkspaceScope): boolean {
  return (
    left.tenantId === right.tenantId &&
    left.projectId === right.projectId &&
    left.environmentId === right.environmentId &&
    left.targetAdapter === right.targetAdapter
  );
}

export function createSessionContextPort(): SessionContextPort {
  let cachedWorkspaceScope = readWorkspaceScope(useSessionStore.getState());

  return {
    getWorkspaceScope: () => readGrantedWorkspaceScope(),
    getWorkspaceScopeSnapshot: () => {
      const nextWorkspaceScope = readGrantedWorkspaceScope();
      if (!areWorkspaceScopesEqual(cachedWorkspaceScope, nextWorkspaceScope)) {
        cachedWorkspaceScope = nextWorkspaceScope;
      }
      return cachedWorkspaceScope;
    },
    subscribeWorkspaceScope: (onStoreChange) => {
      let previousWorkspaceScope = readWorkspaceScope(useSessionStore.getState());
      cachedWorkspaceScope = previousWorkspaceScope;

      return useSessionStore.subscribe((state) => {
        const nextWorkspaceScope = readWorkspaceScope(state);
        if (areWorkspaceScopesEqual(previousWorkspaceScope, nextWorkspaceScope)) {
          return;
        }

        previousWorkspaceScope = nextWorkspaceScope;
        cachedWorkspaceScope = nextWorkspaceScope;
        onStoreChange();
      });
    },
    buildRunContext: (runId) => {
      const workspaceScope = readGrantedWorkspaceScope();
      return {
        tenantId: asNonBlankString(workspaceScope.tenantId),
        projectId: asNonBlankString(workspaceScope.projectId),
        environmentId: asNonBlankString(workspaceScope.environmentId),
        targetAdapter: workspaceScope.targetAdapter,
        runId: asNonBlankString(runId),
      };
    },
  };
}
