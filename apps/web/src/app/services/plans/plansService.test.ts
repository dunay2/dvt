import { describe, expect, it, vi } from 'vitest';

import type { ApiClient } from '../api/createApiClient';
import { createPlansService } from './plansService';

function buildApiClientStub(overrides: Partial<ApiClient> = {}): ApiClient {
  const base: ApiClient = {
    baseUrl: 'http://localhost:3000',
    requestRaw: vi.fn(),
    getJson: vi.fn(),
    postJson: vi.fn(),
  };

  return {
    ...base,
    ...overrides,
  };
}

describe('createPlansService', () => {
  it('uses mock implementation in mock mode', async () => {
    const service = createPlansService('mock');

    const plan = await service.previewPlan({
      selectedNodeIds: ['node_1'],
      context: {
        runId: 'run-1',
        tenantId: 't1',
        projectId: 'p1',
        environmentId: 'e1',
        targetAdapter: 'mock',
      },
    });

    expect(plan.planId).toBeTypeOf('string');
    expect(plan.steps.length).toBeGreaterThan(0);
  });

  it('routes to api implementation in api mode', async () => {
    const postJsonMock = vi.fn(async () => ({
      metadata: {
        planId: 'plan-api',
        planVersion: '1.0',
        schemaVersion: '2.0.0',
        createdAtIso: '2026-04-03T00:00:00.000Z',
      },
      observability: {
        tags: {
          adapter: 'temporal',
          environmentId: 'dev',
        },
      },
      steps: [],
    }));
    const service = createPlansService(
      'api',
      buildApiClientStub({
        postJson: postJsonMock as ApiClient['postJson'],
      })
    );

    await expect(
      service.previewPlan({
        selectedNodeIds: ['node_1'],
        context: {
          runId: 'run-1',
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          targetAdapter: 'temporal',
        },
      })
    ).rejects.toThrow('Validation failed');

    expect(postJsonMock).toHaveBeenCalledWith(
      '/plans/preview',
      expect.objectContaining({
        selectedNodeIds: ['node_1'],
      })
    );
  });
});
