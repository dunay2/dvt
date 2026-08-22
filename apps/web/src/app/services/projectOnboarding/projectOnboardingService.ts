/** Owned concern: adapt first-use project onboarding to protected runtime project rails. */
import {
  CreateProjectResponseSchema,
  ProjectOnboardingCatalogSchema,
  type CreateProjectRequest,
  type CreateProjectResponse,
  type ProjectDescriptor,
  type ProjectOnboardingCatalog,
  type ProjectWorkspaceDescriptor,
} from '@dvt/contracts';

import { type ApiClient, createApiClient } from '../api/createApiClient';

export type {
  CreateProjectResponse,
  ProjectDescriptor,
  ProjectOnboardingCatalog,
  ProjectWorkspaceDescriptor as EffectiveProjectWorkspaceContext,
};

export type ProjectOnboardingService = {
  listProjects: () => Promise<ProjectOnboardingCatalog>;
  createProject: (command: CreateProjectRequest) => Promise<CreateProjectResponse>;
};

type ProjectOnboardingServiceDeps = {
  readonly createIdempotencyKey?: () => string;
};

export function createProjectOnboardingService(
  apiClient: ApiClient = createApiClient(),
  deps: ProjectOnboardingServiceDeps = {}
): ProjectOnboardingService {
  const createIdempotencyKey = deps.createIdempotencyKey ?? createBrowserIdempotencyKey;

  return {
    listProjects: async () =>
      ProjectOnboardingCatalogSchema.parse(
        await apiClient.getJson<unknown>('/projects', {
          includeSessionHeaders: false,
        })
      ),
    createProject: async (command) =>
      CreateProjectResponseSchema.parse(
        await apiClient.postJson<CreateProjectRequest, unknown>(
          '/projects',
          {
            tenantId: command.tenantId,
            name: command.name.trim(),
          },
          {
            headers: { 'Idempotency-Key': createIdempotencyKey() },
            includeSessionHeaders: false,
          }
        )
      ),
  };
}
