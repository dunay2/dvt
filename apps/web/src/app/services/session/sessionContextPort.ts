import type { SessionContextPort, WorkspaceScope } from '../../ports/sessionContext';
import { useSessionStore, type SessionState } from '../../stores/sessionStore';

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
    getWorkspaceScope: () => readWorkspaceScope(useSessionStore.getState()),
    getWorkspaceScopeSnapshot: () => {
      const nextWorkspaceScope = readWorkspaceScope(useSessionStore.getState());
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
    buildRunContext: (runId) => useSessionStore.getState().buildRunContext(runId),
  };
}
