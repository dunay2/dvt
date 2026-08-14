/** Owned concern: share governed project admission state and creation presentation. */
import { FolderPlus, LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';

import {
  createProjectOnboardingService,
  type CreateProjectResponse,
  type EffectiveProjectWorkspaceContext,
  type ProjectDescriptor,
  type ProjectOnboardingCatalog,
  type ProjectOnboardingService,
} from '../../services/projectOnboarding/projectOnboardingService';
import { ApiError } from '../../services/api/createApiClient';
import {
  getApplicationLanguage,
  useApplicationLanguageStore,
} from '../../stores/applicationLanguageStore';
import { resolveProjectOnboardingCopy, type ProjectOnboardingCopy } from '../projectOnboardingCopy';

export type ProjectCatalogState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly catalog: ProjectOnboardingCatalog }
  | { readonly kind: 'failed'; readonly message: string };

type SubmissionState = 'idle' | 'submitting';

type ProjectAdmissionControllerOptions = Readonly<{
  service?: ProjectOnboardingService;
  onProjectCreated: (response: CreateProjectResponse) => Promise<void> | void;
  onProjectSelected?: (selection: EffectiveProjectWorkspaceContext) => Promise<void> | void;
}>;

function readableErrorMessage(
  error: unknown,
  fallback: string,
  projectCreationCopy?: ProjectOnboardingCopy
): string {
  if (error instanceof ApiError && projectCreationCopy !== undefined) {
    let reason: string | null = null;
    if (error.responseBody != null && typeof error.responseBody === 'object') {
      const envelope = error.responseBody as { readonly error?: unknown };
      if (envelope.error != null && typeof envelope.error === 'object') {
        const candidateReason = (envelope.error as { readonly reason?: unknown }).reason;
        reason = typeof candidateReason === 'string' ? candidateReason : null;
      }
    }

    switch (reason) {
      case 'duplicate_project_name':
        return projectCreationCopy.duplicateProjectNameMessage;
      case 'idempotency_conflict':
        return projectCreationCopy.projectCreationConflictMessage;
      default:
        return projectCreationCopy.projectCreationFailureMessage;
    }
  }

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

export function useProjectAdmissionController({
  service,
  onProjectCreated,
  onProjectSelected,
}: ProjectAdmissionControllerOptions) {
  const projectOnboardingService = useMemo(
    () => service ?? createProjectOnboardingService(),
    [service]
  );
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveProjectOnboardingCopy(language);
  const [catalogState, setCatalogState] = useState<ProjectCatalogState>({ kind: 'loading' });
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const submissionLockedRef = useRef(false);

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
            message: readableErrorMessage(
              error,
              resolveProjectOnboardingCopy(getApplicationLanguage()).failureMessage
            ),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectOnboardingService]);

  async function refreshCatalog(): Promise<void> {
    setCatalogState({ kind: 'loading' });
    setFormError(null);
    try {
      const catalog = await projectOnboardingService.listProjects();
      setCatalogState({ kind: 'ready', catalog });
      setSelectedTenantId(resolveInitialTenantId(catalog));
    } catch (error) {
      setCatalogState({
        kind: 'failed',
        message: readableErrorMessage(error, copy.failureMessage),
      });
    }
  }

  async function createProject(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmedName = projectName.trim();
    if (
      submissionLockedRef.current ||
      catalogState.kind !== 'ready' ||
      trimmedName.length === 0 ||
      selectedTenantId.length === 0
    ) {
      return;
    }

    submissionLockedRef.current = true;
    setSubmissionState('submitting');
    setFormError(null);
    try {
      const response = await projectOnboardingService.createProject({
        tenantId: selectedTenantId,
        name: trimmedName,
      });
      await onProjectCreated(response);
    } catch (error) {
      setFormError(readableErrorMessage(error, copy.projectCreationFailureMessage, copy));
    } finally {
      submissionLockedRef.current = false;
      setSubmissionState('idle');
    }
  }

  async function selectProject(project: ProjectDescriptor): Promise<void> {
    if (!onProjectSelected || submissionLockedRef.current) {
      return;
    }

    submissionLockedRef.current = true;
    setFormError(null);
    setSubmissionState('submitting');
    try {
      await onProjectSelected({
        tenantId: project.tenantId,
        projectId: project.projectId,
        projectName: project.name,
        environmentId: resolveDefaultEnvironment(project),
      });
    } catch (error) {
      setFormError(readableErrorMessage(error, copy.failureMessage));
    } finally {
      submissionLockedRef.current = false;
      setSubmissionState('idle');
    }
  }

  const catalog = catalogState.kind === 'ready' ? catalogState.catalog : null;
  const selectedTenant = catalog?.tenants.find((tenant) => tenant.tenantId === selectedTenantId);
  const hasMultipleOrganizations = (catalog?.tenants.length ?? 0) > 1;
  const canCreateProject = selectedTenant?.canCreateProject === true;
  const canSubmit =
    catalogState.kind === 'ready' &&
    canCreateProject &&
    projectName.trim().length > 0 &&
    submissionState === 'idle';

  return {
    catalog,
    catalogState,
    copy,
    selectedTenantId,
    setSelectedTenantId,
    projectName,
    setProjectName,
    submissionState,
    formError,
    hasMultipleOrganizations,
    canCreateProject,
    canSubmit,
    refreshCatalog,
    createProject,
    selectProject,
  } as const;
}

export type ProjectAdmissionController = ReturnType<typeof useProjectAdmissionController>;

type ProjectCreationFormProps = Readonly<{
  controller: ProjectAdmissionController;
  copy?: ProjectOnboardingCopy;
  className?: string;
  dataSlot?: string;
  showCatalogStatus?: boolean;
  showTitle?: boolean;
  autoFocusProjectName?: boolean;
  leadingAction?: ReactNode;
}>;

function resolveTenantDisplayName(tenant: ProjectOnboardingCatalog['tenants'][number]): string {
  return tenant.tenantId;
}

export function ProjectCreationForm({
  controller,
  copy = controller.copy,
  className = 'space-y-4',
  dataSlot = 'project-onboarding-form',
  showCatalogStatus = false,
  showTitle = true,
  autoFocusProjectName = false,
  leadingAction,
}: ProjectCreationFormProps): JSX.Element {
  return (
    <form
      className={className}
      data-slot={dataSlot}
      onSubmit={(event) => void controller.createProject(event)}
    >
      {showTitle ? (
        <h2 className="text-sm font-semibold text-(--text-strong)">{copy.createProjectTitle}</h2>
      ) : null}
      {showCatalogStatus && controller.catalogState.kind === 'loading' ? (
        <div className="flex items-center gap-2 text-sm text-(--text-muted)" role="status">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          {copy.loadingMessage}
        </div>
      ) : null}
      {showCatalogStatus && controller.catalogState.kind === 'failed' ? (
        <div
          className="rounded-md border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-100"
          role="alert"
        >
          {controller.catalogState.message}
        </div>
      ) : null}
      {controller.catalogState.kind === 'ready' ? (
        <>
          {controller.hasMultipleOrganizations ? (
            <label className="block space-y-1.5 text-sm font-medium text-(--text-default)">
              <span>{copy.organizationLabel}</span>
              <select
                className="h-9 w-full rounded-md border border-(--border-default) bg-(--surface-route) px-3 text-sm text-(--text-default) outline-none focus:border-(--focus-ring)"
                name="tenantId"
                disabled={controller.submissionState === 'submitting'}
                onChange={(event) => controller.setSelectedTenantId(event.target.value)}
                value={controller.selectedTenantId}
              >
                {controller.catalogState.catalog.tenants.map((tenant) => (
                  <option key={tenant.tenantId} value={tenant.tenantId}>
                    {resolveTenantDisplayName(tenant)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block space-y-1.5 text-sm font-medium text-(--text-default)">
            <span>{copy.projectNameLabel}</span>
            <input
              autoFocus={autoFocusProjectName}
              className="h-9 w-full rounded-md border border-(--border-default) bg-(--surface-route) px-3 text-sm text-(--text-default) outline-none placeholder:text-(--text-disabled) focus:border-(--focus-ring)"
              name="projectName"
              disabled={controller.submissionState === 'submitting'}
              onChange={(event) => controller.setProjectName(event.target.value)}
              placeholder={copy.projectNamePlaceholder}
              value={controller.projectName}
            />
          </label>
          {!controller.canCreateProject ? (
            <div
              className="rounded-md border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100"
              role="alert"
            >
              {copy.creationUnavailableMessage}
            </div>
          ) : null}
          {controller.formError ? (
            <div
              className="rounded-md border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-100"
              role="alert"
            >
              {controller.formError}
            </div>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            {leadingAction}
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-(--border-strong) bg-(--surface-selected) px-3 text-sm font-semibold text-(--text-strong) transition hover:bg-(--surface-elevated) focus-visible:outline-2 focus-visible:outline-(--focus-ring) disabled:cursor-not-allowed disabled:text-(--text-disabled)"
              disabled={!controller.canSubmit}
              type="submit"
            >
              {controller.submissionState === 'submitting' ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <FolderPlus className="size-4" aria-hidden="true" />
              )}
              {copy.createProjectLabel}
            </button>
          </div>
        </>
      ) : null}
    </form>
  );
}
