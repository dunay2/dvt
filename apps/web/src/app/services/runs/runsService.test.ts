import { describe, expect, it, vi } from 'vitest';

import type { ApiClient } from '../api/createApiClient';
import { createRunsService } from './runsService';

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

describe('createRunsService', () => {
  it('uses mock implementation in mock mode', async () => {
    const service = createRunsService('mock');

    const runs = await service.listRuns();

    expect(runs.length).toBeGreaterThan(0);
    expect(runs[0]?.runId).toBeTypeOf('string');
  });

  it('routes to api implementation in api mode', async () => {
    const getJsonMock = vi.fn(async () => [{ runId: 'run-api', planId: 'plan-api' }]);
    const service = createRunsService(
      'api',
      buildApiClientStub({
        getJson: getJsonMock as ApiClient['getJson'],
      })
    );

    const runs = await service.listRuns();

    expect(getJsonMock).toHaveBeenCalledWith('/runs');
    expect(runs).toEqual([
      expect.objectContaining({
        runId: 'run-api',
        planId: 'plan-api',
      }),
    ]);
  });
});
