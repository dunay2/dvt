/**
 * Owned concern: coordinate the single project context and configuration entry in the shell rail.
 * @baseline GH-3765: File duplicated Code navigation and split project actions from context.
 * @decision Compose existing scope, creation and snapshot owners with one focus lifecycle.
 * @consequence The shell neither grants permissions nor owns project persistence.
 * @version 1.1.0
 */
import { useRef, useState } from 'react';
import { resolveWorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import { buildProjectIdentityBadge } from '../../shell/projectIdentityBadge';
import { useSessionStore } from '../../stores/sessionStore';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { ProjectCreationDialog } from '../../views/projectAdmission/ProjectCreationDialog';
import { resolveProjectOnboardingCopy } from '../../views/projectOnboardingCopy';
import type { ShellTopBarCopy } from './copy';
import { ShellProjectMenuTemplate } from './ShellMenu.templates';

const workspaceBootstrap = resolveWorkspaceBootstrapConfig();

export function ShellProjectMenu({ copy }: Readonly<{ copy: ShellTopBarCopy }>) {
  const [open, setOpen] = useState(false);
  const [projectCreationOpen, setProjectCreationOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const transferFocusRef = useRef(false);
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
  const language = useApplicationLanguageStore((state) => state.language);
  const projectCopy = resolveProjectOnboardingCopy(language);
  const badge = buildProjectIdentityBadge({
    workspaceBootstrap,
    selectedTenant,
    selectedProject,
    selectedProjectName,
    selectedEnvironment,
    targetAdapter,
  });
  return (
    <>
      <ShellProjectMenuTemplate
        copy={copy}
        badge={badge}
        gitBranch={workspaceBootstrap.gitBranch}
        gitSha={workspaceBootstrap.gitSha}
        open={open}
        onOpenChange={setOpen}
        triggerRef={triggerRef}
        onScopeSelected={() => setOpen(false)}
        newProjectLabel={projectCopy.newProjectActionLabel}
        onNewProject={() => {
          transferFocusRef.current = true;
          setOpen(false);
          setProjectCreationOpen(true);
        }}
        onSnapshotFileSelected={() => setOpen(false)}
        onCloseAutoFocus={(event) => {
          if (!transferFocusRef.current) return;
          event.preventDefault();
          transferFocusRef.current = false;
        }}
      />
      {projectCreationOpen ? (
        <ProjectCreationDialog
          open={projectCreationOpen}
          onOpenChange={setProjectCreationOpen}
          returnFocusRef={triggerRef}
        />
      ) : null}
    </>
  );
}
