/**
 * Owned concern: bind the existing workspace identity projection to the active session.
 * @baseline GH-3765: header identity and project properties share the same context.
 * @decision Read granted names and bootstrap labels through one shell query binding.
 * @consequence Neither consumer owns scope selection or creates a second session store.
 * @version 1.0.0
 */
import { resolveWorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import { buildProjectIdentityBadge } from '../../shell/projectIdentityBadge';
import { useSessionStore } from '../../stores/sessionStore';

const workspaceBootstrap = resolveWorkspaceBootstrapConfig();

export function useShellProjectIdentity() {
  const selectedTenant = useSessionStore((state) => state.tenantId);
  const selectedProject = useSessionStore((state) => state.projectId);
  const selectedEnvironment = useSessionStore((state) => state.environmentId);
  const targetAdapter = useSessionStore((state) => state.targetAdapter);
  const selectedProjectName = useSessionStore(
    (state) =>
      state.availableWorkspaces.find(
        (workspace) =>
          workspace.tenantId === state.tenantId &&
          workspace.projectId === state.projectId &&
          workspace.environmentId === state.environmentId
      )?.projectName
  );

  return {
    badge: buildProjectIdentityBadge({
      workspaceBootstrap,
      selectedTenant,
      selectedProject,
      selectedProjectName,
      selectedEnvironment,
      targetAdapter,
    }),
    gitBranch: workspaceBootstrap.gitBranch,
    gitSha: workspaceBootstrap.gitSha,
  };
}
