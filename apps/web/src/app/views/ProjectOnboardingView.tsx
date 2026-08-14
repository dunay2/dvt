/** Owned concern: first-use project onboarding surface for authenticated users without workspace context. */
import { FolderKanban, FolderOpen, LoaderCircle, RefreshCw } from 'lucide-react';

import {
  type CreateProjectResponse,
  type EffectiveProjectWorkspaceContext,
  type ProjectOnboardingService,
} from '../services/projectOnboarding/projectOnboardingService';
import {
  ProjectCreationForm,
  useProjectAdmissionController,
} from './projectAdmission/ProjectCreationForm';

type ProjectOnboardingViewProps = {
  readonly service?: ProjectOnboardingService;
  readonly onProjectCreated: (response: CreateProjectResponse) => Promise<void> | void;
  readonly onProjectSelected?: (
    selection: EffectiveProjectWorkspaceContext
  ) => Promise<void> | void;
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
    <main
      data-slot="project-onboarding-root"
      className="min-h-screen bg-(--surface-app) text-(--text-default)"
    >
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center gap-5 px-5 py-8 sm:px-8">
        <header className="space-y-2 border-b border-(--border-subtle) pb-5">
          <div className="flex items-center gap-2 text-(--text-muted)">
            <FolderKanban className="size-4" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              {copy.workspaceLabel}
            </span>
          </div>
          <h1
            data-slot="project-onboarding-title"
            className="text-xl font-semibold leading-7 text-(--text-strong)"
          >
            {copy.title}
          </h1>
          <p className="max-w-2xl text-sm leading-5 text-(--text-muted)">{copy.description}</p>
        </header>

        <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
          <section className="rounded-md border border-(--border-default) bg-(--surface-panel) p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-(--text-strong)">
                {copy.availableProjectsTitle}
              </h2>
              <button
                className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-(--border-default) px-2.5 text-xs text-(--text-muted) hover:bg-(--surface-elevated) hover:text-(--text-strong) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
                onClick={() => {
                  void controller.refreshCatalog();
                }}
                type="button"
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                {copy.refreshProjectsLabel}
              </button>
            </div>

            {catalogState.kind === 'loading' ? (
              <div className="flex items-center gap-2 text-sm text-(--text-muted)" role="status">
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                {copy.loadingMessage}
              </div>
            ) : null}
            {catalogState.kind === 'failed' ? (
              <div
                className="rounded-md border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-100"
                role="alert"
              >
                {catalogState.message}
              </div>
            ) : null}
            {catalog?.projects.length ? (
              <ul className="space-y-2">
                {catalog.projects.map((project) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-(--border-subtle) bg-(--surface-route) px-3 py-2.5"
                    key={`${project.tenantId}:${project.projectId}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-(--text-strong)">
                        {project.name}
                      </p>
                      <p className="truncate text-xs text-(--text-subtle)">{project.projectId}</p>
                    </div>
                    <button
                      className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-(--border-default) px-2.5 text-xs text-(--text-default) hover:bg-(--surface-elevated) focus-visible:outline-2 focus-visible:outline-(--focus-ring) disabled:cursor-not-allowed disabled:text-(--text-disabled)"
                      disabled={!onProjectSelected || submissionState === 'submitting'}
                      onClick={() => void controller.selectProject(project)}
                      type="button"
                    >
                      <FolderOpen className="size-3.5" aria-hidden="true" />
                      {copy.openProjectLabel}
                    </button>
                  </li>
                ))}
              </ul>
            ) : catalogState.kind === 'ready' ? (
              <p className="text-sm leading-5 text-(--text-muted)">{copy.noProjectsMessage}</p>
            ) : null}
          </section>

          <ProjectCreationForm
            className="space-y-4 rounded-md border border-(--border-default) bg-(--surface-panel) p-4"
            controller={controller}
          />
        </section>
      </div>
    </main>
  );
}
