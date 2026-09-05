// @vitest-environment jsdom

import { parseExecutionSelection } from '@dvt/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
      sha256: 'a'.repeat(64),
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

const activeRunControls = {
  cancel: { available: true },
  recover: { available: false, reason: 'run_active' },
} as const;

const completedRunControls = {
  cancel: { available: false, reason: 'run_terminal' },
  recover: { available: false, reason: 'run_completed' },
} as const;

const failedRunControls = {
  cancel: { available: false, reason: 'run_terminal' },
  recover: { available: true },
} as const;

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
  beforeEach(() => {
    localStorage.clear();
    useSessionStore.setState({
      tenantId: 'tenant-1',
      projectId: 'project-1',
      environmentId: 'env-1',
      targetAdapter: 'temporal',
      availableTargetAdapters: ['temporal'],
      availableWorkspaces: [
        {
          tenantId: 'tenant-1',
          projectId: 'project-1',
          environmentId: 'env-1',
        },
      ],
      workspaceScopeSelectionStatus: 'selected',
      workspaceScopeSelectionRejectionReason: undefined,
      rejectedWorkspaceScope: undefined,
    });
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
        sha256: 'a'.repeat(64),
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
      projectId: 'project-1',
      environmentId: 'dev',
      planVersion: '2.0.0',
      logicalAttemptId: 2,
      provider: 'temporal',
      createdAt: '2026-04-03T23:59:58.000Z',
      gitSha: 'abc',
      startedAt: '2026-04-04T00:00:00.000Z',
      durationMs: 5000,
      substatus: 'WAITING_APPROVAL',
      message: 'Approval required',
      snapshotStaleness: 'FRESH',
      controls: {
        cancel: { available: true },
        recover: { available: false, reason: 'run_active' },
      },
    });

    const service = createRunsService(apiClient);
    const snapshot = await service.getRunSnapshot('run_abc');

    expect(apiClient.getJson).toHaveBeenCalledWith('/runs/run_abc?tenantId=tenant-1');
    expect(snapshot).toEqual({
      runId: 'run_abc',
      planId: 'plan_abc',
      planVersion: '2.0.0',
      status: 'running',
      projectId: 'project-1',
      environment: 'dev',
      logicalAttemptId: 2,
      provider: 'temporal',
      createdAt: '2026-04-03T23:59:58.000Z',
      gitSha: 'abc',
      startedAt: '2026-04-04T00:00:00.000Z',
      completedAt: undefined,
      durationMs: 5000,
      substatus: 'WAITING_APPROVAL',
      message: 'Approval required',
      snapshotStaleness: 'FRESH',
      execution: undefined,
      controls: {
        cancel: { available: true },
        recover: { available: false, reason: 'run_active' },
      },
    });
  });

  it('loads a bounded materialization sample using only run identity and limit', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue({
      contractVersion: 1,
      connectionId: 'warehouse-a',
      objectId: 'relation/analytics_db/public/sink_1',
      columns: [{ name: 'id', type: 'integer', nullable: false }],
      rows: [{ values: ['1'] }],
      limit: 20,
      truncated: true,
      sampledAt: '2026-08-18T00:01:00.000Z',
    });

    const service = createRunsService(apiClient);
    const result = await service.getRunMaterializationSample?.('run_abc', 20);

    expect(apiClient.getJson).toHaveBeenCalledWith(
      '/runs/run_abc/materialization-rows?tenantId=tenant-1&limit=20'
    );
    expect(result).toEqual(
      expect.objectContaining({
        objectId: 'relation/analytics_db/public/sink_1',
        rows: [{ values: ['1'] }],
      })
    );
  });

  it('rejects malformed materialization sample responses', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue({ rows: 'not-a-row-array' });

    const service = createRunsService(apiClient);

    await expect(service.getRunMaterializationSample?.('run_abc', 20)).rejects.toThrow();
  });

  it('uses backend-owned cancel and recover command contracts', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.postJson)
      .mockResolvedValueOnce({
        contractVersion: 'v1',
        runId: 'run_abc',
        signalType: 'CANCEL',
        accepted: true,
        disposition: 'requested',
      })
      .mockResolvedValueOnce({
        contractVersion: 'v1',
        sourceRunId: 'run_failed',
        recoveryRunId: 'run_recovery',
        accepted: true,
      });
    const service = createRunsService(apiClient);

    await expect(service.cancelRun('run_abc')).resolves.toMatchObject({
      contractVersion: 'v1',
      disposition: 'requested',
    });
    await expect(service.recoverRun('run_failed')).resolves.toMatchObject({
      contractVersion: 'v1',
      recoveryRunId: 'run_recovery',
    });

    expect(apiClient.postJson).toHaveBeenNthCalledWith(1, '/runs/run_abc/cancel', {
      tenantId: 'tenant-1',
    });
    expect(apiClient.postJson).toHaveBeenNthCalledWith(
      2,
      '/runs/run_failed/recover',
      { tenantId: 'tenant-1' },
      {
        headers: { 'Idempotency-Key': expect.stringMatching(/^recover-run:/) },
      }
    );
  });

  it('reuses the recovery command identity after a lost response and browser reload', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.postJson)
      .mockRejectedValueOnce(new Error('connection reset after dispatch'))
      .mockResolvedValueOnce({
        contractVersion: 'v1',
        sourceRunId: 'run_failed',
        recoveryRunId: 'run_recovery',
        accepted: true,
      });
    const serviceBeforeReload = createRunsService(apiClient);

    await expect(serviceBeforeReload.recoverRun('run_failed')).rejects.toThrow('connection reset');

    const serviceAfterReload = createRunsService(apiClient);
    await expect(serviceAfterReload.recoverRun('run_failed')).resolves.toMatchObject({
      recoveryRunId: 'run_recovery',
    });

    expect(vi.mocked(apiClient.postJson).mock.calls[0]?.[2]).toEqual(
      vi.mocked(apiClient.postJson).mock.calls[1]?.[2]
    );
  });

  it('rejects malformed run-control receipts', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.postJson).mockResolvedValue({
      contractVersion: 'v0',
      runId: 'run_abc',
      accepted: true,
    });
    const service = createRunsService(apiClient);

    await expect(service.cancelRun('run_abc')).rejects.toThrow('RUN_CONTROL_RESPONSE_INVALID');
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
          controls: activeRunControls,
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
        controls: activeRunControls,
        environment: 'dev',
        gitSha: 'abc',
        createdAt: '2026-04-04T00:00:00.000Z',
        startedAt: undefined,
        completedAt: undefined,
        durationMs: undefined,
        substatus: 'WAITING_APPROVAL',
        message: 'Approval required',
        hash: undefined,
        snapshotStaleness: undefined,
        execution: undefined,
      },
    ]);
  });

  it('does not fabricate lifecycle time or status from the browser clock', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue({
      items: [
        {
          runId: 'run_without_snapshot_time',
          planId: 'plan_1',
          environmentId: 'dev',
          createdAt: '2026-04-04T00:00:00.000Z',
          controls: activeRunControls,
        },
      ],
      nextCursor: null,
    });

    const service = createRunsService(apiClient);

    await expect(service.listRunSummaries()).resolves.toEqual([
      expect.objectContaining({
        runId: 'run_without_snapshot_time',
        status: 'unknown',
        createdAt: '2026-04-04T00:00:00.000Z',
        startedAt: undefined,
        durationMs: undefined,
      }),
    ]);
  });

  it('maps result evidence fields from GET /runs/:runId', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue({
      runId: 'run_completed',
      status: 'COMPLETED',
      controls: completedRunControls,
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
      controls: completedRunControls,
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

  it('maps persisted plan execution scope summary from GET /runs/:runId', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue({
      runId: 'run_with_plan_scope',
      planId: 'plan_123',
      status: 'COMPLETED',
      controls: completedRunControls,
      startedAt: '2026-04-04T00:00:00.000Z',
      completedAt: '2026-04-04T00:00:10.000Z',
      planSummary: {
        executor: 'postgres',
        nodeCount: 3,
        stepCount: 3,
        sourceTables: ['raw.orders'],
        sinkTables: ['analytics.orders_daily'],
      },
    });

    const service = createRunsService(apiClient);
    const snapshot = await service.getRunSnapshot('run_with_plan_scope');

    expect(snapshot).toMatchObject({
      runId: 'run_with_plan_scope',
      planId: 'plan_123',
      planSummary: {
        executor: 'postgres',
        nodeCount: 3,
        stepCount: 3,
        sourceTables: ['raw.orders'],
        sinkTables: ['analytics.orders_daily'],
      },
    });
  });

  it('maps top-level derived run evidence from GET /runs/:runId', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue({
      runId: 'run_with_read_model_fields',
      status: 'COMPLETED',
      controls: completedRunControls,
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

  it('maps run diagnostics from GET /runs/:runId', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue({
      runId: 'run_with_diagnostics',
      status: 'FAILED',
      controls: failedRunControls,
      startedAt: '2026-04-04T00:00:00.000Z',
      completedAt: '2026-04-04T00:00:10.000Z',
      diagnostics: {
        runId: 'run_with_diagnostics',
        planId: 'plan_123',
        planSha: 'a'.repeat(64),
        stepId: 'step-load',
        attemptId: '2',
        adapter: 'temporal',
        durationMs: 10000,
        status: 'FAILED',
        errorCode: 'SINK_WRITE_FAILED',
        pointers: [
          {
            kind: 'trace',
            label: 'Trace query',
            value: 'runId=run_with_diagnostics planId=plan_123 stepId=step-load attemptId=2',
          },
          {
            kind: 'log',
            label: 'Log query',
            value: 'runId=run_with_diagnostics planSha=aaaaaaaa',
          },
        ],
      },
    });

    const service = createRunsService(apiClient);
    const snapshot = await service.getRunSnapshot('run_with_diagnostics');

    expect(snapshot).toMatchObject({
      runId: 'run_with_diagnostics',
      diagnostics: {
        runId: 'run_with_diagnostics',
        planId: 'plan_123',
        planSha: 'a'.repeat(64),
        stepId: 'step-load',
        attemptId: '2',
        adapter: 'temporal',
        durationMs: 10000,
        status: 'failed',
        errorCode: 'SINK_WRITE_FAILED',
        pointers: [
          {
            kind: 'trace',
            label: 'Trace query',
            value: 'runId=run_with_diagnostics planId=plan_123 stepId=step-load attemptId=2',
          },
          {
            kind: 'log',
            label: 'Log query',
            value: 'runId=run_with_diagnostics planSha=aaaaaaaa',
          },
        ],
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
    expect(service).toHaveProperty('getRunMaterializationSample');
    expect(service).toHaveProperty('startRun');
    expect(service).toHaveProperty('listRunEvents');
    expect(service).toHaveProperty('cancelRun');
    expect(service).toHaveProperty('recoverRun');
    expect(typeof service.listRunSummaries).toBe('function');
    expect(typeof service.getRunSnapshot).toBe('function');
    expect(typeof service.getRunMaterializationSample).toBe('function');
    expect(typeof service.startRun).toBe('function');
    expect(typeof service.listRunEvents).toBe('function');
    expect(typeof service.cancelRun).toBe('function');
    expect(typeof service.recoverRun).toBe('function');
  });

  it('keeps the explicit runs-port test double contract usable', () => {
    const service = createMockRunsService();

    expect(service).toHaveProperty('listRunSummaries');
    expect(service).toHaveProperty('getRunSnapshot');
    expect(service).toHaveProperty('startRun');
    expect(service).toHaveProperty('listRunEvents');
    expect(service).toHaveProperty('cancelRun');
    expect(service).toHaveProperty('recoverRun');
    expect(typeof service.listRunSummaries).toBe('function');
    expect(typeof service.getRunSnapshot).toBe('function');
    expect(typeof service.startRun).toBe('function');
    expect(typeof service.listRunEvents).toBe('function');
    expect(typeof service.cancelRun).toBe('function');
    expect(typeof service.recoverRun).toBe('function');
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

  it('surfaces graph_source_selection_mismatch from protected start-run as explicit preview guidance', async () => {
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
      'Selected scope no longer matches the authoritative draft. Preview execution plan again.'
    );
  });

  it('does not call retired GET /runs/:runId/status route', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue({
      runId: 'run_abc',
      status: 'RUNNING',
      controls: activeRunControls,
      startedAt: '2026-04-04T00:00:00.000Z',
    });

    const service = createRunsService(apiClient);
    await service.getRunSnapshot('run_abc');

    expect(apiClient.getJson).toHaveBeenCalledWith('/runs/run_abc?tenantId=tenant-1');
    expect(apiClient.getJson).not.toHaveBeenCalledWith('/runs/run_abc/status');
  });
});
