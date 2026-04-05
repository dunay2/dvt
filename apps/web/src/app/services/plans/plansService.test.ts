import { describe, expect, it, vi } from 'vitest';

import type { ApiClient } from '../api/createApiClient';
import { createPlansService } from './plansService';

function buildValidContractPlan() {
  return {
    metadata: {
      planVersion: '1.0',
      schemaVersion: 'v1.2',
      contractVersion: '1.0.0',
      inputHashSha256: 'a'.repeat(64),
      planId: 'b'.repeat(64),
      createdAtIso: '2026-04-03T00:00:00.000Z',
    },
    steps: [],
    observability: {
      tags: {
        adapter: 'temporal',
        environmentId: 'dev',
      },
    },
  } as const;
}

function buildValidPlanRef() {
  return {
    uri: 'dvt://plans/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    sha256: 'b'.repeat(64),
    schemaVersion: 'v1.2',
    planId: 'b'.repeat(64),
    planVersion: 'v1',
  } as const;
}

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
      plan: buildValidContractPlan(),
      planRef: buildValidPlanRef(),
    }));
    const service = createPlansService(
      'api',
      buildApiClientStub({
        postJson: postJsonMock as ApiClient['postJson'],
      })
    );

    const plan = await service.previewPlan({
      selectedNodeIds: ['node_1'],
      context: {
        runId: 'run-1',
        tenantId: 't1',
        projectId: 'p1',
        environmentId: 'e1',
        targetAdapter: 'temporal',
      },
    });

    expect(plan.planRef).toEqual(buildValidPlanRef());

    expect(postJsonMock).toHaveBeenCalledWith(
      '/plans/preview',
      expect.objectContaining({
        selectedNodeIds: ['node_1'],
      })
    );
  });

  it('rejects api payloads that do not include planRef', async () => {
    const postJsonMock = vi.fn(async () => ({
      plan: buildValidContractPlan(),
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
    ).rejects.toThrow('Invalid plans payload: expected { plan, planRef }');
  });
});
