import { describe, expect, it, vi } from 'vitest';

import type { AuthorizedExecutionContext } from '../../../src/application/ports/auth.js';
import { GetRunStatusUseCase } from '../../../src/application/services/getRunStatusUseCase.js';
import { TenantId } from '../../../src/domain/auth/types.js';

const queryContext: AuthorizedExecutionContext<{ kind: 'query'; name: 'run:view' }> = {
  principal: {
    principalId: 'user-1',
    subjectId: 'user-1',
    issuer: 'issuer',
    audience: 'audience',
    principalType: 'user',
    expiresAt: new Date('2030-01-01T00:00:00Z'),
    rawScopes: [],
    assertedTenantIds: ['tenant-a'],
    assertedProjectIds: [],
  },
  scope: { resource: 'tenant', tenantId: TenantId.unsafe('tenant-a') },
  action: { kind: 'query', name: 'run:view' },
  requestId: 'req-1',
  authorizedAt: new Date('2026-03-19T00:00:00Z'),
};

const expectedOperationalIdentity = {
  tenantId: 'tenant-a',
  projectId: 'proj-1',
  environmentId: 'env-1',
  runId: 'run-1',
  planId: 'plan-1',
  planVersion: '1.0',
  logicalAttemptId: 1,
  provider: 'temporal',
} as const;

const registeredTargetAdapterRegistry = {
  isSupported: vi.fn().mockReturnValue(true),
  listSupported: vi.fn().mockReturnValue(['temporal']),
};

function createStateStore(): {
  getRunMetadataByRunId: ReturnType<typeof vi.fn>;
  getSnapshot: ReturnType<typeof vi.fn>;
  listEvents: ReturnType<typeof vi.fn>;
} {
  return {
    getRunMetadataByRunId: vi.fn(async () => {
      return {
        tenantId: 'tenant-a',
        projectId: 'proj-1',
        environmentId: 'env-1',
        runId: 'run-1',
        planId: 'plan-1',
        planVersion: '1.0',
        logicalAttemptId: 1,
        providerRef: {
          provider: 'temporal' as const,
          tenantId: 'tenant-a',
          namespace: 'default',
          workflowId: 'wf-1',
          runId: 'provider-run-1',
        },
      };
    }),
    getSnapshot: vi.fn(async () => {
      return null;
    }),
    listEvents: vi.fn(async () => {
      return [];
    }),
  };
}

describe('GetRunStatusUseCase', () => {
  it('advertises cancellation when a pending run has confirmed provider dispatch', async () => {
    const engine = {
      getRunStatus: vi.fn().mockResolvedValue({
        runId: 'provider-run-1',
        status: 'PENDING',
      }),
    };
    const startDispatchResolver = {
      resolve: vi.fn().mockResolvedValue({
        kind: 'confirmed',
        runRef: {
          provider: 'temporal',
          tenantId: 'tenant-a',
          namespace: 'default',
          workflowId: 'wf-1',
          runId: 'provider-run-1',
        },
      }),
    };
    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      createStateStore() as never,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      registeredTargetAdapterRegistry as never,
      startDispatchResolver
    );

    const result = await useCase.execute(
      { runId: 'run-1', enriched: false },
      queryContext as never
    );

    expect(result.controls.cancel).toEqual({ available: true });
    expect(startDispatchResolver.resolve).toHaveBeenCalledOnce();
  });

  it('projects an accepted cancellation receipt before runtime lifecycle catches up', async () => {
    const engine = {
      getRunStatus: vi.fn().mockResolvedValue({
        runId: 'provider-run-1',
        status: 'RUNNING',
      }),
    };
    const cancellationReceipts = {
      hasAccepted: vi.fn().mockResolvedValue(true),
      recordAccepted: vi.fn(),
    };
    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      createStateStore() as never,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      registeredTargetAdapterRegistry as never,
      undefined,
      cancellationReceipts
    );

    const result = await useCase.execute(
      { runId: 'run-1', enriched: false },
      queryContext as never
    );

    expect(result.controls.cancel).toEqual({
      available: false,
      reason: 'cancellation_pending',
    });
    expect(cancellationReceipts.hasAccepted).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      runId: 'run-1',
      logicalAttemptId: 1,
      planId: 'plan-1',
      planVersion: '1.0',
    });
  });

  it('loads metadata and returns projected engine status with FRESH staleness', async () => {
    const engine = {
      async getRunStatus(runRef: unknown) {
        expect(runRef).toEqual({
          provider: 'temporal',
          tenantId: 'tenant-a',
          namespace: 'default',
          workflowId: 'wf-1',
          runId: 'provider-run-1',
        });
        return {
          runId: 'provider-run-1',
          status: 'RUNNING' as const,
        };
      },
      async getRunEnrichment() {
        throw new Error('should not be called');
      },
    };

    const stalenessReader = {
      isSnapshotStale: vi.fn().mockResolvedValue(false),
    };

    const telemetry = {
      recordSnapshotStalenessResult: vi.fn(),
      recordSnapshotStalenessFallback: vi.fn(),
    };

    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      createStateStore() as never,
      stalenessReader as never,
      telemetry as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.toEqual({
      ...expectedOperationalIdentity,
      status: 'RUNNING',
      controls: {
        cancel: { available: true },
        recover: { available: false, reason: 'run_active' },
      },
      enriched: false,
      snapshotStaleness: 'FRESH',
      diagnostics: {
        runId: 'provider-run-1',
        planId: 'plan-1',
        adapter: 'temporal',
        status: 'RUNNING',
        pointers: [
          {
            kind: 'trace',
            label: 'Trace query',
            value: 'trace runId=provider-run-1 planId=plan-1 adapter=temporal status=RUNNING',
          },
          {
            kind: 'log',
            label: 'Log query',
            value: 'logs runId=provider-run-1 planId=plan-1 adapter=temporal status=RUNNING',
          },
        ],
      },
    });
    expect(stalenessReader.isSnapshotStale).toHaveBeenCalledWith('tenant-a', 'run-1');
    expect(telemetry.recordSnapshotStalenessResult).toHaveBeenCalledWith(
      'FRESH',
      'tenant-a',
      'run-1'
    );
    expect(telemetry.recordSnapshotStalenessFallback).not.toHaveBeenCalled();
  });

  it('returns STALE staleness when staleness query reports stale snapshot', async () => {
    const engine = {
      async getRunStatus() {
        return {
          runId: 'provider-run-1',
          status: 'RUNNING' as const,
        };
      },
      async getRunEnrichment() {
        throw new Error('should not be called');
      },
    };

    const telemetry = {
      recordSnapshotStalenessResult: vi.fn(),
      recordSnapshotStalenessFallback: vi.fn(),
    };

    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      createStateStore() as never,
      {
        isSnapshotStale: vi.fn().mockResolvedValue(true),
      } as never,
      telemetry as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.toMatchObject({
      snapshotStaleness: 'STALE',
    });
    expect(telemetry.recordSnapshotStalenessResult).toHaveBeenCalledWith(
      'STALE',
      'tenant-a',
      'run-1'
    );
    expect(telemetry.recordSnapshotStalenessFallback).not.toHaveBeenCalled();
  });

  it('uses UNKNOWN staleness and emits telemetry when query capability is not wired', async () => {
    const engine = {
      async getRunStatus() {
        return {
          runId: 'provider-run-1',
          status: 'RUNNING' as const,
        };
      },
      async getRunEnrichment() {
        throw new Error('should not be called');
      },
    };

    const telemetry = {
      recordSnapshotStalenessResult: vi.fn(),
      recordSnapshotStalenessFallback: vi.fn(),
    };

    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      createStateStore() as never,
      undefined,
      telemetry as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.toMatchObject({
      snapshotStaleness: 'UNKNOWN',
    });

    expect(telemetry.recordSnapshotStalenessFallback).toHaveBeenCalledWith(
      'query_not_wired',
      'tenant-a',
      'run-1'
    );
    expect(telemetry.recordSnapshotStalenessResult).toHaveBeenCalledWith(
      'UNKNOWN',
      'tenant-a',
      'run-1'
    );
  });

  it('uses UNKNOWN staleness and emits telemetry when staleness query fails', async () => {
    const engine = {
      async getRunStatus() {
        return {
          runId: 'provider-run-1',
          status: 'RUNNING' as const,
        };
      },
      async getRunEnrichment() {
        throw new Error('should not be called');
      },
    };

    const telemetry = {
      recordSnapshotStalenessResult: vi.fn(),
      recordSnapshotStalenessFallback: vi.fn(),
    };

    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      createStateStore() as never,
      {
        isSnapshotStale: vi.fn().mockRejectedValue(new Error('staleness query failed')),
      } as never,
      telemetry as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.toMatchObject({
      snapshotStaleness: 'UNKNOWN',
    });

    expect(telemetry.recordSnapshotStalenessFallback).toHaveBeenCalledWith(
      'query_failed',
      'tenant-a',
      'run-1'
    );
    expect(telemetry.recordSnapshotStalenessResult).toHaveBeenCalledWith(
      'UNKNOWN',
      'tenant-a',
      'run-1'
    );
  });

  it('uses UNKNOWN staleness and emits telemetry when staleness query returns null', async () => {
    const engine = {
      async getRunStatus() {
        return {
          runId: 'provider-run-1',
          status: 'RUNNING' as const,
        };
      },
      async getRunEnrichment() {
        throw new Error('should not be called');
      },
    };

    const telemetry = {
      recordSnapshotStalenessResult: vi.fn(),
      recordSnapshotStalenessFallback: vi.fn(),
    };

    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      createStateStore() as never,
      {
        isSnapshotStale: vi.fn().mockResolvedValue(null),
      } as never,
      telemetry as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.toMatchObject({
      snapshotStaleness: 'UNKNOWN',
    });

    expect(telemetry.recordSnapshotStalenessFallback).toHaveBeenCalledWith(
      'query_failed',
      'tenant-a',
      'run-1'
    );
    expect(telemetry.recordSnapshotStalenessResult).toHaveBeenCalledWith(
      'UNKNOWN',
      'tenant-a',
      'run-1'
    );
  });

  it('does not emit staleness telemetry when engine status lookup fails and query is not wired', async () => {
    const engine = {
      async getRunStatus() {
        throw new Error('engine unavailable');
      },
      async getRunEnrichment() {
        throw new Error('should not be called');
      },
    };

    const telemetry = {
      recordSnapshotStalenessResult: vi.fn(),
      recordSnapshotStalenessFallback: vi.fn(),
    };

    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      createStateStore() as never,
      undefined,
      telemetry as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).rejects.toThrow(/engine unavailable/);

    expect(telemetry.recordSnapshotStalenessFallback).not.toHaveBeenCalled();
    expect(telemetry.recordSnapshotStalenessResult).not.toHaveBeenCalled();
  });

  it('does not emit staleness telemetry when engine status lookup fails and staleness query resolves', async () => {
    const engine = {
      async getRunStatus() {
        throw new Error('engine unavailable');
      },
      async getRunEnrichment() {
        throw new Error('should not be called');
      },
    };

    const telemetry = {
      recordSnapshotStalenessResult: vi.fn(),
      recordSnapshotStalenessFallback: vi.fn(),
    };

    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      createStateStore() as never,
      {
        isSnapshotStale: vi.fn().mockResolvedValue(false),
      } as never,
      telemetry as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).rejects.toThrow(/engine unavailable/);

    expect(telemetry.recordSnapshotStalenessFallback).not.toHaveBeenCalled();
    expect(telemetry.recordSnapshotStalenessResult).not.toHaveBeenCalled();
  });

  it('uses the enriched path when requested', async () => {
    const engine = {
      async getRunStatus() {
        throw new Error('should not be called');
      },
      async getRunEnrichment() {
        return {
          canonical: {
            runId: 'provider-run-1',
            status: 'RUNNING' as const,
          },
          providerView: {
            provider: 'temporal' as const,
            providerStatus: 'RUNNING',
            providerSubstatus: 'temporal/QUEUED',
          },
        };
      },
    };

    const telemetry = {
      recordSnapshotStalenessResult: vi.fn(),
      recordSnapshotStalenessFallback: vi.fn(),
    };

    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      createStateStore() as never,
      {
        isSnapshotStale: vi.fn().mockResolvedValue(false),
      } as never,
      telemetry as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: true }, queryContext as never)
    ).resolves.toEqual({
      ...expectedOperationalIdentity,
      status: 'RUNNING',
      controls: {
        cancel: { available: true },
        recover: { available: false, reason: 'run_active' },
      },
      enriched: true,
      snapshotStaleness: 'FRESH',
      diagnostics: {
        runId: 'provider-run-1',
        planId: 'plan-1',
        adapter: 'temporal',
        status: 'RUNNING',
        pointers: [
          {
            kind: 'trace',
            label: 'Trace query',
            value: 'trace runId=provider-run-1 planId=plan-1 adapter=temporal status=RUNNING',
          },
          {
            kind: 'log',
            label: 'Log query',
            value: 'logs runId=provider-run-1 planId=plan-1 adapter=temporal status=RUNNING',
          },
        ],
      },
      providerView: {
        provider: 'temporal',
        providerStatus: 'RUNNING',
        providerSubstatus: 'temporal/QUEUED',
      },
    });
    expect(telemetry.recordSnapshotStalenessResult).toHaveBeenCalledWith(
      'FRESH',
      'tenant-a',
      'run-1'
    );
    expect(telemetry.recordSnapshotStalenessFallback).not.toHaveBeenCalled();
  });

  it('omits materialization evidence from failed caller-visible status snapshots', async () => {
    const engine = {
      async getRunStatus() {
        return {
          runId: 'provider-run-1',
          status: 'FAILED' as const,
          execution: {
            activeStepId: 'step-evidence',
            failure: {
              stepId: 'step-transform',
              reason: 'SINK_WRITE_FAILED',
              message: 'duplicate key value violates unique constraint',
              failedAt: '2026-04-08T10:00:03.000Z',
            },
            materialization: {
              executor: 'postgres' as const,
              environmentId: 'env-1',
              sinkTable: 'analytics.orders_daily',
              rowsWritten: 42,
              startedAt: '2026-04-08T10:00:00.000Z',
              completedAt: '2026-04-08T10:00:04.000Z',
              durationMs: 4000,
            },
          },
        };
      },
      async getRunEnrichment() {
        throw new Error('should not be called');
      },
    };

    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      createStateStore() as never,
      {
        isSnapshotStale: vi.fn().mockResolvedValue(false),
      } as never,
      {
        recordSnapshotStalenessResult: vi.fn(),
        recordSnapshotStalenessFallback: vi.fn(),
      } as never
    );

    const result = await useCase.execute(
      { runId: 'run-1', enriched: false },
      queryContext as never
    );

    expect(result).toMatchObject({
      ...expectedOperationalIdentity,
      status: 'FAILED',
      snapshotStaleness: 'FRESH',
      execution: {
        activeStepId: 'step-evidence',
        failure: {
          stepId: 'step-transform',
          reason: 'SINK_WRITE_FAILED',
        },
      },
    });
    expect(result.execution?.materialization).toBeUndefined();
    expect(result.materialization).toBeUndefined();
  });

  it('returns materialization evidence on completed caller-visible status snapshots', async () => {
    const engine = {
      async getRunStatus() {
        return {
          runId: 'provider-run-1',
          status: 'COMPLETED' as const,
          execution: {
            materialization: {
              executor: 'postgres' as const,
              environmentId: 'env-1',
              sinkTable: 'analytics.orders_daily',
              rowsWritten: 42,
              startedAt: '2026-04-08T10:00:00.000Z',
              completedAt: '2026-04-08T10:00:04.000Z',
              durationMs: 4000,
            },
          },
        };
      },
      async getRunEnrichment() {
        throw new Error('should not be called');
      },
    };

    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      createStateStore() as never,
      {
        isSnapshotStale: vi.fn().mockResolvedValue(false),
      } as never,
      {
        recordSnapshotStalenessResult: vi.fn(),
        recordSnapshotStalenessFallback: vi.fn(),
      } as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.toMatchObject({
      ...expectedOperationalIdentity,
      status: 'COMPLETED',
      snapshotStaleness: 'FRESH',
      execution: {
        materialization: {
          executor: 'postgres',
          sinkTable: 'analytics.orders_daily',
          rowsWritten: 42,
        },
      },
      materialization: {
        executor: 'postgres',
        sinkTable: 'analytics.orders_daily',
        rowsWritten: 42,
      },
    });
  });

  it('projects run diagnostics with trace and log pointers from the run read model', async () => {
    const planSha = 'd'.repeat(64);
    const engine = {
      async getRunStatus() {
        return {
          runId: 'provider-run-1',
          status: 'FAILED' as const,
          startedAt: '2026-04-08T10:00:00.000Z',
          completedAt: '2026-04-08T10:00:10.000Z',
          execution: {
            failure: {
              stepId: 'step-load',
              reason: 'SINK_WRITE_FAILED',
              failedAt: '2026-04-08T10:00:09.000Z',
            },
          },
        };
      },
      async getRunEnrichment() {
        throw new Error('should not be called');
      },
    };

    const stateStore = {
      ...createStateStore(),
      async listEvents() {
        return [
          {
            eventId: 'evt-run-started',
            eventType: 'RunStarted',
            runId: 'run-1',
            tenantId: 'tenant-a',
            projectId: 'proj-1',
            environmentId: 'env-1',
            planId: 'plan-1',
            planVersion: '1.0',
            engineAttemptId: 4,
            logicalAttemptId: 2,
            idempotencyKey: 'idem-run-started',
            payloadVersion: 1,
            emittedAt: '2026-04-08T10:00:00.000Z',
            persistedAt: '2026-04-08T10:00:00.100Z',
            runSeq: 1,
            payload: {
              executor: 'postgres',
            },
          },
          {
            eventId: 'evt-step-failed',
            eventType: 'StepFailed',
            runId: 'run-1',
            tenantId: 'tenant-a',
            projectId: 'proj-1',
            environmentId: 'env-1',
            planId: 'plan-1',
            planVersion: '1.0',
            engineAttemptId: 4,
            logicalAttemptId: 2,
            idempotencyKey: 'idem-step-failed',
            payloadVersion: 1,
            emittedAt: '2026-04-08T10:00:09.000Z',
            persistedAt: '2026-04-08T10:00:09.100Z',
            runSeq: 2,
            stepId: 'step-load',
            payload: {
              reason: 'SINK_WRITE_FAILED',
            },
          },
        ];
      },
    };

    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      stateStore as never,
      {
        isSnapshotStale: vi.fn().mockResolvedValue(false),
      } as never,
      undefined,
      {
        async getPlanRecord() {
          return {
            tenantId: 'tenant-a',
            projectId: 'proj-1',
            environmentId: 'env-1',
            planId: 'plan-1',
            planVersion: '1.0',
            schemaVersion: '1.0',
            contractVersion: '1.0.0',
            canonicalHash: planSha,
            canonicalPlanJson: JSON.stringify({
              metadata: {
                planId: 'plan-1',
                planVersion: '1.0',
                schemaVersion: '1.0',
                contractVersion: '1.0.0',
                inputHashSha256: 'b'.repeat(64),
                createdAtIso: '2026-04-08T10:00:00.000Z',
                ownership: {
                  tenantId: 'tenant-a',
                  projectId: 'proj-1',
                  environmentId: 'env-1',
                },
              },
              steps: [],
            }),
            sourceRef: 'plan://persisted/plan-1',
            state: 'ACTIVE' as const,
            createdAtIso: '2026-04-08T10:00:00.000Z',
            updatedAtIso: '2026-04-08T10:00:00.000Z',
          };
        },
      } as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.toMatchObject({
      diagnostics: {
        runId: 'provider-run-1',
        planId: 'plan-1',
        planSha,
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
            value: expect.stringContaining('runId=provider-run-1'),
          },
          {
            kind: 'log',
            label: 'Log query',
            value: expect.stringContaining('planId=plan-1'),
          },
        ],
      },
    });
  });

  it('rejects enriched status when enrichment times out instead of returning partial status', async () => {
    const engine = {
      async getRunStatus() {
        throw new Error('should not be called');
      },
      async getRunEnrichment() {
        throw new Error('adapter.getProviderStatusView timed out after 5ms');
      },
    };

    const telemetry = {
      recordSnapshotStalenessResult: vi.fn(),
      recordSnapshotStalenessFallback: vi.fn(),
    };

    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      createStateStore() as never,
      {
        isSnapshotStale: vi.fn().mockResolvedValue(false),
      } as never,
      telemetry as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: true }, queryContext as never)
    ).rejects.toThrow(/adapter\.getProviderStatusView timed out after 5ms/);

    expect(telemetry.recordSnapshotStalenessFallback).not.toHaveBeenCalled();
    expect(telemetry.recordSnapshotStalenessResult).not.toHaveBeenCalled();
  });

  it('derives executor, currentStepId, and materialization evidence from plan and events', async () => {
    const engine = {
      async getRunStatus() {
        return {
          runId: 'provider-run-1',
          status: 'RUNNING' as const,
          startedAt: '2026-04-08T10:00:00.000Z',
        };
      },
      async getRunEnrichment() {
        throw new Error('should not be called');
      },
    };

    const stateStore = {
      ...createStateStore(),
      async getSnapshot() {
        return {
          schemaVersion: 1,
          runId: 'run-1',
          status: 'RUNNING' as const,
          paused: false,
          cancelling: false,
          startedAt: '2026-04-08T10:00:00.000Z',
          steps: {
            'step-transform': {
              status: 'RUNNING' as const,
              startedAt: '2026-04-08T10:00:01.000Z',
              attempts: 1,
            },
          },
        };
      },
      async listEvents() {
        return [
          {
            eventId: 'evt-run-started',
            eventType: 'RunStarted',
            runId: 'run-1',
            tenantId: 'tenant-a',
            projectId: 'proj-1',
            environmentId: 'env-1',
            planId: 'plan-1',
            planVersion: '1.0',
            engineAttemptId: 1,
            logicalAttemptId: 1,
            idempotencyKey: 'idem-run-started',
            payloadVersion: 1,
            emittedAt: '2026-04-08T10:00:00.000Z',
            persistedAt: '2026-04-08T10:00:00.100Z',
            runSeq: 1,
            payload: {
              executor: 'postgres',
            },
          },
          {
            eventId: 'evt-step-completed',
            eventType: 'StepCompleted',
            runId: 'run-1',
            tenantId: 'tenant-a',
            projectId: 'proj-1',
            environmentId: 'env-1',
            planId: 'plan-1',
            planVersion: '1.0',
            engineAttemptId: 1,
            logicalAttemptId: 1,
            idempotencyKey: 'idem-step-completed',
            payloadVersion: 1,
            emittedAt: '2026-04-08T10:00:05.000Z',
            persistedAt: '2026-04-08T10:00:05.100Z',
            runSeq: 2,
            stepId: 'step-evidence',
            payload: {
              resultEvidence: {
                executor: 'postgres',
                environmentId: 'env-1',
                sinkTable: 'analytics.orders_daily',
                rowsWritten: 42,
                startedAt: '2026-04-08T10:00:02.000Z',
                completedAt: '2026-04-08T10:00:05.000Z',
                durationMs: 3000,
              },
            },
          },
        ];
      },
    };

    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      stateStore as never,
      {
        isSnapshotStale: vi.fn().mockResolvedValue(false),
      } as never,
      undefined,
      {
        async getPlanRecord(input: unknown) {
          expect(input).toEqual({
            tenantId: 'tenant-a',
            projectId: 'proj-1',
            environmentId: 'env-1',
            planId: 'plan-1',
          });
          return {
            tenantId: 'tenant-a',
            projectId: 'proj-1',
            environmentId: 'env-1',
            planId: '9'.repeat(64),
            planVersion: '1.0',
            schemaVersion: '1.0',
            contractVersion: '1.0.0',
            canonicalHash: 'a'.repeat(64),
            canonicalPlanJson: JSON.stringify({
              metadata: {
                planId: '9'.repeat(64),
                planVersion: '1.0',
                schemaVersion: '1.0',
                contractVersion: '1.0.0',
                inputHashSha256: 'b'.repeat(64),
                createdAtIso: '2026-04-08T10:00:00.000Z',
                ownership: {
                  tenantId: 'tenant-a',
                  projectId: 'proj-1',
                  environmentId: 'env-1',
                },
              },
              steps: [],
              observability: {
                extra: {
                  transformationFlowRuntime: {
                    previewProfile: 'transformation-sql-first-v2',
                    executor: 'postgres',
                  },
                  planPreviewProvenance: {
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
                      ref: 'refs/heads/main',
                      commitSha: '3'.repeat(40),
                      contentSha256: '4'.repeat(64),
                    },
                  },
                },
              },
            }),
            sourceRef: 'plan://persisted/plan-1',
            state: 'ACTIVE' as const,
            createdAtIso: '2026-04-08T10:00:00.000Z',
            updatedAtIso: '2026-04-08T10:00:00.000Z',
          };
        },
      } as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.toMatchObject({
      ...expectedOperationalIdentity,
      status: 'RUNNING',
      currentStepId: 'step-transform',
      provenance: {
        persistedPlan: {
          planRecordId: '9'.repeat(64),
          planVersion: '1.0',
          sourceRef: 'plan://persisted/plan-1',
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

  it('derives failedStepId and errorReason from failure events', async () => {
    const engine = {
      async getRunStatus() {
        return {
          runId: 'provider-run-1',
          status: 'FAILED' as const,
          startedAt: '2026-04-08T10:00:00.000Z',
          completedAt: '2026-04-08T10:00:10.000Z',
        };
      },
      async getRunEnrichment() {
        throw new Error('should not be called');
      },
    };

    const stateStore = {
      ...createStateStore(),
      async getSnapshot() {
        return {
          schemaVersion: 1,
          runId: 'run-1',
          status: 'FAILED' as const,
          paused: false,
          cancelling: false,
          startedAt: '2026-04-08T10:00:00.000Z',
          completedAt: '2026-04-08T10:00:10.000Z',
          steps: {
            'step-load': {
              status: 'FAILED' as const,
              startedAt: '2026-04-08T10:00:04.000Z',
              completedAt: '2026-04-08T10:00:09.000Z',
              attempts: 1,
            },
          },
        };
      },
      async listEvents() {
        return [
          {
            eventId: 'evt-step-failed',
            eventType: 'StepFailed',
            runId: 'run-1',
            tenantId: 'tenant-a',
            projectId: 'proj-1',
            environmentId: 'env-1',
            planId: 'plan-1',
            planVersion: '1.0',
            engineAttemptId: 1,
            logicalAttemptId: 1,
            idempotencyKey: 'idem-step-failed',
            payloadVersion: 1,
            emittedAt: '2026-04-08T10:00:09.000Z',
            persistedAt: '2026-04-08T10:00:09.100Z',
            runSeq: 3,
            stepId: 'step-load',
            payload: {
              reason: 'SINK_WRITE_FAILED',
              message: 'duplicate key value violates unique constraint',
            },
          },
          {
            eventId: 'evt-run-failed',
            eventType: 'RunFailed',
            runId: 'run-1',
            tenantId: 'tenant-a',
            projectId: 'proj-1',
            environmentId: 'env-1',
            planId: 'plan-1',
            planVersion: '1.0',
            engineAttemptId: 1,
            logicalAttemptId: 1,
            idempotencyKey: 'idem-run-failed',
            payloadVersion: 1,
            emittedAt: '2026-04-08T10:00:10.000Z',
            persistedAt: '2026-04-08T10:00:10.100Z',
            runSeq: 4,
            payload: {
              reason: 'STEP_FAILURE',
              executor: 'postgres',
              message: 'PERMANENT_STEP_ERROR:step-load',
            },
          },
        ];
      },
    };

    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      stateStore as never,
      {
        isSnapshotStale: vi.fn().mockResolvedValue(false),
      } as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.toMatchObject({
      status: 'FAILED',
      executor: 'postgres',
      failedStepId: 'step-load',
      errorReason: 'SINK_WRITE_FAILED',
    });
  });

  it('ignores stale failure and materialization evidence from prior logical attempts', async () => {
    const engine = {
      async getRunStatus() {
        return {
          runId: 'provider-run-1',
          status: 'RUNNING' as const,
          startedAt: '2026-04-08T10:00:00.000Z',
        };
      },
      async getRunEnrichment() {
        throw new Error('should not be called');
      },
    };

    const stateStore = {
      ...createStateStore(),
      async getSnapshot() {
        return {
          schemaVersion: 1,
          runId: 'run-1',
          status: 'RUNNING' as const,
          paused: false,
          cancelling: false,
          startedAt: '2026-04-08T10:00:00.000Z',
          steps: {
            'step-transform': {
              status: 'RUNNING' as const,
              startedAt: '2026-04-08T10:05:01.000Z',
              attempts: 1,
            },
          },
        };
      },
      async listEvents() {
        return [
          {
            eventId: 'evt-old-step-completed',
            eventType: 'StepCompleted',
            runId: 'run-1',
            tenantId: 'tenant-a',
            projectId: 'proj-1',
            environmentId: 'env-1',
            planId: 'plan-1',
            planVersion: '1.0',
            engineAttemptId: 1,
            logicalAttemptId: 1,
            idempotencyKey: 'idem-old-step-completed',
            payloadVersion: 1,
            emittedAt: '2026-04-08T10:01:05.000Z',
            persistedAt: '2026-04-08T10:01:05.100Z',
            runSeq: 1,
            stepId: 'step-old-sink',
            payload: {
              resultEvidence: {
                executor: 'postgres',
                environmentId: 'env-1',
                sinkTable: 'analytics.old_attempt',
                rowsWritten: 42,
                startedAt: '2026-04-08T10:01:00.000Z',
                completedAt: '2026-04-08T10:01:05.000Z',
                durationMs: 5000,
              },
            },
          },
          {
            eventId: 'evt-old-run-failed',
            eventType: 'RunFailed',
            runId: 'run-1',
            tenantId: 'tenant-a',
            projectId: 'proj-1',
            environmentId: 'env-1',
            planId: 'plan-1',
            planVersion: '1.0',
            engineAttemptId: 1,
            logicalAttemptId: 1,
            idempotencyKey: 'idem-old-run-failed',
            payloadVersion: 1,
            emittedAt: '2026-04-08T10:01:06.000Z',
            persistedAt: '2026-04-08T10:01:06.100Z',
            runSeq: 2,
            payload: {
              reason: 'STEP_FAILURE',
              executor: 'postgres',
              message: 'PERMANENT_STEP_ERROR:step-old-sink',
            },
          },
          {
            eventId: 'evt-current-run-started',
            eventType: 'RunStarted',
            runId: 'run-1',
            tenantId: 'tenant-a',
            projectId: 'proj-1',
            environmentId: 'env-1',
            planId: 'plan-1',
            planVersion: '1.0',
            engineAttemptId: 2,
            logicalAttemptId: 2,
            idempotencyKey: 'idem-current-run-started',
            payloadVersion: 1,
            emittedAt: '2026-04-08T10:05:00.000Z',
            persistedAt: '2026-04-08T10:05:00.100Z',
            runSeq: 3,
            payload: {
              executor: 'postgres',
            },
          },
          {
            eventId: 'evt-current-step-started',
            eventType: 'StepStarted',
            runId: 'run-1',
            tenantId: 'tenant-a',
            projectId: 'proj-1',
            environmentId: 'env-1',
            planId: 'plan-1',
            planVersion: '1.0',
            engineAttemptId: 2,
            logicalAttemptId: 2,
            idempotencyKey: 'idem-current-step-started',
            payloadVersion: 1,
            emittedAt: '2026-04-08T10:05:01.000Z',
            persistedAt: '2026-04-08T10:05:01.100Z',
            runSeq: 4,
            stepId: 'step-transform',
            payload: {},
          },
        ];
      },
    };

    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      stateStore as never,
      {
        isSnapshotStale: vi.fn().mockResolvedValue(false),
      } as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.toMatchObject({
      status: 'RUNNING',
      currentStepId: 'step-transform',
    });

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.not.toMatchObject({
      errorReason: 'STEP_FAILURE',
      failedStepId: 'step-old-sink',
      materialization: expect.anything(),
    });
  });

  it('does not leak old-attempt materialization into a later completed attempt without evidence', async () => {
    const engine = {
      async getRunStatus() {
        return {
          runId: 'provider-run-1',
          status: 'COMPLETED' as const,
          startedAt: '2026-04-08T10:00:00.000Z',
          completedAt: '2026-04-08T10:10:00.000Z',
        };
      },
      async getRunEnrichment() {
        throw new Error('should not be called');
      },
    };

    const stateStore = {
      ...createStateStore(),
      async getSnapshot() {
        return {
          schemaVersion: 1,
          runId: 'run-1',
          status: 'COMPLETED' as const,
          paused: false,
          cancelling: false,
          startedAt: '2026-04-08T10:00:00.000Z',
          completedAt: '2026-04-08T10:10:00.000Z',
          steps: {},
        };
      },
      async listEvents() {
        return [
          {
            eventId: 'evt-old-step-completed',
            eventType: 'StepCompleted',
            runId: 'run-1',
            tenantId: 'tenant-a',
            projectId: 'proj-1',
            environmentId: 'env-1',
            planId: 'plan-1',
            planVersion: '1.0',
            engineAttemptId: 1,
            logicalAttemptId: 1,
            idempotencyKey: 'idem-old-step-completed',
            payloadVersion: 1,
            emittedAt: '2026-04-08T10:01:05.000Z',
            persistedAt: '2026-04-08T10:01:05.100Z',
            runSeq: 1,
            stepId: 'step-old-sink',
            payload: {
              resultEvidence: {
                executor: 'postgres',
                environmentId: 'env-1',
                sinkTable: 'analytics.old_attempt',
                rowsWritten: 42,
                startedAt: '2026-04-08T10:01:00.000Z',
                completedAt: '2026-04-08T10:01:05.000Z',
                durationMs: 5000,
              },
            },
          },
          {
            eventId: 'evt-current-run-started',
            eventType: 'RunStarted',
            runId: 'run-1',
            tenantId: 'tenant-a',
            projectId: 'proj-1',
            environmentId: 'env-1',
            planId: 'plan-1',
            planVersion: '1.0',
            engineAttemptId: 2,
            logicalAttemptId: 2,
            idempotencyKey: 'idem-current-run-started',
            payloadVersion: 1,
            emittedAt: '2026-04-08T10:09:00.000Z',
            persistedAt: '2026-04-08T10:09:00.100Z',
            runSeq: 2,
            payload: {
              executor: 'postgres',
            },
          },
          {
            eventId: 'evt-current-run-completed',
            eventType: 'RunCompleted',
            runId: 'run-1',
            tenantId: 'tenant-a',
            projectId: 'proj-1',
            environmentId: 'env-1',
            planId: 'plan-1',
            planVersion: '1.0',
            engineAttemptId: 2,
            logicalAttemptId: 2,
            idempotencyKey: 'idem-current-run-completed',
            payloadVersion: 1,
            emittedAt: '2026-04-08T10:10:00.000Z',
            persistedAt: '2026-04-08T10:10:00.100Z',
            runSeq: 3,
            payload: {
              executor: 'postgres',
            },
          },
        ];
      },
    };

    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      stateStore as never,
      {
        isSnapshotStale: vi.fn().mockResolvedValue(false),
      } as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.toMatchObject({
      status: 'COMPLETED',
    });

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.not.toMatchObject({
      materialization: expect.anything(),
      errorReason: expect.anything(),
      failedStepId: expect.anything(),
    });
  });

  it('ignores legacy StepCompleted materialization payloads when snapshot evidence is absent', async () => {
    const engine = {
      async getRunStatus() {
        return {
          runId: 'provider-run-1',
          status: 'COMPLETED' as const,
          startedAt: '2026-04-08T10:00:00.000Z',
          completedAt: '2026-04-08T10:10:00.000Z',
        };
      },
      async getRunEnrichment() {
        throw new Error('should not be called');
      },
    };

    const stateStore = {
      ...createStateStore(),
      async getSnapshot() {
        return {
          schemaVersion: 1,
          runId: 'run-1',
          status: 'COMPLETED' as const,
          paused: false,
          cancelling: false,
          startedAt: '2026-04-08T10:00:00.000Z',
          completedAt: '2026-04-08T10:10:00.000Z',
          steps: {},
        };
      },
      async listEvents() {
        return [
          {
            eventId: 'evt-step-completed',
            eventType: 'StepCompleted',
            runId: 'run-1',
            tenantId: 'tenant-a',
            projectId: 'proj-1',
            environmentId: 'env-1',
            planId: 'plan-1',
            planVersion: '1.0',
            engineAttemptId: 1,
            logicalAttemptId: 1,
            idempotencyKey: 'idem-step-completed',
            payloadVersion: 1,
            emittedAt: '2026-04-08T10:10:00.000Z',
            persistedAt: '2026-04-08T10:10:00.100Z',
            runSeq: 1,
            stepId: 'step-evidence',
            payload: {
              materialization: {
                executor: 'postgres',
                environmentId: 'env-1',
                sinkTable: 'analytics.legacy_shape',
                rowsWritten: 42,
                startedAt: '2026-04-08T10:09:55.000Z',
                completedAt: '2026-04-08T10:10:00.000Z',
                durationMs: 5000,
              },
            },
          },
        ];
      },
    };

    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      stateStore as never,
      {
        isSnapshotStale: vi.fn().mockResolvedValue(false),
      } as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.toMatchObject({
      ...expectedOperationalIdentity,
      status: 'COMPLETED',
    });

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.not.toMatchObject({
      materialization: expect.anything(),
    });
  });

  it('skips full event history read when a workflow snapshot is available', async () => {
    const engine = {
      async getRunStatus() {
        return {
          runId: 'provider-run-1',
          status: 'RUNNING' as const,
        };
      },
      async getRunEnrichment() {
        throw new Error('should not be called');
      },
    };

    const stateStore = createStateStore();
    stateStore.getSnapshot.mockResolvedValue({
      schemaVersion: 1,
      runId: 'run-1',
      status: 'RUNNING',
      paused: false,
      cancelling: false,
      steps: {
        'step-current': {
          status: 'RUNNING',
          attempts: 1,
          startedAt: '2026-04-08T10:05:01.000Z',
        },
      },
    });

    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      stateStore as never,
      {
        isSnapshotStale: vi.fn().mockResolvedValue(false),
      } as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.toMatchObject({
      status: 'RUNNING',
      currentStepId: 'step-current',
    });
    expect(stateStore.listEvents).not.toHaveBeenCalled();
  });

  it.each(['getSnapshot', 'listEvents'] as const)(
    'propagates unexpected state-store %s failures',
    async (operation) => {
      const engine = {
        async getRunStatus() {
          return {
            runId: 'provider-run-1',
            status: 'RUNNING' as const,
          };
        },
        async getRunEnrichment() {
          throw new Error('should not be called');
        },
      };
      const stateStore = createStateStore();
      const storageFailure = new Error(`${operation} backend unavailable`);
      stateStore[operation].mockRejectedValue(storageFailure);
      const useCase = new GetRunStatusUseCase(
        engine as never,
        engine as never,
        stateStore as never,
        { isSnapshotStale: vi.fn().mockResolvedValue(false) } as never
      );

      await expect(
        useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
      ).rejects.toBe(storageFailure);
    }
  );

  it('propagates unexpected plan-record failures', async () => {
    const engine = {
      async getRunStatus() {
        return {
          runId: 'provider-run-1',
          status: 'RUNNING' as const,
        };
      },
      async getRunEnrichment() {
        throw new Error('should not be called');
      },
    };

    const stateStore = createStateStore();
    const planStoreFailure = new Error('plan store unavailable');

    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      stateStore as never,
      {
        isSnapshotStale: vi.fn().mockResolvedValue(false),
      } as never,
      undefined,
      {
        getPlanRecord: vi.fn().mockRejectedValue(planStoreFailure),
      }
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).rejects.toBe(planStoreFailure);
  });

  it('propagates unexpected stored-plan reference failures', async () => {
    const engine = {
      getRunStatus: vi.fn().mockResolvedValue({
        runId: 'provider-run-1',
        status: 'FAILED' as const,
      }),
      getRunEnrichment: vi.fn(),
    };
    const planStoreFailure = new Error('stored plan reference unavailable');
    const planStore = {
      getPlanRecord: vi.fn().mockResolvedValue(undefined),
      getStoredPlanRef: vi.fn().mockRejectedValue(planStoreFailure),
      getStoredPlanValidationRecord: vi.fn(),
      fetchStoredPlanArtifact: vi.fn(),
      fetchStoredPlanArtifactForValidation: vi.fn(),
    };
    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      createStateStore() as never,
      { isSnapshotStale: vi.fn().mockResolvedValue(false) } as never,
      undefined,
      planStore as never,
      undefined,
      undefined,
      { fetchAndValidate: vi.fn().mockResolvedValue({}) } as never,
      registeredTargetAdapterRegistry as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).rejects.toBe(planStoreFailure);
  });

  it('does not advertise recovery when the stored source plan fails integrity validation', async () => {
    const engine = {
      getRunStatus: vi.fn().mockResolvedValue({
        runId: 'provider-run-1',
        status: 'FAILED' as const,
      }),
      getRunEnrichment: vi.fn(),
    };
    const planRef = { planId: 'plan-1' };
    const planStore = {
      getPlanRecord: vi.fn().mockResolvedValue(undefined),
      getStoredPlanRef: vi.fn().mockResolvedValue(planRef),
      getStoredPlanValidationRecord: vi.fn(),
      fetchStoredPlanArtifact: vi.fn(),
      fetchStoredPlanArtifactForValidation: vi.fn(),
    };
    const planIntegrityValidator = {
      fetchAndValidate: vi.fn().mockRejectedValue(new Error('PLAN_INTEGRITY_VALIDATION_FAILED')),
    };
    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      createStateStore() as never,
      { isSnapshotStale: vi.fn().mockResolvedValue(false) } as never,
      undefined,
      planStore as never,
      undefined,
      undefined,
      planIntegrityValidator as never,
      registeredTargetAdapterRegistry as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.toMatchObject({
      status: 'FAILED',
      controls: {
        recover: { available: false, reason: 'source_plan_unavailable' },
      },
    });
    expect(planStore.getStoredPlanRef).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      projectId: 'proj-1',
      environmentId: 'env-1',
      planId: 'plan-1',
    });
    expect(planIntegrityValidator.fetchAndValidate).toHaveBeenCalledWith(
      {
        tenantId: 'tenant-a',
        projectId: 'proj-1',
        environmentId: 'env-1',
        planRef,
      },
      planStore
    );
  });

  it('does not advertise recovery when the source runtime adapter is not registered', async () => {
    const engine = {
      getRunStatus: vi.fn().mockResolvedValue({
        runId: 'provider-run-1',
        status: 'FAILED' as const,
      }),
      getRunEnrichment: vi.fn(),
    };
    const planRef = { planId: 'plan-1' };
    const planStore = {
      getPlanRecord: vi.fn().mockResolvedValue(undefined),
      getStoredPlanRef: vi.fn().mockResolvedValue(planRef),
      getStoredPlanValidationRecord: vi.fn(),
      fetchStoredPlanArtifact: vi.fn(),
      fetchStoredPlanArtifactForValidation: vi.fn(),
    };
    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      createStateStore() as never,
      { isSnapshotStale: vi.fn().mockResolvedValue(false) } as never,
      undefined,
      planStore as never,
      undefined,
      undefined,
      { fetchAndValidate: vi.fn().mockResolvedValue({}) } as never,
      { isSupported: vi.fn().mockReturnValue(false), listSupported: vi.fn() } as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.toMatchObject({
      status: 'FAILED',
      controls: {
        recover: { available: false, reason: 'source_adapter_unavailable' },
      },
    });
  });

  it('does not advertise recovery when the current adapter lacks a required plan capability', async () => {
    const engine = {
      getRunStatus: vi.fn().mockResolvedValue({
        runId: 'provider-run-1',
        status: 'FAILED' as const,
      }),
      getRunEnrichment: vi.fn(),
    };
    const planRef = { planId: 'plan-1' };
    const planStore = {
      getPlanRecord: vi.fn().mockResolvedValue(undefined),
      getStoredPlanRef: vi.fn().mockResolvedValue(planRef),
      getStoredPlanValidationRecord: vi.fn(),
      fetchStoredPlanArtifact: vi.fn(),
      fetchStoredPlanArtifactForValidation: vi.fn(),
    };
    const planExecutabilityValidator = {
      validatePlan: vi.fn().mockResolvedValue({
        status: 'ERROR',
        code: 'MISSING_CAPABILITY',
        reason: 'Missing adapter capability: executor.dbt',
      }),
    };
    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      createStateStore() as never,
      { isSnapshotStale: vi.fn().mockResolvedValue(false) } as never,
      undefined,
      planStore as never,
      undefined,
      undefined,
      { fetchAndValidate: vi.fn().mockResolvedValue({}) } as never,
      registeredTargetAdapterRegistry as never,
      undefined,
      undefined,
      planExecutabilityValidator as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.toMatchObject({
      status: 'FAILED',
      controls: {
        recover: { available: false, reason: 'source_adapter_unavailable' },
      },
    });
    expect(planExecutabilityValidator.validatePlan).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      projectId: 'proj-1',
      environmentId: 'env-1',
      planRef,
      adapterId: 'temporal',
    });
  });
});
