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

function readableErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return 'Project onboarding failed.';
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
          setCatalogState({ kind: 'failed', message: readableErrorMessage(error) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectOnboardingService]);

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
      setFormError(readableErrorMessage(error));
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
      setFormError(readableErrorMessage(error));
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
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-6 px-6 py-10">
        <header className="space-y-3">
          <div className="flex items-center gap-3 text-cyan-300">
            <FolderKanban className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-semibold uppercase tracking-normal">Workspace</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-white">Create a project</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              Start from an empty governed project and open the Canvas with project-backed state.
            </p>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
          <form
            className="space-y-4 rounded-lg border border-slate-700 bg-slate-900/80 p-5"
            data-slot="project-onboarding-form"
            onSubmit={(event) => void handleCreateProject(event)}
          >
            {catalogState.kind === 'loading' ? (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading project access...
              </div>
            ) : null}

            {catalogState.kind === 'failed' ? (
              <div
                className="rounded-md border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-100"
                role="alert"
              >
                {catalogState.message}
              </div>
            ) : null}

            {catalogState.kind === 'ready' ? (
              <>
                <label className="block space-y-2 text-sm font-medium text-slate-200">
                  <span>Tenant</span>
                  <select
                    className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
                    name="tenantId"
                    onChange={(event) => {
                      setSelectedTenantId(event.target.value);
                    }}
                    value={selectedTenantId}
                  >
                    {catalogState.catalog.tenants.map((tenant) => (
                      <option key={tenant.tenantId} value={tenant.tenantId}>
                        {resolveTenantDisplayName(tenant)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2 text-sm font-medium text-slate-200">
                  <span>Project name</span>
                  <input
                    className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400"
                    name="projectName"
                    onChange={(event) => {
                      setProjectName(event.target.value);
                    }}
                    placeholder="Orders"
                    value={projectName}
                  />
                </label>

                {!canCreateProject ? (
                  <div
                    className="rounded-md border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100"
                    role="alert"
                  >
                    Project creation is not granted for this tenant.
                  </div>
                ) : null}

                {formError ? (
                  <div
                    className="rounded-md border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-100"
                    role="alert"
                  >
                    {formError}
                  </div>
                ) : null}

                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-cyan-400/50 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
                  disabled={!canSubmit}
                  title="Create project"
                  type="submit"
                >
                  {submissionState === 'submitting' ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <FolderPlus className="h-4 w-4" aria-hidden="true" />
                  )}
                  Create project
                </button>
              </>
            ) : null}
          </form>

          <aside className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-100">Projects</h2>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
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
                        message: readableErrorMessage(error),
                      });
                    });
                }}
                title="Refresh projects"
                type="button"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {catalog?.projects.length ? (
              <ul className="space-y-2">
                {catalog.projects.map((project) => (
                  <li
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2"
                    key={`${project.tenantId}:${project.projectId}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">{project.name}</p>
                      <p className="truncate text-xs text-slate-400">{project.projectId}</p>
                    </div>
                    <button
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 text-slate-300 hover:border-cyan-400 hover:text-cyan-200 disabled:cursor-not-allowed disabled:text-slate-600"
                      disabled={!onProjectSelected || submissionState === 'submitting'}
                      onClick={() => void handleProjectSelected(project)}
                      title="Open project"
                      type="button"
                    >
                      <FolderOpen className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-6 text-slate-400">No projects available.</p>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
