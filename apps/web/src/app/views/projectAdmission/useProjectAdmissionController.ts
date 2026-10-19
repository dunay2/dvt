/** Owned concern: coordinate project admission within the initiating view's lifetime. */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import { ApiError } from '../../services/api/createApiClient';
import {
  createProjectOnboardingService,
  type CreateProjectResponse,
  type EffectiveProjectWorkspaceContext,
  type ProjectDescriptor,
  type ProjectOnboardingCatalog,
  type ProjectOnboardingService,
} from '../../services/projectOnboarding/projectOnboardingService';
import { SessionContextDiscardedError } from '../../services/session/sessionContextPublication';
import {
  getApplicationLanguage,
  useApplicationLanguageStore,
} from '../../stores/applicationLanguageStore';
import { resolveProjectOnboardingCopy, type ProjectOnboardingCopy } from '../projectOnboardingCopy';

export type ProjectCatalogState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly catalog: ProjectOnboardingCatalog }
  | { readonly kind: 'failed'; readonly message: string };

export type ProjectAdmissionCallbacks = Readonly<{
  onProjectCreated: (response: CreateProjectResponse, signal: AbortSignal) => Promise<void> | void;
  onProjectSelected?: (
    selection: EffectiveProjectWorkspaceContext,
    signal: AbortSignal
  ) => Promise<void> | void;
}>;

type ProjectAdmissionControllerOptions = ProjectAdmissionCallbacks &
  Readonly<{
    service?: ProjectOnboardingService;
    active?: boolean;
  }>;

export interface ProjectAdmissionBinding {
  readonly catalog: ProjectOnboardingCatalog | null;
  readonly catalogState: ProjectCatalogState;
  readonly copy: ProjectOnboardingCopy;
  readonly selectedTenantId: string;
  readonly setSelectedTenantId: (tenantId: string) => void;
  readonly projectName: string;
  readonly setProjectName: (name: string) => void;
  readonly submissionState: 'idle' | 'submitting' | 'created';
  readonly formError: string | null;
  readonly hasMultipleOrganizations: boolean;
  readonly canCreateProject: boolean;
  readonly canSubmit: boolean;
  readonly refreshCatalog: () => Promise<void>;
  readonly createProject: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  readonly selectProject: (project: ProjectDescriptor) => Promise<void>;
}

function readableErrorMessage(
  error: unknown,
  fallback: string,
  copy?: ProjectOnboardingCopy
): string {
  if (error instanceof ApiError && copy !== undefined) {
    const envelope = error.responseBody;
    const detail =
      typeof envelope === 'object' && envelope !== null && 'error' in envelope
        ? envelope.error
        : null;
    const reason =
      typeof detail === 'object' && detail !== null && 'reason' in detail ? detail.reason : null;
    switch (reason) {
      case 'duplicate_project_name':
        return copy.duplicateProjectNameMessage;
      case 'idempotency_conflict':
        return copy.projectCreationConflictMessage;
      default:
        return copy.projectCreationFailureMessage;
    }
  }
  return error instanceof Error && error.message.length > 0 ? error.message : fallback;
}

export function useProjectAdmissionController({
  service,
  active = true,
  onProjectCreated,
  onProjectSelected,
}: ProjectAdmissionControllerOptions): ProjectAdmissionBinding {
  const projectOnboardingService = useMemo(
    () => service ?? createProjectOnboardingService(),
    [service]
  );
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveProjectOnboardingCopy(language);
  const [catalogState, setCatalogState] = useState<ProjectCatalogState>({ kind: 'loading' });
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [submissionState, setSubmissionState] = useState<'idle' | 'submitting' | 'created'>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const lifetimeRef = useRef<AbortController | null>(null);
  const submissionLockedRef = useRef(false);

  const loadCatalog = useCallback(
    async (signal: AbortSignal): Promise<void> => {
      setCatalogState({ kind: 'loading' });
      setFormError(null);
      try {
        const catalog = await projectOnboardingService.listProjects();
        if (signal.aborted) return;
        setCatalogState({ kind: 'ready', catalog });
        setSelectedTenantId(
          catalog.tenants.find((tenant) => tenant.canCreateProject)?.tenantId ??
            catalog.tenants[0]?.tenantId ??
            ''
        );
      } catch (error) {
        if (signal.aborted) return;
        setCatalogState({
          kind: 'failed',
          message: readableErrorMessage(
            error,
            resolveProjectOnboardingCopy(getApplicationLanguage()).failureMessage
          ),
        });
      }
    },
    [projectOnboardingService]
  );

  useEffect(() => {
    if (!active) return;
    const lifetime = new AbortController();
    lifetimeRef.current = lifetime;
    submissionLockedRef.current = false;
    setSubmissionState('idle');
    void loadCatalog(lifetime.signal);
    return () => {
      lifetime.abort();
      if (lifetimeRef.current === lifetime) lifetimeRef.current = null;
    };
  }, [active, loadCatalog]);

  async function refreshCatalog(): Promise<void> {
    const signal = lifetimeRef.current?.signal;
    if (active && signal && !signal.aborted) await loadCatalog(signal);
  }

  async function createProject(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const signal = lifetimeRef.current?.signal;
    const trimmedName = projectName.trim();
    if (
      !active ||
      !signal ||
      signal.aborted ||
      submissionLockedRef.current ||
      submissionState !== 'idle' ||
      catalogState.kind !== 'ready' ||
      trimmedName.length === 0 ||
      selectedTenantId.length === 0
    )
      return;
    submissionLockedRef.current = true;
    setSubmissionState('submitting');
    setFormError(null);
    let response: CreateProjectResponse;
    try {
      response = await projectOnboardingService.createProject({
        tenantId: selectedTenantId,
        name: trimmedName,
      });
    } catch (error) {
      if (signal.aborted) return;
      setFormError(readableErrorMessage(error, copy.projectCreationFailureMessage, copy));
      submissionLockedRef.current = false;
      setSubmissionState('idle');
      return;
    }
    if (signal.aborted) return;
    setSubmissionState('created');
    try {
      await onProjectCreated(response, signal);
    } catch (error) {
      if (!signal.aborted && !(error instanceof SessionContextDiscardedError))
        setFormError(copy.projectActivationFailureMessage);
    } finally {
      if (!signal.aborted) submissionLockedRef.current = false;
    }
  }

  async function selectProject(project: ProjectDescriptor): Promise<void> {
    const signal = lifetimeRef.current?.signal;
    if (!active || !signal || signal.aborted || !onProjectSelected || submissionLockedRef.current)
      return;
    submissionLockedRef.current = true;
    setFormError(null);
    setSubmissionState('submitting');
    try {
      await onProjectSelected(
        {
          tenantId: project.tenantId,
          projectId: project.projectId,
          projectName: project.name,
          environmentId: project.environmentIds[0] ?? 'dev',
        },
        signal
      );
    } catch (error) {
      if (!signal.aborted && !(error instanceof SessionContextDiscardedError))
        setFormError(readableErrorMessage(error, copy.failureMessage));
    } finally {
      if (!signal.aborted) {
        submissionLockedRef.current = false;
        setSubmissionState('idle');
      }
    }
  }

  const catalog = catalogState.kind === 'ready' ? catalogState.catalog : null;
  const canCreateProject =
    catalog?.tenants.find((tenant) => tenant.tenantId === selectedTenantId)?.canCreateProject ===
    true;
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
    hasMultipleOrganizations: (catalog?.tenants.length ?? 0) > 1,
    canCreateProject,
    canSubmit:
      active &&
      catalogState.kind === 'ready' &&
      canCreateProject &&
      projectName.trim().length > 0 &&
      submissionState === 'idle',
    refreshCatalog,
    createProject,
    selectProject,
  };
}
