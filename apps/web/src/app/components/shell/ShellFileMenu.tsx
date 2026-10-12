/**
 * Owned concern: coordinate File commands and transfer focus to their existing receivers.
 * @baseline GH-3622: File reuses project creation and the active Canvas contribution.
 * @decision Keep dialog lifecycle here and passive menu markup in the template.
 * @consequence No second project/file command rail or store; dialog close returns focus to File.
 * @version 1.0.0
 */
import { useRef, useState } from 'react';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { ProjectCreationDialog } from '../../views/projectAdmission/ProjectCreationDialog';
import { resolveProjectOnboardingCopy } from '../../views/projectOnboardingCopy';
import type { ShellTopBarCopy } from './copy';
import { ShellFileMenuTemplate } from './ShellMenu.templates';

export function ShellFileMenu({ copy }: Readonly<{ copy: ShellTopBarCopy }>) {
  const [open, setOpen] = useState(false);
  const [projectCreationOpen, setProjectCreationOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const transferFocusRef = useRef(false);
  const language = useApplicationLanguageStore((state) => state.language);
  const projectCopy = resolveProjectOnboardingCopy(language);
  function transferFocus() {
    transferFocusRef.current = true;
    setOpen(false);
  }
  return (
    <>
      <ShellFileMenuTemplate
        open={open}
        onOpenChange={setOpen}
        copy={copy}
        newProjectLabel={projectCopy.newProjectActionLabel}
        triggerRef={triggerRef}
        onNewProject={() => {
          transferFocus();
          setProjectCreationOpen(true);
        }}
        onProjectCodeSelected={transferFocus}
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
