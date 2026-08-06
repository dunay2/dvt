/** Owned concern: first-use project onboarding surface for authenticated users without workspace context. */
import { FolderKanban, FolderOpen, FolderPlus, LoaderCircle, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import {
  createProjectOnboardingService,
  type CreateProjectResponse,
  type EffectiveProjectWorkspaceContext,
  type ProjectDescriptor,
  type ProjectOnboardingCatalog,
  type ProjectOnboardingService,
} from '../services/projectOnboarding/projectOnboardingService';
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';
import { resolveProjectOnboardingCopy } from './projectOnboardingCopy';

type ProjectOnboardingViewProps = {
  readonly service?: ProjectOnboardingService;
  readonly onProjectCreated: (response: CreateProjectResponse) => Promise<void> | void;
  readonly onProjectSelected?: (
    selection: EffectiveProjectWorkspaceContext
  ) => Promise<void> | void;
};

type CatalogState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly catalog: ProjectOnboardingCatalog }
  | { readonly kind: 'failed'; readonly message: string };

type SubmissionState = 'idle' | 'submitting';

function readableErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return fallback;
}

function resolveInitialTenantId(catalog: ProjectOnboardingCatalog): string {
  return (
    catalog.tenants.find((tenant) => tenant.canCreateProject)?.tenantId ??
    catalog.tenants[0]?.tenantId ??
    ''
  );
}

function resolveDefaultEnvironment(project: ProjectDescriptor): string {
  return project.environmentIds[0] ?? 'dev';
}

function resolveTenantDisplayName(tenant: ProjectOnboardingCatalog['tenants'][number]): string {
  return tenant.displayName ?? tenant.tenantId;
}

export default function ProjectOnboardingView({
  service,
  onProjectCreated,
  onProjectSelected,
}: ProjectOnboardingViewProps): JSX.Element {
  const projectOnboardingService = useMemo(
    () => service ?? createProjectOnboardingService(),
    [service]
  );
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveProjectOnboardingCopy(language);
  const [catalogState, setCatalogState] = useState<CatalogState>({ kind: 'loading' });
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCatalogState({ kind: 'loading' });
    setFormError(null);

    projectOnboardingService
      .listProjects()
      .then((catalog) => {
        if (cancelled) {
          return;
        }

        setCatalogState({ kind: 'ready', catalog });
        setSelectedTenantId(resolveInitialTenantId(catalog));
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setCatalogState({
            kind: 'failed',
            message: readableErrorMessage(error, copy.failureMessage),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [copy.failureMessage, projectOnboardingService]);

  async function handleCreateProject(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmedName = projectName.trim();
    if (
      catalogState.kind !== 'ready' ||
      trimmedName.length === 0 ||
      selectedTenantId.length === 0
    ) {
      return;
    }

    setSubmissionState('submitting');
    setFormError(null);
    try {
      const response = await projectOnboardingService.createProject({
        tenantId: selectedTenantId,
        name: trimmedName,
      });
      await onProjectCreated(response);
    } catch (error) {
      setFormError(readableErrorMessage(error, copy.failureMessage));
    } finally {
      setSubmissionState('idle');
    }
  }

  async function handleProjectSelected(project: ProjectDescriptor): Promise<void> {
    if (!onProjectSelected) {
      return;
    }

    setFormError(null);
    setSubmissionState('submitting');
    try {
      await onProjectSelected({
        tenantId: project.tenantId,
        projectId: project.projectId,
        environmentId: resolveDefaultEnvironment(project),
      });
    } catch (error) {
      setFormError(readableErrorMessage(error, copy.failureMessage));
    } finally {
      setSubmissionState('idle');
    }
  }

  const catalog = catalogState.kind === 'ready' ? catalogState.catalog : null;
  const selectedTenant = catalog?.tenants.find((tenant) => tenant.tenantId === selectedTenantId);
  const canCreateProject = selectedTenant?.canCreateProject === true;
  const canSubmit =
    catalogState.kind === 'ready' &&
    canCreateProject &&
    projectName.trim().length > 0 &&
    submissionState === 'idle';

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
                  setCatalogState({ kind: 'loading' });
                  setFormError(null);
                  void projectOnboardingService
                    .listProjects()
                    .then((nextCatalog) => {
                      setCatalogState({ kind: 'ready', catalog: nextCatalog });
                      setSelectedTenantId(resolveInitialTenantId(nextCatalog));
                    })
                    .catch((error: unknown) => {
                      setCatalogState({
                        kind: 'failed',
                        message: readableErrorMessage(error, copy.failureMessage),
                      });
                    });
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
                      onClick={() => void handleProjectSelected(project)}
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

          <form
            className="space-y-4 rounded-md border border-(--border-default) bg-(--surface-panel) p-4"
            data-slot="project-onboarding-form"
            onSubmit={(event) => void handleCreateProject(event)}
          >
            <h2 className="text-sm font-semibold text-(--text-strong)">
              {copy.createProjectTitle}
            </h2>
            {catalogState.kind === 'ready' ? (
              <>
                <label className="block space-y-1.5 text-sm font-medium text-(--text-default)">
                  <span>{copy.tenantLabel}</span>
                  <select
                    className="h-9 w-full rounded-md border border-(--border-default) bg-(--surface-route) px-3 text-sm text-(--text-default) outline-none focus:border-(--focus-ring)"
                    name="tenantId"
                    onChange={(event) => setSelectedTenantId(event.target.value)}
                    value={selectedTenantId}
                  >
                    {catalogState.catalog.tenants.map((tenant) => (
                      <option key={tenant.tenantId} value={tenant.tenantId}>
                        {resolveTenantDisplayName(tenant)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1.5 text-sm font-medium text-(--text-default)">
                  <span>{copy.projectNameLabel}</span>
                  <input
                    className="h-9 w-full rounded-md border border-(--border-default) bg-(--surface-route) px-3 text-sm text-(--text-default) outline-none placeholder:text-(--text-disabled) focus:border-(--focus-ring)"
                    name="projectName"
                    onChange={(event) => setProjectName(event.target.value)}
                    placeholder={copy.projectNamePlaceholder}
                    value={projectName}
                  />
                </label>
                {!canCreateProject ? (
                  <div
                    className="rounded-md border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100"
                    role="alert"
                  >
                    {copy.creationUnavailableMessage}
                  </div>
                ) : null}
                {formError ? (
                  <div
                    className="rounded-md border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-100"
                    role="alert"
                  >
                    {formError}
                  </div>
                ) : null}
                <button
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-(--border-strong) bg-(--surface-selected) px-3 text-sm font-semibold text-(--text-strong) transition hover:bg-(--surface-elevated) focus-visible:outline-2 focus-visible:outline-(--focus-ring) disabled:cursor-not-allowed disabled:text-(--text-disabled)"
                  disabled={!canSubmit}
                  type="submit"
                >
                  {submissionState === 'submitting' ? (
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <FolderPlus className="size-4" aria-hidden="true" />
                  )}
                  {copy.createProjectLabel}
                </button>
              </>
            ) : null}
          </form>
        </section>
      </div>
    </main>
  );
}
