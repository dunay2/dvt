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
  scope: { tenantId: TenantId.unsafe('tenant-a') },
  action: { kind: 'query', name: 'run:view' },
  requestId: 'req-1',
  authorizedAt: new Date('2026-03-19T00:00:00Z'),
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
          provider: 'mock' as const,
          tenantId: 'tenant-a',
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
  it('loads metadata and returns projected engine status with FRESH staleness', async () => {
    const engine = {
      async getRunStatus(runRef: unknown) {
        expect(runRef).toEqual({
          provider: 'mock',
          tenantId: 'tenant-a',
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
      runId: 'provider-run-1',
      tenantId: 'tenant-a',
      status: 'RUNNING',
      enriched: false,
      snapshotStaleness: 'FRESH',
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
            provider: 'mock' as const,
            providerStatus: 'RUNNING',
            providerSubstatus: 'mock/QUEUED',
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
      runId: 'provider-run-1',
      tenantId: 'tenant-a',
      status: 'RUNNING',
      enriched: true,
      snapshotStaleness: 'FRESH',
      providerView: {
        provider: 'mock',
        providerStatus: 'RUNNING',
        providerSubstatus: 'mock/QUEUED',
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

    const result = await useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never);

    expect(result).toMatchObject({
      runId: 'provider-run-1',
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
      runId: 'provider-run-1',
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
        async getPlanRecord() {
          return {
            planId: 'plan-1',
            planVersion: '1.0',
            schemaVersion: 'v1.2',
            contractVersion: '1.0.0',
            canonicalHash: 'a'.repeat(64),
            canonicalPlanJson: JSON.stringify({
              metadata: {
                planId: 'plan-1',
                planVersion: '1.0',
                schemaVersion: 'v1.2',
                contractVersion: '1.0.0',
                inputHashSha256: 'b'.repeat(64),
                createdAtIso: '2026-04-08T10:00:00.000Z',
              },
              steps: [],
              observability: {
                extra: {
                  transformationFlowRuntime: {
                    previewProfile: 'transformation-sql-first-v1',
                    executor: 'postgres',
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
      runId: 'provider-run-1',
      status: 'RUNNING',
      currentStepId: 'step-transform',
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

  it('keeps status response available when optional evidence sources fail', async () => {
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
    stateStore.getSnapshot.mockRejectedValue(new Error('snapshot backend unavailable'));
    stateStore.listEvents.mockRejectedValue(new Error('events backend unavailable'));

    const useCase = new GetRunStatusUseCase(
      engine as never,
      engine as never,
      stateStore as never,
      {
        isSnapshotStale: vi.fn().mockResolvedValue(false),
      } as never,
      undefined,
      {
        getPlanRecord: vi.fn().mockRejectedValue(new Error('plan store unavailable')),
      }
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.toMatchObject({
      runId: 'provider-run-1',
      status: 'RUNNING',
      snapshotStaleness: 'FRESH',
    });
  });
});


