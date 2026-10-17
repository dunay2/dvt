/** Owned concern: present governed project creation as an accessible modal surface. */
import { FolderPlus } from 'lucide-react';
import type { RefObject } from 'react';

import { useWorkspaceScopeSelection } from '../../services/AppServicesContext';
import { activateProjectWorkspace } from '../../services/projectOnboarding/activateProjectWorkspace';
import type { ProjectOnboardingService } from '../../services/projectOnboarding/projectOnboardingService';
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
import { ProjectCreationForm } from './ProjectCreationForm';
import {
  useProjectAdmissionController,
  type ProjectAdmissionCallbacks,
} from './useProjectAdmissionController';
import styles from './ProjectCreationDialog.module.css';

type ProjectCreationDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: ProjectOnboardingService;
  activateCreatedProject?: ProjectAdmissionCallbacks['onProjectCreated'];
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
    active: open,
    onProjectCreated: async (response, signal) => {
      if (activateCreatedProject) {
        await activateCreatedProject(response, signal);
      } else {
        const publication = await activateProjectWorkspace(response.defaultWorkspace, {
          workspaceScopeSelection,
          signal,
        });
        publication.assertCurrent();
      }
      if (!signal.aborted) onOpenChange(false);
    },
  });
  const { copy } = controller;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={styles.content}
        closeLabel={copy.closeProjectDialogLabel}
        data-slot="project-creation-dialog"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef?.current?.focus();
        }}
      >
        <DialogHeader className={styles.header}>
          <span aria-hidden="true" className={styles.iconFrame} data-slot="project-creation-icon">
            <FolderPlus className={styles.icon} />
          </span>
          <div className={styles.heading}>
            <DialogTitle className={styles.title}>{copy.newProjectDialogTitle}</DialogTitle>
            <DialogDescription className={styles.description}>
              {copy.newProjectDialogDescription}
            </DialogDescription>
          </div>
        </DialogHeader>
        <ProjectCreationForm
          autoFocusProjectName
          className={styles.form}
          contentClassName={styles.fields}
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
            <DialogFooter className={styles.footer}>{actions}</DialogFooter>
          )}
          showCatalogStatus
          showProjectNameHelp
          showTitle={false}
        />
      </DialogContent>
    </Dialog>
  );
}
