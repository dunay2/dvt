import { describe, expect, it, vi } from 'vitest';

import { ApiError, type ApiClient } from '../api/createApiClient';
import { useSessionStore } from '../../stores/sessionStore';
import { createRunsService, type StartRunInput } from './runsService';

function createApiClientMock(): ApiClient {
  return {
    baseUrl: 'http://localhost:3000',
    requestRaw: vi.fn(),
    getJson: vi.fn(),
    postJson: vi.fn(),
  };
}

function createStartRunInput(runId = 'run_123'): StartRunInput {
  return {
    planRef: {
      uri: 's3://plans/plan.json',
      sha256: 'abc123',
      schemaVersion: '1.0.0',
      planId: 'plan_123',
      planVersion: '1.0.0',
    },
    context: {
      tenantId: 'tenant-1',
      projectId: 'project-1',
      environmentId: 'env-1',
      runId,
      targetAdapter: 'mock',
    },
  };
}

function createApiError(statusCode: number, endpoint = '/runs/start'): ApiError {
  return new ApiError({
    message: `HTTP ${statusCode}`,
    endpoint,
    statusCode,
    category: statusCode >= 500 ? 'server' : 'client',
  });
}

describe('runsService runtime contract', () => {
  useSessionStore.setState({
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'env-1',
  });

  it('uses POST /runs/start for startRun', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.postJson).mockResolvedValue({
      provider: 'mock',
      tenantId: 'tenant-1',
      workflowId: 'wf_run_123',
      runId: 'run_123',
    });

    const service = createRunsService('api', apiClient);
    await service.startRun(createStartRunInput('run_123'));

    expect(apiClient.postJson).toHaveBeenCalledWith('/runs/start', expect.any(Object));
  });

  it('uses GET /runs/:runId for getRunSnapshot', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue({
      runId: 'run_abc',
      planId: 'plan_abc',
      status: 'RUNNING',
      environmentId: 'dev',
      gitSha: 'abc',
      startedAt: '2026-04-04T00:00:00.000Z',
      substatus: 'WAITING_APPROVAL',
      message: 'Approval required',
      snapshotStaleness: 'FRESH',
    });

    const service = createRunsService('api', apiClient);
    const snapshot = await service.getRunSnapshot('run_abc');

    expect(apiClient.getJson).toHaveBeenCalledWith('/runs/run_abc?tenantId=tenant-1');
    expect(snapshot).toEqual({
      runId: 'run_abc',
      planId: 'plan_abc',
      status: 'running',
      environment: 'dev',
      gitSha: 'abc',
      startedAt: '2026-04-04T00:00:00.000Z',
      completedAt: undefined,
      substatus: 'WAITING_APPROVAL',
      message: 'Approval required',
      snapshotStaleness: 'FRESH',
      currentStepId: undefined,
      failedStepId: undefined,
      errorReason: undefined,
      materialization: undefined,
    });
  });

  it('maps missing snapshots to null for getRunSnapshot', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockRejectedValue(createApiError(404, '/runs/missing'));

    const service = createRunsService('api', apiClient);
    const snapshot = await service.getRunSnapshot('missing');

    expect(snapshot).toBeNull();
  });

  it('uses GET /runs/:runId/events for listRunEvents', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue({
      items: [],
      nextCursor: 10,
    });

    const service = createRunsService('api', apiClient);
    await service.listRunEvents('run_abc', 5);

    expect(apiClient.getJson).toHaveBeenCalledWith(
      '/runs/run_abc/events?tenantId=tenant-1&afterSeq=5'
    );
  });

  it('maps listRunSummaries from runtime list result items', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue({
      items: [
        {
          runId: 'run_1',
          planId: 'plan_1',
          status: 'RUNNING',
          environmentId: 'dev',
          gitSha: 'abc',
          createdAt: '2026-04-04T00:00:00.000Z',
          substatus: 'WAITING_APPROVAL',
          message: 'Approval required',
        },
      ],
      nextCursor: null,
    });

    const service = createRunsService('api', apiClient);
    const runs = await service.listRunSummaries();

    expect(apiClient.getJson).toHaveBeenCalledWith(
      '/runs?tenantId=tenant-1&projectId=project-1&environmentId=env-1'
    );
    expect(runs).toEqual([
      {
        runId: 'run_1',
        planId: 'plan_1',
        status: 'running',
        environment: 'dev',
        gitSha: 'abc',
        startedAt: '2026-04-04T00:00:00.000Z',
        completedAt: undefined,
        substatus: 'WAITING_APPROVAL',
        message: 'Approval required',
        snapshotStaleness: undefined,
        currentStepId: undefined,
        failedStepId: undefined,
        errorReason: undefined,
        materialization: undefined,
      },
    ]);
  });

  it('maps result evidence fields from GET /runs/:runId', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue({
      runId: 'run_completed',
      status: 'COMPLETED',
      startedAt: '2026-04-04T00:00:00.000Z',
      completedAt: '2026-04-04T00:00:10.000Z',
      currentStepId: 'step_transform',
      materialization: {
        executor: 'postgres',
        environmentId: 'env-prod',
        sinkTable: 'analytics.orders_daily',
        rowsWritten: 42,
        startedAt: '2026-04-04T00:00:02.000Z',
        completedAt: '2026-04-04T00:00:10.000Z',
        durationMs: 8000,
      },
    });

    const service = createRunsService('api', apiClient);
    const snapshot = await service.getRunSnapshot('run_completed');

    expect(snapshot).toMatchObject({
      runId: 'run_completed',
      currentStepId: 'step_transform',
      materialization: {
        executor: 'postgres',
        sinkTable: 'analytics.orders_daily',
        rowsWritten: 42,
      },
    });
  });

  it('maps listRunEvents from runtime events result items and nextCursor', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue({
      items: [],
      nextCursor: 11,
    });

    const service = createRunsService('api', apiClient);
    const result = await service.listRunEvents('run_abc');

    expect(result).toEqual({
      events: [],
      nextAfterSeq: 11,
    });
  });

  it('ignores non-integer nextCursor values in listRunEvents payload', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue({
      items: [],
      nextCursor: 11.5,
    });

    const service = createRunsService('api', apiClient);
    const result = await service.listRunEvents('run_abc');

    expect(result).toEqual({
      events: [],
      nextAfterSeq: undefined,
    });
  });

  it.each([401, 403, 404, 409, 422, 500])(
    'propagates runtime API error for startRun (%s)',
    async (statusCode) => {
      const apiClient = createApiClientMock();
      const apiError = createApiError(statusCode);
      vi.mocked(apiClient.postJson).mockRejectedValue(apiError);
      const service = createRunsService('api', apiClient);

      await expect(service.startRun(createStartRunInput())).rejects.toBe(apiError);
    }
  );

  it('does not call legacy GET /runs/:runId/status route', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue({
      runId: 'run_abc',
      status: 'RUNNING',
      startedAt: '2026-04-04T00:00:00.000Z',
    });

    const service = createRunsService('api', apiClient);
    await service.getRunSnapshot('run_abc');

    expect(apiClient.getJson).toHaveBeenCalledWith('/runs/run_abc?tenantId=tenant-1');
    expect(apiClient.getJson).not.toHaveBeenCalledWith('/runs/run_abc/status');
  });
});
