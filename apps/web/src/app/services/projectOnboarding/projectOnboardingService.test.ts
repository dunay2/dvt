import { describe, expect, it } from 'vitest';

import { createApiClientHarness } from '../workspace/workspaceApiClient.test.harness';
import { createProjectOnboardingService } from './projectOnboardingService';

describe('createProjectOnboardingService', () => {
  it('loads the project catalog without requiring an existing workspace context', async () => {
    const catalog = {
      tenants: [{ tenantId: 'tenant-1', canCreateProject: true }],
      projects: [],
      integrityFindings: [],
    };
    const { apiClient, getJson } = createApiClientHarness({
      getJson: async <TResponse>() => catalog as TResponse,
    });

    const service = createProjectOnboardingService(apiClient, {
      createIdempotencyKey: () => 'idempotency-1',
    });

    await expect(service.listProjects()).resolves.toEqual(catalog);
    expect(getJson).toHaveBeenCalledWith('/projects', {
      includeSessionHeaders: false,
    });
  });

  it('creates a project through the governed command rail with an idempotency key', async () => {
    const response = {
      project: {
        tenantId: 'tenant-1',
        projectId: 'orders',
        name: 'Orders',
        environmentIds: ['dev'],
      },
      defaultWorkspace: {
        tenantId: 'tenant-1',
        projectId: 'orders',
        projectName: 'Orders',
        environmentId: 'dev',
      },
    };
    const { apiClient, postJson } = createApiClientHarness({
      postJson: async <TRequest, TResponse>() => response as TResponse,
    });

    const service = createProjectOnboardingService(apiClient, {
      createIdempotencyKey: () => 'idempotency-1',
    });

    await expect(service.createProject({ tenantId: 'tenant-1', name: 'Orders' })).resolves.toEqual(
      response
    );
    expect(postJson).toHaveBeenCalledWith(
      '/projects',
      { tenantId: 'tenant-1', name: 'Orders' },
      {
        headers: { 'Idempotency-Key': 'idempotency-1' },
        includeSessionHeaders: false,
      }
    );
  });
});
