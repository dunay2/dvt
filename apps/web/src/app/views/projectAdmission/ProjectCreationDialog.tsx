/** Owned concern: present governed project creation as an accessible modal surface. */
import type { RefObject } from 'react';

import { useWorkspaceScopeSelection } from '../../services/AppServicesContext';
import { activateProjectWorkspace } from '../../services/projectOnboarding/activateProjectWorkspace';
import type {
  CreateProjectResponse,
  ProjectOnboardingService,
} from '../../services/projectOnboarding/projectOnboardingService';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { ProjectCreationForm, useProjectAdmissionController } from './ProjectCreationForm';

type ProjectCreationDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: ProjectOnboardingService;
  activateCreatedProject?: (response: CreateProjectResponse) => Promise<void>;
  returnFocusRef?: RefObject<HTMLElement>;
}>;

export function ProjectCreationDialog({
  open,
  onOpenChange,
  service,
  activateCreatedProject,
  returnFocusRef,
}: ProjectCreationDialogProps): JSX.Element {
  const workspaceScopeSelection = useWorkspaceScopeSelection();
  const controller = useProjectAdmissionController({
    service,
    onProjectCreated: async (response) => {
      if (activateCreatedProject) {
        await activateCreatedProject(response);
      } else {
        await activateProjectWorkspace(response.defaultWorkspace, { workspaceScopeSelection });
      }
      onOpenChange(false);
    },
  });
  const { copy } = controller;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
        closeLabel={copy.closeProjectDialogLabel}
        data-slot="project-creation-dialog"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef?.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{copy.newProjectDialogTitle}</DialogTitle>
          <DialogDescription>{copy.newProjectDialogDescription}</DialogDescription>
        </DialogHeader>
        <ProjectCreationForm
          autoFocusProjectName
          controller={controller}
          dataSlot="project-creation-form"
          leadingAction={
            <DialogClose asChild>
              <button
                className="inline-flex h-9 items-center justify-center rounded-md border border-(--border-default) px-3 text-sm font-semibold text-(--text-default) hover:bg-(--surface-elevated) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
                type="button"
              >
                {copy.cancelActionLabel}
              </button>
            </DialogClose>
          }
          showCatalogStatus
          showTitle={false}
        />
      </DialogContent>
    </Dialog>
  );
}
