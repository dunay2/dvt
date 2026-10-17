/** Owned concern: first-use project onboarding surface for authenticated users without workspace context. */
import { FolderKanban, FolderOpen, LoaderCircle, RefreshCw } from 'lucide-react';

import type { ProjectOnboardingService } from '../services/projectOnboarding/projectOnboardingService';
import { ProjectCreationForm } from './projectAdmission/ProjectCreationForm';
import {
  useProjectAdmissionController,
  type ProjectAdmissionCallbacks,
} from './projectAdmission/useProjectAdmissionController';
import styles from './ProjectOnboardingView.module.css';
import formStyles from './projectAdmission/ProjectCreationForm.module.css';

type ProjectOnboardingViewProps = ProjectAdmissionCallbacks & {
  readonly service?: ProjectOnboardingService;
};

export default function ProjectOnboardingView({
  service,
  onProjectCreated,
  onProjectSelected,
}: ProjectOnboardingViewProps): JSX.Element {
  const controller = useProjectAdmissionController({
    service,
    onProjectCreated,
    onProjectSelected,
  });
  const { catalog, catalogState, copy, submissionState } = controller;

  return (
    <main data-slot="project-onboarding-root" className={styles.root}>
      <div className={styles.layout}>
        <header className={styles.header}>
          <div className={styles.eyebrow}>
            <FolderKanban className={formStyles.icon} aria-hidden="true" />
            <span className={styles.label}>{copy.workspaceLabel}</span>
          </div>
          <h1 data-slot="project-onboarding-title" className={styles.title}>
            {copy.title}
          </h1>
          <p className={styles.description}>{copy.description}</p>
        </header>

        <section className={styles.columns}>
          <section className={styles.catalog}>
            <div className={styles.catalogHeader}>
              <h2 className={formStyles.title}>{copy.availableProjectsTitle}</h2>
              <button
                className={styles.refresh}
                onClick={() => {
                  void controller.refreshCatalog();
                }}
                type="button"
              >
                <RefreshCw className={styles.refreshIcon} aria-hidden="true" />
                {copy.refreshProjectsLabel}
              </button>
            </div>

            {catalogState.kind === 'loading' ? (
              <div className={formStyles.status} role="status">
                <LoaderCircle className={formStyles.spinner} aria-hidden="true" />
                {copy.loadingMessage}
              </div>
            ) : null}
            {catalogState.kind === 'failed' ? (
              <div className={formStyles.error} role="alert">
                {catalogState.message}
              </div>
            ) : null}
            {catalog?.projects.length ? (
              <ul className={styles.projectList}>
                {catalog.projects.map((project) => (
                  <li className={styles.project} key={`${project.tenantId}:${project.projectId}`}>
                    <div className={styles.projectIdentity}>
                      <p className={styles.projectName}>{project.name}</p>
                      <p className={styles.projectId}>{project.projectId}</p>
                    </div>
                    <button
                      className={styles.openProject}
                      disabled={!onProjectSelected || submissionState === 'submitting'}
                      onClick={() => void controller.selectProject(project)}
                      type="button"
                    >
                      <FolderOpen className={styles.refreshIcon} aria-hidden="true" />
                      {copy.openProjectLabel}
                    </button>
                  </li>
                ))}
              </ul>
            ) : catalogState.kind === 'ready' ? (
              <p className={styles.empty}>{copy.noProjectsMessage}</p>
            ) : null}
          </section>

          <ProjectCreationForm className={styles.creation} controller={controller} />
        </section>
      </div>
    </main>
  );
}
