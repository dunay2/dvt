/** Owned concern: adapt first-use project onboarding to protected runtime project rails. */
import { type ApiClient, createApiClient } from '../api/createApiClient';

export type ProjectOnboardingTenant = {
  readonly tenantId: string;
  readonly displayName?: string;
  readonly canCreateProject: boolean;
};

export type ProjectDescriptor = {
  readonly tenantId: string;
  readonly projectId: string;
  readonly name: string;
  readonly environmentIds: readonly string[];
  readonly createdAt?: string;
};

export type ProjectOnboardingCatalog = {
  readonly tenants: readonly ProjectOnboardingTenant[];
  readonly projects: readonly ProjectDescriptor[];
};

export type EffectiveProjectWorkspaceContext = {
  readonly tenantId: string;
  readonly projectId: string;
  readonly environmentId: string;
};

export type CreateProjectCommand = {
  readonly tenantId: string;
  readonly name: string;
};

export type CreateProjectResponse = {
  readonly project: ProjectDescriptor;
  readonly effectiveWorkspace: EffectiveProjectWorkspaceContext;
};

export type ProjectOnboardingService = {
  listProjects: () => Promise<ProjectOnboardingCatalog>;
  createProject: (command: CreateProjectCommand) => Promise<CreateProjectResponse>;
};

type ProjectOnboardingServiceDeps = {
  readonly createIdempotencyKey?: () => string;
};

function createBrowserIdempotencyKey(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) {
    return randomUuid;
  }

  return `project-${Date.now().toString(36)}`;
}

export function createProjectOnboardingService(
  apiClient: ApiClient = createApiClient(),
  deps: ProjectOnboardingServiceDeps = {}
): ProjectOnboardingService {
  const createIdempotencyKey = deps.createIdempotencyKey ?? createBrowserIdempotencyKey;

  return {
    listProjects: () =>
      apiClient.getJson<ProjectOnboardingCatalog>('/projects', {
        includeSessionHeaders: false,
      }),
    createProject: (command) =>
      apiClient.postJson<CreateProjectCommand, CreateProjectResponse>(
        '/projects',
        {
          tenantId: command.tenantId,
          name: command.name.trim(),
        },
        {
          headers: { 'Idempotency-Key': createIdempotencyKey() },
          includeSessionHeaders: false,
        }
      ),
  };
}
