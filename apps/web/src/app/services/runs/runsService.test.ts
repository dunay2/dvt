import { parseExecutionSelection } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type { StartRunInput } from '../../ports/runs';
import { useSessionStore } from '../../stores/sessionStore';
import { makePlanRef } from '../../testing/contractTestUtils';
import { createMockRunsService } from '../../../testing/runsPortDoubles';
import { ApiError, type ApiClient } from '../api/createApiClient';
import { createRunsService } from './runsService';

function createApiClientMock(): ApiClient {
  return {
    baseUrl: 'http://localhost:3000',
    requestRaw: vi.fn(),
    getJson: vi.fn(),
    postJson: vi.fn(),
  };
}

function createStartRunInput(): StartRunInput {
  return {
    planRef: makePlanRef({
      uri: 's3://plans/plan.json',
      sha256: 'abc123',
      schemaVersion: '1.0.0',
      planId: 'plan_123',
      planVersion: '1.0.0',
    }),
    workspaceScope: {
      tenantId: 'tenant-1',
      projectId: 'project-1',
      environmentId: 'env-1',
      targetAdapter: 'temporal',
    },
    selection: parseExecutionSelection({
      mode: 'explicit',
      nodeIds: ['model_a', 'model_b'],
    }),
  };
}

function createApiError(
  statusCode: number,
  endpoint = '/runs/start',
  responseBody?: unknown
): ApiError {
  return new ApiError({
    message: `HTTP ${statusCode}`,
    endpoint,
    statusCode,
    category: statusCode >= 500 ? 'server' : 'client',
    responseBody,
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
      runId: 'run_123',
      accepted: true,
    });

    const service = createRunsService(apiClient);
    await expect(service.startRun(createStartRunInput())).resolves.toEqual({
      runId: 'run_123',
      accepted: true,
    });

    expect(apiClient.postJson).toHaveBeenCalledWith('/runs/start', {
      tenantId: 'tenant-1',
      projectId: 'project-1',
      environmentId: 'env-1',
      targetAdapter: 'temporal',
      selection: {
        mode: 'explicit',
        nodeIds: ['model_a', 'model_b'],
      },
      planRef: {
        uri: 's3://plans/plan.json',
        sha256: 'abc123',
        schemaVersion: '1.0.0',
        planId: 'plan_123',
        planVersion: '1.0.0',
      },
    });
  });

  it('does not send client-authored run identity for startRun', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.postJson).mockResolvedValue({
      runId: 'run_platform',
      accepted: true,
    });

    const service = createRunsService(apiClient);
    await service.startRun(createStartRunInput());

    const [, payload] = vi.mocked(apiClient.postJson).mock.calls[0] ?? [];

    expect(payload).not.toHaveProperty('runId');
    expect(payload).not.toHaveProperty('context');
  });

  it('rejects malformed startRun acceptance payloads', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.postJson).mockResolvedValue({
      accepted: true,
    });

    const service = createRunsService(apiClient);

    await expect(service.startRun(createStartRunInput())).rejects.toThrow(
      'RUN_START_RESPONSE_INVALID_RUN_ID'
    );
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

    const service = createRunsService(apiClient);
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
      execution: undefined,
    });
  });

  it('maps missing snapshots to null for getRunSnapshot', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockRejectedValue(createApiError(404, '/runs/missing'));

    const service = createRunsService(apiClient);
    const snapshot = await service.getRunSnapshot('missing');

    expect(snapshot).toBeNull();
  });

  it('uses GET /runs/:runId/events for listRunEvents', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue({
      items: [],
      nextCursor: 10,
    });

    const service = createRunsService(apiClient);
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

    const service = createRunsService(apiClient);
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
        execution: undefined,
      },
    ]);
  });

  it('maps result evidence fields from GET /runs/:runId', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue({
      runId: 'run_completed',
      status: 'COMPLETED',
      executor: 'postgres',
      startedAt: '2026-04-04T00:00:00.000Z',
      completedAt: '2026-04-04T00:00:10.000Z',
      execution: {
        activeStepId: 'step_transform',
        materialization: {
          executor: 'postgres',
          environmentId: 'env-prod',
          sinkTable: 'analytics.orders_daily',
          rowsWritten: 42,
          startedAt: '2026-04-04T00:00:02.000Z',
          completedAt: '2026-04-04T00:00:10.000Z',
          durationMs: 8000,
        },
      },
    });

    const service = createRunsService(apiClient);
    const snapshot = await service.getRunSnapshot('run_completed');

    expect(snapshot).toMatchObject({
      runId: 'run_completed',
      executor: 'postgres',
      execution: {
        activeStepId: 'step_transform',
        materialization: {
          executor: 'postgres',
          sinkTable: 'analytics.orders_daily',
          rowsWritten: 42,
        },
      },
    });
  });

  it('maps persisted-plan and authoring provenance from GET /runs/:runId', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue({
      runId: 'run_with_provenance',
      status: 'COMPLETED',
      startedAt: '2026-04-04T00:00:00.000Z',
      completedAt: '2026-04-04T00:00:10.000Z',
      provenance: {
        persistedPlan: {
          planRecordId: 'plan-record-1',
          planVersion: '1.0',
          sourceRef: 'plan://persisted/plan-record-1',
          canonicalPlanSha256: 'a'.repeat(64),
        },
        authoring: {
          graphArtifact: {
            repo: 'acme/warehouse',
            path: 'graphs/orders.flow.yaml',
            ref: 'refs/heads/main',
            commitSha: '1'.repeat(40),
            contentSha256: '2'.repeat(64),
          },
          sqlArtifact: {
            repo: 'acme/warehouse',
            path: 'models/orders_daily.sql',
            commitSha: '3'.repeat(40),
          },
        },
      },
    });

    const service = createRunsService(apiClient);
    const snapshot = await service.getRunSnapshot('run_with_provenance');

    expect(snapshot).toMatchObject({
      runId: 'run_with_provenance',
      provenance: {
        persistedPlan: {
          planRecordId: 'plan-record-1',
          planVersion: '1.0',
          sourceRef: 'plan://persisted/plan-record-1',
          canonicalPlanSha256: 'a'.repeat(64),
        },
        authoring: {
          graphArtifact: {
            repo: 'acme/warehouse',
            path: 'graphs/orders.flow.yaml',
          },
          sqlArtifact: {
            repo: 'acme/warehouse',
            path: 'models/orders_daily.sql',
          },
        },
      },
    });
  });

  it('maps top-level derived run evidence from GET /runs/:runId', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue({
      runId: 'run_with_read_model_fields',
      status: 'COMPLETED',
      startedAt: '2026-04-04T00:00:00.000Z',
      completedAt: '2026-04-04T00:00:10.000Z',
      currentStepId: 'step-transform',
      failedStepId: 'step-load',
      errorReason: 'SINK_WRITE_FAILED',
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

    const service = createRunsService(apiClient);
    const snapshot = await service.getRunSnapshot('run_with_read_model_fields');

    expect(snapshot).toMatchObject({
      runId: 'run_with_read_model_fields',
      currentStepId: 'step-transform',
      failedStepId: 'step-load',
      errorReason: 'SINK_WRITE_FAILED',
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

    const service = createRunsService(apiClient);
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

    const service = createRunsService(apiClient);
    const result = await service.listRunEvents('run_abc');

    expect(result).toEqual({
      events: [],
      nextAfterSeq: undefined,
    });
  });

  it('propagates listRunSummaries API errors', async () => {
    const apiClient = createApiClientMock();
    const apiError = createApiError(500, '/runs');
    vi.mocked(apiClient.getJson).mockRejectedValue(apiError);

    const service = createRunsService(apiClient);

    await expect(service.listRunSummaries()).rejects.toBe(apiError);
  });

  it('returns an IRunsPort-compatible API service', () => {
    const apiClient = createApiClientMock();
    const service = createRunsService(apiClient);

    expect(service).toHaveProperty('listRunSummaries');
    expect(service).toHaveProperty('getRunSnapshot');
    expect(service).toHaveProperty('startRun');
    expect(service).toHaveProperty('listRunEvents');
    expect(typeof service.listRunSummaries).toBe('function');
    expect(typeof service.getRunSnapshot).toBe('function');
    expect(typeof service.startRun).toBe('function');
    expect(typeof service.listRunEvents).toBe('function');
  });

  it('keeps the explicit runs-port test double contract usable', () => {
    const service = createMockRunsService();

    expect(service).toHaveProperty('listRunSummaries');
    expect(service).toHaveProperty('getRunSnapshot');
    expect(service).toHaveProperty('startRun');
    expect(service).toHaveProperty('listRunEvents');
    expect(typeof service.listRunSummaries).toBe('function');
    expect(typeof service.getRunSnapshot).toBe('function');
    expect(typeof service.startRun).toBe('function');
    expect(typeof service.listRunEvents).toBe('function');
  });

  it.each([401, 403, 404, 409, 422, 500])(
    'propagates runtime API error for startRun (%s)',
    async (statusCode) => {
      const apiClient = createApiClientMock();
      const apiError = createApiError(statusCode);
      vi.mocked(apiClient.postJson).mockRejectedValue(apiError);
      const service = createRunsService(apiClient);

      await expect(service.startRun(createStartRunInput())).rejects.toBe(apiError);
    }
  );

  it('surfaces graph_source_selection_mismatch from protected start-run as explicit re-plan guidance', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.postJson).mockRejectedValue(
      createApiError(422, '/runs/start', {
        error: {
          type: 'unprocessable',
          reason: 'plan_rejected',
          details: {
            cause: 'graph_source_selection_mismatch',
            message:
              'graphSource nodes must match the planner-derived executable subgraph for the selection.',
          },
        },
      })
    );
    const service = createRunsService(apiClient);

    await expect(service.startRun(createStartRunInput())).rejects.toThrow(
      'Selected scope no longer matches the authoritative draft. Re-run Plan.'
    );
  });

  it('does not call retired GET /runs/:runId/status route', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue({
      runId: 'run_abc',
      status: 'RUNNING',
      startedAt: '2026-04-04T00:00:00.000Z',
    });

    const service = createRunsService(apiClient);
    await service.getRunSnapshot('run_abc');

    expect(apiClient.getJson).toHaveBeenCalledWith('/runs/run_abc?tenantId=tenant-1');
    expect(apiClient.getJson).not.toHaveBeenCalledWith('/runs/run_abc/status');
  });
});
