import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../api/createApiClient';
import { createRunWorkspaceFacade, RunWorkspaceLoadError } from './runWorkspaceFacade';
import type { RunsService } from './runsService';

function createRunsServiceMock(): RunsService {
  return {
    listRunSummaries: vi.fn(),
    getRunSnapshot: vi.fn(),
    startRun: vi.fn(),
    listRunEvents: vi.fn(),
  };
}

function createApiError(statusCode: number): ApiError {
  return new ApiError({
    message: `HTTP ${statusCode}`,
    endpoint: '/runs/run_1',
    statusCode,
    category: statusCode >= 500 ? 'server' : 'client',
  });
}

describe('runWorkspaceFacade', () => {
  it('returns snapshot-only workspace state when events are empty', async () => {
    const service = createRunsServiceMock();
    vi.mocked(service.getRunSnapshot).mockResolvedValue({
      runId: 'run_1',
      planId: 'plan_1',
      status: 'running',
      startedAt: '2026-04-04T00:00:00.000Z',
    });
    vi.mocked(service.listRunEvents).mockResolvedValue({
      events: [],
    });

    const facade = createRunWorkspaceFacade(service);
    const workspace = await facade.loadRunWorkspace('run_1');

    expect(workspace).toEqual({
      runId: 'run_1',
      snapshot: {
        runId: 'run_1',
        planId: 'plan_1',
        status: 'running',
        startedAt: '2026-04-04T00:00:00.000Z',
      },
      timeline: {
        state: 'empty',
        events: [],
        nextAfterSeq: undefined,
      },
      detailState: 'snapshot-only',
    });
  });

  it('returns snapshot-plus-events state when timeline exists', async () => {
    const service = createRunsServiceMock();
    vi.mocked(service.getRunSnapshot).mockResolvedValue({
      runId: 'run_1',
      status: 'running',
      startedAt: '2026-04-04T00:00:00.000Z',
    });
    vi.mocked(service.listRunEvents).mockResolvedValue({
      events: [
        {
          eventId: 'evt_1',
          eventType: 'StepStarted',
          runId: 'run_1',
          emittedAt: '2026-04-04T00:00:01.000Z',
          tenantId: 'tenant-1',
          projectId: 'project-1',
          environmentId: 'env-1',
          planId: 'plan_1',
          planVersion: '1.0.0',
          engineAttemptId: 1,
          logicalAttemptId: 1,
          idempotencyKey: 'idemp-1',
          payloadVersion: 1,
          stepId: 'step_1',
          runSeq: 1,
          persistedAt: '2026-04-04T00:00:01.000Z',
        },
      ],
      nextAfterSeq: 2,
    });

    const facade = createRunWorkspaceFacade(service);
    const workspace = await facade.loadRunWorkspace('run_1');

    expect(workspace?.detailState).toBe('snapshot-plus-events');
    expect(workspace?.timeline).toMatchObject({
      state: 'available',
      nextAfterSeq: 2,
    });
  });

  it('returns null when snapshot route returns 404 equivalent', async () => {
    const service = createRunsServiceMock();
    vi.mocked(service.getRunSnapshot).mockResolvedValue(null);

    const facade = createRunWorkspaceFacade(service);
    const workspace = await facade.loadRunWorkspace('missing');

    expect(workspace).toBeNull();
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [500, 'runtime-unavailable'],
  ] as const)(
    'throws classified load error for snapshot failure (%s)',
    async (statusCode, expectedKind) => {
      const service = createRunsServiceMock();
      vi.mocked(service.getRunSnapshot).mockRejectedValue(createApiError(statusCode));
      const facade = createRunWorkspaceFacade(service);

      await expect(facade.loadRunWorkspace('run_1')).rejects.toMatchObject({
        name: 'RunWorkspaceLoadError',
        kind: expectedKind,
        statusCode,
      } satisfies Partial<RunWorkspaceLoadError>);
    }
  );

  it('keeps snapshot state when timeline fetch fails', async () => {
    const service = createRunsServiceMock();
    vi.mocked(service.getRunSnapshot).mockResolvedValue({
      runId: 'run_1',
      status: 'running',
      startedAt: '2026-04-04T00:00:00.000Z',
    });
    vi.mocked(service.listRunEvents).mockRejectedValue(createApiError(500));

    const facade = createRunWorkspaceFacade(service);
    const workspace = await facade.loadRunWorkspace('run_1');

    expect(workspace?.detailState).toBe('snapshot-only');
    expect(workspace?.timeline).toMatchObject({
      state: 'degraded',
      statusCode: 500,
    });
  });
});
