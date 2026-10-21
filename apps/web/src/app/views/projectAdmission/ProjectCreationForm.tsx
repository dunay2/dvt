/** Owned concern: present project creation using its admission binding. */
import { FolderPlus, LoaderCircle } from 'lucide-react';
import { useId, type ReactNode } from 'react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import type { ProjectOnboardingCopy } from '../projectOnboardingCopy';
import type { ProjectAdmissionBinding } from './useProjectAdmissionController';
import styles from './ProjectCreationForm.module.css';

type ProjectCreationFormProps = Readonly<{
  controller: Omit<ProjectAdmissionBinding, 'catalog' | 'refreshCatalog' | 'selectProject'>;
  copy?: ProjectOnboardingCopy;
  className?: string;
  contentClassName?: string;
  dataSlot?: string;
  showCatalogStatus?: boolean;
  showProjectNameHelp?: boolean;
  showTitle?: boolean;
  autoFocusProjectName?: boolean;
  leadingAction?: ReactNode;
  renderActions?: (actions: ReactNode) => ReactNode;
}>;

export function ProjectCreationForm({
  controller,
  copy = controller.copy,
  className,
  contentClassName = styles.fields,
  dataSlot = 'project-onboarding-form',
  showCatalogStatus = false,
  showProjectNameHelp = false,
  showTitle = true,
  autoFocusProjectName = false,
  leadingAction,
  renderActions,
}: ProjectCreationFormProps): JSX.Element {
  const projectNameHelpId = useId();
  const projectNameInputId = `${projectNameHelpId}-input`;
  const actions = (
    <>
      {leadingAction}
      <Button className={styles.submit} disabled={!controller.canSubmit} type="submit">
        {controller.submissionState === 'submitting' ? (
          <LoaderCircle className={styles.spinner} aria-hidden="true" />
        ) : (
          <FolderPlus className={styles.icon} aria-hidden="true" />
        )}
        {copy.createProjectLabel}
      </Button>
    </>
  );

  return (
    <form
      className={className}
      data-slot={dataSlot}
      onSubmit={(event) => void controller.createProject(event)}
    >
      <div className={contentClassName} data-slot="project-creation-fields">
        {showTitle ? <h2 className={styles.title}>{copy.createProjectTitle}</h2> : null}
        {showCatalogStatus && controller.catalogState.kind === 'loading' ? (
          <div className={styles.status} role="status">
            <LoaderCircle className={styles.spinner} aria-hidden="true" />
            {copy.loadingMessage}
          </div>
        ) : null}
        {showCatalogStatus && controller.catalogState.kind === 'failed' ? (
          <div className={styles.error} role="alert">
            {controller.catalogState.message}
          </div>
        ) : null}
        {controller.catalogState.kind === 'ready' ? (
          <>
            {controller.hasMultipleOrganizations ? (
              <Label className={styles.field}>
                <span>{copy.organizationLabel}</span>
                <select
                  className={styles.organization}
                  name="tenantId"
                  disabled={controller.submissionState !== 'idle'}
                  onChange={(event) => controller.setSelectedTenantId(event.target.value)}
                  value={controller.selectedTenantId}
                >
                  {controller.catalogState.catalog.tenants.map((tenant) => (
                    <option key={tenant.tenantId} value={tenant.tenantId}>
                      {tenant.tenantId}
                    </option>
                  ))}
                </select>
              </Label>
            ) : null}
            <div className={styles.field}>
              <Label htmlFor={projectNameInputId}>{copy.projectNameLabel}</Label>
              <Input
                aria-describedby={showProjectNameHelp ? projectNameHelpId : undefined}
                autoFocus={autoFocusProjectName}
                className={styles.input}
                id={projectNameInputId}
                name="projectName"
                disabled={controller.submissionState !== 'idle'}
                onChange={(event) => controller.setProjectName(event.target.value)}
                placeholder={copy.projectNamePlaceholder}
                value={controller.projectName}
              />
              {showProjectNameHelp ? (
                <span className={styles.help} data-slot="project-name-help" id={projectNameHelpId}>
                  {copy.projectNameHelpText}
                </span>
              ) : null}
            </div>
            {!controller.canCreateProject ? (
              <div className={styles.warning} role="alert">
                {copy.creationUnavailableMessage}
              </div>
            ) : null}
            {controller.formError ? (
              <div className={styles.error} role="alert">
                {controller.formError}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
      {controller.catalogState.kind === 'ready' ? (
        renderActions ? (
          renderActions(actions)
        ) : (
          <div className={styles.actions} data-slot="project-creation-actions">
            {actions}
          </div>
        )
      ) : null}
    </form>
  );
}
