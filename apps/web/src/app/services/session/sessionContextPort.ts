import type { SessionContextPort } from '../../ports/sessionContext';
import { useSessionStore } from '../../stores/sessionStore';

export function createSessionContextPort(): SessionContextPort {
  return {
    getWorkspaceScope: () => {
      const { tenantId, projectId, environmentId, targetAdapter } = useSessionStore.getState();
      return {
        tenantId,
        projectId,
        environmentId,
        targetAdapter,
      };
    },
    buildRunContext: (runId) => useSessionStore.getState().buildRunContext(runId),
  };
}
