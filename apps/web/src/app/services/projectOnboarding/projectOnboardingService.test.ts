import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApiClientHarness } from '../workspace/workspaceApiClient.test.harness';
import { createProjectOnboardingService } from './projectOnboardingService';

describe('createProjectOnboardingService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it('uses a secure project-prefixed UUID when no idempotency factory is injected', async () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (target: Uint8Array) => {
        target.set([
          0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee,
          0xff,
        ]);
        return target;
      },
    });
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

    await createProjectOnboardingService(apiClient).createProject({
      tenantId: 'tenant-1',
      name: 'Orders',
    });

    expect(postJson).toHaveBeenCalledWith(
      '/projects',
      { tenantId: 'tenant-1', name: 'Orders' },
      {
        headers: {
          'Idempotency-Key': 'project:00112233-4455-4677-8899-aabbccddeeff',
        },
        includeSessionHeaders: false,
      }
    );
  });
});
