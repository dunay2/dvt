/** Owned concern: present governed project creation as an accessible modal surface. */
import { FolderPlus } from 'lucide-react';
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
  DialogFooter,
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
        <DialogHeader className="flex-row items-start gap-3 border-b border-(--border-muted) px-6 py-5 pr-14 text-left">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-md border border-(--border-default) bg-(--surface-elevated) text-primary"
            data-slot="project-creation-icon"
          >
            <FolderPlus className="size-5" />
          </span>
          <div className="grid min-w-0 gap-1">
            <DialogTitle className="leading-6 text-(--text-strong)">
              {copy.newProjectDialogTitle}
            </DialogTitle>
            <DialogDescription className="leading-5 text-(--text-muted)">
              {copy.newProjectDialogDescription}
            </DialogDescription>
          </div>
        </DialogHeader>
        <ProjectCreationForm
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
          renderActions={(actions) => (
            <DialogFooter className="border-t border-(--border-muted) bg-(--surface-panel-subtle) px-6 py-4">
              {actions}
            </DialogFooter>
          )}
          showCatalogStatus
          showProjectNameHelp
          showTitle={false}
        />
      </DialogContent>
    </Dialog>
  );
}
