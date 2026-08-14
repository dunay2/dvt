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
import { Button } from '../../components/ui/button';
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
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto border-(--border-default) bg-(--surface-panel) p-0 text-(--text-default) sm:max-w-md"
        closeLabel={copy.closeProjectDialogLabel}
        data-slot="project-creation-dialog"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef?.current?.focus();
        }}
      >
        <DialogHeader className="border-b border-(--border-muted) px-6 py-5 pr-14">
          <DialogTitle>{copy.newProjectDialogTitle}</DialogTitle>
          <DialogDescription className="sr-only">
            {copy.newProjectDialogDescription}
          </DialogDescription>
        </DialogHeader>
        <ProjectCreationForm
          actionsClassName="flex flex-wrap justify-end gap-2 border-t border-(--border-muted) bg-(--surface-panel-subtle) px-6 py-4"
          autoFocusProjectName
          className="grid gap-0"
          contentClassName="grid gap-4 px-6 py-5"
          controller={controller}
          dataSlot="project-creation-form"
          leadingAction={
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {copy.cancelActionLabel}
              </Button>
            </DialogClose>
          }
          showCatalogStatus
          showTitle={false}
        />
      </DialogContent>
    </Dialog>
  );
}
