/**
 * Owned concern: coordinate the single project context and configuration entry in the shell rail.
 * @baseline GH-3765: File duplicated Code navigation and split project actions from context.
 * @decision Compose existing scope, creation and snapshot owners with one focus lifecycle.
 * @consequence The shell neither grants permissions nor owns project persistence.
 * @version 1.1.0
 */
import { useRef, useState } from 'react';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { ProjectCreationDialog } from '../../views/projectAdmission/ProjectCreationDialog';
import { resolveProjectOnboardingCopy } from '../../views/projectOnboardingCopy';
import type { ShellTopBarCopy } from './copy';
import { ShellProjectMenuTemplate } from './ShellProjectMenu.template';
import { useShellProjectIdentity } from './useShellProjectIdentity';

export function ShellProjectMenu({ copy }: Readonly<{ copy: ShellTopBarCopy }>) {
  const [open, setOpen] = useState(false);
  const [projectCreationOpen, setProjectCreationOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const transferFocusRef = useRef(false);
  const { badge, gitBranch, gitSha } = useShellProjectIdentity();
  const language = useApplicationLanguageStore((state) => state.language);
  const projectCopy = resolveProjectOnboardingCopy(language);
  return (
    <>
      <ShellProjectMenuTemplate
        copy={copy}
        badge={badge}
        gitBranch={gitBranch}
        gitSha={gitSha}
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
